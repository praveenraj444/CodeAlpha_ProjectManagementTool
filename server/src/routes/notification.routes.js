import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(getNotifications));
router.put('/read-all', asyncHandler(markAllAsRead));
router.put('/:id/read', asyncHandler(markAsRead));
router.delete('/:id', asyncHandler(deleteNotification));

export default router;