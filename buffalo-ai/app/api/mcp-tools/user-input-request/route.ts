import { getAuthToken } from "@/app/auth";
import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import dedent from "dedent";


export async function GET(req: NextRequest): Promise<Response> {
    try {
        // Fetch the session details, they are already in the search params
        const searchParams = req.nextUrl.searchParams;
        const testSessionId = searchParams.get("testSessionId");
        const websiteUrl = searchParams.get("websiteUrl");
        const email = searchParams.get("email");

        if (!testSessionId || !websiteUrl || !email) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const testSession = await fetchQuery(api.testSessions.getBySessionId, {
            sessionId: testSessionId as Id<"testSessions">
        });

        if (!testSession) {
            return NextResponse.json("Test session not found", { status: 404 });
        }

        const cred = testSession.credentials as Record<string, string> | undefined;
        const credentialText = cred
            ? `\nLogin credentials for authenticated areas (use only if needed):\n${Object.entries(cred)
                .map(([k, v]) => `- ${k}=${v}`)
                .join("\n")}`
            : "";

        const prompt = dedent`
            Please help me test the user's website at ${websiteUrl}.
            The user has asked you to test the website with the following modes: ${testSession.modes.join(", ")}.
            Send the user an email of the test report when done at ${email}.
            Here is the test session id which you will need to give to the Buffalo agent to save test results: ${testSessionId}
            Please also let the buffalo agent know the modes of the test session: ${testSession.modes.join(", ")}.
            ${credentialText}
        `;
        return NextResponse.json(prompt, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export const POST = GET;
