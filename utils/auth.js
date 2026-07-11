const responses = require('./responses');

function verifyAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  const adminToken = process.env.ADMIN_TOKEN || 'admin123';
  if (token === adminToken) {
    next();
  } else {
    responses.error(res, 'Unauthorized', 401);
  }
}

function requestLogger(req, res, next) {
  console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
}

function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', err);
  responses.error(res, 'Internal Server Error', 500);
}

module.exports = {
  verifyAdmin,
  requestLogger,
  errorHandler
};
