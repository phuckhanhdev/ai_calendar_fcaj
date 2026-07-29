import mysql2 from "mysql2";
import { loadAwsSecrets } from "@/lib/secrets-utils";

// Tải cấu hình từ AWS Secrets Manager bất đồng bộ trước khi các module khác truy vấn DB
await loadAwsSecrets();

// Global pool instance
let pool = null;

function getRealPool() {
  if (typeof globalThis !== 'undefined' && globalThis.__mysqlPool) {
    return globalThis.__mysqlPool;
  }

  if (!pool) {
    console.log("Creating MySQL connection pool lazily...");
    
    // Đọc từ process.env (đã được Secrets Manager hoặc .env.local nạp)
    pool = mysql2.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false, // Aiven & AWS RDS hỗ trợ SSL
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    if (typeof globalThis !== 'undefined') {
      globalThis.__mysqlPool = pool;
    }

    pool.on('error', (err) => {
      console.error('Database pool error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('Database connection lost, pool will handle reconnection');
      }
    });

    console.log("MySQL connection pool created successfully!");
  }

  return pool;
}

/**
 * Trả về một lazy proxy của Database Pool.
 * Giúp tránh việc khởi tạo pool ngay khi import (import time),
 * cho phép AWS Secrets Manager có thời gian nạp các biến môi trường bất đồng bộ trước khi kết nối thực tế xảy ra.
 */
export function connectToDatabase() {
  if (typeof globalThis !== 'undefined' && globalThis.__mysqlPool) {
    return globalThis.__mysqlPool;
  }

  return {
    query(sql, params, callback) {
      const realPool = getRealPool();
      // Hỗ trợ cả query(sql, callback) và query(sql, params, callback)
      if (typeof params === 'function') {
        return realPool.query(sql, params);
      }
      return realPool.query(sql, params, callback);
    },
    on(event, handler) {
      const realPool = getRealPool();
      return realPool.on(event, handler);
    }
  };
}

export default connectToDatabase;
