"""
Browser automation tools for Buffalo agent

# Feature 1: Crawl Testing Workflow

1. Start with a seed URL
2. Scout page: Use a browser task to identify top 5 interactive elements on the page, and create a list of specific testing tasks, what to expect for the next image
3. Execute tasks in parallel, checking if next image matches expectations
4. Report results, log success/failure of elements by page of the website
5. If we are on a new page, call the scout page function again and come up with new test tasks with expectations
6. Repeat until we have scanned the entire website

Notes:
- We should use iterative BFS with a task queue, each task is a tuple of (url, task, expected output)
- Browser workers, we only have 5 workers so we should pop the top 5 tasks at each iteration, one task per browser agent
- Browser agents could takes in an instruction to first navigate to the url, then execute the task, then reason if the next image matches the expectations
- Browser agents should result in an output schema of (success: bool, comment: str) and save the tests into the database with the (url, task, success, comment)

# Feature 2: Specified User Flow Testing

1. Given a list of user flow tasks (user defined), see if we can fully execute them
2. Execute the tasks in parallel, one task per browser agent
3. While executing the task, let the agent note down its difficulties
4. Stop when bug found or task complete
"""

import logging
import base64
import time
import asyncio
import json
from typing import List, Optional, Literal
from browser_use import Agent, BrowserProfile, BrowserSession, llm
from browser_use.browser.views import BrowserStateSummary
from browser_use.llm.messages import UserMessage
from pydantic import BaseModel, Field
import requests

from configs import convex_client, get_screen_dimensions, model, browser_llm, browser_profile
logger = logging.getLogger(__name__)

class TestExecutionResult(BaseModel):
    is_working: bool
    message: str
    error: Optional[str]

# ---- Logging helpers ----
def _truncate(text: str, max_len: int = 2000) -> str:
    try:
        if text is None:
            return ""
        s = str(text)
        return s if len(s) <= max_len else s[:max_len] + "… [truncated]"
    except Exception:
        return "[unserializable]"

def _extract_final_result_text(history) -> str:
    try:
        final_attr = getattr(history, "final_result", None)
        if callable(final_attr):
            return str(final_attr())
        if final_attr is not None:
            return str(final_attr)
        return str(history)
    except Exception as e:
        logger.exception("Failed extracting final result from history: %s", e)
        return str(history)

async def run_prod_checks(prod_checks: List[str], num_agents: int = 3, headless: bool = False, test_session_id: str = None):
    """
    QA check prod checks orchestrator, process tasks in batches
    """
    convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Running {len(prod_checks)} prod checks"
    })
    await run_pool(prod_checks, num_agents, headless, tag="preprod_checks", test_session_id=test_session_id)
    convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Completed {len(prod_checks)} prod checks"
    })

async def run_user_flow_testing(user_flow_tasks: List[str], num_agents: int = 3, headless: bool = False, test_session_id: str = None):
    """
    QA check user flow tasks orchestrator, process tasks in batches
    """
    convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Running {len(user_flow_tasks)} user flow tasks"
    })
    await run_pool(user_flow_tasks, num_agents, headless, tag="user_flow", test_session_id=test_session_id)
    convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Completed {len(user_flow_tasks)} user flow tasks"
    })

async def run_exploratory_testing(starting_urls: List[str], num_agents: int = 3, headless: bool = False, test_session_id: str = None):
    """
    QA check websites orchestrator, it will:
    1. Loop through each starting URL
    2. Call the run_pool function to test the website
    3. Return the results
    
    Args:
        starting_urls: List of starting URLs to test, these should be the starting points within a website to test
    """
    convex_client.mutation("testSessions:addMessageToTestSession", {
            "testSessionId": test_session_id,
            "message": f"Crawled {len(starting_urls)} starting URLs"
        })

    for starting_url in starting_urls:
        qa_tasks = await scout_page(starting_url)

        convex_client.mutation("testSessions:addMessageToTestSession", {
            "testSessionId": test_session_id,
            "message": f"Scouted {starting_url} and found {len(qa_tasks)} tasks"
        })

        await run_pool(qa_tasks, starting_url, num_agents, headless, tag="exploratory", test_session_id=test_session_id)

        convex_client.mutation("testSessions:addMessageToTestSession", {
            "testSessionId": test_session_id,
            "message": f"Completed {len(qa_tasks)} exploratory tasks for {starting_url}"
        })
    
    convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Completed exploratory testing"
    })

