const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const ENTRY_STATUS = {
  RUNNING: 'running',
  FINISHED: 'finished',
};

const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

const PROJECT_COLORS = [
  '#FF5F5F',
  '#FFB84D',
  '#F2E750',
  '#7ED957',
  '#4DC9FF',
  '#5B8FF9',
  '#9B5BFF',
  '#FF5BCF',
  '#8C8C8C',
];

module.exports = {
  ROLES,
  USER_STATUS,
  ENTRY_STATUS,
  HTTP_METHODS,
  PROJECT_COLORS,
};
