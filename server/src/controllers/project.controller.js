import { v4 as uuid } from 'uuid';
import { db, queryAll, queryOne } from '../config/db.js';
import { HttpError } from '../middleware/error.js';

const PROJECT_SELECT = `
  SELECT p.*, u.name AS owner_name, pm.role AS my_role,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done_count
  FROM projects p
  JOIN users u ON u.id = p.owner_id
  JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?`;

const getProject = (id, userId) => queryOne(`${PROJECT_SELECT} WHERE p.id = ?`, [userId, id]);

export async function listProjects(req, res) {
  // Only get projects where user is a member
  const projects = await queryAll(`${PROJECT_SELECT} ORDER BY p.created_at DESC`, [req.user.id]);
  res.json({ projects });
}

export async function createProject(req, res) {
  const { name, description = '' } = req.body;
  if (!name?.trim()) throw new HttpError(400, 'Project name is required');

  const id = uuid();
  
  // Create project
  await db.execute({
    sql: 'INSERT INTO projects (id, name, description, owner_id) VALUES (?, ?, ?, ?)',
    args: [id, name.trim(), description, req.user.id],
  });

  // Add owner as a member
  await db.execute({
    sql: "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')",
    args: [id, req.user.id],
  });

  res.status(201).json({ project: await getProject(id, req.user.id) });
}

export async function getProjectById(req, res) {
  const project = await getProject(req.params.id, req.user.id);
  if (!project) throw new HttpError(404, 'Project not found');
  res.json({ project });
}

export async function updateProject(req, res) {
  const project = await queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw new HttpError(404, 'Project not found');

  const name = req.body.name !== undefined ? String(req.body.name).trim() : project.name;
  const description = req.body.description !== undefined ? req.body.description : project.description;
  if (!name) throw new HttpError(400, 'Project name cannot be empty');

  await db.execute({
    sql: 'UPDATE projects SET name = ?, description = ? WHERE id = ?',
    args: [name, description, project.id],
  });

  res.json({ project: await getProject(project.id, req.user.id) });
}

export async function deleteProject(req, res) {
  const project = await queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!project) throw new HttpError(404, 'Project not found');

  // Cascade deletes should handle members, tasks, comments if PRAGMA is on, 
  // but explicit deletion is safer.
  await db.batch(
    [
      { sql: 'DELETE FROM comments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', args: [project.id] },
      { sql: 'DELETE FROM tasks WHERE project_id = ?', args: [project.id] },
      { sql: 'DELETE FROM project_members WHERE project_id = ?', args: [project.id] },
      { sql: 'DELETE FROM projects WHERE id = ?', args: [project.id] },
    ],
    'write'
  );

  res.json({ message: 'Project deleted' });
}