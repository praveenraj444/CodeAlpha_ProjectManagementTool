import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is missing. Copy .env.example to .env and fill it in.');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Convert libSQL Row objects to plain JSON-safe objects
export const toObjects = (result) => result.rows.map((row) => ({ ...row }));

export const queryAll = async (sql, args = []) => toObjects(await db.execute({ sql, args }));

export const queryOne = async (sql, args = []) => {
  const rows = await queryAll(sql, args);
  return rows[0] || null;
};

// Applies schema.sql (idempotent: every statement uses IF NOT EXISTS)
export async function initDb() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await db.executeMultiple(sql);
  console.log('✅ Database schema ready');
}
