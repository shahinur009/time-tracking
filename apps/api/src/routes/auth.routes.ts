import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../validators/auth.schema';
import * as ctrl from '../controllers/auth.controller';
import * as clickup from '../controllers/clickup.controller';

const router = Router();

router.post('/register', validateBody(registerSchema), asyncHandler(ctrl.register));
router.post('/login', validateBody(loginSchema), asyncHandler(ctrl.login));
router.post('/refresh', validateBody(refreshSchema), asyncHandler(ctrl.refresh));
router.post('/logout', asyncHandler(ctrl.logout));
router.get('/me', authenticate, asyncHandler(ctrl.me));

router.get('/clickup', asyncHandler(clickup.authorize));
router.get('/clickup/callback', asyncHandler(clickup.callback));

export default router;
