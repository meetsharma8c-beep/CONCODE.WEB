require('dotenv').config();
const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const DatabaseManager = require('./utils/DatabaseManager');
const { verifyAdmin, requestLogger, errorHandler } = require('./utils/auth');
const responses = require('./utils/responses');
const gemini = require('./utils/gemini');

// Core service modules
const gateway = require('./utils/gateway');
const studio = require('./utils/studio');
const devops = require('./utils/devops');
const migration = require('./utils/migration');

const app = express();
const db = new DatabaseManager();

// Helmet CSP Middleware - Bypass CSP on dynamically served client projects
app.use((req, res, next) => {
  if (req.path.startsWith('/project/')) {
    next();
  } else {
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })(req, res, next);
  }
});

app.use(morgan('dev'));
app.use(requestLogger);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again later.'
});
app.use('/api/', apiLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  responses.success(res, { status: 'healthy', uptime: process.uptime() });
});

// Chatbot Endpoint (Gemini integrated)
app.post('/api/chat', async (req, res) => {
  const { input, sessionId } = req.body;
  if (!input) return responses.error(res, 'Input required');

  const activeSessionId = sessionId || 'default_session';

  // Read all previous chats from database
  const allChats = await db.read('chats');
  
  // Filter for current session chats
  const sessionChats = allChats.filter(chat => chat.sessionId === activeSessionId);
  
  // Format history context for the Gemini SDK helper (last 15 messages)
  const formattedHistory = sessionChats.slice(-15).map(chat => ({
    role: chat.role || 'user',
    text: chat.text || chat.message || ''
  }));

  // Save the user message to database
  await db.insert('chats', {
    sessionId: activeSessionId,
    role: 'user',
    text: input
  });

  // Call Gemini helper to generate the reply
  const reply = await gemini.generateReply(input, formattedHistory);

  // Save the bot message to database
  const history = await db.insert('chats', {
    sessionId: activeSessionId,
    role: 'bot',
    text: reply
  });

  responses.success(res, { reply, history });
});

// ═══════════════════════════════════════
// UI/UX AI STUDIO ENDPOINT
// ═══════════════════════════════════════
app.post('/api/studio/generate', async (req, res, next) => {
  const { projectId, prompt, options } = req.body;
  if (!projectId || !prompt) return responses.error(res, 'Project ID and prompt are required');

  try {
    const result = await studio.generateWebsite(projectId, prompt, options || {});
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════
// API GATEWAY ENDPOINTS
// ═══════════════════════════════════════
app.get('/api/gateway/routes', async (req, res, next) => {
  try {
    const activeRoutes = await gateway.getRoutes();
    responses.success(res, activeRoutes);
  } catch (err) {
    next(err);
  }
});

app.post('/api/gateway/register', async (req, res, next) => {
  const { projectId, customPath, customDomain, rateLimitRpm } = req.body;
  if (!projectId) return responses.error(res, 'Project ID is required');

  try {
    const route = await gateway.registerRoute(projectId, customPath, customDomain, rateLimitRpm);
    responses.success(res, route);
  } catch (err) {
    next(err);
  }
});

app.get('/api/gateway/analytics/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const analytics = await gateway.getRouteAnalytics(projectId);
    responses.success(res, analytics);
  } catch (err) {
    next(err);
  }
});

app.get('/api/gateway/telemetry', (req, res) => {
  responses.success(res, gateway.getGatewayTelemetry());
});

app.delete('/api/gateway/route/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const result = await gateway.deleteRoute(projectId);
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════
// DEVOPS & INFRASTRUCTURE ENDPOINTS
// ═══════════════════════════════════════
app.post('/api/devops/deploy', async (req, res, next) => {
  const { projectId, cloudTarget } = req.body;
  if (!projectId) return responses.error(res, 'Project ID is required');

  try {
    const result = await devops.deployWebsite(projectId, cloudTarget || 'aws');
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/devops/logs/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const logs = await devops.getDeploymentLogs(projectId);
    responses.success(res, logs);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════
// LEGACY DATA MIGRATION ENDPOINTS
// ═══════════════════════════════════════
app.post('/api/migration/migrate', async (req, res, next) => {
  const { collection, rawData, format, mapping } = req.body;
  if (!collection || !rawData) return responses.error(res, 'Collection target and rawData are required');

  try {
    const result = await migration.migrateData(collection, rawData, format || 'json', mapping || {});
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/migration/export/:jobId', async (req, res, next) => {
  const { jobId } = req.params;
  try {
    const result = await migration.exportMigrationJob(jobId);
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════
// DYNAMIC WEB ROUTE RESOLUTION
// ═══════════════════════════════════════
app.get('/project/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    if (!req.path.endsWith('/')) {
      return res.redirect(301, `/project/${projectId}/`);
    }
    const route = await gateway.resolveRoute(projectId);
    if (route && fs.existsSync(path.join(route.localDir, 'index.html'))) {
      res.sendFile(path.join(route.localDir, 'index.html'));
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

app.get('/project/:projectId/*', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const route = await gateway.resolveRoute(projectId);
    if (route) {
      let subpath = req.params[0] || 'index.html';
      
      // Clean URLs support: Auto-resolve file without extension (e.g. /about -> about.html)
      if (subpath && !subpath.includes('.') && !subpath.endsWith('/')) {
        const htmlFilePath = path.join(route.localDir, subpath + '.html');
        if (fs.existsSync(htmlFilePath)) {
          subpath += '.html';
        }
      }
      
      const filePath = path.join(route.localDir, subpath);
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).send('Asset not found');
      }
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Contact Endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return responses.error(res, 'All fields are required');
  if (message.length < 10) return responses.error(res, 'Message must be at least 10 characters');

  const lead = await db.insert('contacts', { name, email, message });
  responses.success(res, { lead, message: 'Message stored successfully' });
});

// Inquiry Endpoint
app.post('/api/inquiry', async (req, res) => {
  const { name, email, serviceType, description } = req.body;
  if (!name || !email || !serviceType || !description) return responses.error(res, 'All fields are required');

  const inquiry = await db.insert('inquiries', { name, email, serviceType, description });
  responses.success(res, { inquiry, message: 'Inquiry registered successfully' });
});

// Admin Panel endpoints (protected)
app.get('/api/admin/dashboard', verifyAdmin, async (req, res) => {
  const contacts = await db.read('contacts');
  const inquiries = await db.read('inquiries');
  const chats = await db.read('chats');
  const deployments = await db.read('deployments');
  const routes = await db.read('routes');
  responses.success(res, {
    stats: {
      totalContacts: contacts.length,
      totalInquiries: inquiries.length,
      totalChats: chats.length,
      totalDeployments: deployments.length,
      totalRoutes: routes.length
    },
    contacts,
    inquiries
  });
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  // If request is for a missing static file or API route, return 404 instead of index.html
  if (req.path.includes('.') || req.path.startsWith('/api/')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Concode Platform Server active on port ${PORT}`);
  });
}

exports.api = onRequest({ cors: true }, app);
