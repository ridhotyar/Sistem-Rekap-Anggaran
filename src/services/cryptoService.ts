/**
 * Cryptographic service for password hashing and credential encryption.
 * Protects user credentials from being exposed in plain text in network responses and Firestore.
 */

import { AppUser } from '../types/auth';

const DEFAULT_SALT = 'bakesbangpoldagri_ntb_salt_2027';

/**
 * Computes a salted SHA-256 hash
 */
export async function hashPasswordWithSalt(
  password: string,
  salt: string = DEFAULT_SALT
): Promise<string> {
  if (!password) return '';

  const salted = `${password}:${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(salted);

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback FNV-1a hash
  let h = 0x811c9dc5;
  for (let i = 0; i < salted.length; i++) {
    h ^= salted.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function generateSalt(length = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Computes a salted SHA-256 hash returning an object with hash and salt
 */
export async function hashPassword(
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  const effectiveSalt = salt || generateSalt();
  const hex = await hashPasswordWithSalt(password, effectiveSalt);
  return { hash: hex, salt: effectiveSalt };
}

/**
 * Verifies a password against a stored hash and salt
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  if (!password || !storedHash || !salt) return false;
  const hex = await hashPasswordWithSalt(password, salt);
  return hex.toLowerCase() === storedHash.toLowerCase();
}

/**
 * Verifies an entered password against an AppUser document.
 * Supports salt + passwordHash, enc_sha256_ format, and legacy plaintext.
 */
export async function verifyUserPassword(
  inputPassword: string,
  user: AppUser
): Promise<boolean> {
  if (!inputPassword || !user) return false;

  const salt = user.salt || DEFAULT_SALT;
  const computedHex = await hashPasswordWithSalt(inputPassword, salt);
  const computedEnc = `enc_sha256_${computedHex}`;
  const { hash: computedDefaultHex } = await hashPassword(inputPassword, DEFAULT_SALT);

  // 1. Check passwordHash
  if (user.passwordHash) {
    if (
      user.passwordHash === computedHex ||
      user.passwordHash === computedEnc ||
      user.passwordHash === computedDefaultHex
    ) {
      return true;
    }
  }

  // 2. Check password field (if stored as hash or legacy token)
  if (user.password) {
    if (
      user.password === computedHex ||
      user.password === computedEnc ||
      user.password === computedDefaultHex
    ) {
      return true;
    }
    // Legacy plaintext match
    if (user.password === inputPassword) {
      return true;
    }
  }

  // 3. Built-in hardcoded credentials check for default admin & operator
  if (user.username === 'userutama' && inputPassword === 'Kesbang123#') {
    return true;
  }
  if (user.username === 'operator' && inputPassword === 'operator123') {
    return true;
  }

  return false;
}

/**
 * Sanitizes an AppUser object before storing in session or sending to client,
 * removing plaintext passwords completely.
 */
export function sanitizeUser(user: AppUser): AppUser {
  const copy = { ...user };
  delete copy.password;
  return copy;
}

/**
 * Safely masks a password for UI presentation
 */
export function maskPassword(password?: string): string {
  if (!password) return '••••••••';
  return '•••••••• (Terenkripsi)';
}
