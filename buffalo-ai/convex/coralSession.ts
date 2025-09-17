import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type CreateCoralSessionBody = {
    privacyKey: string;
    applicationId: string;
    agentGraph: {
        agents: Record<
            string,
            {
                options: Record<string, string>;
                type: string;
                agentType: string;
                tools: Array<string>;
            }
        >;
        links: Array<Array<string>>;
        tools: Record<
            string,
            {
                transport: {
                    type: string;
                    url: string;
                };
                toolSchema: {
                    name: string;
                    description: string;
                    inputSchema: {
                        type: string;
                        properties: Record<
                            string,
                            {
                                type: string;
                                description?: string;
                            }
                        >;
                        required?: Array<string>;
                    };
                };
            }
        >;
    };
};

// Create a new coral session
// export const createCoralSession = action({
//     args: {
//         modes: v.array(
//             v.union(v.literal("exploratory"), v.literal("user_flow"), v.literal("preprod_checklist"))
//         ),
//         websiteUrl: v.string(),
//         email: v.string(),
//     },
//     handler: async (ctx, { modes, websiteUrl, email }) => {
//         const testSessionId = await ctx.runMutation(api.testSessions.createTestSession, {
//             websiteUrl: websiteUrl,
//             modes: modes,
//             email: email,
//         });

//         const prodBaseUrl = process.env.CONVEX_SITE;
//         if (!prodBaseUrl) {
//             throw new Error("Missing CONVEX_SITE. Provide via env.");
//         }

//         // Coral Application
//         const baseUrlEnv = process.env.CORAL_BASE_URL;
//         if (!baseUrlEnv) {
//             throw new Error("Missing CORAL_BASE_URL. Provide via env.");
//         }
//         const baseUrl = baseUrlEnv.endsWith("/") ? baseUrlEnv.slice(0, -1) : baseUrlEnv;
//         const privacyKey = process.env.CORAL_PRIVACY_KEY;
//         const applicationId = process.env.CORAL_APPLICATION_ID;
//         if (!privacyKey || !applicationId) {
//             throw new Error("Missing CORAL_PRIVACY_KEY or CORAL_APPLICATION_ID. Provide via env.");
//         }
//         if (!privacyKey || !applicationId) {
//             throw new Error("Missing CORAL_PRIVACY_KEY or CORAL_APPLICATION_ID. Provide via env.");
//         }

//         // Agent Options
//         const MODEL_NAME = process.env.MODEL_NAME;
//         if (!MODEL_NAME) {
//             throw new Error("Missing MODEL_NAME. Provide via env.");
//         }
//         const MODEL_API_KEY = process.env.MODEL_API_KEY;
//         if (!MODEL_API_KEY) {
//             throw new Error("Missing MODEL_API_KEY. Provide via env.");
//         }
//         const BROWSER_USE_MODEL_API_KEY = process.env.BROWSER_USE_MODEL_API_KEY;
//         if (!BROWSER_USE_MODEL_API_KEY) {
//             throw new Error("Missing BROWSER_USE_MODEL_API_KEY. Provide via env.");
//         }
//         const BROWSER_USE_MODEL_NAME = process.env.BROWSER_USE_MODEL_NAME;
//         if (!BROWSER_USE_MODEL_NAME) {
//             throw new Error("Missing BROWSER_USE_MODEL_NAME. Provide via env.");
//         }
//         const GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
//         if (!GITHUB_PERSONAL_ACCESS_TOKEN) {
//             throw new Error("Missing GITHUB_PERSONAL_ACCESS_TOKEN. Provide via env.");
//         }
//         const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
//         if (!FIRECRAWL_API_KEY) {
//             throw new Error("Missing FIRECRAWL_API_KEY. Provide via env.");
//         }

//         const payload: CreateCoralSessionBody = {
//             privacyKey,
//             applicationId,
//             agentGraph: {
//                 "agents": {
//                     "interface": {
//                         "options": {
//                             "MODEL_API_KEY": MODEL_API_KEY
//                         },
//                         "type": "local",
//                         "agentType": "interface",
//                         "tools": [
//                             "user-input-respond",
//                             "user-input-request"
//                         ]
//                     },
//                     "github": {
//                         "options": {
//                             "MODEL_API_KEY": MODEL_API_KEY,
//                             "GITHUB_PERSONAL_ACCESS_TOKEN": GITHUB_PERSONAL_ACCESS_TOKEN
//                         },
//                         "type": "local",
//                         "agentType": "github",
//                         "tools": []
//                     },
//                     "firecrawl": {
//                         "options": {
//                             "MODEL_API_KEY": MODEL_API_KEY,
//                             "FIRECRAWL_API_KEY": FIRECRAWL_API_KEY
//                         },
//                         "type": "local",
//                         "agentType": "firecrawl",
//                         "tools": []
//                     },
//                     "buffalo": {
//                         "options": {
//                             "BROWSER_USE_MODEL_API_KEY": BROWSER_USE_MODEL_API_KEY,
//                             "BROWSER_USE_MODEL_NAME": BROWSER_USE_MODEL_NAME,
//                             "MODEL_API_KEY": MODEL_API_KEY
//                         },
//                         "type": "local",
//                         "agentType": "buffalo",
//                         "tools": []
//                     }
//                 },
//                 "links": [
//                     [
//                         "firecrawl",
//                         "github",
//                         "interface",
//                         "buffalo"
//                     ]
//                 ],
//                 "tools": {
//                     "user-input-respond": {
//                         "transport": {
//                             "type": "http",
//                             "url": `${prodBaseUrl}/api/mcp-tools/user-input-respond?testSessionId=${testSessionId}&websiteUrl=${websiteUrl}&email=${email}`
//                         },
//                         "toolSchema": {
//                             "name": "answer-question",
//                             "description": "Answer the last question you requested from the user. You can only respond once, and will have to request more input later.",
//                             "inputSchema": {
//                                 "type": "object",
//                                 "properties": {
//                                     "response": {
//                                         "type": "string",
//                                         "description": "Answer to show to the user."
//                                     }
//                                 },
//                                 "required": [
//                                     "response"
//                                 ]
//                             }
//                         }
//                     },
//                     "user-input-request": {
//                         "transport": {
//                             "type": "http",
//                             "url": `${prodBaseUrl}/api/mcp-tools/user-input-request?testSessionId=${testSessionId}&websiteUrl=${websiteUrl}&email=${email}`
//                         },
//                         "toolSchema": {
//                             "name": "request-question",
//                             "description": "Request a question from the user. Hangs until input is received.",
//                             "inputSchema": {
//                                 "type": "object",
//                                 "properties": {
//                                     "message": {
//                                         "type": "string",
//                                         "description": "Message to show to the user."
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         };

//         const response = await fetch(`${baseUrl}/sessions/`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify(payload),
//         });

//         return await response.json();
//     },
// });