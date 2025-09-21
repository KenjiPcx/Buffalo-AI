import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new test session
export const createTestSession = mutation({
  args: {
    websiteUrl: v.string(),
    modes: v.array(
      v.union(
        v.literal("exploratory"),
        v.literal("user-defined"),
        v.literal("buffalo-defined"),
      ),
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"testSessions">> => {
    const now = Date.now();

    // Create the test session
    const testSessionId = await ctx.db.insert("testSessions", {
      websiteUrl: args.websiteUrl,
      modes: args.modes,
      email: args.email || "",
      status: "running",
      startedAt: now,
      messages: [],
    });

    return testSessionId;
  },
});

export const setRemoteSessionId = mutation({
  args: {
    testSessionId: v.id("testSessions"),
    remoteSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testSessionId, { remoteSessionId: args.remoteSessionId });
  },
});

export const getRemoteSessionId = query({
  args: {
    testSessionId: v.id("testSessions"),
  },
  handler: async (ctx, args): Promise<string | undefined> => {
    const testSession = await ctx.db.get(args.testSessionId);

    if (!testSession) return undefined;
    return testSession.remoteSessionId;
  },
});

// Fetch a session by sessionId
export const getBySessionId = query({
  args: {
    sessionId: v.id("testSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .get(args.sessionId);
    return session ?? null;
  },
});

// Update test session progress
export const updateProgress = mutation({
  args: {
    testSessionId: v.id("testSessions"),
    completed: v.optional(v.number()),
    passed: v.optional(v.number()),
    failed: v.optional(v.number()),
    skipped: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const testSession = await ctx.db.get(args.testSessionId);
    if (!testSession) throw new Error("Test session not found");

    const updates: any = {
      results: {
        ...testSession.results,
        ...(args.completed !== undefined && { completed: args.completed }),
        ...(args.passed !== undefined && { passed: args.passed }),
        ...(args.failed !== undefined && { failed: args.failed }),
        ...(args.skipped !== undefined && { skipped: args.skipped }),
      }
    };

    await ctx.db.patch(args.testSessionId, updates);
  },
});

// Cancel a run
export const cancelRun = mutation({
  args: { testSessionId: v.id("testSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testSessionId, {
      status: "cancelled",
      completedAt: Date.now(),
    });
  },
});

// Get latest runs for a website
export const getWebsiteRuns = query({
  args: {
    websiteUrl: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("testSessions")
      .withIndex("by_website", (q) => q.eq("websiteUrl", args.websiteUrl))
      .order("desc")
      .take(limit);
  },
});

export const addMessageToTestSession = mutation({
  args: { testSessionId: v.id("testSessions"), message: v.string() },
  handler: async (ctx, args) => {
    const testSession = await ctx.db.get(args.testSessionId);
    if (!testSession) throw new Error("Test session not found");

    await ctx.db.patch(args.testSessionId, { messages: [...(testSession.messages || []), args.message] });
    return args.testSessionId;
  },
});

// Mark a test session as completed
export const completeTestSession = mutation({
  args: { testSessionId: v.id("testSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testSessionId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

// Mark a test session as failed
export const failTestSession = mutation({
  args: { testSessionId: v.id("testSessions"), errorMessage: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testSessionId, {
      status: "failed",
      completedAt: Date.now(),
    });
    if (args.errorMessage) {
      const session = await ctx.db.get(args.testSessionId);
      const messages = (session?.messages || []);
      await ctx.db.patch(args.testSessionId, { messages: [...messages, `Error: ${args.errorMessage}`] });
    }
  },
});