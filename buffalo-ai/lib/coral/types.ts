export interface CoralConfig {
  host: string;
  appId: string;
  privacyKey: string;
}

export interface Agent {
  id?: string;
  type: 'local' | 'remote';
  blocking: boolean;
  agentType: string;
  options: Record<string, any>;
  tools?: string[];
  systemPrompt?: string;
  state?: string;
}

export interface AgentGraph {
  agents: Record<string, Agent>;
  links?: string[][];
  tools?: Record<string, any>;
}

export interface CoralSession {
  sessionId: string;
  connected: boolean;
  agentId?: string;
  agents: Record<string, Agent>;
  threads: Record<string, Thread>;
  messages: Record<string, Message[]>;
}

export interface Thread {
  id: string;
  name: string;
  participants: string[];
  summary?: string;
  creatorId: string;
  isClosed: boolean;
  unread?: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: string;
  type?: string;
}

export interface AgentRequest {
  id: string;
  sessionId: string;
  agentId: string;
  agentRequest: string;
  userQuestion?: string;
  agentAnswer?: string;
}