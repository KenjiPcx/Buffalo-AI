import { components } from "@/lib/coral/api";

type CreateSessionPayload = components["schemas"]["SessionRequest"];

type CoralSessionRequest = {
    testSessionId: string;
    websiteUrl: string;
    email: string;
}

export async function POST(req: Request): Promise<Response> {
    try {
        const incoming: CoralSessionRequest = await req.json();

        const prodBaseUrl = process.env.PROD_BASE_URL;
        if (!prodBaseUrl) {
            throw new Error("Missing PROD_BASE_URL. Provide via env.");
        }
        const prodBaseWithScheme = /^(https?:)?\/\//.test(prodBaseUrl) ? prodBaseUrl : `http://${prodBaseUrl}`;
        const prodBase = prodBaseWithScheme.endsWith("/") ? prodBaseWithScheme.slice(0, -1) : prodBaseWithScheme;
        console.log("prodBase", prodBase);
        
        // Coral Application
        const baseUrlEnv = process.env.CORAL_BASE_URL;
        if (!baseUrlEnv) {
            throw new Error("Missing CORAL_BASE_URL. Provide via env.");
        }
        const baseUrlWithScheme = /^(https?:)?\/\//.test(baseUrlEnv) ? baseUrlEnv : `http://${baseUrlEnv}`;
        const baseUrl = baseUrlWithScheme.endsWith("/") ? baseUrlWithScheme.slice(0, -1) : baseUrlWithScheme;
        console.log("baseUrl", baseUrl);

        // Construct URLs used below and log them for debugging
        const respondUrl = `${prodBase}/api/mcp-tools/user-input-respond?testSessionId=${incoming.testSessionId}&websiteUrl=${incoming.websiteUrl}&email=${incoming.email}`;
        const requestUrl = `${prodBase}/api/mcp-tools/user-input-request?testSessionId=${incoming.testSessionId}&websiteUrl=${incoming.websiteUrl}&email=${incoming.email}`;
        const sessionUrl = `${baseUrl}/api/v1/sessions`;
        console.log("respondUrl", respondUrl);
        console.log("requestUrl", requestUrl);
        console.log("sessionUrl", sessionUrl);
        const privacyKey = process.env.CORAL_PRIVACY_KEY;
        const applicationId = process.env.CORAL_APPLICATION_ID;
        if (!privacyKey || !applicationId) {
            throw new Error("Missing CORAL_PRIVACY_KEY or CORAL_APPLICATION_ID. Provide via env.");
        }
        if (!privacyKey || !applicationId) {
            throw new Error("Missing CORAL_PRIVACY_KEY or CORAL_APPLICATION_ID. Provide via env.");
        }

        // Agent Options
        const MODEL_NAME = process.env.MODEL_NAME;
        if (!MODEL_NAME) {
            throw new Error("Missing MODEL_NAME. Provide via env.");
        }
        const MODEL_API_KEY = process.env.MODEL_API_KEY;
        if (!MODEL_API_KEY) {
            throw new Error("Missing MODEL_API_KEY. Provide via env.");
        }
        const BROWSER_USE_MODEL_API_KEY = process.env.BROWSER_USE_MODEL_API_KEY;
        if (!BROWSER_USE_MODEL_API_KEY) {
            throw new Error("Missing BROWSER_USE_MODEL_API_KEY. Provide via env.");
        }
        const BROWSER_USE_MODEL_NAME = process.env.BROWSER_USE_MODEL_NAME;
        if (!BROWSER_USE_MODEL_NAME) {
            throw new Error("Missing BROWSER_USE_MODEL_NAME. Provide via env.");
        }
        const GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        if (!GITHUB_PERSONAL_ACCESS_TOKEN) {
            throw new Error("Missing GITHUB_PERSONAL_ACCESS_TOKEN. Provide via env.");
        }
        const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
        if (!FIRECRAWL_API_KEY) {
            throw new Error("Missing FIRECRAWL_API_KEY. Provide via env.");
        }

        const customTools: Record<string, components["schemas"]["CustomTool"]> = {
            "user-input-respond": {
                "transport": {
                    "type": "http",
                    "url": respondUrl
                },
                "toolSchema": {
                    "name": "answer-question",
                    "description": "Answer the last question you requested from the user. You can only respond once, and will have to request more input later.",
                    "inputSchema": {
                        "type": "object",
                        "properties": { "response": {} },
                        "required": [
                            "response"
                        ]
                    }
                }
            },
            "user-input-request": {
                "transport": {
                    "type": "http",
                    "url": requestUrl
                },
                "toolSchema": {
                    "name": "request-question",
                    "description": "Request a question from the user. Hangs until input is received.",
                    "inputSchema": {
                        "type": "object",
                        "properties": { "message": {} }
                    }
                }
            }
        };

        const payload: CreateSessionPayload = {
            privacyKey,
            applicationId,
            agentGraphRequest: {
                "agents": [
                    {
                        id: { name: "interface", version: "0.0.1" },
                        name: "interface",
                        options: {
                            MODEL_API_KEY: { type: "string", value: MODEL_API_KEY }
                        },
                        provider: { type: "local", runtime: "executable" },
                        customToolAccess: [
                            "user-input-respond",
                            "user-input-request"
                        ],
                        coralPlugins: [],
                    },
                    {
                        id: { name: "github", version: "0.0.1" },
                        name: "github",
                        options: {
                            MODEL_API_KEY: { type: "string", value: MODEL_API_KEY },
                            GITHUB_PERSONAL_ACCESS_TOKEN: { type: "string", value: GITHUB_PERSONAL_ACCESS_TOKEN }
                        },
                        provider: { type: "local", runtime: "executable" },
                        customToolAccess: [],
                        coralPlugins: [],
                    },
                    {
                        id: { name: "firecrawl", version: "0.0.1" },
                        name: "firecrawl",
                        options: {
                            MODEL_API_KEY: { type: "string", value: MODEL_API_KEY },
                            FIRECRAWL_API_KEY: { type: "string", value: FIRECRAWL_API_KEY }
                        },
                        provider: { type: "local", runtime: "executable" },
                        customToolAccess: [],
                        coralPlugins: [],
                    },
                    {
                        id: { name: "buffalo", version: "0.0.1" },
                        name: "buffalo",
                        options: {
                            BROWSER_USE_MODEL_API_KEY: { type: "string", value: BROWSER_USE_MODEL_API_KEY },
                            BROWSER_USE_MODEL_NAME: { type: "string", value: BROWSER_USE_MODEL_NAME },
                            MODEL_API_KEY: { type: "string", value: MODEL_API_KEY }
                        },
                        provider: { type: "local", runtime: "executable" },
                        customToolAccess: [],
                        coralPlugins: [],
                    }
                ],
                "groups": [
                    [
                        "firecrawl",
                        "github",
                        "interface",
                        "buffalo"
                    ]
                ],
                "customTools": customTools
            }
        };

        // Log a concise summary of the payload to avoid huge logs
        console.log("agentSummary", payload.agentGraphRequest.agents.map(a => ({ name: a.name, id: a.id, provider: a.provider })));
        console.log("groups", payload.agentGraphRequest.groups);
        console.log("customToolKeys", Object.keys(payload.agentGraphRequest.customTools));

        let upstreamResponse: Response;
        try {
            upstreamResponse = await fetch(sessionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            });
        } catch (networkError) {
            console.error("Network error when calling Coral sessions endpoint:", networkError);
            throw networkError;
        }

        const contentType = upstreamResponse.headers.get("content-type") || "application/json";
        const responseText = await upstreamResponse.text();
        console.log("upstreamResponse", {
            status: upstreamResponse.status,
            ok: upstreamResponse.ok,
            contentType,
            bodyPreview: responseText.slice(0, 500),
        });

        if (!upstreamResponse.ok) {
            return new Response(JSON.stringify({ error: "Upstream request failed", status: upstreamResponse.status, body: responseText }), {
                status: 502,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(responseText, {
            status: upstreamResponse.status,
            headers: {
                "Content-Type": contentType,
            },
        });
    } catch (error) {
        console.error("Proxy error in create-coral-session POST:", error);
        return new Response(JSON.stringify({ error: "Upstream request failed" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }
}


