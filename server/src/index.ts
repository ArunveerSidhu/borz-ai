import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth.routes';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:8081', 'http://localhost:19000', 'http://localhost:19006', 'http://10.0.2.2:3000'],
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
    type: 'REST API',
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

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server is running on http://localhost:${port}`);
console.log(`📡 REST API endpoints:`);
console.log(`   POST   /auth/signup`);
console.log(`   POST   /auth/login`);
console.log(`   POST   /auth/forgot-password`);
console.log(`   POST   /auth/reset-password`);
console.log(`   GET    /auth/me (protected)`);
console.log(`   GET    /auth/check`);
