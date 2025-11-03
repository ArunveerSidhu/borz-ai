import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

// Check if we're connecting to a production database
const isProduction = process.env.DATABASE_URL?.includes('amazonaws.com') || 
                     process.env.DATABASE_URL?.includes('supabase.co') ||
                     process.env.DATABASE_URL?.includes('neon.tech');

// Create connection pool with optimized settings
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  max: 10,                        // Maximum connections in pool
  min: 2,                         // Keep 2 connections warm
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout if connection takes > 10s
  keepAlive: true,                // Keep connections alive
  keepAliveInitialDelayMillis: 10000,
});

// Add error handler for pool errors
pool.on('error', (err) => {
  console.error('⚠️  Unexpected database pool error:', err.message);
  // Pool will automatically create new connections
});

// Pre-warm the connection pool on startup
pool.query('SELECT 1').catch(console.error);

// Drizzle instance
export const db = drizzle(pool, { schema });

// Export the schemas
export { schema };