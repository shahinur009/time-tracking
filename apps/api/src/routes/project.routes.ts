import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  taskSchema,
} from '../validators/project.schema';
import * as ctrl from '../controllers/project.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.listProjects));
router.post(
  '/',
  requireAdmin,
  validateBody(createProjectSchema),
  asyncHandler(ctrl.createProject),
);
router.patch(
  '/:id',
  requireAdmin,
  validateBody(updateProjectSchema),
  asyncHandler(ctrl.updateProject),
);
router.delete('/:id', requireAdmin, asyncHandler(ctrl.deleteProject));

router.post(
  '/:id/tasks',
  validateBody(taskSchema),
  asyncHandler(ctrl.addTask),
);
router.patch(
  '/:id/tasks/:taskId',
  validateBody(taskSchema.partial()),
  asyncHandler(ctrl.updateTask),
);
router.delete('/:id/tasks/:taskId', asyncHandler(ctrl.deleteTask));

router.post('/:id/favorite', asyncHandler(ctrl.toggleFavorite));

export default router;
