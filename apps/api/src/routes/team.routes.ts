import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/team.controller';

const router = Router();

router.use(authenticate);

router.get('/live', asyncHandler(ctrl.liveTimers));

export default router;
