import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { db, queryAll, queryOne } from '../config/db.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, created_at: u.created_at });

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    throw new HttpError(400, 'Name, email and password are required');
  }
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Invalid email address');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing) throw new HttpError(409, 'Email is already registered');

  const hash = await bcrypt.hash(password, 10);
  const id = uuid();

  await db.execute({
    sql: 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
    args: [id, name.trim(), normalizedEmail, hash],
  });

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email?.trim() || !password) throw new HttpError(400, 'Email and password are required');

  const user = await queryOne('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new HttpError(401, 'User no longer exists');
  res.json({ user: publicUser(user) });
}

// Used by the task modal to populate the "assign to" dropdown
export async function listUsers(req, res) {
  const users = await queryAll('SELECT id, name, email FROM users ORDER BY name ASC');
  res.json({ users });
}
