import type { Server, Socket } from 'socket.io';
import type { CoralSessionManager } from './CoralSessionManager.js';
import type { AgentRequest } from '../types.js';

interface ClientToServerEvents {
  user_response: (data: { id: string; value: string }) => void;
  join_session: (sessionId: string) => void;
  leave_session: (sessionId: string) => void;
}

interface ServerToClientEvents {
  agent_request: (request: AgentRequest) => void;
  agent_answer: (data: { id: string; answer: string }) => void;
  session_update: (data: any) => void;
  error: (error: { message: string }) => void;
}

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  sessionManager: CoralSessionManager
): void {
  // User input namespace
  const userInputNamespace = io.of('/user-input');

  userInputNamespace.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('👤 User input client connected:', socket.id);

    // Join a specific session room
    socket.on('join_session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`Socket ${socket.id} joined session ${sessionId}`);
    });

    // Leave a session room
    socket.on('leave_session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      console.log(`Socket ${socket.id} left session ${sessionId}`);
    });

    // Handle user response to agent request
    socket.on('user_response', ({ id, value }) => {
      try {
        const request = sessionManager.respondToAgent(id, value);
        console.log(`📥 User response for request ${id}:`, value);

        // Broadcast to all clients in this session
        userInputNamespace.to(`session:${request.sessionId}`).emit('agent_answer', {
          id,
          answer: value
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('👤 User input client disconnected:', socket.id);
    });
  });

  // Listen for agent requests from the session manager
  sessionManager.on('agentRequest', (request: AgentRequest) => {
    console.log(`📤 Broadcasting agent request ${request.id} to session ${request.sessionId}`);
    userInputNamespace.to(`session:${request.sessionId}`).emit('agent_request', request);
  });

  // Listen for agent answers
  sessionManager.on('agentAnswer', ({ id, answer }: { id: string; answer: string }) => {
    const request = sessionManager.getAgentRequest(id);
    if (request) {
      console.log(`📤 Broadcasting agent answer for request ${id}`);
      userInputNamespace.to(`session:${request.sessionId}`).emit('agent_answer', { id, answer });
    }
  });

  // Main namespace for general session updates
  io.on('connection', (socket: Socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  // Forward session messages to connected clients
  sessionManager.on('sessionMessage', (sessionId: string, data: any) => {
    io.to(`session:${sessionId}`).emit('session_update', data);
  });
}