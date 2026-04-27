import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/report.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', asyncHandler(ctrl.summary));
router.get('/detailed', asyncHandler(ctrl.detailed));
router.get('/weekly', asyncHandler(ctrl.weekly));

export default router;
