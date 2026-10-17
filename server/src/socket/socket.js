import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import { queryOne } from '../config/db.js';

let io = null;

// projectId -> Map(socketId -> { id, name })
const presence = new Map();

const room = (projectId) => `project:${projectId}`;

function broadcastPresence(projectId) {
  const sockets = presence.get(projectId);
  const unique = new Map();
  sockets?.forEach((u) => unique.set(u.id, u));
  io.to(room(projectId)).emit('presence:update', {
    projectId,
    users: [...unique.values()],
  });
}

function leaveProject(socket, projectId) {
  socket.leave(room(projectId));
  socket.data.projects.delete(projectId);

  const sockets = presence.get(projectId);
  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size === 0) presence.delete(projectId);
  }
  broadcastPresence(projectId);
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT auth on handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      socket.data.user = { id: payload.id, name: payload.name };
      socket.data.projects = new Set();
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });
  

  io.on('connection', (socket) => {
        // Join user-specific room for notifications
    socket.join(`user:${socket.data.user.id}`);
    socket.on('project:join', async (projectId) => {
      try {
        if (!projectId || typeof projectId !== 'string') return;
        const project = await queryOne('SELECT id FROM projects WHERE id = ?', [projectId]);
        if (!project) return;

        socket.join(room(projectId));
        socket.data.projects.add(projectId);

        if (!presence.has(projectId)) presence.set(projectId, new Map());
        presence.get(projectId).set(socket.id, socket.data.user);

        broadcastPresence(projectId);
      } catch (err) {
        console.error('project:join failed', err);
      }
    });

    socket.on('project:leave', (projectId) => {
      if (socket.data.projects.has(projectId)) leaveProject(socket, projectId);
    });

    socket.on('disconnect', () => {
      for (const projectId of [...socket.data.projects]) {
        const sockets = presence.get(projectId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) presence.delete(projectId);
        }
        broadcastPresence(projectId);
      }
    });
  });

  return io;
}

export function emitToProject(projectId, event, payload) {
  if (io) io.to(room(projectId)).emit(event, payload);
}
export function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}
