import { Router } from 'express';
import {
  listCommentsByTask,
  createComment,
  deleteComment,
} from '../controllers/comment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();
router.use(authenticate);

router.get('/task/:taskId', asyncHandler(listCommentsByTask));
router.post('/', asyncHandler(createComment));
router.delete('/:id', asyncHandler(deleteComment));

export default router;
