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

from textwrap import dedent
import time
import asyncio
import json
from typing import List, Dict, Any, Set
import uuid
from browser_use import Agent, BrowserSession
from pydantic import BaseModel, Field

from agents.buffalo.configs import model, browser_llm, browser_profile

class TestingTask(BaseModel):
    task: str = Field(description="The task to perform, ie navigate to the url, click on the element, fill in the form, etc.")
    expected_output: str = Field(description="The expected output of performing the task")
    
class TestingTaskList(BaseModel):
    tasks: List[TestingTask] = Field(description="A list of testing tasks")
    
class TestingTaskResult(BaseModel):
    success: bool = Field(description="Whether the task was successful")
    comment: str = Field(description="A short explanation of the result")
    current_url: str = Field(description="The final URL after the task")

class SeverityAnalysis(BaseModel):
    high_severity: list[str] = Field(description="A list of high severity issues")
    medium_severity: list[str] = Field(description="A list of medium severity issues")
    low_severity: list[str] = Field(description="A list of low severity issues")

class TestingResultSummary(BaseModel):
    total_tests: int = Field(description="The total number of tests")
    total_passed: int = Field(description="The total number of passed tests")
    total_failed: int = Field(description="The total number of failed tests")
    severity_analysis: SeverityAnalysis = Field(description="The severity analysis of the tests")

# Batch size for parallel test execution
BATCH_SIZE = 5

'''
Crawl workflow

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
'''

async def summarize_results(base_url: str, all_results: List[TestingTaskResult]) -> str:
    """Summarize the results of the tests"""
    
    prompt = dedent(f"""
        You are an objective QA analyst. Review the following test reports from agents that explored the website {base_url}.

        Identify only actual functional issues, broken features, or technical problems. Do NOT classify subjective opinions, missing features that may be intentional, or design preferences as issues.

        Only report issues if they represent:
        - Broken functionality (buttons that don't work, forms that fail)
        - Technical errors (404s, JavaScript errors, broken links)
        - Accessibility violations (missing alt text, poor contrast)
        - Performance problems (very slow loading, timeouts)

        IMPORTANT: For each issue you identify, provide SPECIFIC and DETAILED descriptions including:
        - The exact element that was tested (button name, link text, form field, etc.)
        - The specific action taken (clicked, typed, submitted, etc.)
        - The exact result or error observed (404 error, no response, broken redirect, etc.)
        - Any relevant context from the agent's testing

        DO NOT use vague descriptions like "broken link" or "404 error". Instead use specific descriptions like:
        - "Upon clicking the 'Contact Us' button in the header navigation, the page redirected to a 404 error"
        - "When submitting the newsletter signup form with a valid email, the form displayed 'Server Error 500' instead of confirmation"

        Here are the test reports:
        {all_results}

        Format the output as JSON with the following structure:
        {{
            "high_severity": [
                {{ "category": "category_name", "description": "specific detailed description with exact steps and results" }},
                ...
            ],
            "medium_severity": [
                {{ "category": "category_name", "description": "specific detailed description with exact steps and results" }},
                ...
            ],
            "low_severity": [
                {{ "category": "category_name", "description": "specific detailed description with exact steps and results" }},
                ...
            ]
        }}

        Only include real issues found during testing. Provide clear, concise descriptions. Deduplicate similar issues.
    """)
    
    severity_analysis: SeverityAnalysis = await model.with_structured_output(SeverityAnalysis).ainvoke(prompt)
    total_issues = (
        len(severity_analysis.get("high_severity", [])) +
        len(severity_analysis.get("medium_severity", [])) +
        len(severity_analysis.get("low_severity", []))
    )
    
    # determine overall status
    if len(severity_analysis.get("high_severity", [])) > 0:
        overall_status = "high-severity"
        status_emoji = "🔴"
        status_description = "Critical issues found that need immediate attention"
    elif len(severity_analysis.get("medium_severity", [])) > 0:
        overall_status = "medium-severity"
        status_emoji = "🟠"
        status_description = "Moderate issues found that should be addressed"
    elif len(severity_analysis.get("low_severity", [])) > 0:
        overall_status = "low-severity"
        status_emoji = "🟡"
        status_description = "Minor issues found that could be improved"
    else:
        overall_status = "passing"
        status_emoji = "✅"
        status_description = "No technical issues detected during testing"
    
    summary.update({
        "overall_status": overall_status,
        "status_emoji": status_emoji,
        "status_description": status_description,
        "total_issues": total_issues,
        "severity_breakdown": severity_analysis,
        "llm_analysis": {
            "raw_response": response_text,
            "model_used": "gemini-1.5-flash"
        }
    })
   

