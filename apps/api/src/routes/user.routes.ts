import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  updateRoleSchema,
} from '../validators/user.schema';
import * as ctrl from '../controllers/user.controller';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', asyncHandler(ctrl.listUsers));
router.get('/:id', asyncHandler(ctrl.getUser));
router.post('/', validateBody(createUserSchema), asyncHandler(ctrl.createUser));
router.patch('/:id', validateBody(updateUserSchema), asyncHandler(ctrl.updateUser));
router.patch('/:id/role', validateBody(updateRoleSchema), asyncHandler(ctrl.updateRole));
router.delete('/:id', asyncHandler(ctrl.deleteUser));

export default router;
