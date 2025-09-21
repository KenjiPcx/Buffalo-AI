from typing import Literal, Optional

from custom_types import CustomTestDoc, Task
from qa_util import run_exploratory_testing, run_prod_checks, run_user_flow_testing, summarize_test_session
from langchain_core.tools import tool
from configs import convex_client, model



@tool
async def start_test_session(test_session_id: str, base_url: str, num_agents: int = 3, headless: bool = False, modes: list[str] = ["exploratory", "user_defined", "buffalo_preprod_checks"], project_id: Optional[str] = None) -> str:
    """Launch browser agents to test a website for UI bugs and issues.
    
    Args:
        base_url: The website URL to test
        unique_page_urls: The list of unique page starting point URLs to test
        num_agents: Number of QA agents to spawn (default: 3)
        headless: Whether to run browsers in headless mode (default: False)
        modes: The modes of the test session (default: ["exploratory", "user_defined", "buffalo_preprod_checks"])
    """
    try:        
        if "exploratory" in modes:
            await run_exploratory_testing(base_url=base_url, num_agents=num_agents, headless=headless, test_session_id=test_session_id)
        
        if "user_defined" in modes:
            website_tests: list[CustomTestDoc] = convex_client.query(
                "customTests:getUserDefinedTestsByProject",
                {"projectId": project_id},
            )
            user_flow_tasks = [Task(name=t["name"], prompt=t["prompt"]) for t in website_tests]
            await run_user_flow_testing(base_url=base_url, user_flow_tasks=user_flow_tasks, num_agents=num_agents, headless=headless, test_session_id=test_session_id)
        
        if "buffalo_preprod_checks" in modes:
            website_tests: list[CustomTestDoc] = convex_client.query(
                "customTests:getBuffaloDefinedTests", {}
            )
            prod_checks = [Task(name=t["name"], prompt=t["prompt"]) for t in website_tests]
            await run_prod_checks(base_url=base_url, prod_checks=prod_checks, num_agents=num_agents, headless=headless, test_session_id=test_session_id)
        
        return f"Test session completed"
       
    except Exception as e:
        return f"Error starting test: {str(e)}"

@tool
async def analyze_test_session(test_id: str) -> dict:
    """Get the consolidated bug report for a test run.
    
    Args:
        test_id: The test ID returned from start
    
    Returns:
        dict: Complete test results with detailed findings
    """
    try:
        summary = await summarize_test_session(test_id)
        return summary
        
    except Exception as e:
        return {"error": f"Error getting results: {str(e)}"}
    
@tool
def write_todos(todos: str) -> str:
    """
    A todolist for you to manage and keep track of your tasks

    Args:
        todos: The list of todos to write in markdown format

    Returns:
        The list of todos that you have written
    """
    return todos

@tool
async def generate_test_session(base_url: str, modes: list[Literal["exploratory", "user-defined", "buffalo-defined"]], email: str) -> str:
    """Generate a test session for a website"""
    
    test_session_id = convex_client.mutation("testSessions:create", {
        "websiteUrl": base_url,
        "modes": modes,
        "email": email,
    })

    return test_session_id

buffalo_tools = [start_test_session, analyze_test_session, write_todos, generate_test_session]