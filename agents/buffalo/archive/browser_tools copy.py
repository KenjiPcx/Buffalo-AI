"""
Browser automation tools for Buffalo agent
"""
import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from langchain_core.tools import tool
from browser_use import Agent, ChatGoogle
from convex import ConvexClient
from dotenv import load_dotenv

load_dotenv()

# Initialize Convex client
CONVEX_URL = os.getenv("CONVEX_URL", "https://your-project.convex.cloud")
convex_client = ConvexClient(CONVEX_URL)

# Batch size for parallel test execution
BATCH_SIZE = 5


async def execute_browser_test(test_prompt: str, website_url: str) -> Dict[str, Any]:
    """
    Execute a single browser test using browser-use.
    This is NOT a tool, just an internal function.
    """
    try:
        llm = ChatGoogle(model="gemini-2.0-flash")

        # Construct the full task
        task = f"On the website {website_url}, {test_prompt}"

        # Execute browser task
        agent = Agent(task=task, llm=llm)
        result = await agent.run()

        # Extract screenshot if available
        screenshot = None
        if hasattr(agent, 'screenshot'):
            screenshot = agent.screenshot

        # Simple heuristic to determine if test passed
        passed = result is not None and "error" not in str(result).lower()

        return {
            "success": True,
            "passed": passed,
            "result": str(result) if result else "Test completed",
            "screenshot": screenshot,
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "passed": False,
            "result": None,
            "screenshot": None,
            "error": str(e)
        }


