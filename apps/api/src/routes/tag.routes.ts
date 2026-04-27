import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import * as ctrl from '../controllers/tag.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.listTags));
router.post('/', asyncHandler(ctrl.createTag));
router.delete('/:id', requireAdmin, asyncHandler(ctrl.deleteTag));

export default router;
