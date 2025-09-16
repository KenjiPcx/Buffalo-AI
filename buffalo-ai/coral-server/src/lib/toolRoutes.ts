import type { Express, Request, Response } from 'express';
import type { Server } from 'socket.io';
import type { CoralSessionManager } from './CoralSessionManager.js';

interface ToolRequest<T = any> {
  sessionId: string;
  agentId: string;
  body: T;
}

export function setupToolRoutes(
  app: Express,
  sessionManager: CoralSessionManager,
  io: Server
): void {
  // User input request tool - agent requests input from user
  app.post('/api/tools/user-input-request/:sessionId/:agentId',
    async (req: Request<{ sessionId: string; agentId: string }, {}, { message: string }>, res: Response) => {
    try {
      const { sessionId, agentId } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Create agent request
      const request = sessionManager.createAgentRequest(sessionId, agentId, message);

      // Wait for user response with timeout
      const response = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('User response timeout'));
        }, 300000); // 5 minute timeout

        const handleResponse = (data: { id: string; value: string }) => {
          if (data.id === request.id) {
            clearTimeout(timeout);
            sessionManager.removeListener('userResponse', handleResponse);
            resolve(data.value);
          }
        };

        sessionManager.on('userResponse', handleResponse);
      });

      res.json({ response });
    } catch (error: any) {
      console.error('Error in user-input-request:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // User input respond tool - agent responds to user with answer
  app.post('/api/tools/user-input-respond/:sessionId/:agentId',
    (req: Request<{ sessionId: string; agentId: string }, {}, { response: string; requestId?: string }>, res: Response) => {
    try {
      const { sessionId, agentId } = req.params;
      const { response, requestId } = req.body;

      if (!response) {
        return res.status(400).json({ error: 'Response is required' });
      }

      // If requestId provided, complete that specific request
      if (requestId) {
        sessionManager.completeAgentRequest(requestId, response);
      } else {
        // Otherwise, create a new agent answer event
        const request = sessionManager.createAgentRequest(sessionId, agentId, '');
        sessionManager.completeAgentRequest(request.id, response);
      }

      res.json({ message: 'Response sent successfully' });
    } catch (error: any) {
      console.error('Error in user-input-respond:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get tool schema (for agents to discover available tools)
  app.get('/api/tools', (req: Request, res: Response) => {
    res.json({
      tools: [
        {
          name: 'user-input-request',
          description: 'Request input from the user',
          toolSchema: {
            name: 'user-input-request',
            description: 'Request input from the user with a question or prompt',
            parameters: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'The question or prompt to show the user'
                }
              },
              required: ['message']
            }
          },
          transport: {
            type: 'http',
            url: '/api/tools/user-input-request/{sessionId}/{agentId}'
          }
        },
        {
          name: 'user-input-respond',
          description: 'Send a response back to the user',
          toolSchema: {
            name: 'user-input-respond',
            description: 'Send a response or answer back to the user',
            parameters: {
              type: 'object',
              properties: {
                response: {
                  type: 'string',
                  description: 'The response to send to the user'
                },
                requestId: {
                  type: 'string',
                  description: 'Optional ID of the request being responded to'
                }
              },
              required: ['response']
            }
          },
          transport: {
            type: 'http',
            url: '/api/tools/user-input-respond/{sessionId}/{agentId}'
          }
        }
      ]
    });
  });
}