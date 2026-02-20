const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false 
  },
  max: 10, // Reduced for better performance with Supabase
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000 // Increased to 30 seconds for slow connections
});

// Connect to database on server start
pool.connect()
  .catch(err => {
    // Silent error handling to avoid sensitive data exposure
    process.exit(-1);
  });

pool.on('error', (err) => {
  process.exit(-1);
});

module.exports = pool;
