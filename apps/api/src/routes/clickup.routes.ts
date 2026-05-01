import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/clickup.controller';

const router = Router();

router.use(authenticate);

router.get('/status', asyncHandler(ctrl.status));
router.get('/teams', asyncHandler(ctrl.teams));
router.get('/tasks', asyncHandler(ctrl.listTasks));
router.post('/sync', asyncHandler(ctrl.sync));
router.post('/sync-entries', asyncHandler(ctrl.syncEntries));
router.post('/auto-push', asyncHandler(ctrl.setAutoPush));
router.post('/connect-token', asyncHandler(ctrl.connectPersonalToken));
router.delete('/disconnect', asyncHandler(ctrl.disconnect));

export default router;
