import { v4 as uuid } from 'uuid';
import { db, queryAll, queryOne } from '../config/db.js';
import { HttpError } from '../middleware/error.js';
import { emitToProject } from '../socket/socket.js';
import { createNotification } from '../utils/notify.js'; // NEW IMPORT

const COMMENT_SELECT = `
  SELECT c.*, u.name AS user_name
  FROM comments c
  JOIN users u ON u.id = c.user_id`;

const getComment = (id) => queryOne(`${COMMENT_SELECT} WHERE c.id = ?`, [id]);

export async function listCommentsByTask(req, res) {
  const task = await queryOne('SELECT id FROM tasks WHERE id = ?', [req.params.taskId]);
  if (!task) throw new HttpError(404, 'Task not found');

  const comments = await queryAll(`${COMMENT_SELECT} WHERE c.task_id = ? ORDER BY c.created_at ASC`, [
    req.params.taskId,
  ]);
  res.json({ comments });
}

export async function createComment(req, res) {
  const { task_id, content } = req.body;
  if (!task_id) throw new HttpError(400, 'task_id is required');
  if (!content?.trim()) throw new HttpError(400, 'Comment cannot be empty');

  const task = await queryOne('SELECT id, project_id FROM tasks WHERE id = ?', [task_id]);
  if (!task) throw new HttpError(404, 'Task not found');

  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)',
    args: [id, task_id, req.user.id, content.trim()],
  });

  const comment = await getComment(id);
  emitToProject(task.project_id, 'comment:created', { comment, projectId: task.project_id });

  // NOTIFICATION LOGIC: Comment added
  const taskDetails = await queryOne(
    'SELECT t.title, t.assigned_to, p.owner_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ?',
    [task_id]
  );

  if (taskDetails) {
    const notifyUsers = new Set();
    // Notify assignee (if not the commenter)
    if (taskDetails.assigned_to && taskDetails.assigned_to !== req.user.id) {
      notifyUsers.add(taskDetails.assigned_to);
    }
    // Notify project owner (if not the commenter and not already added)
    if (taskDetails.owner_id && taskDetails.owner_id !== req.user.id) {
      notifyUsers.add(taskDetails.owner_id);
    }

    for (const userId of notifyUsers) {
      await createNotification({
        userId,
        type: 'comment_added',
        message: `${req.user.name} commented on task: "${taskDetails.title}"`,
        link: `/board/${task.project_id}`,
      });
    }
  }

  res.status(201).json({ comment });
}

export async function deleteComment(req, res) {
  const comment = await queryOne(
    `SELECT c.*, t.project_id, p.owner_id
     FROM comments c
     JOIN tasks t ON t.id = c.task_id
     JOIN projects p ON p.id = t.project_id
     WHERE c.id = ?`,
    [req.params.id]
  );
  if (!comment) throw new HttpError(404, 'Comment not found');

  if (comment.user_id !== req.user.id && comment.owner_id !== req.user.id) {
    throw new HttpError(403, 'You can only delete your own comments');
  }

  await db.execute({ sql: 'DELETE FROM comments WHERE id = ?', args: [comment.id] });

  emitToProject(comment.project_id, 'comment:deleted', {
    id: comment.id,
    task_id: comment.task_id,
    projectId: comment.project_id,
  });
  res.json({ message: 'Comment deleted' });
}