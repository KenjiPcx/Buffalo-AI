import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Create a new test session
export const createTestSession = mutation({
  args: {
    externalId: v.string(),
    websiteUrl: v.string(),
    uniquePageUrls: v.optional(v.array(v.string())),
    mode: v.union(v.literal("exploratory"), v.literal("user_flow"), v.literal("all")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the test session
    const testSessionId = await ctx.db.insert("testSessions", {
      externalId: args.externalId,
      websiteUrl: args.websiteUrl,
      uniquePageUrls: args.uniquePageUrls,
      mode: args.mode,
      status: "running",
      startedAt: now,
    });

    return testSessionId;
  },
});

// Fetch a session by externalId
export const getByExternalId = query({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("testSessions")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
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
    websiteId: v.id("websites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("testSessions")
      .withIndex("by_website", (q) => q.eq("websiteUrl", args.websiteId))
      .order("desc")
      .take(limit);
  },
});