import traceback
from dotenv import load_dotenv
import asyncio
from langchain.prompts import ChatPromptTemplate
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_mcp_adapters.client import MultiServerMCPClient
import os
import json
import urllib.parse
from agents.buffalo.qa_tools import buffalo_tools  # Import our browser automation tools
from configs import model

load_dotenv()

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

async def create_agent(coral_tools, agent_tools):
    coral_tools_description = get_tools_description(coral_tools)
    agent_tools_description = get_tools_description(agent_tools)
    combined_tools = coral_tools + agent_tools
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are Buffalo, a specialized browser automation agent that executes test sessions for web applications through using browser use agents.

            # Your capabilities:
            1. Start test session (start_test_session) - Execute tests in batches with parallel browser automation given a website URL, mode can be "exploratory", "user_flow", or "all"
            2. Results (analyze_test_session) - Get the results of the test session

            # Instructions:
            1. Call wait_for_mentions from coral tools (timeoutMs: 30000) to receive test requests from other agents.
            2. When you receive a mention, keep the thread ID and the sender ID.
            3. If you are asked to run a test on a website, execute the based on the mode of the test session defined below
            4. Use `send_message` from coral tools to send the results back to the sender.
            5. If any error occurs, send a detailed error message explaining what went wrong.
            6. Always respond back to the sender agent with actionable results.
            7. Wait for 2 seconds and repeat the process from step 1.
            
            # Test Modes:
            ## Exploratory Testing Workflow Mode:
            1) Ask the Firecrawl agent to generate a sitemap from the website URL, then normalize paths by stripping query params and collapsing dynamic segments (e.g., treat /product/123 and /product/456 as the same type). For each type, select one representative URL (e.g., keep /product/123, drop the rest), it should return you a bunch of starting points within the website to test
            2) Call the `start_test_session` tool with (mode: "exploratory") to start a test session for the website, put the starting points in the unique_page_urls parameter.
            3) Call the `analyze_test_session` tool to generate a structured test report from the completed session, it will return a url to the report
            4) Share the url of the report to the Email agent and ask it to send a copy of the generated report to the user
            5) Report back to the user interface agent that you have completed the task
            
            ## User Flow Testing Workflow Mode:
            1) Call the `start_test_session` tool with (mode: "user_flow") to start a test session for the website, you may leave the unique_page_urls empty.
            Rest of the workflow is the same as the exploratory test website workflow.
            
            ## All Testing Workflow Mode:
            The workflow is the same as the exploratory test website workflow, but with the following changes:
            2) Call the `start_test_session` tool with (mode: "all") to start a test session for the website.
            
            These are the list of coral tools: {coral_tools_description}
            These are the list of your testing tools: {agent_tools_description}"""
                ),
                ("placeholder", "{agent_scratchpad}")

    ])

    agent = create_tool_calling_agent(model, combined_tools, prompt)
    return AgentExecutor(agent=agent, tools=combined_tools, verbose=True, handle_parsing_errors=True)

async def main():

    runtime = os.getenv("CORAL_ORCHESTRATION_RUNTIME", None)
    if runtime is None:
        load_dotenv()

    base_url = os.getenv("CORAL_SSE_URL")
    agentID = os.getenv("CORAL_AGENT_ID")

    coral_params = {
        "agentId": agentID,
        "agentDescription": "Buffalo - A testing agent that validates web apps using browser automation"
    }

    query_string = urllib.parse.urlencode(coral_params)

    CORAL_SERVER_URL = f"{base_url}?{query_string}"
    print(f"Connecting to Coral Server: {CORAL_SERVER_URL}")

    timeout = float(os.getenv("TIMEOUT_MS", "300"))
    client = MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": CORAL_SERVER_URL,
                "timeout": timeout,
                "sse_read_timeout": timeout,
            }
        }
    )

    print("Multi Server Connection Established")

    coral_tools = await client.get_tools(server_name="coral")

    # Combine Buffalo's custom tools with Coral tools
    agent_tools = buffalo_tools  # Use our custom browser automation tools

    print(f"Coral tools count: {len(coral_tools)} and Buffalo tools count: {len(agent_tools)}")

    agent_executor = await create_agent(coral_tools, agent_tools)

    while True:
        try:
            print("Starting new agent invocation")
            await agent_executor.ainvoke({"agent_scratchpad": []})
            print("Completed agent invocation, restarting loop")
            await asyncio.sleep(10)
        except Exception as e:
            print(f"Error in agent loop: {str(e)}")
            print(traceback.format_exc())
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
