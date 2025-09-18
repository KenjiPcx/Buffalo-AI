from typing import Literal
from qa_util import run_exploratory_testing, run_prod_checks, run_user_flow_testing, summarize_test_session
from langchain_core.tools import tool
from configs import convex_client

@tool
async def start_test_session(test_session_id: str, base_url: str, unique_page_urls: list[str], num_agents: int = 3, headless: bool = False, modes: list[str] = ["exploratory", "user_flow", "preprod_checks"]) -> str:
    """Launch browser agents to test a website for UI bugs and issues.
    
    Args:
        base_url: The website URL to test
        unique_page_urls: The list of unique page starting point URLs to test
        num_agents: Number of QA agents to spawn (default: 3)
        headless: Whether to run browsers in headless mode (default: False)
        modes: The modes of the test session (default: ["exploratory", "user_flow", "preprod_checks"])
    
    Returns:
        test_id: Unique identifier for this test run
    """
    try:        
        if "exploratory" in modes:
            await run_exploratory_testing(starting_urls=unique_page_urls, num_agents=num_agents, headless=headless, test_session_id=test_session_id)
        
        if "user_flow" in modes:
            website_tests = convex_client.query("tests:getTestsForWebsiteUrl", {"websiteUrl": base_url})
            await run_user_flow_testing(user_flow_tasks=website_tests["websiteSpecific"], num_agents=num_agents, headless=headless, test_session_id=test_session_id)
        
        if "preprod_checks" in modes:
            website_tests = convex_client.query("tests:getTestsForWebsiteUrl", {"websiteUrl": base_url})
            await run_prod_checks(prod_checks=website_tests["checklist"], num_agents=num_agents, headless=headless, test_session_id=test_session_id)
        
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

buffalo_tools = [start_test_session, analyze_test_session, write_todos]