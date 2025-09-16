import { NextRequest } from 'next/server'
function getIO() {
    return (globalThis as any).io as any
}

type Question = {
    id: string
    sessionId: string
    agentId: string
    agentRequest: string
    userQuestion?: string
    agentAnswer?: string
}

const questions: Record<string, Question> = {}

function key(sessionId: string, agentId: string) {
    return `${sessionId}-${agentId}`
}

export async function POST(req: NextRequest, { params }: { params: { tool: string, sessionId: string, agentId: string } }) {
    const { tool, sessionId, agentId } = params
    const io = getIO()
    if (!io) return new Response('Socket server not initialized', { status: 500 })

    const body = await req.json().catch(() => ({})) as any

    if (tool === 'user-input-request') {
        const id = crypto.randomUUID()
        const q: Question = {
            id,
            sessionId,
            agentId,
            agentRequest: body?.message as string,
        }
        questions[key(sessionId, agentId)] = q
        io.of('/user-input').emit('agent_request', q)

        return await new Promise<Response>((resolve) => {
            const onResponse = ({ id: resId, value }: { id: string, value: string }) => {
                const current = questions[key(sessionId, agentId)]
                if (!current) return
                current.userQuestion = value
                if (resId !== id) return
                io.of('/user-input').off('user_response', onResponse)
                resolve(new Response(value))
            }
            io.of('/user-input').on('user_response', onResponse)
            setTimeout(() => {
                io.of('/user-input').off('user_response', onResponse)
                resolve(new Response('timeout waiting for user_response', { status: 504 }))
            }, 5 * 60 * 1000)
        })
    }

    if (tool === 'user-input-respond') {
        const q = questions[key(sessionId, agentId)]
        if (!q) return new Response('No prior question for this agent', { status: 404 })
        q.agentAnswer = body?.response as string
        io.of('/user-input').emit('agent_answer', { id: q.id, answer: q.agentAnswer })
        return new Response(q.agentAnswer)
    }

    return new Response(`Tool '${tool}' not found`, { status: 404 })
}


