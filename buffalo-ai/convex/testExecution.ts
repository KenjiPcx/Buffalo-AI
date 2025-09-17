import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new test execution
export const createTestExecution = internalMutation({
  args: {
    testSessionId: v.id("testSessions"),
    name: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const testExecutionId = await ctx.db.insert("testExecutions", {
      testSessionId: args.testSessionId,
      name: args.name,
      prompt: args.prompt,
      status: "pending",
    });

    return testExecutionId;
  },
});

// Create multiple test executions at once
export const createTestExecutions = mutation({
  args: {
    testSessionId: v.id("testSessions"),
    testExecutions: v.array(v.object({
      name: v.string(),
      prompt: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const testExecutionIds: Id<"testExecutions">[] = [];

    for (const testExecution of args.testExecutions) {
      const testExecutionId = await ctx.db.insert("testExecutions", {
        testSessionId: args.testSessionId,
        name: testExecution.name,
        prompt: testExecution.prompt,
        status: "pending",
      });
      testExecutionIds.push(testExecutionId);
    }

    return testExecutionIds;
  },
});

// Update test execution status
export const updateTestExecutionStatus = mutation({
  args: {
    testExecutionId: v.id("testExecutions"),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("skipped"))
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testExecutionId, { status: args.status });
  },
});

// Get test executions for a test session
export const getTestSessionExecutions = query({
  args: { testSessionId: v.id("testSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("testExecutions")
      .withIndex("by_testSession", (q) => q.eq("testSessionId", args.testSessionId))
      .order("asc")
      .collect();
  },
});

export const getTestExecutionsBySessionId = query({
  args: { testSessionId: v.id("testSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("testExecutions")
      .withIndex("by_testSession", (q) => q.eq("testSessionId", args.testSessionId))
      .order("asc")
      .collect();
  },
});