import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

// Check if we're connecting to a production database
const isProduction = process.env.DATABASE_URL?.includes('amazonaws.com') || 
                     process.env.DATABASE_URL?.includes('supabase.co') ||
                     process.env.DATABASE_URL?.includes('neon.tech') ||
                     process.env.DATABASE_URL?.includes('railway.app') ||
                     process.env.NODE_ENV === 'production';

// Check if we're using a serverless database (Neon)
const isServerless = process.env.DATABASE_URL?.includes('neon.tech');

// Create connection pool with optimized settings
// For serverless databases (Neon), use fewer persistent connections
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  max: 10,                                 // Maximum connections in pool
  min: isServerless ? 0 : 2,               // Serverless: don't keep connections warm
  idleTimeoutMillis: isServerless ? 20000 : 30000,  // Close idle connections faster for serverless
  connectionTimeoutMillis: 10000,           // Timeout if connection takes > 10s
  keepAlive: true,                         // Keep connections alive
  keepAliveInitialDelayMillis: 10000,
});

// Add error handler for pool errors
pool.on('error', (err) => {
  console.error('⚠️  Unexpected database pool error:', err.message);
  // Pool will automatically create new connections
});

// Pre-warm the connection pool on startup (skip for serverless)
if (!isServerless) {
  pool.query('SELECT 1').catch(console.error);
}

// Drizzle instance
export const db = drizzle(pool, { schema });

// Export the schemas
export { schema };