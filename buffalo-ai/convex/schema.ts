import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Websites that can be tested
  projects: defineTable({
    url: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    lastTestedAt: v.optional(v.number()), // Unix timestamp
    lastTestSessionStatus: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("partial"))),
    sensitiveInfo: v.optional(v.any()),
  })
    .index("by_url", ["url"]),

  // Test definitions - reusable test prompts/instructions
  customTests: defineTable({
    name: v.string(),
    prompt: v.string(), // The actual test instruction/prompt for the agent
    type: v.union(
      v.literal("user-defined"), // Custom test for a specific website
      v.literal("buffalo-defined")          // Generic production readiness check
    ),
    projectId: v.optional(v.id("projects")), // Only set for project-specific tests
    category: v.optional(v.string()), // e.g., "security", "performance", "seo", "accessibility", "custom"
    description: v.optional(v.string()), // Brief description of what this test checks
    isActive: v.optional(v.boolean()), // Whether the test is active/enabled
  })
    .index("by_project", ["projectId"])
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_project_and_type", ["projectId", "type"]),

  // Test sessions - when we execute tests on a website
  testSessions: defineTable({
    websiteUrl: v.string(),
    uniquePageUrls: v.optional(v.array(v.string())),
    modes: v.array(
      v.union(
        v.literal("exploratory"),
        v.literal("user-defined"),
        v.literal("buffalo-defined"),
      ),
    ),
    messages: v.optional(v.array(v.string())),
    // Optional app credentials for testing authenticated areas
    // Stored as a record of key -> value (env-style)
    credentials: v.optional(v.record(v.string(), v.string())),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    email: v.string(),
    remoteSessionId: v.optional(v.string()),
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
    websiteUrl: v.optional(v.string()),
    type: v.optional(v.union(v.literal("exploratory"), v.literal("user-defined"), v.literal("buffalo-defined"))),
    passed: v.optional(v.boolean()),
    message: v.optional(v.string()), // Result commentary from the agent
    errorMessage: v.optional(v.union(v.string(), v.null())),
    screenshots: v.optional(v.array(v.string())), // URL of screenshot
    executionTime: v.optional(v.number()), // Time in milliseconds
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_testSession", ["testSessionId"])
    .index("by_status", ["status"]),

  testReports: defineTable({
    testSessionId: v.id("testSessions"),
    summary: v.string(),
    issues: v.array(
      v.object({
        severity: v.union(
          v.literal("High"),
          v.literal("Medium"),
          v.literal("Low"),
        ),
        risk: v.string(),
        details: v.string(),
        testExecutionId: v.id("testExecutions"),
        advice: v.string(),
      }),
    ),
  })
    .index("by_testSessionId", ["testSessionId"]),

});