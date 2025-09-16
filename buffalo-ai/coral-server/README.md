# Buffalo AI Coral Integration Server

This Node.js/TypeScript server handles the integration between your Next.js Buffalo AI frontend and the Coral protocol for multi-agent communication.

## Architecture

```
Buffalo AI (Next.js) <--> Coral Server (Node.js) <--> Coral Protocol
                            |
                            ├── HTTP API (Express)
                            ├── WebSocket (for Coral)
                            └── Socket.IO (for UI updates)
```

## Features

- ✅ **Coral Session Management**: Create and manage Coral sessions with agent graphs
- ✅ **WebSocket Integration**: Real-time connection to Coral protocol
- ✅ **Socket.IO for UI**: Real-time updates to your React frontend
- ✅ **User Input Handling**: Agents can request input from users and receive responses
- ✅ **TypeScript**: Full type safety across the stack

## Setup

1. **Install dependencies:**
   ```bash
   cd coral-server
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run in development:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Session Management

- `POST /api/sessions` - Create a new Coral session
- `GET /api/sessions` - List all active sessions
- `GET /api/sessions/:sessionId` - Get session state
- `DELETE /api/sessions/:sessionId` - Close a session

### Tool Routes (for Agents)

- `POST /api/tools/user-input-request/:sessionId/:agentId` - Agent requests user input
- `POST /api/tools/user-input-respond/:sessionId/:agentId` - Agent sends response
- `GET /api/tools` - Get available tool schemas

### Health Check

- `GET /health` - Server health status

## Socket.IO Events

### Namespaces

- `/` - Main namespace for session updates
- `/user-input` - Dedicated namespace for user input handling

### Client Events (send)

- `join_session` - Join a session room
- `leave_session` - Leave a session room
- `user_response` - Send user's response to an agent request

### Server Events (receive)

- `agent_request` - Agent is requesting user input
- `agent_answer` - Agent has provided an answer
- `session_update` - General session state updates
- `error` - Error messages

## Integration with Next.js

Use the provided React hooks and components in your Next.js app:

```tsx
import { useCoralSession } from '@/lib/coral/useCoralSession';
import { AgentRequestHandler } from '@/components/coral/AgentRequestHandler';

function MyComponent() {
  const {
    session,
    agentRequests,
    createSession,
    respondToAgent
  } = useCoralSession();

  // Create session
  const handleCreateSession = async () => {
    await createSession({
      host: 'coral-server.com:8080',
      appId: 'my-app',
      privacyKey: 'my-key',
      agentGraph: {
        agents: {
          'agent1': {
            type: 'local',
            blocking: false,
            agentType: 'buffalo',
            options: {},
            tools: ['user-input-request']
          }
        }
      }
    });
  };

  return (
    <AgentRequestHandler
      requests={agentRequests}
      onRespond={respondToAgent}
    />
  );
}
```

## Environment Variables

- `PORT` - Server port (default: 4000)
- `HOST` - Server host (default: 0.0.0.0)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)

## How It Works

1. **Session Creation**: Your Next.js app calls the server to create a Coral session
2. **WebSocket Connection**: Server establishes WebSocket connection to Coral protocol
3. **Agent Requests**: When agents need user input, they call the tool endpoints
4. **Socket.IO Broadcast**: Server broadcasts agent requests to connected UI clients
5. **User Response**: UI sends response via Socket.IO, server relays to waiting agent
6. **Real-time Updates**: All session events are forwarded to UI for live updates

## Development Tips

- Use `npm run dev` for auto-reloading during development
- Check `/health` endpoint to verify server status
- Monitor console for WebSocket connection logs
- Use Socket.IO debug mode for troubleshooting: `DEBUG=socket.io* npm run dev`