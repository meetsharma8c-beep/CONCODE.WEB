const responses = require('./responses');
const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set and at least 32 characters long.');
  }
  return secret;
}

function extractToken(req) {
  if (req.headers['x-admin-token']) return req.headers['x-admin-token'];
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) return authHeader.substring(7).trim();
    return authHeader.trim();
  }
  return null;
}

async function verifyAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return responses.error(res, 'Unauthorized: Missing authentication token', 401);
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    if (decoded.role === 'admin') {
      return next();
    }
    return responses.error(res, 'Forbidden: Admin access required', 403);
  } catch (e) {
    console.warn('verifyAdmin JWT Verification Failed:', e.message);
    return responses.error(res, 'Unauthorized: Invalid or expired token', 401);
  }
}

/**
 * Middleware to verify any authenticated user (admin or regular).
 */
async function verifyAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return responses.error(res, 'Unauthorized: Missing authentication token', 401);
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (e) {
    return responses.error(res, 'Unauthorized: Invalid or expired token', 401);
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
  verifyAuth,
  getJwtSecret,
  requestLogger,
  errorHandler
};
