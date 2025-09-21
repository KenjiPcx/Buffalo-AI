import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all custom tasks for a project
export const getUserDefinedTestsByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customTests")
      .withIndex("by_project_and_type", (q) => q.eq("projectId", args.projectId).eq("type", "user-defined"))
      .collect();
  },
});

// Create a new custom task
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    prompt: v.string(),
    type: v.union(v.literal("user-defined"), v.literal("buffalo-defined")),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const taskId = await ctx.db.insert("customTests", {
      projectId: args.projectId,
      name: args.name,
      prompt: args.prompt,
      type: args.type || "user-defined",
      category: args.category,
      description: args.description,
      isActive: args.isActive,
    });

    return taskId;
  },
});

// Update a custom task
export const update = mutation({
  args: {
    id: v.id("customTests"),
    name: v.optional(v.string()),
    prompt: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const task = await ctx.db.get(id);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Delete a custom task
export const remove = mutation({
  args: { id: v.id("customTests") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Batch update multiple tasks (for saving all at once)
export const batchUpdate = mutation({
  args: {
    projectId: v.id("projects"),
    tasks: v.array(v.object({
      id: v.optional(v.id("customTests")),
      name: v.string(),
      prompt: v.string(),
      category: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    // Validate project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Get existing tasks for this project
    const existingTasks = await ctx.db
      .query("customTests")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const existingTaskIds = new Set(existingTasks.map(t => t._id));
    const newTaskIds = new Set(args.tasks.filter(t => t.id).map(t => t.id));

    // Delete tasks that are no longer in the list
    for (const existingTask of existingTasks) {
      if (!newTaskIds.has(existingTask._id)) {
        await ctx.db.delete(existingTask._id);
      }
    }

    // Update or create tasks
    const results = [];
    for (const task of args.tasks) {
      if (task.id && existingTaskIds.has(task.id)) {
        // Update existing task
        await ctx.db.patch(task.id, {
          name: task.name,
          prompt: task.prompt,
          category: task.category,
        });
        results.push(task.id);
      } else {
        // Create new task
        const newId = await ctx.db.insert("customTests", {
          projectId: args.projectId,
          name: task.name,
          prompt: task.prompt,
          type: "user-defined",
          category: task.category,
          description: task.description,
          isActive: task.isActive,
        });
        results.push(newId);
      }
    }

    return results;
  },
});

export const getBuffaloDefinedTests = query({
  args: {},
  handler: async (ctx, args) => {
    return await ctx.db.query("customTests").withIndex("by_type", (q) => q.eq("type", "buffalo-defined")).collect();
  },
});