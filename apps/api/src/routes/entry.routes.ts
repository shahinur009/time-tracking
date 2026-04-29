import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  startEntrySchema,
  stopEntrySchema,
  createEntrySchema,
} from '../validators/entry.schema';
import * as ctrl from '../controllers/entry.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.listEntries));
router.get('/current', asyncHandler(ctrl.currentRunning));
router.get('/:id', asyncHandler(ctrl.getEntry));
router.post('/start', validateBody(startEntrySchema), asyncHandler(ctrl.startEntry));
router.post('/stop', validateBody(stopEntrySchema), asyncHandler(ctrl.stopEntry));
router.post(
  '/',
  requireAdmin,
  validateBody(createEntrySchema),
  asyncHandler(ctrl.createEntry),
);
router.patch('/:id', asyncHandler(ctrl.updateEntry));
router.delete('/:id', requireAdmin, asyncHandler(ctrl.deleteEntry));
router.post('/:id/push-clickup', asyncHandler(ctrl.pushToClickup));

export default router;
