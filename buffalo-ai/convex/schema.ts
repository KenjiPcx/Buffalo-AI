import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Websites that can be tested
  websites: defineTable({
    url: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    lastTestedAt: v.optional(v.number()), // Unix timestamp
    lastTestSessionStatus: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("partial"))),
  })
    .index("by_url", ["url"]),

  // Test definitions - reusable test prompts/instructions
  tests: defineTable({
    name: v.string(),
    prompt: v.string(), // The actual test instruction/prompt for the agent
    type: v.union(
      v.literal("website-specific"), // Custom test for a specific website
      v.literal("checklist")          // Generic production readiness check
    ),
    websiteId: v.optional(v.id("websites")), // Only set for website-specific tests
    category: v.optional(v.string()), // e.g., "security", "performance", "seo", "accessibility"
  })
    .index("by_website", ["websiteId"])
    .index("by_type", ["type"])
    .index("by_category", ["category"]),

  // Test sessions - when we execute tests on a website
  testSessions: defineTable({
    websiteUrl: v.string(),
    uniquePageUrls: v.optional(v.array(v.string())),
    modes: v.array(
      v.union(
        v.literal("exploratory"),
        v.literal("user_flow"),
        v.literal("preprod_checklist"),
      ),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    email: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    results: v.optional(v.object({
      exploratory: v.optional(v.object({
        highSeverityIssues: v.number(),
        mediumSeverityIssues: v.number(),
        lowSeverityIssues: v.number(),
        reportUrl: v.string(),
      })),
      userFlow: v.optional(v.object({
        completed: v.number(),
        passed: v.number(),
        failed: v.number(),
        skipped: v.number(),
        reportUrl: v.string(),
      })),
    }))
  })
    .index("by_website", ["websiteUrl", "startedAt"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  // Test executions - results of running tests in a specific test session
  testExecutions: defineTable({
    testSessionId: v.id("testSessions"),
    name: v.string(),
    prompt: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    passed: v.optional(v.boolean()),
    message: v.optional(v.string()), // Result commentary from the agent
    errorMessage: v.optional(v.string()),
    screenshots: v.optional(v.array(v.string())), // URL or base64 of screenshot
    executionTime: v.optional(v.number()), // Time in milliseconds
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_testSession", ["testSessionId"])
    .index("by_status", ["status"]),
});