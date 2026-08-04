import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Generate a unique file key for MinIO storage
 * Format: {prefix}/{year}/{month}/{day}/{uuid}{ext}
 */
export const generateFileKey = (
  prefix: string,
  originalName: string
): string => {
  const ext = path.extname(originalName) || '.jpg';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${prefix}/${year}/${month}/${day}/${uuidv4()}${ext}`;
};

/**
 * Generate a unique API key (plain text, for one-time display)
 */
export const generateApiKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'dk_'; // disguise key prefix
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

/**
 * Generate a unique case number
 * Format: CASE-{YEAR}-{6 digit sequential-like number}
 */
export const generateCaseNumber = (): string => {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `CASE-${year}-${randomPart}`;
};

/**
 * Sleep utility for testing/debugging
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse JSON safely, returning a default value on error
 */
export const safeJsonParse = <T>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Strip undefined/null fields from an object (for PATCH operations)
 */
export const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
};
