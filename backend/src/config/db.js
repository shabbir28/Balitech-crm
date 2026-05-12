const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "bpo_crm",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5432,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
  // Do not exit — let the pool recover or reconnect automatically
});

module.exports = {
  query: (text, params) => {
    const cleanedParams = params ? params.map(p => (typeof p === 'string' ? p.replace(/\0/g, '') : p)) : params;
    return pool.query(text, cleanedParams);
  },
  getClient: async () => {
    const client = await pool.connect();
    const originalQuery = client.query;
    client.query = (...args) => {
      if (args[1] && Array.isArray(args[1])) {
        args[1] = args[1].map(p => (typeof p === 'string' ? p.replace(/\0/g, '') : p));
      } else if (args[0] && typeof args[0] === 'object' && Array.isArray(args[0].values)) {
        args[0].values = args[0].values.map(p => (typeof p === 'string' ? p.replace(/\0/g, '') : p));
      }
      return originalQuery.apply(client, args);
    };
    return client;
  },
};
