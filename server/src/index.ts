import 'dotenv/config';
import { createServer } from 'http';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createAdaptorServer } from '@hono/node-server';
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
  origin: allowedOrigins,
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

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 Server starting on port ${port}...`);

// Create HTTP server with Hono
const httpServer = createAdaptorServer({
  fetch: app.fetch,
});

// Initialize Socket.IO with the HTTP server (cast to any for type compatibility)
const socketService = new SocketService(httpServer as any);
console.log('✅ WebSocket server initialized');

// Start server
httpServer.listen(port);

console.log(`✅ Server is running on http://localhost:${port}`);
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
