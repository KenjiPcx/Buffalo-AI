/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as coralSession from "../coralSession.js";
import type * as customTests from "../customTests.js";
import type * as payments from "../payments.js";
import type * as projects from "../projects.js";
import type * as testExecutions from "../testExecutions.js";
import type * as testReports from "../testReports.js";
import type * as testSessions from "../testSessions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  coralSession: typeof coralSession;
  customTests: typeof customTests;
  payments: typeof payments;
  projects: typeof projects;
  testExecutions: typeof testExecutions;
  testReports: typeof testReports;
  testSessions: typeof testSessions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
