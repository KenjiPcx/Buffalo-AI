export type RequestUserInputArgs = {
    baseUrl: string
    sessionId: string
    agentId: string
    message: string
}

export async function requestUserInput({ baseUrl, sessionId, agentId, message }: RequestUserInputArgs): Promise<string> {
    const url = `${baseUrl}/api/mcp-tools/user-input-request/${encodeURIComponent(sessionId)}/${encodeURIComponent(agentId)}`
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`user-input-request failed: ${res.status} ${res.statusText} ${text}`)
    }
    return await res.text()
}

export type RespondUserInputArgs = {
    baseUrl: string
    sessionId: string
    agentId: string
    response: string
}

export async function respondUserInput({ baseUrl, sessionId, agentId, response }: RespondUserInputArgs): Promise<string> {
    const url = `${baseUrl}/api/mcp-tools/user-input-respond/${encodeURIComponent(sessionId)}/${encodeURIComponent(agentId)}`
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`user-input-respond failed: ${res.status} ${res.statusText} ${text}`)
    }
    return await res.text()
}


