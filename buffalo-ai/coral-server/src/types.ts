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
  tools?: Record<string, CustomTool>;
}

export interface CustomTool {
  toolSchema: {
    name: string;
    description: string;
    parameters: any;
  };
  transport: {
    type: string;
    url: string;
  };
}

export interface SessionConfig extends CoralConfig {
  sessionId: string;
  agentGraph: AgentGraph;
}

export interface Thread {
  id: string;
  name: string;
  participants: string[];
  summary?: string;
  creatorId: string;
  isClosed: boolean;
  unread?: number;
  messages?: Message[];
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
  timestamp: Date;
}

export interface UserInputRequest {
  message: string;
}

export interface UserInputResponse {
  response: string;
}

export interface CoralMessage {
  type: string;
  [key: string]: any;
}