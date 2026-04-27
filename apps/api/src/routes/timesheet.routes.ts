import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  upsertCellSchema,
  deleteRowSchema,
  copyWeekSchema,
  createTemplateSchema,
  applyTemplateSchema,
} from '../validators/timesheet.schema';
import * as ctrl from '../controllers/timesheet.controller';

const router = Router();

router.use(authenticate);

router.get('/matrix', asyncHandler(ctrl.getMatrix));
router.get('/projects', asyncHandler(ctrl.listProjectsForRow));
router.put('/cell', validateBody(upsertCellSchema), asyncHandler(ctrl.upsertCell));
router.post('/row/delete', validateBody(deleteRowSchema), asyncHandler(ctrl.deleteRow));
router.post('/copy-week', validateBody(copyWeekSchema), asyncHandler(ctrl.copyWeek));

router.get('/templates', asyncHandler(ctrl.listTemplates));
router.post(
  '/templates',
  validateBody(createTemplateSchema),
  asyncHandler(ctrl.createTemplate),
);
router.delete('/templates/:id', asyncHandler(ctrl.deleteTemplate));
router.post(
  '/templates/:id/apply',
  validateBody(applyTemplateSchema),
  asyncHandler(ctrl.applyTemplate),
);

export default router;
