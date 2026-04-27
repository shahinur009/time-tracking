import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/calendar.controller';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(ctrl.calendar));

export default router;
