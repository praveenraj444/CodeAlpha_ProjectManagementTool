import { Router } from 'express';
import {
  listTasksByProject,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
} from '../controllers/task.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();
router.use(authenticate);

router.get('/project/:projectId', asyncHandler(listTasksByProject));
router.post('/', asyncHandler(createTask));
router.put('/:id/move', asyncHandler(moveTask));
router.put('/:id', asyncHandler(updateTask));
router.delete('/:id', asyncHandler(deleteTask));

export default router;
