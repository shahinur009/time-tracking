import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  createClientSchema,
  updateClientSchema,
} from '../validators/client.schema';
import * as ctrl from '../controllers/client.controller';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(ctrl.listClients));
router.post(
  '/',
  requireAdmin,
  validateBody(createClientSchema),
  asyncHandler(ctrl.createClient),
);
router.patch(
  '/:id',
  requireAdmin,
  validateBody(updateClientSchema),
  asyncHandler(ctrl.updateClient),
);
router.delete('/:id', requireAdmin, asyncHandler(ctrl.deleteClient));

export default router;
