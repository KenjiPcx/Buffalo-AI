import type { Express, Request, Response } from 'express';
import type { Server } from 'socket.io';
import type { CoralSessionManager } from './CoralSessionManager.js';
import type { AgentGraph } from '../types.js';

interface CreateSessionRequest {
  host: string;
  appId: string;
  privacyKey: string;
  agentGraph: AgentGraph;
}

interface SessionResponse {
  sessionId: string;
  status: 'created' | 'connected' | 'error';
  message?: string;
}

export function setupAPIRoutes(
  app: Express,
  sessionManager: CoralSessionManager,
  io: Server
): void {
  // Create a new Coral session
  app.post('/api/sessions', async (req: Request<{}, {}, CreateSessionRequest>, res: Response<SessionResponse>) => {
    try {
      const { host, appId, privacyKey, agentGraph } = req.body;

      if (!host || !appId || !privacyKey || !agentGraph) {
        return res.status(400).json({
          sessionId: '',
          status: 'error',
          message: 'Missing required fields: host, appId, privacyKey, agentGraph'
        });
      }

      const session = await sessionManager.createSession({
        host,
        appId,
        privacyKey,
        agentGraph
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        session.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        session.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      res.json({
        sessionId: session.getSessionId(),
        status: 'connected'
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      res.status(500).json({
        sessionId: '',
        status: 'error',
        message: error.message
      });
    }
  });

  // Get session state
  app.get('/api/sessions/:sessionId', (req: Request<{ sessionId: string }>, res: Response) => {
    const session = sessionManager.getSession(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    res.json(session.getState());
  });

  // List active sessions
  app.get('/api/sessions', (req: Request, res: Response) => {
    const sessions = sessionManager.getActiveSessions().map(s => s.getState());
    res.json({ sessions });
  });

  // Close a session
  app.delete('/api/sessions/:sessionId', (req: Request<{ sessionId: string }>, res: Response) => {
    const session = sessionManager.getSession(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    session.close();
    res.json({ message: 'Session closed successfully' });
  });

  // Get pending agent requests
  app.get('/api/sessions/:sessionId/requests', (req: Request<{ sessionId: string }>, res: Response) => {
    const session = sessionManager.getSession(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    // Get all pending requests for this session
    const requests = sessionManager.getActiveSessions()
      .map(s => s.getState())
      .filter(s => s.sessionId === req.params.sessionId);

    res.json({ requests });
  });
}