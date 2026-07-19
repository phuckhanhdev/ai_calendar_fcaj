import mysql2 from "mysql2";

// Global singleton pool instance
let pool = null;

export function connectToDatabase() {
  // Use globalThis to ensure singleton across all module instances in Next.js hot-reload
  if (typeof globalThis !== 'undefined' && globalThis.__mysqlPool) {
    return globalThis.__mysqlPool;
  }

  // Create connection pool if it doesn't exist
  if (!pool) {
    console.log("Creating MySQL connection pool (refactored connection layer)...");
    
    pool = mysql2.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false, // Aiven & AWS RDS support SSL
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    // Store in globalThis for Next.js hot-reload persistence
    if (typeof globalThis !== 'undefined') {
      globalThis.__mysqlPool = pool;
    }

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('Database connection lost, pool will handle reconnection');
      } else if (err.code === 'ER_CON_COUNT_ERROR') {
        console.error('Too many connections - check connectionLimit setting');
      }
    });

    console.log("MySQL connection pool created successfully!");
  }

  return pool;
}

export default connectToDatabase;
