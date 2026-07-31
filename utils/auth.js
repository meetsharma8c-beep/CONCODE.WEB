const responses = require('./responses');
const DatabaseManager = require('./DatabaseManager');
const jwt = require('jsonwebtoken');
const db = new DatabaseManager();

async function verifyAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  const adminToken = process.env.ADMIN_TOKEN || 'admin123';
  if (token === adminToken) {
    return next();
  }
  
  if (token) {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'concode_super_secret_session_token_key';
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      if (decoded.role === 'admin') {
        return next();
      }
    } catch (e) {
      console.warn('verifyAdmin JWT Verification Failed:', e.message);
    }
  }
  
  responses.error(res, 'Unauthorized', 401);
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
