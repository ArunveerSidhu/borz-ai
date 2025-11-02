import { Context } from 'hono';

/**
 * Extended Hono context with custom variables
 */
export type AuthContext = Context<{
  Variables: {
    userId: string;
    email: string;
  };
}>;