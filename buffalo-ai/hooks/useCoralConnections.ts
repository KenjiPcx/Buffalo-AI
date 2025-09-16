import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

// Coral session connection similar to Svelte example
class CoralSession {
    private socket: WebSocket | null = null
    public connected = false
    public onStateChange?: () => void

    readonly host: string
    readonly appId: string
    readonly privKey: string
    readonly session: string

    public agentId: string | null = null
    public agents: { [id: string]: any } = {}
    public threads: { [id: string]: any } = {}
    public messages: { [thread: string]: any[] } = {}

    constructor({
        host,
        appId,
        privacyKey,
        session
    }: {
        host: string
        appId: string
        privacyKey: string
        session: string
    }) {
        this.host = host
        this.appId = appId
        this.privKey = privacyKey
        this.session = session
    }

    connect() {
        this.socket = new WebSocket(
            `ws://${this.host}/debug/${this.appId}/${this.privKey}/${this.session}/?timeout=10000`
        )

        this.socket.onopen = () => {
            console.log('Connected to Coral session')
            this.connected = true
            this.onStateChange?.()
        }

        this.socket.onerror = () => {
            console.error('Error connecting to Coral session')
            this.connected = false
            this.onStateChange?.()
            this.socket?.close()
        }

        this.socket.onclose = (e) => {
            if (this.connected) {
                console.info(`Coral session connection closed${e.reason ? ` - ${e.reason}` : '.'}`)
            }
            this.threads = {}
            this.agents = {}
            this.connected = false
            this.onStateChange?.()
        }

        this.socket.onmessage = (ev) => {
            let data = null
            try {
                data = JSON.parse(ev.data)
            } catch (e) {
                console.warn(`ws: '${ev.data}'`)
                return
            }

            switch (data.type ?? '') {
                case 'DebugAgentRegistered':
                    this.agentId = data.id
                    break
                case 'ThreadList':
                    for (const thread of data.threads) {
                        this.messages[thread.id] = thread.messages ?? []
                        this.threads[thread.id] = {
                            ...thread,
                            messages: undefined,
                            unread: 0
                        }
                    }
                    break
                case 'AgentList':
                    for (const agent of data.agents) {
                        this.agents[agent.id] = agent
                    }
                    break
                case 'org.coralprotocol.coralserver.session.Event.AgentStateUpdated':
                    if (this.agents[data.agentId]) {
                        this.agents[data.agentId].state = data.state
                    }
                    break
                case 'org.coralprotocol.coralserver.session.Event.ThreadCreated':
                    console.log('new thread')
                    this.threads[data.id] = {
                        id: data.id,
                        name: data.name,
                        participants: data.participants,
                        summary: data.summary,
                        creatorId: data.creatorId,
                        isClosed: data.isClosed,
                        unread: 0
                    }
                    this.messages[data.id] = data.messages ?? []
                    break
                case 'org.coralprotocol.coralserver.session.Event.MessageSent':
                    if (data.threadId in this.messages) {
                        console.log('message sent')
                        this.messages[data.threadId].push(data.message)
                        this.threads[data.threadId].unread += 1
                    } else {
                        console.warn('Thread not found', { data: data, messages: this.messages })
                    }
                    break
            }
            this.onStateChange?.()
        }
    }

    close() {
        this.socket?.close()
    }
}

// User Input Socket.IO connection similar to Svelte example
class UserInput {
    private sock: Socket
    public connected = false
    public onStateChange?: () => void
    public requests: {
        [id: string]: {
            id: string
            sessionId: string
            agentId: string
            agentRequest: string
            userQuestion?: string
            agentAnswer?: string
        }
    } = {}

    constructor() {
        // ensure Next socket server is initialized
        if (typeof window !== 'undefined') {
            // fire and forget to boot the server if not yet created
            fetch('/api/socketio').catch(() => { })
        }
        this.sock = io('/user-input', { path: '/api/socketio' })

        this.sock.on('connect', () => {
            console.log('user input connected')
            this.connected = true
            this.onStateChange?.()
        })

        this.sock.on('disconnect', () => {
            console.log('user input disconnected')
            this.connected = false
            this.onStateChange?.()
        })

        this.sock.onAny((event: string, ...args: any[]) => {
            console.log('user-input:', { event, args })
        })

        this.sock.on('agent_request', (req: any) => {
            console.log('agent_request', req)
            this.requests[req.id] = req
            this.onStateChange?.()
        })

        this.sock.on('agent_answer', (req: any) => {
            console.log('agent_answer', req)
            if (this.requests[req.id]) {
                this.requests[req.id].agentAnswer = req.answer
            }
            this.onStateChange?.()
        })
    }

    respond(id: string, value: string) {
        if (this.requests[id]) {
            this.requests[id].userQuestion = value
        }
        this.sock.emit('user_response', { id, value })
    }

    close() {
        this.sock.disconnect()
    }
}

interface CoralConnectionsConfig {
    host?: string
    appId?: string
    privacyKey?: string
    sessionId: string
}

interface UserInputRequest {
    id: string
    sessionId: string
    agentId: string
    agentRequest: string
    userQuestion?: string
    agentAnswer?: string
}

export function useCoralConnections({
    host = 'localhost:8080',
    appId = 'buffalo-ai',
    privacyKey = 'your-privacy-key',
    sessionId
}: CoralConnectionsConfig) {
    const [coralSession, setCoralSession] = useState<CoralSession | null>(null)
    const [userInput, setUserInput] = useState<UserInput | null>(null)
    const [activeUserInputRequest, setActiveUserInputRequest] = useState<UserInputRequest | null>(null)
    const [connectionState, setConnectionState] = useState({})

    useEffect(() => {
        // Initialize Coral session connection
        const session = new CoralSession({
            host,
            appId,
            privacyKey,
            session: sessionId
        })

        // Initialize UserInput Socket.IO connection
        const userInputConnection = new UserInput()

        const handleStateChange = () => {
            setConnectionState({})

            // Check for new user input requests from UserInput connection
            const requests = Object.values(userInputConnection.requests)
            const activeRequest = requests.find((req: any) => !req.userQuestion && !req.agentAnswer)
            if (activeRequest && activeRequest !== activeUserInputRequest) {
                setActiveUserInputRequest(activeRequest)
            }
        }

        session.onStateChange = handleStateChange
        userInputConnection.onStateChange = handleStateChange

        session.connect()
        setCoralSession(session)
        setUserInput(userInputConnection)

        return () => {
            session.close()
            userInputConnection.close()
        }
    }, [sessionId, host, appId, privacyKey])

    const handleUserInput = (requestId: string, value: string) => {
        userInput?.respond(requestId, value)
        setActiveUserInputRequest(null)
    }

    const closeUserInputModal = () => {
        setActiveUserInputRequest(null)
    }

    return {
        coralSession,
        userInput,
        activeUserInputRequest,
        handleUserInput,
        closeUserInputModal,
        isCoralConnected: coralSession?.connected ?? false,
        isUserInputConnected: userInput?.connected ?? false,
        agentId: coralSession?.agentId ?? null,
    }
}
