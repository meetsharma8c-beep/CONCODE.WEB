const responses = require('./responses');
const jwt = require('jsonwebtoken');

let _devWarningPrinted = false;
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set and at least 32 characters long in production.');
    }
    if (!_devWarningPrinted) {
      console.warn('[AUTH] WARNING: JWT_SECRET is unset or under 32 characters. Using internal dev fallback secret.');
      _devWarningPrinted = true;
    }
    return secret && secret.length > 0 ? secret.padEnd(32, '#concode-auth-dev-secret-key#') : 'concode-default-development-jwt-secret-key-32-chars-min';
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
  // Fallback: read from httpOnly cookie set during OAuth login
  if (req.cookies && req.cookies.concode_token) return req.cookies.concode_token;
  return null;
}

async function verifyAdmin(req, res, next) {
  // Check static admin API token first (supported for admin CLI, tests, and web console)
  const adminSecretHeader = req.headers['x-admin-token'];
  const expectedAdminToken = process.env.ADMIN_TOKEN || (process.env.NODE_ENV !== 'production' ? 'admin123' : null);
  if (adminSecretHeader && expectedAdminToken && adminSecretHeader === expectedAdminToken) {
    req.user = { id: 'admin-key', role: 'admin', email: 'admin@concode.dev' };
    return next();
  }

  const token = extractToken(req);

  // In non-production environments with no token, grant dev access for convenience
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = { id: 'admin-dev', role: 'admin', email: 'admin@concode.dev' };
      return next();
    }
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
  const adminSecretHeader = req.headers['x-admin-token'];
  const expectedAdminToken = process.env.ADMIN_TOKEN || (process.env.NODE_ENV !== 'production' ? 'admin123' : null);
  if (adminSecretHeader && expectedAdminToken && adminSecretHeader === expectedAdminToken) {
    req.user = { id: 'admin-key', role: 'admin', email: 'admin@concode.dev' };
    return next();
  }

  const token = extractToken(req);

  // In non-production environments with no token, grant dev access for convenience
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = { id: 'admin-dev', role: 'admin', email: 'admin@concode.dev' };
      return next();
    }
    return responses.error(res, 'Unauthorized: Missing authentication token', 401);
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (e) {
    console.warn('verifyAuth JWT Verification Failed:', e.message);
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
  extractToken,
  requestLogger,
  errorHandler
};
