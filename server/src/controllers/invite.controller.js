import { v4 as uuid } from 'uuid';
import { db, queryOne } from '../config/db.js';
import { HttpError } from '../middleware/error.js';

// Generate a link (Owner/Editor can generate)
export async function generateInviteLink(req, res) {
  const projectId = req.params.id;
  const token = uuid().slice(0, 8); // Short unique token

  await db.execute({
    sql: 'INSERT INTO invite_tokens (token, project_id, created_by) VALUES (?, ?, ?)',
    args: [token, projectId, req.user.id],
  });

  res.json({ token });
}

// Accept the invite (Any logged-in user can accept)
export async function acceptInvite(req, res) {
  const { token } = req.params;

  const invite = await queryOne('SELECT * FROM invite_tokens WHERE token = ?', [token]);
  if (!invite) throw new HttpError(404, 'Invalid or expired invite link');

  // Check if already a member
  const existing = await queryOne(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [invite.project_id, req.user.id]
  );

  if (existing) {
    // Already a member, just return the project ID to redirect
    return res.json({ projectId: invite.project_id, message: 'Already a member' });
  }

  // Add as editor
  await db.execute({
    sql: "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'editor')",
    args: [invite.project_id, req.user.id],
  });

  res.json({ projectId: invite.project_id, message: 'Joined successfully' });
}