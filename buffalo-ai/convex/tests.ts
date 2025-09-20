import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create or update a test definition
export const upsertTest = mutation({
  args: {
    name: v.string(),
    prompt: v.string(),
    type: v.union(v.literal("website-specific"), v.literal("checklist")),
    websiteId: v.optional(v.id("websites")),
    category: v.optional(v.string()),
    order: v.optional(v.number()),
    ownerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const ownerId = args.ownerId ?? identity?.subject ?? undefined;

    // For website-specific tests, check if it already exists
    if (args.type === "website-specific" && args.websiteId) {
      const existing = await ctx.db
        .query("tests")
        .withIndex("by_owner_and_website", (q) => q.eq("ownerId", ownerId).eq("websiteId", args.websiteId))
        .filter((q) => q.eq(q.field("name"), args.name))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          prompt: args.prompt,
          category: args.category,
          ownerId,
        });
        return existing._id;
      }
    }

    // Create new test
    const testId = await ctx.db.insert("tests", {
      name: args.name,
      prompt: args.prompt,
      type: args.type,
      websiteId: args.websiteId,
      category: args.category,
      ownerId,
    });

    return testId;
  },
});

// Get all tests for a website (both specific and checklist)
export const getTestsForWebsiteUrl = query({
  args: { websiteUrl: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const ownerId = identity?.subject ?? undefined;
    const website = await ctx.db
      .query("websites")
      .withIndex("by_url", (q) => q.eq("url", args.websiteUrl))
      .first();

    let websiteTests: Doc<"tests">[] = [];
    if (website && ownerId) {
      // Get website-specific tests
      websiteTests = await ctx.db
        .query("tests")
        .withIndex("by_owner_and_website", (q) => q.eq("ownerId", ownerId).eq("websiteId", website._id))
        .collect();
    }

    // Get checklist tests
    const checklistTests = await ctx.db
      .query("tests")
      .withIndex("by_type", (q) => q.eq("type", "checklist"))
      .collect();

    return {
      websiteSpecific: websiteTests,
      checklist: checklistTests,
      total: websiteTests.length + checklistTests.length,
    };
  },
});
export const deleteTest = mutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const ownerId = identity?.subject ?? undefined;
    const test = await ctx.db.get(args.testId);
    if (!test) throw new Error("Test not found");
    if (test.ownerId && ownerId && test.ownerId !== ownerId) throw new Error("Not authorized");
    await ctx.db.delete(args.testId);
    return null;
  },
});

// Get default checklist tests
export const getChecklistTests = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("tests")
      .withIndex("by_type", (q) => q.eq("type", "checklist"))
      .collect();
  },
});

// Initialize default checklist tests (call this once to seed the database)
export const initializeChecklist = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    const checklistItems = [
      { name: "SSL Certificate", prompt: "Check if the website has a valid SSL certificate and is served over HTTPS", category: "security", order: 1 },
      { name: "Mobile Responsiveness", prompt: "Test if the website is properly responsive on mobile devices", category: "accessibility", order: 2 },
      { name: "Page Load Speed", prompt: "Measure the page load time and check if it's under 3 seconds", category: "performance", order: 3 },
      { name: "404 Error Handling", prompt: "Navigate to a non-existent page and verify proper 404 error handling", category: "reliability", order: 4 },
      { name: "Form Validation", prompt: "Test all forms on the site for proper validation and error messages", category: "functionality", order: 5 },
      { name: "SEO Meta Tags", prompt: "Check if the page has proper title, description, and other SEO meta tags", category: "seo", order: 6 },
      { name: "Cookie Consent", prompt: "Verify that cookie consent banner appears and functions correctly", category: "legal", order: 7 },
      { name: "Contact Information", prompt: "Check if contact information is easily accessible", category: "usability", order: 8 },
      { name: "Social Media Links", prompt: "Verify all social media links work and open in new tabs", category: "functionality", order: 9 },
      { name: "Browser Compatibility", prompt: "Test basic functionality across Chrome, Firefox, and Safari", category: "compatibility", order: 10 },
    ];

    for (const item of checklistItems) {
      // Check if already exists
      const existing = await ctx.db
        .query("tests")
        .withIndex("by_type", (q) => q.eq("type", "checklist"))
        .filter((q) => q.eq(q.field("name"), item.name))
        .first();

      if (!existing) {
        await ctx.db.insert("tests", {
          name: item.name,
          prompt: item.prompt,
          type: "checklist",
          category: item.category,
        });
      }
    }

    return { success: true, message: "Checklist initialized" };
  },
});