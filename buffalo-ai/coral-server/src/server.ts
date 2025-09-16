import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { CoralSessionManager } from './lib/CoralSessionManager.js';
import { setupSocketHandlers } from './lib/socketHandlers.js';
import { setupAPIRoutes } from './lib/apiRoutes.js';
import { setupToolRoutes } from './lib/toolRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: corsOptions,
  path: '/socket.io'
});

// Initialize Coral Session Manager
const sessionManager = new CoralSessionManager();

// Setup Socket.IO handlers for user input
setupSocketHandlers(io, sessionManager);

// Setup API routes for session management
setupAPIRoutes(app, sessionManager, io);

// Setup tool routes for agent communication
setupToolRoutes(app, sessionManager, io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeSessions: sessionManager.getActiveSessions().length,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Coral server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.IO path: /socket.io`);
  console.log(`🌐 CORS enabled for: ${corsOptions.origin}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...');
  sessionManager.closeAll();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});