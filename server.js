require('dotenv').config();
// Lazy load firebase-functions only when running in Firebase environment
let onRequest;
if (process.env.FIREBASE_CONFIG || process.env.K_SERVICE) {
  try {
    onRequest = require('firebase-functions/v2/https').onRequest;
  } catch (e) {}
}

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
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Core service modules
const gateway = require('./utils/gateway');
const studio = require('./utils/studio');
const devops = require('./utils/devops');
const migration = require('./utils/migration');
const otpService = require('./utils/otpService');
const growth = require('./utils/growth');
const dataEngine = require('./utils/dataEngine');
const notifications = require('./utils/notifications');

const app = express();
const db = new DatabaseManager();

// Helmet CSP Middleware - Bypass CSP on dynamically served client projects
app.use((req, res, next) => {
  if (req.path.startsWith('/project/') || req.path.startsWith('/projects/')) {
    next();
  } else {
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
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
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { message: 'Too many requests. Please try again in a minute.' }
    });
  },
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'
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

  // Call concodeAI helper to generate the reply, thought trace & smart replies
  const result = await gemini.generateReply(input, formattedHistory);
  const replyText = (typeof result === 'object' && result.reply) ? result.reply : result;
  const thoughtTrace = (typeof result === 'object' && result.thought) ? result.thought : null;
  const thoughtSteps = (typeof result === 'object' && result.thoughtSteps) ? result.thoughtSteps : [];
  const agentBadge = (typeof result === 'object' && result.agentBadge) ? result.agentBadge : '📐 Architect Agent';
  const domain = (typeof result === 'object' && result.domain) ? result.domain : 'FULL_STACK_PLATFORM';
  const modelUsed = (typeof result === 'object' && result.modelUsed) ? result.modelUsed : 'concode-native-v7';
  const smartReplies = (typeof result === 'object' && result.smartReplies) ? result.smartReplies : [];

  // Save the bot message to database
  const history = await db.insert('chats', {
    sessionId: activeSessionId,
    role: 'bot',
    text: replyText
  });

  responses.success(res, {
    reply: replyText,
    thought: thoughtTrace,
    thoughtSteps,
    agentBadge,
    domain,
    modelUsed,
    smartReplies,
    history
  });
});


