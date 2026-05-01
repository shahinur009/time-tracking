import { Router } from 'express';
import auth from './auth.routes';
import users from './user.routes';
import projects from './project.routes';
import clients from './client.routes';
import tags from './tag.routes';
import entries from './entry.routes';
import reports from './report.routes';
import calendar from './calendar.routes';
import timesheet from './timesheet.routes';
import team from './team.routes';
import clickup from './clickup.routes';
import { asyncHandler } from '../utils/asyncHandler';
import { webhookHandler } from '../controllers/clickup.controller';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'success',
    name: 'time-tracker-api',
    version: '0.1.0',
    docs: 'See PROJECT_PLAN.md section 7 for endpoints',
    endpoints: [
      '/health',
      '/auth',
      '/users',
      '/projects',
      '/clients',
      '/tags',
      '/entries',
      '/reports',
      '/calendar',
      '/timesheet',
      '/team',
      '/clickup',
    ],
  });
});

router.get('/health', (_req, res) => {
  res.json({ status: 'success', uptime: process.uptime() });
});

router.get('/__build', (_req, res) => {
  const stack: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.stack.forEach((layer: any) => {
    if (layer.route) {
      stack.push(
        `${Object.keys(layer.route.methods || {}).join(',').toUpperCase()} ${
          layer.route.path
        }`,
      );
    } else if (layer.regexp) {
      stack.push(`USE ${layer.regexp.toString()}`);
    }
  });
  res.json({
    status: 'success',
    buildStamp: '2026-05-02-v2-webhook-fix',
    routes: stack,
  });
});

router.post('/webhooks/clickup', asyncHandler(webhookHandler));

router.use('/auth', auth);
router.use('/users', users);
router.use('/projects', projects);
router.use('/clients', clients);
router.use('/tags', tags);
router.use('/entries', entries);
router.use('/reports', reports);
router.use('/calendar', calendar);
router.use('/timesheet', timesheet);
router.use('/team', team);
router.use('/clickup', clickup);

export default router;
