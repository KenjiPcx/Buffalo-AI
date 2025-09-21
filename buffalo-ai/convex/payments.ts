import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

const PRICE_PER_TEST_EXECUTION = 1000;

export const claimPayment = action({
    args: {
        testSessionId: v.id("testSessions"),
    },
    handler: async (ctx, args) => {
        const { testSessionId } = args;

        // Get the remote session ID from the test session
        const remoteSessionId: string | undefined | null = await ctx.runQuery(api.testSessions.getRemoteSessionId, { testSessionId });

        if (!remoteSessionId) {
            throw new Error("Remote session ID not found");
        }

        // Get the test executions from the test session 
        const testExecutions: Doc<"testExecutions">[] = await ctx.runQuery(api.testExecutions.getTestExecutionsBySessionId, { testSessionId });


        const response: Response = await fetch(`${process.env.CORAL_API_URL}/api/v1/internal/claim/${remoteSessionId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount: {
                type: "coral",
                amount: testExecutions.length * PRICE_PER_TEST_EXECUTION,
            } }),
        });

        if (!response.ok) {
            throw new Error("Failed to claim payment");
        }
        console.log("response", response);
        return response.json();
    }
})