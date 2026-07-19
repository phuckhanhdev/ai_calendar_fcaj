import jwt from "jsonwebtoken";
import crypto from "crypto";
import * as userService from "@/services/userService";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

/**
 * Generate a verification code (6 digits)
 */
export function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Create a JWT token for user session
 */
export function createToken(userId, email) {
  return jwt.sign(
    { userId, email, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Create temporary verification ticket (session-bound via cookie)
 */
export function createVerificationTicket(email) {
  return jwt.sign(
    { email, purpose: "verify-email", iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: "20m" }
  );
}

/**
 * Verify temporary verification ticket
 */
export function verifyVerificationTicket(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || payload.purpose !== "verify-email" || !payload.email) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password using crypto (simple hash for now)
 * In production, consider using bcrypt
 */
export function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Verify password
 */
export function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

/**
 * Store verification code in database (delegated to Service)
 */
export async function storeVerificationCode(email, code) {
  return await userService.storeVerificationOTP(email, code);
}

/**
 * Verify code from database (delegated to Service)
 */
export async function verifyCode(email, code, shouldDelete = true) {
  return await userService.verifyOTP(email, code, shouldDelete);
}

/**
 * Atomically consume verification code (delegated to Service)
 */
export async function consumeVerificationCode(email, code) {
  return await userService.consumeOTP(email, code);
}

/**
 * Get user by email (delegated to Service)
 */
export async function getUserByEmail(email) {
  return await userService.getUserByEmail(email);
}

/**
 * Get user by ID (delegated to Service)
 */
export async function getUserById(userId) {
  return await userService.getUserProfile(userId);
}

/**
 * Create new user (delegated to Service)
 */
export async function createUser(email, hashedPassword, userData) {
  return await userService.registerUser(email, hashedPassword, userData);
}

/**
 * Update user password (delegated to Service)
 */
export async function updateUserPassword(email, hashedPassword) {
  return await userService.changePassword(email, hashedPassword);
}
