import { useEffect, useState } from "react"

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

        const handleStateChange = () => {
            setConnectionState({})
        }

        session.onStateChange = handleStateChange

        session.connect()
        setCoralSession(session)

        return () => {
            session.close()
        }
    }, [sessionId, host, appId, privacyKey])


    const closeUserInputModal = () => {
        setActiveUserInputRequest(null)
    }

    return {
        coralSession,
        activeUserInputRequest,
        closeUserInputModal,
        isCoralConnected: coralSession?.connected ?? false,
    }
}
