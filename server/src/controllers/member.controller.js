import { db, queryAll, queryOne } from '../config/db.js';
import { HttpError } from '../middleware/error.js';

export async function listMembers(req, res) {
  const projectId = req.params.id;
  const members = await queryAll(
    `SELECT pm.user_id, pm.role, pm.joined_at, u.name, u.email 
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
     ORDER BY pm.role = 'owner' DESC, u.name ASC`,
    [projectId]
  );
  res.json({ members });
}

export async function addMember(req, res) {
  const projectId = req.params.id;
  const { email, role = 'editor' } = req.body;

  if (!email) throw new HttpError(400, 'Email is required');
  if (!['editor', 'viewer'].includes(role)) throw new HttpError(400, 'Invalid role');

  const user = await queryOne('SELECT id, name FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (!user) throw new HttpError(404, 'User not found. They must register first.');

  const existing = await queryOne('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, user.id]);
  if (existing) throw new HttpError(400, 'User is already a member of this project');

  await db.execute({
    sql: "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
    args: [projectId, user.id, role],
  });

  // Optional: Emit real-time event here later if needed

  res.status(201).json({ message: 'Member added successfully' });
}

export async function removeMember(req, res) {
  const projectId = req.params.id;
  const memberId = req.params.userId;

  if (memberId === req.user.id) throw new HttpError(400, 'You cannot remove yourself as owner');

  const existing = await queryOne('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, memberId]);
  if (!existing) throw new HttpError(404, 'User is not a member of this project');
  if (existing.role === 'owner') throw new HttpError(400, 'Cannot remove project owner');

  await db.execute({
    sql: 'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
    args: [projectId, memberId],
  });

  res.json({ message: 'Member removed' });
}