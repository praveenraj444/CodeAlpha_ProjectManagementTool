import { Router } from 'express';
import {
  listProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';
import { listMembers, addMember, removeMember } from '../controllers/member.controller.js';
import { generateInviteLink } from '../controllers/invite.controller.js'; // NEW IMPORT
import { authenticate } from '../middleware/auth.js';
import { requireMember, requireOwner, requireEditor } from '../middleware/projectAccess.js'; // requireEditor added
import { asyncHandler } from '../middleware/error.js';

const router = Router();
router.use(authenticate); 

// Project CRUD
router.get('/', asyncHandler(listProjects));
router.post('/', asyncHandler(createProject));

// Access checks
router.get('/:id', requireMember, asyncHandler(getProjectById));
router.put('/:id', requireOwner, asyncHandler(updateProject));
router.delete('/:id', requireOwner, asyncHandler(deleteProject));

// Member Management Routes
router.get('/:id/members', requireMember, asyncHandler(listMembers));
router.post('/:id/members', requireOwner, asyncHandler(addMember));
router.delete('/:id/members/:userId', requireOwner, asyncHandler(removeMember));

// NEW ROUTE: Invite Link (Editor & Owner can generate)
router.post('/:id/invite-link', requireEditor, asyncHandler(generateInviteLink));

export default router;