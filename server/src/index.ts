import 'dotenv/config';
import { createServer } from 'http';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import { SocketService } from './services/socket.service';

const app = new Hono();

// Middleware
app.use('*', logger());

// Configure CORS with environment variable support for Railway
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .concat([
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://10.0.2.2:3000',
  ]);

app.use('*', cors({
  origin: '*',
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Borz AI Server is running',
    version: '1.0.0',
    type: 'REST API + WebSocket',
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Debug route to verify server is working
app.get('/debug', (c) => {
  return c.json({
    message: 'Server is responding',
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
  });
});

// Routes
app.route('/auth', authRoutes);
app.route('/api/chats', chatRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('❌ Server Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

const port = Number(process.env.PORT) || 8080;

console.log(`🚀 Server starting on port ${port}...`);

// Create HTTP server for Socket.IO
const httpServer = createServer();

// Initialize Socket.IO with the HTTP server
const socketService = new SocketService(httpServer);
console.log('✅ WebSocket server initialized');

// Use Hono's serve() function - it automatically handles Railway's port binding
serve({
  fetch: app.fetch,
  port,
  createServer: () => httpServer,
}, (info) => {
  console.log(`✅ Server is running on http://${info.address}:${info.port}`);
  console.log(`📡 REST API + WebSocket endpoints:`);
  console.log(`\n  Auth:`);
  console.log(`   POST   /auth/signup`);
  console.log(`   POST   /auth/login`);
  console.log(`   POST   /auth/forgot-password`);
  console.log(`   POST   /auth/reset-password`);
  console.log(`   GET    /auth/me (protected)`);
  console.log(`   GET    /auth/check`);
  console.log(`\n  Chat (REST):`);
  console.log(`   GET    /api/chats (protected)`);
  console.log(`   POST   /api/chats (protected)`);
  console.log(`   GET    /api/chats/:chatId (protected)`);
  console.log(`   POST   /api/chats/:chatId/messages (protected, streaming - deprecated)`);
  console.log(`   PATCH  /api/chats/:chatId (protected)`);
  console.log(`   DELETE /api/chats/:chatId (protected)`);
  console.log(`   DELETE /api/chats/:chatId/messages (protected)`);
  console.log(`\n  Chat (WebSocket):`);
  console.log(`   EVENT  send-message (chatId, content)`);
  console.log(`   EVENT  typing (chatId, isTyping)`);
});
