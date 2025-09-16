import WebSocket from 'ws';
import EventEmitter from 'events';
import type {
  SessionConfig,
  CoralConfig,
  Agent,
  Thread,
  Message,
  AgentRequest,
  CoralMessage,
  AgentGraph
} from '../types.js';

export class CoralSessionManager extends EventEmitter {
  private sessions: Map<string, CoralSession>;
  private agentRequests: Map<string, AgentRequest>;

  constructor() {
    super();
    this.sessions = new Map();
    this.agentRequests = new Map();
  }

  async createSession(config: CoralConfig & { agentGraph: AgentGraph }): Promise<CoralSession> {
    // First, create the session via Coral API
    const response = await fetch(`http://${config.host}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentGraph: config.agentGraph,
        applicationId: config.appId,
        privacyKey: config.privacyKey
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create session');
    }

    const { sessionId } = await response.json();

    // Create session manager instance
    const sessionConfig: SessionConfig = {
      ...config,
      sessionId
    };

    const session = new CoralSession(sessionConfig);
    this.sessions.set(sessionId, session);

    // Forward session events
    session.on('message', (data) => {
      this.emit('sessionMessage', sessionId, data);
    });

    session.on('closed', () => {
      this.sessions.delete(sessionId);
      this.emit('sessionClosed', sessionId);
    });

    return session;
  }

  getSession(sessionId: string): CoralSession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): CoralSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isConnected());
  }

  createAgentRequest(sessionId: string, agentId: string, request: string): AgentRequest {
    const agentRequest: AgentRequest = {
      id: crypto.randomUUID(),
      sessionId,
      agentId,
      agentRequest: request,
      timestamp: new Date()
    };

    this.agentRequests.set(agentRequest.id, agentRequest);
    this.emit('agentRequest', agentRequest);

    return agentRequest;
  }

  getAgentRequest(requestId: string): AgentRequest | undefined {
    return this.agentRequests.get(requestId);
  }

  respondToAgent(requestId: string, response: string): AgentRequest {
    const request = this.agentRequests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.userQuestion = response;
    this.emit('userResponse', { id: requestId, value: response });

    return request;
  }

  completeAgentRequest(requestId: string, answer: string): void {
    const request = this.agentRequests.get(requestId);
    if (request) {
      request.agentAnswer = answer;
      this.emit('agentAnswer', { id: requestId, answer });
      // Keep request for a while in case UI needs to display it
      setTimeout(() => this.agentRequests.delete(requestId), 60000);
    }
  }

  closeAll(): void {
    for (const session of this.sessions.values()) {
      session.close();
    }
  }
}

export class CoralSession extends EventEmitter {
  private socket?: WebSocket;
  private connected: boolean = false;
  private readonly config: SessionConfig;
  private agents: Map<string, Agent> = new Map();
  private threads: Map<string, Thread> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private agentId?: string;

  constructor(config: SessionConfig) {
    super();
    this.config = config;
    this.connect();
  }

  private connect(): void {
    const { host, appId, privacyKey, sessionId } = this.config;
    const url = `ws://${host}/debug/${appId}/${privacyKey}/${sessionId}/?timeout=10000`;

    this.socket = new WebSocket(url);

    this.socket.on('open', () => {
      this.connected = true;
      console.log(`✅ Session ${this.config.sessionId} connected`);
      this.emit('connected');
    });

    this.socket.on('message', (data: WebSocket.RawData) => {
      try {
        const message: CoralMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.socket.on('error', (error: Error) => {
      console.error(`Session ${this.config.sessionId} error:`, error);
      this.emit('error', error);
    });

    this.socket.on('close', (code: number, reason: Buffer) => {
      this.connected = false;
      console.log(`Session ${this.config.sessionId} closed:`, reason?.toString());
      this.emit('closed', { code, reason: reason?.toString() });
    });
  }

  private handleMessage(data: CoralMessage): void {
    this.emit('message', data);

    switch (data.type) {
      case 'DebugAgentRegistered':
        this.agentId = data.id;
        break;

      case 'ThreadList':
        for (const thread of data.threads) {
          this.messages.set(thread.id, thread.messages || []);
          const { messages, ...threadWithoutMessages } = thread;
          this.threads.set(thread.id, {
            ...threadWithoutMessages,
            unread: 0
          });
        }
        break;

      case 'AgentList':
        for (const agent of data.agents) {
          this.agents.set(agent.id, agent);
        }
        break;

      case 'org.coralprotocol.coralserver.session.Event.AgentStateUpdated':
        const agent = this.agents.get(data.agentId);
        if (agent) {
          agent.state = data.state;
        }
        break;

      case 'org.coralprotocol.coralserver.session.Event.ThreadCreated':
        this.threads.set(data.id, {
          id: data.id,
          name: data.name,
          participants: data.participants,
          summary: data.summary,
          creatorId: data.creatorId,
          isClosed: data.isClosed,
          unread: 0
        });
        this.messages.set(data.id, data.messages || []);
        break;

      case 'org.coralprotocol.coralserver.session.Event.MessageSent':
        const threadMessages = this.messages.get(data.threadId);
        if (threadMessages) {
          threadMessages.push(data.message);
          const thread = this.threads.get(data.threadId);
          if (thread) {
            thread.unread = (thread.unread || 0) + 1;
          }
        }
        break;
    }
  }

  send(data: any): void {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  close(): void {
    if (this.socket) {
      this.socket.close();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSessionId(): string {
    return this.config.sessionId;
  }

  getState() {
    return {
      sessionId: this.config.sessionId,
      connected: this.connected,
      agentId: this.agentId,
      agents: Object.fromEntries(this.agents),
      threads: Object.fromEntries(this.threads),
      messages: Object.fromEntries(this.messages)
    };
  }
}