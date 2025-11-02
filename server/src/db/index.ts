import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

// Check if we're connecting to a production database
const isProduction = process.env.DATABASE_URL?.includes('amazonaws.com') || 
                     process.env.DATABASE_URL?.includes('supabase.co') ||
                     process.env.DATABASE_URL?.includes('neon.tech');

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

// Drizzle instance
export const db = drizzle(pool, { schema });

// Export the schemas
export { schema };