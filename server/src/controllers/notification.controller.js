import { db, queryAll, queryOne } from '../config/db.js';
import { HttpError } from '../middleware/error.js';

export async function getNotifications(req, res) {
  const notifications = await queryAll(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  const unreadRow = await queryOne(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );
  
  res.json({ notifications, unreadCount: unreadRow.count });
}

export async function markAsRead(req, res) {
  const notif = await queryOne('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
  if (!notif) throw new HttpError(404, 'Notification not found');
  if (notif.user_id !== req.user.id) throw new HttpError(403, 'Not authorized');

  await db.execute({
    sql: 'UPDATE notifications SET is_read = 1 WHERE id = ?',
    args: [notif.id],
  });

  res.json({ message: 'Marked as read' });
}

export async function markAllAsRead(req, res) {
  await db.execute({
    sql: 'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    args: [req.user.id],
  });
  res.json({ message: 'All marked as read' });
}

export async function deleteNotification(req, res) {
  const notif = await queryOne('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
  if (!notif) throw new HttpError(404, 'Notification not found');
  if (notif.user_id !== req.user.id) throw new HttpError(403, 'Not authorized');

  await db.execute({ sql: 'DELETE FROM notifications WHERE id = ?', args: [notif.id] });
  res.json({ message: 'Deleted' });
}