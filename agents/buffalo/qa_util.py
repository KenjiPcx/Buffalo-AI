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

import base64
import time
import asyncio
import json
from typing import List, Optional
from browser_use import Agent, BrowserProfile, BrowserSession
from browser_use.llm.messages import UserMessage
from pydantic import BaseModel, Field
import requests

from configs import convex_client, get_screen_dimensions, model, browser_llm, browser_profile

class TestExecutionResult(BaseModel):
    is_working: bool = Field(description="Whether the test execution is working as expected")
    message: str = Field(description="A message explaining the result")
    error: Optional[str] = Field(description="An error message if the test execution failed")

async def run_prod_checks(prod_checks: List[str], num_agents: int = 3, headless: bool = False, test_session_id: str = None):
    """
    QA check prod checks orchestrator, process tasks in batches
    """
    await convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Running {len(prod_checks)} prod checks"
    })
    await run_pool(prod_checks, num_agents, headless, tag="preprod_checks", test_session_id=test_session_id)
    await convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Completed {len(prod_checks)} prod checks"
    })

async def run_user_flow_testing(user_flow_tasks: List[str], num_agents: int = 3, headless: bool = False, test_session_id: str = None):
    """
    QA check user flow tasks orchestrator, process tasks in batches
    """
    await convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Running {len(user_flow_tasks)} user flow tasks"
    })
    await run_pool(user_flow_tasks, num_agents, headless, tag="user_flow", test_session_id=test_session_id)
    await convex_client.mutation("testSessions:addMessageToTestSession", {
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
    await convex_client.mutation("testSessions:addMessageToTestSession", {
            "testSessionId": test_session_id,
            "message": f"Crawled {len(starting_urls)} starting URLs"
        })

    for starting_url in starting_urls:
        qa_tasks = await scout_page(starting_url)

        await convex_client.mutation("testSessions:addMessageToTestSession", {
            "testSessionId": test_session_id,
            "message": f"Scouted {starting_url} and found {len(qa_tasks)} tasks"
        })

        await run_pool(qa_tasks, starting_url, num_agents, headless, tag="exploratory", test_session_id=test_session_id)

        await convex_client.mutation("testSessions:addMessageToTestSession", {
            "testSessionId": test_session_id,
            "message": f"Completed {len(qa_tasks)} exploratory tasks for {starting_url}"
        })
    
    await convex_client.mutation("testSessions:addMessageToTestSession", {
        "testSessionId": test_session_id,
        "message": f"Completed exploratory testing"
    })

async def run_pool(tasks: List[str], base_url: str, num_agents: int = 3, headless: bool = False, tag: str | None = None, test_session_id: str = None) -> str:
    start_time = time.time()

    task_execution_ids = []

    # Add a test execution for each qa_task
    for task in tasks:
        task_execution_id = await convex_client.mutation("testExecutions:createTestExecution", {
            "testSessionId": test_session_id,
            "name": task,
            "prompt": task,
            "type": tag
        })
        task_execution_ids.append(task_execution_id)

    async def run_single_agent(i: int):
        task_description = tasks[i % len(tasks)]

        # Update the task execution status to running
        await convex_client.mutation("testExecutions:updateTestExecutionStatus", {
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
            
            try:
                agent = Agent(
                    task=task_description,
                    llm=browser_llm,
                    browser_session=browser_session,
                    use_vision=True,
                    output_model_schema=TestExecutionResult
                )

                def on_step(state, output, step_no):
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

                agent.register_new_step_callback(on_step)
                
                history = await agent.run()
                
                result_text = str(history.final_result()) if hasattr(history, 'final_result') else str(history)

                validate_results_response = TestExecutionResult.model_validate_json(result_text)
                await convex_client.mutation("testExecutions:saveTestExecutionResults", {
                    "testExecutionId": task_execution_ids[i],
                    "results": {
                        "passed": validate_results_response.is_working,
                        "message": validate_results_response.message,
                        "error": validate_results_response.error
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
                except Exception:
                    pass
            
        except Exception as e:
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
    
    results = await asyncio.gather(
        *[run_agent_with_semaphore(i) for i in range(num_agents)], 
        return_exceptions=True
    )
    
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
    
    return test_data

async def scout_page(base_url: str) -> list:
    """Scout agent that identifies all interactive elements on the page"""
    try:
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
        
        try:
            scout_task = f"""Navigate to {base_url} using the go_to_url action, then identify ALL interactive elements on the page. Do NOT click anything, just observe and catalog what's available. List buttons, links, forms, input fields, menus, dropdowns, and any other clickable elements you can see. Provide a comprehensive inventory."""
            
            agent = Agent(
                task=scout_task,
                llm=browser_llm,
                browser_session=browser_session,
                use_vision=True
            )
            
            history = await agent.run()
        finally:
            # Properly close scout browser session to prevent lingering processes
            try:
                await browser_session.aclose()
            except Exception:
                pass
        
        scout_result = str(history.final_result()) if hasattr(history, 'final_result') else str(history)
        
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
        partition_response = await browser_llm.ainvoke(partition_messages)
        
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
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            element_tasks = json.loads(json_match.group())
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
        
        return element_tasks
        
    except Exception as e:
        # fallback tasks if scouting fails
        return [
            f"Test navigation elements in the header area of {base_url}",
            f"Test main content links and buttons in {base_url}",
            f"Test footer links and elements in {base_url}",
            f"Test any form elements found in {base_url}",
            f"Test sidebar or secondary navigation in {base_url}",
            f"Test any remaining interactive elements in {base_url}"
        ]