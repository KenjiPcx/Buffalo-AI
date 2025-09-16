"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  CoralConfig,
  CoralSession,
  AgentRequest,
  AgentGraph
} from './types';

const CORAL_SERVER_URL = process.env.NEXT_PUBLIC_CORAL_SERVER_URL || 'http://localhost:4000';

export interface UseCoralSessionOptions {
  autoConnect?: boolean;
  onAgentRequest?: (request: AgentRequest) => void;
  onAgentAnswer?: (data: { id: string; answer: string }) => void;
  onSessionUpdate?: (data: any) => void;
}

export function useCoralSession(options: UseCoralSessionOptions = {}) {
  const [session, setSession] = useState<CoralSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentRequests, setAgentRequests] = useState<AgentRequest[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const userInputSocketRef = useRef<Socket | null>(null);

  // Create a new Coral session
  const createSession = useCallback(async (
    config: CoralConfig & { agentGraph: AgentGraph }
  ): Promise<string> => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${CORAL_SERVER_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create session');
      }

      const { sessionId } = await response.json();

      // Connect to Socket.IO for this session
      await connectToSession(sessionId);

      return sessionId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Connect to an existing session via Socket.IO
  const connectToSession = useCallback(async (sessionId: string) => {
    // Disconnect existing sockets if any
    disconnectSockets();

    // Main socket for session updates
    socketRef.current = io(CORAL_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // User input socket for agent interactions
    userInputSocketRef.current = io(`${CORAL_SERVER_URL}/user-input`, {
      transports: ['websocket'],
      reconnection: true
    });

    // Join the session room
    userInputSocketRef.current.emit('join_session', sessionId);

    // Set up event listeners
    userInputSocketRef.current.on('agent_request', (request: AgentRequest) => {
      console.log('📥 Agent request received:', request);
      setAgentRequests(prev => [...prev, request]);
      options.onAgentRequest?.(request);
    });

    userInputSocketRef.current.on('agent_answer', (data: { id: string; answer: string }) => {
      console.log('📥 Agent answer received:', data);
      setAgentRequests(prev =>
        prev.map(req =>
          req.id === data.id ? { ...req, agentAnswer: data.answer } : req
        )
      );
      options.onAgentAnswer?.(data);
    });

    socketRef.current.on('session_update', (data: any) => {
      console.log('📥 Session update:', data);
      options.onSessionUpdate?.(data);
    });

    // Fetch initial session state
    const stateResponse = await fetch(`${CORAL_SERVER_URL}/api/sessions/${sessionId}`);
    if (stateResponse.ok) {
      const sessionState = await stateResponse.json();
      setSession(sessionState);
    }
  }, [options]);

  // Respond to an agent request
  const respondToAgent = useCallback((requestId: string, response: string) => {
    if (!userInputSocketRef.current) {
      console.error('Socket not connected');
      return;
    }

    userInputSocketRef.current.emit('user_response', {
      id: requestId,
      value: response
    });

    // Update local state
    setAgentRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, userQuestion: response } : req
      )
    );
  }, []);

  // Disconnect all sockets
  const disconnectSockets = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (userInputSocketRef.current) {
      userInputSocketRef.current.disconnect();
      userInputSocketRef.current = null;
    }
  }, []);

  // Close the session
  const closeSession = useCallback(async () => {
    if (session?.sessionId) {
      await fetch(`${CORAL_SERVER_URL}/api/sessions/${session.sessionId}`, {
        method: 'DELETE'
      });
    }
    disconnectSockets();
    setSession(null);
    setAgentRequests([]);
  }, [session, disconnectSockets]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectSockets();
    };
  }, [disconnectSockets]);

  return {
    session,
    isConnecting,
    error,
    agentRequests,
    createSession,
    connectToSession,
    respondToAgent,
    closeSession
  };
}