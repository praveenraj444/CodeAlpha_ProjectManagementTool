import { v4 as uuid } from 'uuid';
import { db, queryAll, queryOne } from '../config/db.js';
import { HttpError } from '../middleware/error.js';
import { emitToProject } from '../socket/socket.js';
import { createNotification } from '../utils/notify.js'; // NEW IMPORT

const STATUSES = ['todo', 'in-progress', 'done'];

const TASK_SELECT = `
  SELECT t.*, u.name AS assignee_name,
    (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comment_count
  FROM tasks t
  LEFT JOIN users u ON u.id = t.assigned_to`;

const getTask = (id) => queryOne(`${TASK_SELECT} WHERE t.id = ?`, [id]);

async function assertUserExists(userId) {
  const user = await queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) throw new HttpError(400, 'Assigned user does not exist');
}

async function nextPosition(projectId, status) {
  const row = await queryOne(
    'SELECT COALESCE(MAX(position), -1) AS max_pos FROM tasks WHERE project_id = ? AND status = ?',
    [projectId, status]
  );
  return row.max_pos + 1;
}

export async function listTasksByProject(req, res) {
  const project = await queryOne('SELECT id FROM projects WHERE id = ?', [req.params.projectId]);
  if (!project) throw new HttpError(404, 'Project not found');

  const tasks = await queryAll(`${TASK_SELECT} WHERE t.project_id = ? ORDER BY t.position ASC, t.created_at ASC`, [
    req.params.projectId,
  ]);
  res.json({ tasks });
}

export async function createTask(req, res) {
  const { project_id, title, description = '', status = 'todo', assigned_to = null } = req.body;

  if (!project_id) throw new HttpError(400, 'project_id is required');
  if (!title?.trim()) throw new HttpError(400, 'Task title is required');
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');

  const project = await queryOne('SELECT id FROM projects WHERE id = ?', [project_id]);
  if (!project) throw new HttpError(404, 'Project not found');
  if (assigned_to) await assertUserExists(assigned_to);

  const id = uuid();
  const position = await nextPosition(project_id, status);

  await db.execute({
    sql: `INSERT INTO tasks (id, project_id, title, description, status, assigned_to, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, project_id, title.trim(), description, status, assigned_to || null, position],
  });

  const task = await getTask(id);
  emitToProject(project_id, 'task:created', { task });

  // NOTIFICATION LOGIC: Task created & assigned
  if (assigned_to && assigned_to !== req.user.id) {
    await createNotification({
      userId: assigned_to,
      type: 'task_assigned',
      message: `${req.user.name} assigned you a task: "${title.trim()}"`,
      link: `/board/${project_id}`,
    });
  }

  res.status(201).json({ task });
}

export async function updateTask(req, res) {
  const existing = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!existing) throw new HttpError(404, 'Task not found');

  const body = req.body;
  const title = body.title !== undefined ? String(body.title).trim() : existing.title;
  const description = body.description !== undefined ? body.description : existing.description;
  const status = body.status !== undefined ? body.status : existing.status;
  const assigned_to = 'assigned_to' in body ? body.assigned_to || null : existing.assigned_to;

  if (!title) throw new HttpError(400, 'Task title cannot be empty');
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');
  if (assigned_to) await assertUserExists(assigned_to);

  const position =
    status !== existing.status ? await nextPosition(existing.project_id, status) : existing.position;

  await db.execute({
    sql: `UPDATE tasks SET title = ?, description = ?, status = ?, assigned_to = ?, position = ? WHERE id = ?`,
    args: [title, description, status, assigned_to, position, existing.id],
  });

  const task = await getTask(existing.id);
  emitToProject(existing.project_id, 'task:updated', { task });

  // NOTIFICATION LOGIC: Task updated & assignee changed
  if (assigned_to && assigned_to !== existing.assigned_to && assigned_to !== req.user.id) {
    await createNotification({
      userId: assigned_to,
      type: 'task_assigned',
      message: `${req.user.name} assigned you a task: "${title}"`,
      link: `/board/${existing.project_id}`,
    });
  }

  res.json({ task });
}

export async function moveTask(req, res) {
  const { status, position } = req.body;

  if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');
  if (!Number.isInteger(position) || position < 0) {
    throw new HttpError(400, 'position must be a non-negative integer');
  }

  const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) throw new HttpError(404, 'Task not found');

  const all = await queryAll(
    'SELECT id, status, position FROM tasks WHERE project_id = ? ORDER BY position ASC, created_at ASC',
    [task.project_id]
  );

  const columns = { todo: [], 'in-progress': [], done: [] };
  const original = new Map();
  for (const t of all) {
    original.set(t.id, { status: t.status, position: t.position });
    if (t.id !== task.id) columns[t.status].push(t.id);
  }

  const index = Math.min(position, columns[status].length);
  columns[status].splice(index, 0, task.id);

  const updates = [];
  const statements = [];
  for (const col of STATUSES) {
    columns[col].forEach((id, i) => {
      const before = original.get(id);
      if (before.status !== col || before.position !== i) {
        updates.push({ id, status: col, position: i });
        statements.push({
          sql: 'UPDATE tasks SET status = ?, position = ? WHERE id = ?',
          args: [col, i, id],
        });
      }
    });
  }

  if (statements.length) await db.batch(statements, 'write');

  const updated = await getTask(task.id);
  emitToProject(task.project_id, 'task:moved', {
    projectId: task.project_id,
    task: updated,
    updates,
  });
  res.json({ task: updated, updates });
}

export async function deleteTask(req, res) {
  const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) throw new HttpError(404, 'Task not found');

  await db.batch(
    [
      { sql: 'DELETE FROM comments WHERE task_id = ?', args: [task.id] },
      { sql: 'DELETE FROM tasks WHERE id = ?', args: [task.id] },
    ],
    'write'
  );

  emitToProject(task.project_id, 'task:deleted', { id: task.id, project_id: task.project_id });
  res.json({ message: 'Task deleted' });
}