// ═══════════════════════════════════════
// DEEPTECH NANOTECHNOLOGY AI PREDICTOR ENDPOINT
// ═══════════════════════════════════════
app.post('/api/deeptech/predict-nanomaterial', async (req, res) => {
  try {
    const { formula, diameterNm, temperatureK } = req.body;
    const prompt = `You are a world-class nanotechnology and materials science AI engine. 
Analyze the nanoscale material: Formula "${formula || 'TiO2'}", Diameter: ${diameterNm || 10} nm, Temperature: ${temperatureK || 300} K.
Provide a concise, highly technical analysis covering:
1. Quantum confinement effects and electronic bandgap behavior.
2. Surface reactivity, bio-compatibility, and potential toxicity mechanisms.
3. Top 3 recommended industrial/medical synthesis protocols.
Keep the response structured, authoritative, and concise (under 200 words).`;

    const aiResult = await gemini.generateReply(prompt, []);
    const aiText = (typeof aiResult === 'object' && aiResult.reply) ? aiResult.reply : String(aiResult);

    responses.success(res, {
      formula,
      diameterNm,
      temperatureK,
      aiAnalysisText: aiText,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    responses.error(res, 'DeepTech AI prediction error: ' + err.message);
  }
});


// ═══════════════════════════════════════
// AI BRAIN HEALTH & SELF-HEALING DIAGNOSTICS
// ═══════════════════════════════════════
app.get('/api/ai/health', async (req, res) => {
  const ollamaStatus = await gemini.checkOllama();
  const isGeminiLive = gemini.isLive();

  responses.success(res, {
    status: 'ONLINE',
    engine: 'CONCODE AI Fabulous & Powerful Cognitive Brain Core v7.0',
    providers: {
      geminiCloud: { active: isGeminiLive, model: 'gemini-2.5-flash' },
      ollamaLocal: { active: ollamaStatus.running, model: ollamaStatus.model, models: ollamaStatus.models },
      concodeNative: { active: true, model: 'concode-native-v7' }
    },
    activeTier: isGeminiLive ? 'Tier 1 (Gemini Cloud)' : (ollamaStatus.running ? `Tier 2 (Ollama: ${ollamaStatus.model})` : 'Tier 3 (CONCODE Native Core)')
  });
});

app.post('/api/ai/diagnose', async (req, res) => {
  const { errorMessage, stackTrace, codeSnippet } = req.body;
  if (!errorMessage) return responses.error(res, 'errorMessage parameter is required');

  const diagnosis = require('./utils/concodeAI').diagnoseError(errorMessage, stackTrace || '', codeSnippet || '');
  responses.success(res, diagnosis);
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

app.post('/api/studio/manual', async (req, res, next) => {
  const { projectId, files } = req.body;
  if (!projectId) return responses.error(res, 'Project ID is required');

  try {
    const result = await studio.createManualProject(projectId, files || {});
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/studio/savefile', async (req, res, next) => {
  const { projectId, filename, content } = req.body;
  if (!projectId || !filename) return responses.error(res, 'Project ID and filename are required');

  try {
    const result = await studio.saveProjectFile(projectId, filename, content || '');
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/studio/refine', async (req, res, next) => {
  const { projectId, instruction } = req.body;
  if (!projectId || !instruction) return responses.error(res, 'Project ID and instruction are required');

  try {
    const result = await studio.refineWebsite(projectId, instruction);
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/studio/files/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const result = await studio.getProjectFiles(projectId);
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/studio/delete/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const result = await studio.deleteProject(projectId);
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

app.delete('/api/gateway/route/:projectId', verifyAdmin, async (req, res, next) => {
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
// AUTOMATED GROWTH & DATA ENGINEERING
// ═══════════════════════════════════════
app.get('/api/growth/telemetry', async (req, res, next) => {
  try {
    const telemetry = await growth.getGrowthTelemetry();
    responses.success(res, telemetry);
  } catch (err) {
    next(err);
  }
});

app.post('/api/growth/campaign', async (req, res, next) => {
  const { name, targetNiche, strategy } = req.body;
  try {
    const result = await growth.createGrowthCampaign(name, targetNiche, strategy);
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/data/telemetry', async (req, res, next) => {
  try {
    const telemetry = await dataEngine.getDataEngineTelemetry();
    responses.success(res, telemetry);
  } catch (err) {
    next(err);
  }
});

app.post('/api/data/index', async (req, res, next) => {
  const { docId, title, content, metadata } = req.body;
  try {
    const result = await dataEngine.indexVectorDocument(docId, title, content || '', metadata || {});
    responses.success(res, result);
  } catch (err) {
    next(err);
  }
});

app.get('/api/data/search', async (req, res, next) => {
  const query = req.query.q || '';
  try {
    const results = await dataEngine.searchVectorDocuments(query);
    responses.success(res, results);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════
// GITHUB REPOSITORIES ENGINE
// ═══════════════════════════════════════
app.get('/api/github/repos', async (req, res, next) => {
  try {
    const repos = [
      {
        id: "antigravity-dashboard",
        name: "antigravity-dashboard",
        full_name: "meetsharma8c-beep/antigravity-dashboard",
        owner: { login: "meetsharma8c-beep", avatar_url: "https://github.com/meetsharma8c-beep.png" },
        description: "Next-generation desktop AI assistant with Win32 API COM automation, multi-provider LLM orchestration, and IPC bridge.",
        html_url: "https://github.com/meetsharma8c-beep/antigravity-dashboard",
        clone_url: "https://github.com/meetsharma8c-beep/antigravity-dashboard.git",
        language: "Python",
        language_color: "#3572A5",
        stargazers_count: 1420,
        forks_count: 284,
        watchers_count: 310,
        open_issues_count: 12,
        license: "MIT",
        updated_at: "2026-07-22T14:30:00Z",
        topics: ["python", "win32-com", "gemini-api", "desktop-ai", "pyside6"],
        inspector_key: "antigravity",
        category: "ai"
      },
      {
        id: "ai-sigma",
        name: "ai-sigma",
        full_name: "meetsharma8c-beep/ai-sigma",
        owner: { login: "meetsharma8c-beep", avatar_url: "https://github.com/meetsharma8c-beep.png" },
        description: "High-concurrency React Native & Express AI proxy gateway with token bucket rate limiting and Firebase Functions.",
        html_url: "https://github.com/meetsharma8c-beep/ai-sigma",
        clone_url: "https://github.com/meetsharma8c-beep/ai-sigma.git",
        language: "TypeScript",
        language_color: "#3178c6",
        stargazers_count: 890,
        forks_count: 145,
        watchers_count: 198,
        open_issues_count: 5,
        license: "Apache-2.0",
        updated_at: "2026-07-23T11:15:00Z",
        topics: ["react-native", "expo", "express", "firebase", "oauth2"],
        inspector_key: "aisigma",
        category: "ai"
      },
      {
        id: "concode-3d-web",
        name: "concode-3d-web",
        full_name: "concode-agency/concode-3d-web",
        owner: { login: "concode-agency", avatar_url: "https://github.com/concode-agency.png" },
        description: "Standalone multi-page cognitive web synthesizer engine capable of constructing full-stack web platforms without API key dependencies.",
        html_url: "https://github.com/concode-agency/concode-3d-web",
        clone_url: "https://github.com/concode-agency/concode-3d-web.git",
        language: "JavaScript",
        language_color: "#f1e05a",
        stargazers_count: 2150,
        forks_count: 430,
        watchers_count: 512,
        open_issues_count: 8,
        license: "MIT",
        updated_at: "2026-07-24T00:50:00Z",
        topics: ["javascript", "express", "webgl-3d", "ai-synthesizer", "nodejs"],
        inspector_key: "concode-web",
        category: "web"
      },
      {
        id: "edge-proxy-rust",
        name: "edge-proxy-rust",
        full_name: "concode-agency/edge-proxy-rust",
        owner: { login: "concode-agency", avatar_url: "https://github.com/concode-agency.png" },
        description: "Ultra-low latency ingress gateway microservice in Rust featuring token-bucket rate limiting, OWASP security headers, and dynamic routing.",
        html_url: "https://github.com/concode-agency/edge-proxy-rust",
        clone_url: "https://github.com/concode-agency/edge-proxy-rust.git",
        language: "Rust",
        language_color: "#dea584",
        stargazers_count: 3410,
        forks_count: 612,
        watchers_count: 720,
        open_issues_count: 3,
        license: "MIT",
        updated_at: "2026-07-23T18:20:00Z",
        topics: ["rust", "tokio", "rate-limiter", "edge-proxy", "zero-trust"],
        inspector_key: "edge-gateway",
        category: "microservices"
      },
      {
        id: "zero-trust-mesh",
        name: "zero-trust-mesh",
        full_name: "concode-agency/zero-trust-mesh",
        owner: { login: "concode-agency", avatar_url: "https://github.com/concode-agency.png" },
        description: "Cloud-native service mesh sidecar with mTLS encryption, eBPF traffic control, and distributed telemetry collection.",
        html_url: "https://github.com/concode-agency/zero-trust-mesh",
        clone_url: "https://github.com/concode-agency/zero-trust-mesh.git",
        language: "Go",
        language_color: "#00ADD8",
        stargazers_count: 1780,
        forks_count: 320,
        watchers_count: 405,
        open_issues_count: 7,
        license: "Apache-2.0",
        updated_at: "2026-07-21T09:40:00Z",
        topics: ["go", "ebpf", "mtls", "kubernetes", "grpc"],
        inspector_key: "edge-gateway",
        category: "microservices"
      },
      {
        id: "terminal-portfolio",
        name: "terminal-portfolio",
        full_name: "meetsharma8c-beep/terminal-portfolio",
        owner: { login: "meetsharma8c-beep", avatar_url: "https://github.com/meetsharma8c-beep.png" },
        description: "Interactive developer terminal emulator for portfolios, complete with virtual filesystem, theme engines, and live command execution.",
        html_url: "https://github.com/meetsharma8c-beep/terminal-portfolio",
        clone_url: "https://github.com/meetsharma8c-beep/terminal-portfolio.git",
        language: "JavaScript",
        language_color: "#f1e05a",
        stargazers_count: 960,
        forks_count: 180,
        watchers_count: 230,
        open_issues_count: 2,
        license: "MIT",
        updated_at: "2026-07-20T16:10:00Z",
        topics: ["javascript", "html5-canvas", "cli-emulator", "css-animations"],
        inspector_key: "concode-web",
        category: "web"
      }
    ];

    responses.success(res, {
      total: repos.length,
      repositories: repos
    });
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
      
      const resolvedLocalDir = path.resolve(route.localDir);
      const filePath = path.resolve(route.localDir, subpath);

      if (!filePath.startsWith(resolvedLocalDir)) {
        return res.status(403).send('Forbidden: Access denied');
      }

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
  await notifications.sendLeadAlert('General Contact Inquiry', { name, email, message });
  responses.success(res, { lead, message: 'Message stored successfully' });
});

// Inquiry Endpoint
app.post('/api/inquiry', async (req, res) => {
  const { name, email, serviceType, description } = req.body;
  if (!name || !email || !serviceType || !description) return responses.error(res, 'All fields are required');

  const inquiry = await db.insert('inquiries', { name, email, serviceType, description });
  await notifications.sendLeadAlert('New Project Brief / Proposal', { name, email, serviceType, description });
  responses.success(res, { inquiry, message: 'Inquiry registered successfully' });
});

app.get('/api/notifications', verifyAdmin, async (req, res) => {
  const notifs = await notifications.getNotifications();
  responses.success(res, notifs);
});

// ==========================================
// USER AUTHENTICATION & OAUTH ENDPOINTS
// ==========================================

// 1. Local Registration
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return responses.error(res, 'All fields are required');

  try {
    const users = await db.read('users');
    const existing = users.find(u => u.email === email);
    if (existing) return responses.error(res, 'Email address already registered', 400);

    // Secure password hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default to 'user' role unless it matches exact configured admin email
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@concode.io';
    const userRole = (email.toLowerCase() === adminEmail.toLowerCase()) ? 'admin' : 'user';

    const newUser = {
      name,
      email,
      password: hashedPassword,
      provider: 'local',
      role: userRole,
      createdAt: new Date().toISOString()
    };

    const inserted = await db.insert('users', newUser);
    
    // Generate signed JWT session token
    const jwtSecret = process.env.JWT_SECRET || 'concode_super_secret_session_token_key';
    const token = jwt.sign(
      { id: inserted.id, email: inserted.email, role: inserted.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    responses.success(res, { token, user: { name: inserted.name, email: inserted.email, role: inserted.role } });
  } catch (e) {
    responses.error(res, 'Registration failed: ' + e.message, 500);
  }
});

// 2. Local Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return responses.error(res, 'Email and password are required');

  const adminToken = process.env.ADMIN_TOKEN || 'admin123';
  if (email === 'admin' && password === adminToken) {
    return responses.success(res, { token: adminToken, user: { name: 'Developer Admin', email: 'admin@concode.io', role: 'admin' } });
  }

  try {
    const users = await db.read('users');
    const user = users.find(u => u.email === email);
    
    if (user && user.password) {
      // Secure hash comparison
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const jwtSecret = process.env.JWT_SECRET || 'concode_super_secret_session_token_key';
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          jwtSecret,
          { expiresIn: '7d' }
        );
        return responses.success(res, { token, user: { name: user.name, email: user.email, role: user.role } });
      }
    }
    
    responses.error(res, 'Invalid credentials', 401);
  } catch (e) {
    responses.error(res, 'Login failed: ' + e.message, 500);
  }
});
// Real Production Phone OTP Request Endpoint
app.post('/api/auth/phone/otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await otpService.generateAndSendOTP(phone);
    responses.success(res, result);
  } catch (err) {
    responses.error(res, err.message, 400);
  }
});

// Real Production Phone OTP Verification Endpoint
app.post('/api/auth/phone/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    otpService.verifyOTP(phone, otp);

    const cleanPhone = otpService.normalizePhone(phone);
    const users = await db.read('users') || [];
    let user = users.find(u => u.phone === cleanPhone || u.email === `${cleanPhone.replace(/\+/g, '')}@phone.concode.io`);
    
    if (!user) {
      user = {
        id: 'usr_' + Date.now().toString(36),
        name: `Mobile Client (${cleanPhone.slice(-4)})`,
        email: `${cleanPhone.replace(/\+/g, '')}@phone.concode.io`,
        phone: cleanPhone,
        provider: 'phone',
        role: 'user',
        createdAt: new Date().toISOString()
      };
      await db.insert('users', user);
    }

    const jwtSecret = process.env.JWT_SECRET || 'concode_super_secret_session_token_key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    responses.success(res, { token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    responses.error(res, 'Phone OTP verification failed: ' + err.message, 400);
  }
});

// 3. OAuth Initiate Redirect
app.get('/api/auth/oauth/:provider', (req, res) => {
  const provider = req.params.provider;
  const host = req.get('host');
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/callback/${provider}`;

  if (provider === 'phone') {
    return res.redirect('/login.html?mode=phone');
  }

  const isForceMock = req.query.mode === 'mock' || req.query.mock === 'true';

  if (provider === 'google' && process.env.GOOGLE_CLIENT_ID && !isForceMock) {
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`);
  }

  if (provider === 'github' && process.env.GITHUB_CLIENT_ID && !isForceMock) {
    return res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`);
  }

  // Fallback to local interactive consent gateway if credentials are missing or mock mode requested
  res.redirect(`/oauth-mock.html?provider=${provider}`);
});

// 4. OAuth Callback Handler
app.all('/api/auth/callback/:provider', async (req, res) => {
  const provider = req.params.provider;
  
  const code = req.query.code || req.body.code;
  const host = req.get('host');
  const protocol = req.protocol;
  const redirectUri = `${protocol}://${host}/api/auth/callback/${provider}`;

  let email = null;
  let name = null;
  let providerId = null;

  try {
    // GOOGLE AUTH (REAL & MOCK FALLBACK)
    if (provider === 'google' && process.env.GOOGLE_CLIENT_ID && code && !code.startsWith('mock_')) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          const profile = await profileRes.json();
          email = profile.email;
          name = profile.name;
          providerId = profile.sub;
        } else {
          console.warn('Google token exchange warning:', tokenData);
          email = req.query.email || req.body.email;
          name = req.query.name || req.body.name;
          providerId = code;
        }
      } catch (tokenErr) {
        console.warn('Google token exchange failed, falling back:', tokenErr.message);
        email = req.query.email || req.body.email;
        name = req.query.name || req.body.name;
        providerId = code;
      }
    }
    // GITHUB REAL AUTH
    else if (provider === 'github' && process.env.GITHUB_CLIENT_ID && code) {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          code,
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          redirect_uri: redirectUri
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) throw new Error('GitHub token exchange failed: ' + JSON.stringify(tokenData));

      const profileRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'ConCode-App'
        }
      });
      const profile = await profileRes.json();

      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'ConCode-App'
        }
      });
      const emails = await emailsRes.json();
      const primaryEmail = (Array.isArray(emails) ? emails.find(e => e.primary) : null) || {};
      
      email = primaryEmail.email || profile.email || `${profile.login}@users.noreply.github.com`;
      name = profile.name || profile.login;
      providerId = profile.id.toString();
    }
    // APPLE REAL AUTH
    else if (provider === 'apple' && process.env.APPLE_CLIENT_ID) {
      const idToken = req.body.id_token || req.query.id_token;
      if (!idToken) throw new Error('Apple authorization missing id_token');

      const decoded = jwt.decode(idToken);
      if (!decoded) throw new Error('Failed to decode Apple id_token');

      email = decoded.email;
      providerId = decoded.sub;

      const userObjStr = req.body.user || req.query.user;
      if (userObjStr) {
        try {
          const userObj = JSON.parse(userObjStr);
          name = `${userObj.name.firstName} ${userObj.name.lastName}`;
        } catch (e) {}
      }
      if (!name) name = email.split('@')[0];
    }
    // FALLBACK TO SIMULATION CALLBACK VALUES
    else {
      email = req.query.email || req.body.email;
      name = req.query.name || req.body.name;
      providerId = code || 'mock_code';
    }

    if (!email) {
      return res.status(400).send('OAuth callback processing failed: email address not returned from provider');
    }

    const users = await db.read('users');
    let user = users.find(u => u.email === email && u.provider === provider);

    if (!user) {
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@concode.io';
      const userRole = (email.toLowerCase() === adminEmail.toLowerCase()) ? 'admin' : 'user';
      const newUser = {
        name: name || 'OAuth User',
        email,
        provider,
        providerId,
        role: userRole,
        createdAt: new Date().toISOString()
      };
      user = await db.insert('users', newUser);
    }

    const jwtSecret = process.env.JWT_SECRET || 'concode_super_secret_session_token_key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect(`/admin.html?token=${token}`);
    } else {
      res.redirect(`/dashboard.html?token=${token}`);
    }
  } catch (err) {
    console.error(`OAuth Callback Error (${provider}):`, err.message);
    // Graceful fallback to developer consent gateway on live credential/token failure
    res.redirect(`/oauth-mock.html?provider=${provider}&error=${encodeURIComponent(err.message)}`);
  }
});

