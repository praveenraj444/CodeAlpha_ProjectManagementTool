import jwt from 'jsonwebtoken';
import { HttpError } from './error.js';

export const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Authentication required'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}
