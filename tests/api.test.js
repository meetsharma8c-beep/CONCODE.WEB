/**
 * CONCODE.WEB — API Integration Tests
 * ====================================
 * Tests critical API endpoints for correct behavior, status codes,
 * input validation, and error handling.
 *
 * Run: npm test
 */

const request = require('supertest');
const app = require('../server');

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
describe('GET /api/health', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.uptime).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// Chat Endpoint
// ─────────────────────────────────────────────
describe('POST /api/chat', () => {
  it('should return error when input is missing', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error when input exceeds 10,000 characters', async () => {
    const longInput = 'a'.repeat(10001);
    const res = await request(app)
      .post('/api/chat')
      .send({ input: longInput });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should process valid chat input', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ input: 'Hello, what is JavaScript?', sessionId: 'test_session' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toBeDefined();
    expect(res.body.data.responseTimeMs).toBeDefined();
  }, 30000); // Extended timeout for AI inference
});

// ─────────────────────────────────────────────
// AI Brain Health
// ─────────────────────────────────────────────
describe('GET /api/ai/health', () => {
  it('should return AI engine status', async () => {
    const res = await request(app).get('/api/ai/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ONLINE');
    expect(res.body.data.providers).toBeDefined();
    expect(res.body.data.activeTier).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// Brain Endpoints
// ─────────────────────────────────────────────
describe('GET /api/brain/health', () => {
  it('should return brain health status', async () => {
    const res = await request(app).get('/api/brain/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.online).toBe(true);
    expect(res.body.jsBrainActive).toBe(true);
  });
});

describe('GET /api/brain/guilds', () => {
  it('should return guild list', async () => {
    const res = await request(app).get('/api/brain/guilds');
    expect(res.statusCode).toBe(200);
    expect(res.body.guilds).toBeDefined();
    expect(Array.isArray(res.body.guilds)).toBe(true);
    expect(res.body.guilds.length).toBeGreaterThan(0);
  });
});

describe('GET /api/brain/emotion', () => {
  it('should return emotional telemetry', async () => {
    const res = await request(app).get('/api/brain/emotion');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
  });
});

// ─────────────────────────────────────────────
// Brain Code Generation
// ─────────────────────────────────────────────
describe('POST /api/brain/generate-code', () => {
  it('should reject request without prompt', async () => {
    const res = await request(app)
      .post('/api/brain/generate-code')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should generate code for valid prompt', async () => {
    const res = await request(app)
      .post('/api/brain/generate-code')
      .send({ prompt: 'Create a hello world function' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Authentication Endpoints
// ─────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('should reject registration without required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should register a new user with valid data', async () => {
    const uniqueEmail = `test_${Date.now()}@jest.test`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jest Test User',
        email: uniqueEmail,
        password: 'TestPassword123!'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'].join(';')).toMatch(/concode_token=.*HttpOnly/);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.user.email).toBe(uniqueEmail);
  });
});

describe('POST /api/auth/login', () => {
  it('should reject login without credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'wrong' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Contact & Inquiry Endpoints
// ─────────────────────────────────────────────
describe('POST /api/contact', () => {
  it('should reject contact without required fields', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Test' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject contact with short message', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Test', email: 'test@test.com', message: 'Hi' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Studio Endpoints (require auth)
// ─────────────────────────────────────────────
describe('POST /api/studio/generate', () => {
  it('should reject without project ID and prompt', async () => {
    const res = await request(app)
      .post('/api/studio/generate')
      .set('x-admin-token', 'admin123')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Gateway Endpoints
// ─────────────────────────────────────────────
describe('GET /api/gateway/routes', () => {
  it('should return routes list', async () => {
    const res = await request(app).get('/api/gateway/routes');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/gateway/telemetry', () => {
  it('should return gateway telemetry', async () => {
    const res = await request(app).get('/api/gateway/telemetry');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// GitHub Repos (hardcoded showcase)
// ─────────────────────────────────────────────
describe('GET /api/github/repos', () => {
  it('should return repositories list', async () => {
    const res = await request(app).get('/api/github/repos');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.repositories).toBeDefined();
    expect(res.body.data.total).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Static Frontend Serving
// ─────────────────────────────────────────────
describe('Frontend Static Serving', () => {
  it('should serve index.html at root', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('should return 404 for missing static files', async () => {
    const res = await request(app).get('/nonexistent-file.xyz');
    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────
// Guild Routing Diversity
// ─────────────────────────────────────────────
describe('Guild Routing Diversity', () => {
  it('should route 7 diverse queries to multiple unique specialized agent guilds', async () => {
    const queries = [
      'How do I build a 3D WebGL particle scene with Three.js?',
      'How do I optimize MongoDB query indexing and schema design?',
      'How do I deploy a containerized app with Docker and Kubernetes?',
      'How do I configure JWT auth tokens and defend against XSS security flaws?',
      'How do I write unit tests and assertions with Jest?',
      'How do I build a rate limit REST API endpoint middleware?',
      'How do I profile performance latency and reduce memory bottleneck?'
    ];

    const badges = new Set();
    const domains = new Set();

    for (const query of queries) {
      const res = await request(app)
        .post('/api/chat')
        .send({ input: query, sessionId: 'guild_diversity_session' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      if (res.body.data.agentBadge) badges.add(res.body.data.agentBadge);
      if (res.body.data.domain) domains.add(res.body.data.domain);
    }

    // Expect high guild routing diversity (at least 5 unique specialist agent guilds for 7 queries)
    expect(badges.size).toBeGreaterThanOrEqual(5);
    expect(domains.size).toBeGreaterThanOrEqual(5);
  }, 45000);
});