async def execute_test_batch(test_executions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Execute a batch of tests in parallel and update their status in Convex.
    """
    results = []

    # Execute tests in parallel
    browser_results = await asyncio.gather(
        *[execute_browser_test(
            test["prompt"],
            test["websiteUrl"]
        ) for test in test_executions],
        return_exceptions=True
    )

    # Process results and update Convex
    for i, test_execution in enumerate(test_executions):
        browser_result = browser_results[i]

        if isinstance(browser_result, Exception):
            browser_result = {
                "success": False,
                "passed": False,
                "result": None,
                "error": str(browser_result)
            }

        # Update test execution status in Convex
        try:
            convex_client.mutation(
                "testExecutions:complete",
                {
                    "id": test_execution["_id"],
                    "passed": browser_result["passed"],
                    "result": browser_result["result"],
                    "error": browser_result.get("error"),
                    "screenshot": browser_result.get("screenshot"),
                    "completedAt": datetime.now().isoformat()
                }
            )

            results.append({
                "testExecutionId": test_execution["_id"],
                "testName": test_execution.get("name", "Unknown"),
                "passed": browser_result["passed"],
                "result": browser_result["result"],
                "error": browser_result.get("error")
            })
        except Exception as e:
            results.append({
                "testExecutionId": test_execution["_id"],
                "testName": test_execution.get("name", "Unknown"),
                "passed": False,
                "error": f"Failed to update Convex: {str(e)}"
            })

    return results


@tool
async def get_tests_by_website(url: str) -> Dict[str, Any]:
    """Get all tests for a specific website URL.

    Args:
        url: The website URL to get tests for

    Returns:
        Dictionary containing tests for the website
    """
    try:
        # Query tests for this website
        tests = convex_client.query("tests:getByWebsiteUrl", {"url": url})

        if tests:
            return {
                "success": True,
                "url": url,
                "testCount": len(tests),
                "tests": tests,
                "message": f"Found {len(tests)} tests for {url}"
            }
        else:
            return {
                "success": True,
                "url": url,
                "testCount": 0,
                "tests": [],
                "message": f"No tests found for {url}"
            }
    except Exception as e:
        return {
            "success": False,
            "url": url,
            "error": str(e),
            "message": f"Error fetching tests: {str(e)}"
        }


@tool
async def upsert_tests(url: str, tests: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Create or update tests for a website.

    Args:
        url: The website URL
        tests: List of test objects with name, type, and prompt

    Returns:
        Dictionary containing upsert results
    """
    try:
        results = []

        for test in tests:
            # Upsert each test
            result = convex_client.mutation(
                "tests:upsert",
                {
                    "websiteUrl": url,
                    "name": test.get("name"),
                    "type": test.get("type", "custom"),
                    "prompt": test.get("prompt"),
                    "expectedOutcome": test.get("expectedOutcome"),
                    "isActive": test.get("isActive", True)
                }
            )
            results.append(result)

        return {
            "success": True,
            "url": url,
            "testsUpserted": len(results),
            "results": results,
            "message": f"Successfully upserted {len(results)} tests for {url}"
        }
    except Exception as e:
        return {
            "success": False,
            "url": url,
            "error": str(e),
            "message": f"Error upserting tests: {str(e)}"
        }


@tool
async def start_test_session(url: str, test_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Start a test session for a website, executing tests in batches.

    Args:
        url: The website URL to test
        test_ids: Optional list of specific test IDs to run. If None, runs all active tests.

    Returns:
        Dictionary containing test session results
    """
    try:
        # Create a new test session
        session = convex_client.mutation(
            "testSessions:create",
            {
                "websiteUrl": url,
                "startedAt": datetime.now().isoformat()
            }
        )
        session_id = session["_id"]

        # Phase 1: Do proactive smoke testing with BFS crawling
        
        # Phase 2: Do specific user flows testing

        # Get tests to execute
        if test_ids:
            tests = convex_client.query("tests:getByIds", {"ids": test_ids})
        else:
            tests = convex_client.query("tests:getByWebsiteUrl", {"url": url, "activeOnly": True})

        if not tests:
            # Update session as completed with no tests
            convex_client.mutation(
                "testSessions:complete",
                {
                    "id": session_id,
                    "completedAt": datetime.now().isoformat(),
                    "testCount": 0,
                    "passedCount": 0,
                    "failedCount": 0
                }
            )

            return {
                "success": True,
                "sessionId": session_id,
                "url": url,
                "message": "No tests to execute",
                "totalTests": 0,
                "results": []
            }

        # Create test executions for this session
        test_executions = []
        for test in tests:
            execution = convex_client.mutation(
                "testExecutions:create",
                {
                    "testSessionId": session_id,
                    "testId": test["_id"],
                    "websiteUrl": url,
                    "name": test["name"],
                    "prompt": test["prompt"],
                    "status": "pending"
                }
            )
            test_executions.append(execution)

        # Execute tests in batches
        all_results = []
        for i in range(0, len(test_executions), BATCH_SIZE):
            batch = test_executions[i:i + BATCH_SIZE]

            # Update session progress
            convex_client.mutation(
                "testSessions:updateProgress",
                {
                    "id": session_id,
                    "currentBatch": i // BATCH_SIZE + 1,
                    "totalBatches": (len(test_executions) + BATCH_SIZE - 1) // BATCH_SIZE,
                    "testsCompleted": i
                }
            )

            # Execute batch
            batch_results = await execute_test_batch(batch)
            all_results.extend(batch_results)

        # Calculate final stats
        passed_count = sum(1 for r in all_results if r.get("passed"))
        failed_count = len(all_results) - passed_count

        # Update session as completed
        convex_client.mutation(
            "testSessions:complete",
            {
                "id": session_id,
                "completedAt": datetime.now().isoformat(),
                "testCount": len(all_results),
                "passedCount": passed_count,
                "failedCount": failed_count
            }
        )

        return {
            "success": True,
            "sessionId": session_id,
            "url": url,
            "totalTests": len(all_results),
            "passedTests": passed_count,
            "failedTests": failed_count,
            "results": all_results,
            "message": f"Test session completed: {passed_count}/{len(all_results)} tests passed"
        }

    except Exception as e:
        # Try to mark session as failed
        if 'session_id' in locals():
            try:
                convex_client.mutation(
                    "testSessions:fail",
                    {
                        "id": session_id,
                        "error": str(e),
                        "failedAt": datetime.now().isoformat()
                    }
                )
            except:
                pass

        return {
            "success": False,
            "url": url,
            "error": str(e),
            "message": f"Error starting test session: {str(e)}"
        }


# Export the tools
buffalo_tools = [get_tests_by_website, upsert_tests, start_test_session]