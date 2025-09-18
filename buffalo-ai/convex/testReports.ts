import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

const issueObject = v.object({
  severity: v.union(v.literal("High"), v.literal("Medium"), v.literal("Low")),
  risk: v.string(),
  details: v.string(),
  testExecutionId: v.id("testExecutions"),
  advice: v.string(),
});

export const createReport = mutation({
  args: {
    testSessionId: v.id("testSessions"),
    summary: v.string(),
    issues: v.array(issueObject),
  },
  handler: async (ctx, args) => {
    const existingReport = await ctx.db
      .query("testReports")
      .withIndex("by_testSessionId", (q) =>
        q.eq("testSessionId", args.testSessionId),
      )
      .unique();

    if (existingReport) {
      console.log(
        `Report for session ${args.testSessionId} already exists. Skipping creation.`,
      );
      return null;
    }

    await ctx.db.insert("testReports", {
      testSessionId: args.testSessionId,
      summary: args.summary,
      issues: args.issues,
    });
    return null;
  },
});

export const getReportBySessionId = query({
  args: { testSessionId: v.id("testSessions") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("testReports"),
      _creationTime: v.number(),
      testSessionId: v.id("testSessions"),
      summary: v.string(),
      issues: v.array(issueObject),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("testReports")
      .withIndex("by_testSessionId", (q) =>
        q.eq("testSessionId", args.testSessionId),
      )
      .unique();
  },
});
