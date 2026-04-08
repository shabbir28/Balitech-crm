const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bpo_crm',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432
});
const sql = fs.readFileSync('migrations/10_notifications.sql', 'utf8');
pool.query(sql)
  .then(() => { console.log('✅ Migration 10 (notifications) SUCCESS'); pool.end(); })
  .catch(e => { console.error('❌ Migration FAILED:', e.message); pool.end(); process.exit(1); });
