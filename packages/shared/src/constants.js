const AUTH_KEY = '_tt_auth';
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

const PER_PAGE = 20;

const API_PATHS = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',

  // Users
  USERS: '/users',

  // Projects
  PROJECTS: '/projects',

  // Tags
  TAGS: '/tags',

  // Entries
  ENTRIES: '/entries',
  ENTRY_START: '/entries/start',
  ENTRY_STOP: '/entries/stop',

  // Reports
  REPORT_SUMMARY: '/reports/summary',
  REPORT_DETAILED: '/reports/detailed',
  REPORT_WEEKLY: '/reports/weekly',

  // Calendar
  CALENDAR: '/calendar',

  // ClickUp (phase 2)
  CLICKUP_AUTH: '/auth/clickup',
  CLICKUP_CALLBACK: '/auth/clickup/callback',
  CLICKUP_SYNC: '/clickup/sync',
  CLICKUP_TASKS: '/clickup/tasks',
};

module.exports = {
  AUTH_KEY,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  PER_PAGE,
  API_PATHS,
};
