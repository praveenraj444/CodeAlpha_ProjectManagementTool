import { Router } from 'express';
import { register, login, me, listUsers } from '../controllers/auth.controller.js';
import { acceptInvite } from '../controllers/invite.controller.js'; // NEW IMPORT
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));
router.get('/users', authenticate, asyncHandler(listUsers));

// NEW ROUTE: Accept Invite
router.post('/invite/:token/accept', authenticate, asyncHandler(acceptInvite));

export default router;