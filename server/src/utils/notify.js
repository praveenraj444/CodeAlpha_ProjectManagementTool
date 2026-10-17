import { v4 as uuid } from 'uuid';
import { db } from '../config/db.js';
import { emitToUser } from '../socket/socket.js';

export async function createNotification({ userId, type, message, link }) {
  try {
    const id = uuid();
    await db.execute({
      sql: 'INSERT INTO notifications (id, user_id, type, message, link) VALUES (?, ?, ?, ?, ?)',
      args: [id, userId, type, message, link],
    });

    // Fetch the newly created notification to send via socket
    const result = await db.execute({
      sql: 'SELECT * FROM notifications WHERE id = ?',
      args: [id],
    });
    const notification = { ...result.rows[0] };

    // Emit real-time event to the specific user
    emitToUser(userId, 'notification:new', { notification });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}