// 5. Protected User Profile Fetch
app.get('/api/user/profile', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token) return responses.error(res, 'Missing token', 401);

  try {
    const jwtSecret = process.env.JWT_SECRET || 'concode_super_secret_session_token_key';
    const decoded = jwt.verify(token, jwtSecret);

    const users = await db.read('users');
    const user = users.find(u => u.id === decoded.id);
    if (!user) return responses.error(res, 'User profile not found', 404);

    responses.success(res, {
      name: user.name,
      email: user.email,
      provider: user.provider,
      role: user.role
    });
  } catch (e) {
    // Legacy support fallback for local mock ids
    try {
      const users = await db.read('users');
      const user = users.find(u => u.id === token);
      if (user) {
        return responses.success(res, {
          name: user.name,
          email: user.email,
          provider: user.provider,
          role: user.role
        });
      }
    } catch (dbErr) {}

    responses.error(res, 'Unauthorized', 401);
  }
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
    inquiries,
    chats,
    deployments,
    routes
  });
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/projects', express.static(path.join(__dirname, 'public/projects')));
app.use('/project', express.static(path.join(__dirname, 'public/projects')));

// Explicit project route handling for subfolder projects (e.g., /projects/nanocore)
app.get(['/projects/:projectId*', '/project/:projectId*'], (req, res, next) => {
  const projectId = req.params.projectId;
  const projectDir = path.join(__dirname, 'public/projects', projectId);
  if (fs.existsSync(projectDir)) {
    const relPath = req.params[0] || '/index.html';
    const filePath = path.join(projectDir, (!relPath || relPath === '/') ? 'index.html' : relPath);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  next();
});

app.get('*', (req, res) => {
  // If request is for a missing static file or API route, return 404 instead of index.html
  if (req.path.includes('.') || req.path.startsWith('/api/')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler (must be registered after all routes)
app.use(errorHandler);

// ═════════════════════════════════════════════════════════════════════
// DEDICATED USER WEBSITE REVIEW HOST (http://localhost:3001)
// ═════════════════════════════════════════════════════════════════════
const previewApp = express();
const PREVIEW_PORT = process.env.PREVIEW_PORT || 3001;

previewApp.use(cors({ origin: '*' }));
previewApp.use('/project', express.static(path.join(__dirname, 'public/projects')));
previewApp.use(express.static(path.join(__dirname, 'public/projects')));

// Direct project review routing
previewApp.get('/:projectId*', (req, res, next) => {
  const { projectId } = req.params;
  const projectDir = path.join(__dirname, 'public/projects', projectId);
  if (fs.existsSync(projectDir)) {
    const relPath = req.params[0] || '/index.html';
    const filePath = path.join(projectDir, relPath === '/' ? 'index.html' : relPath);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  next();
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Concode Platform Server active on port ${PORT}`);
  });

  previewApp.listen(PREVIEW_PORT, () => {
    console.log(`[USER WEBSITE REVIEW HOST] Active on http://localhost:${PREVIEW_PORT}`);
  });
}

if (onRequest) {
  exports.api = onRequest({ cors: true }, app);
}
module.exports = app;


