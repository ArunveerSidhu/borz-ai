import { Context, Next } from 'hono';
import { verifyToken } from '../utils/auth/jwt';

/**
 * Authentication middleware for Hono routes
 */
export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    c.set('userId', decoded.userId);
    c.set('email', decoded.email);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = verifyToken(token);
      c.set('userId', decoded.userId);
      c.set('email', decoded.email);
    } catch (error) {
      // Token is invalid, but we don't throw
    }
  }

  await next();
};

