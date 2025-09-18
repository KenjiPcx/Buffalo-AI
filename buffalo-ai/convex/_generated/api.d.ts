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
import type * as testExecutions from "../testExecutions.js";
import type * as testReports from "../testReports.js";
import type * as testSessions from "../testSessions.js";
import type * as tests from "../tests.js";
import type * as websites from "../websites.js";

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
  testExecutions: typeof testExecutions;
  testReports: typeof testReports;
  testSessions: typeof testSessions;
  tests: typeof tests;
  websites: typeof websites;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