async def run_pool(tasks: List[str], base_url: str, num_agents: int = 3, headless: bool = False, tag: str | None = None, test_session_id: str = None) -> str:
    start_time = time.time()

    task_execution_ids = []

    # Add a test execution for each qa_task
    for task in tasks:
        task_execution_id = convex_client.mutation("testExecutions:createTestExecution", {
            "testSessionId": test_session_id,
            "name": task,
            "prompt": task,
            "type": tag,
            "websiteUrl": base_url
        })
        task_execution_ids.append(task_execution_id)
        logger.debug("Created test execution id=%s for task='%s'", task_execution_id, task)

    async def run_single_agent(i: int):
        task_description = tasks[i]

        # Update the task execution status to running
        convex_client.mutation("testExecutions:updateTestExecutionStatus", {
            "testExecutionId": task_execution_ids[i],
            "status": "running"
        })
        
        try:
            # browser configuration with optimizations for faster startup
            browser_args = [
                '--disable-gpu', 
                '--no-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-component-extensions-with-background-pages',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-background-networking'
            ]
            if headless:
                browser_args.append('--headless=new')
            
            window_config = {}
            
            if not headless:
                # window positioning for non-headless mode
                screen_width, screen_height = get_screen_dimensions()
                
                window_width = 300
                window_height = 400
                viewport_width = 280
                viewport_height = 350
                
                margin = 10
                spacing = 15
                
                usable_width = screen_width - (2 * margin)
                windows_per_row = max(1, usable_width // (window_width + spacing))
                
                row = i // windows_per_row
                col = i % windows_per_row
                
                x_offset = margin + col * (window_width + spacing)
                y_offset = margin + row * (window_height + spacing)
                
                if x_offset + window_width > screen_width:
                    x_offset = screen_width - window_width - margin
                if y_offset + window_height > screen_height:
                    y_offset = screen_height - window_height - margin
                
                window_config = {
                    "window_size": {"width": window_width, "height": window_height},
                    "viewport": {"width": viewport_width, "height": viewport_height}
                }
                # Note: window_position removed due to API incompatibility - expects width/height but needs x/y
            
            logger.debug("Agent %d configuring BrowserProfile. headless=%s, args=%s, window_config=%s", i, headless, browser_args, window_config)
            browser_profile = BrowserProfile(
                headless=headless,
                disable_security=True,
                user_data_dir=None,
                args=browser_args,
                ignore_default_args=['--enable-automation'],
                wait_for_network_idle_page_load_time=1.0,  # Reduced for faster execution
                maximum_wait_page_load_time=5.0,  # Reduced timeout
                wait_between_actions=0.3,  # Faster actions
                **window_config
            )
            
            browser_session = BrowserSession(browser_profile=browser_profile)
            logger.debug("Agent %d BrowserSession created", i)
            
            try:
                def on_step(state: BrowserStateSummary, output, step_no):
                    # state is BrowserStateSummary
                    if not state.screenshot:
                        return

                    # 1) Decode base64 to PNG bytes
                    base64_bytes = base64.b64decode(state.screenshot)
                    print(f"Saving screenshot for step {step_no}")

                    # 2) Get upload URL from Convex (it's a mutation in your backend)
                    upload_url = convex_client.mutation("testExecutions:generateUploadUrl")

                    # 3) Upload bytes to Convex storage via HTTP
                    resp = requests.post(upload_url, data=base64_bytes, headers={"Content-Type": "image/png"})
                    resp.raise_for_status()
                    storage_id = resp.json()["storageId"]  # returned by Convex upload endpoint

                    # 4) Save screenshot reference on your test execution (mutation expects Id<'_storage'>)
                    convex_client.mutation(
                        "testExecutions:saveTestExecutionScreenshot",
                        {"testExecutionId": task_execution_ids[i], "storageId": storage_id},
                    )

                agent = Agent(
                    task=task_description,
                    llm=browser_llm,
                    browser_session=browser_session,
                    use_vision=True,
                    output_model_schema=TestExecutionResult,
                    register_new_step_callback=on_step
                )
                logger.info("Agent %d starting run for task_execution_id=%s", i, task_execution_ids[i])
                t0 = time.time()

                history = await agent.run()
                elapsed = time.time() - t0
                logger.info("Agent %d finished run in %.2fs", i, elapsed)
                logger.debug("Agent %d history (truncated): %s", i, _truncate(history))
                
                result_text = _extract_final_result_text(history)
                logger.debug("Agent %d final_result (truncated): %s", i, _truncate(result_text))

                validate_results_response = TestExecutionResult.model_validate_json(result_text)
                convex_client.mutation("testExecutions:saveTestExecutionResults", {
                    "testExecutionId": task_execution_ids[i],
                    "results": {
                        "passed": validate_results_response.is_working,
                        "message": validate_results_response.message,
                        "errorMessage": validate_results_response.error
                    }
                })
                
                return {
                    "agent_id": i,
                    "task": task_description,
                    "result": result_text,
                    "timestamp": time.time(),
                    "status": "success"
                }
            finally:
                # Properly close browser session to prevent lingering processes
                try:
                    await browser_session.aclose()
                    logger.debug("Agent %d BrowserSession closed", i)
                except Exception:
                    logger.exception("Agent %d error closing BrowserSession", i)
            
        except Exception as e:
            logger.exception("Error running agent %d: %s", i, e)
            return {
                "agent_id": i,
                "task": task_description,
                "error": str(e),
                "timestamp": time.time(),
                "status": "error"
            }

    # run agents in parallel
    semaphore = asyncio.Semaphore(min(num_agents, 10))
    
    async def run_agent_with_semaphore(i: int):
        async with semaphore:
            return await run_single_agent(i)
    
    logger.info("Running %d tasks with up to %d concurrent agents for base_url=%s (headless=%s, tag=%s)", len(tasks), num_agents, base_url, headless, tag)
    results = await asyncio.gather(
        *[run_agent_with_semaphore(i) for i in range(len(tasks))], 
        return_exceptions=True
    )
    success_count = 0
    error_count = 0
    for r in results:
        if isinstance(r, Exception):
            error_count += 1
            logger.exception("Agent raised exception: %s", r)
        elif isinstance(r, dict) and r.get("status") == "error":
            error_count += 1
            logger.error("Agent reported error: %s", r.get("error"))
        else:
            success_count += 1
    logger.info("Agents completed: success=%d, error=%d", success_count, error_count)
    
    end_time = time.time()
    
    # Allow time for browser sessions to close gracefully
    await asyncio.sleep(1)
    
    # store results
    test_data = {
        "url": base_url,
        "agents": num_agents,
        "start_time": start_time,
        "end_time": end_time,
        "duration": end_time - start_time,
        "results": [r for r in results if not isinstance(r, Exception)],
        "status": "completed"
    }
    logger.info("run_pool completed for %s in %.2fs", base_url, test_data["duration"])
    return test_data

async def scout_page(base_url: str) -> list:
    """Scout agent that identifies all interactive elements on the page"""
    try:
        logger.info("Scout starting for base_url=%s", base_url)
        browser_profile = BrowserProfile(
            headless=True,
            disable_security=True,
            user_data_dir=None,
            args=[
                '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--headless=new',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-component-extensions-with-background-pages',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-background-networking'
            ],
            wait_for_network_idle_page_load_time=1.0,  # Reduced for faster execution
            maximum_wait_page_load_time=5.0,  # Reduced timeout
            wait_between_actions=0.3  # Faster actions
        )
        
        browser_session = BrowserSession(browser_profile=browser_profile)
        logger.debug("Scout BrowserSession created")
        
        try:
            scout_task = f"""Navigate to {base_url} using the go_to_url action, then identify ALL interactive elements on the page. Do NOT click anything, just observe and catalog what's available. List buttons, links, forms, input fields, menus, dropdowns, and any other clickable elements you can see. Provide a comprehensive inventory."""
            
            agent = Agent(
                task=scout_task,
                llm=browser_llm,
                browser_session=browser_session,
                use_vision=True
            )
            logger.info("Scout agent starting run")
            t0 = time.time()
            history = await agent.run()
            elapsed = time.time() - t0
            logger.info("Scout agent finished run in %.2fs", elapsed)
        finally:
            # Properly close scout browser session to prevent lingering processes
            try:
                await browser_session.aclose()
                logger.debug("Scout BrowserSession closed")
            except Exception:
                logger.exception("Scout error closing BrowserSession")
        
        scout_result = _extract_final_result_text(history)
        logger.debug("Scout final_result (truncated): %s", _truncate(scout_result))
        
        # partition elements with llm
        partition_prompt = f"""
Based on this scout report of interactive elements found on {base_url}:

{scout_result}

Create a list of specific testing tasks, each focusing on different elements. Each task should specify exactly which elements to test (by their text, location, or description). Aim for 6-8 distinct tasks that cover different elements without overlap.

Format as JSON array:
[
    "Navigate to {base_url} using go_to_url, then test the [specific element description] - click on [exact button/link text or location]",
    "Navigate to {base_url} using go_to_url, then test the [different specific element] - interact with [exact description]",
    ...
]

Make each task very specific about which exact elements to test. ALWAYS start each task with navigation instructions.
"""
        
        # Format prompt as proper message for the LLM  
        from browser_use.llm.messages import UserMessage
        partition_messages = [UserMessage(content=partition_prompt)]
        logger.info("Scout partitioning elements via LLM")
        partition_response = await browser_llm.ainvoke(partition_messages)
        logger.debug("Partition LLM raw response (truncated): %s", _truncate(partition_response))
        
        # parse response
        import re
        # Handle different response types - check multiple possible attributes
        if hasattr(partition_response, 'content'):
            response_text = str(partition_response.content)
        elif hasattr(partition_response, 'completion'):
            response_text = str(partition_response.completion)
        elif hasattr(partition_response, 'text'):
            response_text = str(partition_response.text)
        else:
            response_text = str(partition_response)
        logger.debug("Partition response text (truncated): %s", _truncate(response_text))
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            element_tasks = json.loads(json_match.group())
            logger.info("Scout partitioned %d element tasks", len(element_tasks))
        else:
            # fallback tasks
            element_tasks = [
                f"Test navigation elements in the header area of {base_url}",
                f"Test main content links and buttons in {base_url}",
                f"Test footer links and elements in {base_url}",
                f"Test any form elements found in {base_url}",
                f"Test sidebar or secondary navigation in {base_url}",
                f"Test any remaining interactive elements in {base_url}"
            ]
            logger.warning("Scout partition JSON parse failed; using fallback tasks (%d)", len(element_tasks))
        
        return element_tasks
        
    except Exception as e:
        # fallback tasks if scouting fails
        logger.exception("Scout failed for base_url=%s: %s", base_url, e)
        return [
            f"Test navigation elements in the header area of {base_url}",
            f"Test main content links and buttons in {base_url}",
            f"Test footer links and elements in {base_url}",
            f"Test any form elements found in {base_url}",
            f"Test sidebar or secondary navigation in {base_url}",
            f"Test any remaining interactive elements in {base_url}"
        ]

class Issue(BaseModel):
    """Represents a single issue found during testing."""
    severity: Literal["High", "Medium", "Low"] = Field(description="The severity of the issue.")
    risk: str = Field(description="What is the risk of this issue?")
    details: str = Field(description="Details about the issue that was found.")
    testExecutionId: str = Field(description="The ID of the test execution where this issue was found.")
    advice: str = Field(description="Advice on how to fix the issue.")

class ReportGenerator(BaseModel):
    """Always use this tool to structure your response to the user."""
    summary: str = Field(description="A summary of the test session.")
    issues: List[Issue] = Field(description="A list of issues found during the test session.")


async def summarize_test_session(test_session_id: str) -> str:
    """Summarize a test session"""
    test_executions = convex_client.query("testExecutions:getTestExecutionsBySessionId", {"testSessionId": test_session_id})

    prompt = f"""
    You are a QA engineer summarizing a test session.
    Based on the following test executions, generate a report.
    The report should include a summary and a list of issues.
    For each issue, provide the severity, risk, details, the test execution ID, and advice on how to fix it.
    Prioritize failed tests and tests with error messages.

    Test Executions:
    {test_executions}
    """
    response: ReportGenerator = await model.with_structured_output(ReportGenerator).ainvoke(prompt)
    
    # Convert Pydantic model to dictionary
    report_data = response.model_dump()
    
    convex_client.mutation(
        "testReports:createReport",
        {
            "testSessionId": test_session_id,
            "summary": report_data["summary"],
            "issues": report_data["issues"],
        },
    )
    
    return "Report generated and saved."
