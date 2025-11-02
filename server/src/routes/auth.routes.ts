import { Hono } from 'hono';
import { AuthService } from '../services/auth.service';
import { 
  signupSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../utils/auth/validation';
import { authMiddleware } from '../middlewares/auth.middleware';
import { z } from 'zod';
import type { AuthContext } from '../types/hono.types.ts';

const authRoutes = new Hono();

/**
 * POST /auth/signup
 * Register a new user
 */
authRoutes.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = signupSchema.parse(body);
    const result = await AuthService.signup(validatedData);
    
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.issues 
      }, 400);
    }
    
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to sign up' 
    }, 400);
  }
});

/**
 * POST /auth/login
 * Login user
 */
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = loginSchema.parse(body);
    const result = await AuthService.login(validatedData);
    
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.issues 
      }, 400);
    }
    
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to login' 
    }, 401);
  }
});

/**
 * POST /auth/forgot-password
 * Request password reset
 */
authRoutes.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = forgotPasswordSchema.parse(body);
    const result = await AuthService.forgotPassword(validatedData);
    
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.issues 
      }, 400);
    }
    
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to request password reset' 
    }, 400);
  }
});

/**
 * POST /auth/reset-password
 * Reset password with token
 */
authRoutes.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = resetPasswordSchema.parse(body);
    const result = await AuthService.resetPassword(validatedData);
    
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.issues 
      }, 400);
    }
    
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to reset password' 
    }, 400);
  }
});

/**
 * GET /auth/me
 * Get current user (protected route)
 */
authRoutes.get('/me', authMiddleware, async (c: AuthContext) => {
  try {
    const userId = c.get('userId');
    const result = await AuthService.getUserById(userId);
    
    return c.json(result, 200);
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get user' 
    }, 404);
  }
});

/**
 * GET /auth/check
 * Check if user is authenticated
 */
authRoutes.get('/check', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      isAuthenticated: false,
      userId: null,
      email: null,
    });
  }

  try {
    const { verifyToken } = await import('../utils/auth/jwt');
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    return c.json({
      isAuthenticated: true,
      userId: decoded.userId,
      email: decoded.email,
    });
  } catch (error) {
    return c.json({
      isAuthenticated: false,
      userId: null,
      email: null,
    });
  }
});

export default authRoutes;

