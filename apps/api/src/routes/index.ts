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
