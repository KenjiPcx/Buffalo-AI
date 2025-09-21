import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new test execution
export const createTestExecution = mutation({
  args: {
    testSessionId: v.id("testSessions"),
    name: v.string(),
    prompt: v.string(),
    websiteUrl: v.optional(v.string()),
    type: v.optional(v.union(v.literal("exploratory"), v.literal("user-defined"), v.literal("buffalo-defined"))),
  },
  handler: async (ctx, args) => {
    const testExecutionId = await ctx.db.insert("testExecutions", {
      testSessionId: args.testSessionId,
      name: args.name,
      prompt: args.prompt,
      websiteUrl: args.websiteUrl,
      type: args.type,
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
    const updates: any = { status: args.status };
    if (args.status === "running") {
      updates.startedAt = Date.now();
    }
    if (args.status === "completed" || args.status === "failed" || args.status === "skipped") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(args.testExecutionId, updates);
  },
});

// Save results of a test execution
export const saveTestExecutionResults = mutation({
  args: { testExecutionId: v.id("testExecutions"), results: v.object({
    passed: v.boolean(),
    message: v.string(),
    errorMessage: v.optional(v.union(v.string(), v.null()))
  }) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testExecutionId, { ...args.results, status: "completed", completedAt: Date.now() });
  },
});

// Save failure of a test execution
export const saveTestExecutionFailure = mutation({
  args: { testExecutionId: v.id("testExecutions"), failure: v.object({
    message: v.string(),
    errorMessage: v.union(v.string(), v.null()),
  }) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testExecutionId, {
      passed: false,
      message: args.failure.message,
      errorMessage: args.failure.errorMessage,
      status: "failed",
      completedAt: Date.now(),
    });
  },
});

// Generate a upload URL for a screenshot
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save screenshot of a test execution step
export const saveTestExecutionScreenshot = mutation({
  args: { testExecutionId: v.id("testExecutions"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const testExecution = await ctx.db.get(args.testExecutionId);
    if (!testExecution) throw new Error("Test execution not found");
    
    if (!testExecution.screenshots) testExecution.screenshots = [];

    const screenshotUrl = await ctx.storage.getUrl(args.storageId);
    if (!screenshotUrl) throw new Error("Screenshot URL not found");
    
    await ctx.db.patch(args.testExecutionId, { screenshots: [...testExecution.screenshots, screenshotUrl] });
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