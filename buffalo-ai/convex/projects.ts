import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update a website
export const upsertProject = mutation({
  args: {
    url: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing website
      await ctx.db.patch(existing._id, {
        name: args.name || existing.name,
        description: args.description || existing.description,
      });
      return existing._id;
    } else {
      // Create new website
      const projectId = await ctx.db.insert("projects", {
        url: args.url,
        name: args.name || new URL(args.url).hostname,
        description: args.description,
      });
      return projectId;
    }
  },
});

// Get website by URL
export const getByUrl = query({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
  },
});

// Get website by ID
export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List all projects
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("projects")
      .withIndex("by_url")
      .order("desc")
      .take(limit);
  },
});

// Update project details (name, description)
export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Validate project exists
    const project = await ctx.db.get(id);
    if (!project) {
      throw new Error("Project not found");
    }

    // Update the project
    await ctx.db.patch(id, updates);

    return id;
  },
});

// Get website with latest test session
export const getWithLatestTestSession = query({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const website = await ctx.db
      .query("projects")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    if (!website) return null;

    const latestTestSession = await ctx.db
      .query("testSessions")
      .withIndex("by_website", (q) => q.eq("websiteUrl", website.url))
      .order("desc")
      .first();

    return {
      website,
      latestTestSession,
    };
  },
});

// Delete a website and all its data
export const deleteWebsite = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    // Delete all test sessions for this website
    const testSessions = await ctx.db
      .query("testSessions")
      .withIndex("by_website", (q) => q.eq("websiteUrl", args.id))
      .collect();

    for (const testSession of testSessions) {
      await ctx.db.delete(testSession._id);
    }

    // Delete all website-specific tests
    const tests = await ctx.db
      .query("customTests")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const test of tests) {
      await ctx.db.delete(test._id);
    }

    // Delete all test executions by testSessionIds
    for (const testSession of testSessions) {
      const testExecutions = await ctx.db
        .query("testExecutions")
        .withIndex("by_testSession", (q) => q.eq("testSessionId", testSession._id))
        .collect();

      for (const testExecution of testExecutions) {
        await ctx.db.delete(testExecution._id);
      }
    }

    // Finally, delete the website
    await ctx.db.delete(args.id);
  },
});

export const addSensitiveInfo = mutation({
  args: { id: v.id("projects"), sensitiveInfo: v.record(v.string(), v.string()) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) {
      throw new Error("Project not found");
    }
    const key = project.url;
    await ctx.db.patch(args.id, { sensitiveInfo: {
      [key]: args.sensitiveInfo
    } });
  },
});

export const getSensitiveInfo = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) {
      throw new Error("Project not found");
    }
    return project.sensitiveInfo;
  },
});

export const updateSensitiveInfo = mutation({
  args: { id: v.id("projects"), sensitiveInfo: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { sensitiveInfo: args.sensitiveInfo });
  },
});