# async def orchestrate_tests(base_url: str, num_agents: int = 4, headless: bool = False):
    """Orchestrate the test execution"""
    
    qa_tasks: List[TestingTask] = []
    visited_urls: Set[str] = set()
    all_results: List[TestingTaskResult] = []
    
    async def scout_page(base_url: str) -> TestingTaskList:
        """Scout agent that identifies all interactive elements on the page"""
        try:
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
            partition_prompt = dedent(f"""
                Based on this scout report of interactive elements found on {base_url}:

                {scout_result}

                Create a list of specific testing tasks, each focusing on different elements. Each task should specify exactly which elements to test (by their text, location, or description). Aim for 6-8 distinct tasks that cover different elements without overlap.

                Here are some examples of how to write the tasks:
                1. "Navigate to {base_url} using go_to_url, then test the [specific element description] - click on [exact button/link text or location], expect [expected output]"
                2. "Navigate to {base_url} using go_to_url, then test the [different specific element] - interact with [exact description], expect [expected output]"

                Make each task very specific about which exact elements to test. ALWAYS start each task with navigation instructions.
            """)
            
            element_tasks: TestingTaskList = await model.with_structured_output(TestingTaskList).ainvoke(partition_prompt)
            return element_tasks
            
        except Exception as e:
            # fallback tasks if scouting fails
            raise e
        
    
    async def execute_single_test(test: TestingTask, default_url: str) -> TestingTaskResult:
        """Execute a single browser test and return a structured result."""
        
        browser_session = BrowserSession(browser_profile=browser_profile)
        try:
            # Build an instruction that forces navigation and returns explicit JSON
            test_instruction = dedent(f"""
                You are testing a website using browser actions. Follow these steps exactly:
                1) Use go_to_url to navigate to {default_url}
                2) Then perform the following test steps: {test.task}
                3) After completing, determine whether the observed result matches this expected outcome: {test.expected_output}

                IMPORTANT OUTPUT FORMAT:
                Return ONLY a compact JSON object with keys: success, comment, current_url, new_urls.
                - success: boolean indicating whether expected outcome was achieved
                - comment: short 1-2 sentence explanation of reasoning
                - current_url: the final URL after actions
            """)

            agent = Agent(
                task=test_instruction,
                llm=browser_llm,
                browser_session=browser_session,
                output_model_schema=TestingTaskResult
            )

            history = await agent.run()

            final_str = str(history.final_result()) if hasattr(history, 'final_result') else str(history)
            task_result = TestingTaskResult.model_validate_json(final_str)
            
            return task_result
        finally:
            try:
                await browser_session.aclose()
            except Exception:
                pass


    async def run_agent_pool(tasks_to_execute: List[TestingTask], default_url: str) -> List[TestingTaskResult]:
        """Run a pool of browser agents in parallel for a given batch of tests."""
        sem = asyncio.Semaphore(num_agents)

        async def wrapped(test: TestingTask) -> TestingTaskResult:
            async with sem:
                return await execute_single_test(test, default_url)

        return await asyncio.gather(*[wrapped(t) for t in tasks_to_execute])
    
    # Initialize test queue
    identified_tasks: TestingTaskList = await scout_page(base_url)
    qa_tasks = identified_tasks.tasks
    
    while qa_tasks:
        # Pop top N tasks
        tasks_to_execute = qa_tasks[:num_agents]
        qa_tasks = qa_tasks[num_agents:]

        # Run tests in parallel
        batch_results = await run_agent_pool(tasks_to_execute, base_url)
        all_results.extend(batch_results)

        # Discover and enqueue new pages (BFS-like), without revisiting
        for result in batch_results:
            current_url = result.current_url
            if isinstance(current_url, str) and current_url and current_url not in visited_urls:
                visited_urls.add(current_url)
                # Only scout pages that are not the original base to avoid loops
                if current_url != base_url:
                    try:
                        new_tasks = await scout_page(current_url)
                        qa_tasks.extend(new_tasks.tasks)
                    except Exception:
                        # Ignore scouting failures for robustness
                        pass
            
    # Summarize results
    severity_analysis = await summarize_results(base_url, all_results)

    return all_results