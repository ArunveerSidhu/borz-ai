require('dotenv/config');
const { Pool } = require('pg');

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');

const isProduction = process.env.DATABASE_URL?.includes('amazonaws.com') || 
                     process.env.DATABASE_URL?.includes('supabase.co') ||
                     process.env.DATABASE_URL?.includes('neon.tech');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

pool.query('SELECT version()')
  .then((result) => {
    console.log('✅ Connection successful!');
    console.log('PostgreSQL version:', result.rows[0].version);
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
    });
    pool.end();
    process.exit(1);
  });

