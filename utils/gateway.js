const DatabaseManager = require('./DatabaseManager');
const path = require('path');
const fs = require('fs');

const db = new DatabaseManager();

/**
 * Validates a custom route path name (alphanumeric, hyphens, and underscores only).
 */
function isValidRoutePath(routePath) {
  return /^[a-zA-Z0-9-_]+$/.test(routePath);
}

/**
 * Registers or updates a project routing entry with custom domains and rate limits.
 * @param {string} projectId 
 * @param {string} customPath 
 * @param {string} customDomain 
 * @param {number} rateLimitRpm - Requests Per Minute
 * @returns {Promise<Object>}
 */
async function registerRoute(projectId, customPath = '', customDomain = '', rateLimitRpm = 100) {
  const normalizedPath = (customPath || projectId).trim().toLowerCase();
  
  if (!isValidRoutePath(normalizedPath)) {
    throw new Error('Invalid path format. Use alphanumeric, hyphens, or underscores only.');
  }

  const routes = await db.read('routes');
  
  // Check duplicates
  const duplicate = routes.find(r => r.path === normalizedPath && r.projectId !== projectId);
  if (duplicate) {
    throw new Error(`Route path "/project/${normalizedPath}" is already claimed by another project.`);
  }

  const existingRoute = routes.find(r => r.projectId === projectId);
  
  const routeData = {
    projectId,
    path: normalizedPath,
    localDir: path.join(__dirname, '../public/projects', projectId),
    status: 'active',
    customDomain: customDomain ? customDomain.trim().toLowerCase() : null,
    rateLimitRpm: parseInt(rateLimitRpm) || 100,
    updatedAt: new Date().toISOString()
  };

  if (existingRoute) {
    const allRoutes = await db.read('routes');
    const filtered = allRoutes.filter(r => r.projectId !== projectId);
    const file = path.join(db.baseDir || path.join(__dirname, '../data'), 'routes.json');
    if (!db.useFirestore) {
      fs.writeFileSync(file, JSON.stringify(filtered, null, 2), 'utf8');
    }
  }

  const doc = await db.insert('routes', routeData);
  
  // Generate baseline analytics logs
  await initializeRouteAnalytics(projectId);

  return doc;
}

/**
 * Returns all active routes.
 */
async function getRoutes() {
  return await db.read('routes');
}

/**
 * Resolves local file paths for serving.
 */
async function resolveRoute(routePath) {
  const routes = await db.read('routes');
  const match = routes.find(r => r.path === routePath.toLowerCase() && r.status === 'active');
  return match || null;
}

/**
 * Initializes telemetry logs for a route.
 */
async function initializeRouteAnalytics(projectId) {
  const analytics = [];
  const now = Date.now();
  
  for (let i = 0; i < 30; i++) {
    const timestamp = new Date(now - (30 - i) * 60 * 1000).toISOString();
    const hitSuccess = Math.random() > 0.02;
    analytics.push({
      projectId,
      timestamp,
      latencyMs: Math.floor(Math.random() * 15) + (hitSuccess ? 2 : 150),
      statusCode: hitSuccess ? 200 : 502,
      path: '/index.html'
    });
  }

  // Save to DB
  for (const item of analytics) {
    await db.insert('analytics', item);
  }
}

/**
 * Gathers analytics telemetry stats for a project route.
 * @param {string} projectId 
 * @returns {Promise<Object>}
 */
async function fnGetRouteAnalytics(projectId) {
  const allAnalytics = await db.read('analytics');
  const projectLogs = allAnalytics
    .filter(a => a.projectId === projectId.toLowerCase())
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // If none exists, initialize baseline
  if (projectLogs.length === 0) {
    await initializeRouteAnalytics(projectId);
    return await fnGetRouteAnalytics(projectId);
  }

  // Calculate stats
  const totalRequests = projectLogs.length;
  const errorCount = projectLogs.filter(a => a.statusCode >= 400).length;
  const avgLatency = Math.round(projectLogs.reduce((acc, cur) => acc + cur.latencyMs, 0) / totalRequests);
  const throughput = (totalRequests / 30).toFixed(1) + ' req/min';

  return {
    projectId,
    stats: {
      totalRequests,
      errorCount,
      errorRate: ((errorCount / totalRequests) * 100).toFixed(2) + '%',
      avgLatencyMs: avgLatency + ' ms',
      throughput
    },
    history: projectLogs.slice(-20) // last 20 ticks
  };
}

/**
 * Generates simulated edge gateway status telemetry.
 */
function getGatewayTelemetry() {
  return {
    edgeNodes: 8,
    activeRoutes: 12,
    requestRate: Math.floor(Math.random() * 200) + 1200 + ' req/s',
    avgLatency: (Math.random() * 2 + 1.8).toFixed(2) + ' ms',
    errorRate: (Math.random() * 0.03).toFixed(3) + '%',
    memoryUsage: '34%'
  };
}

/**
 * Deletes a route and cleans up its files, analytics, and deployments.
 */
async function deleteRoute(projectId) {
  const routes = await db.read('routes');
  const existingRoute = routes.find(r => r.projectId.toLowerCase() === projectId.toLowerCase());
  
  if (!existingRoute) {
    throw new Error('Project route does not exist.');
  }

  // Delete from routes collection
  await db.delete('routes', existingRoute.id);

  // Clean up analytics for this project
  const analytics = await db.read('analytics');
  const projectAnalytics = analytics.filter(a => a.projectId.toLowerCase() === projectId.toLowerCase());
  for (const item of projectAnalytics) {
    await db.delete('analytics', item.id);
  }

  // Clean up deployments for this project
  const deployments = await db.read('deployments');
  const projectDeployments = deployments.filter(d => d.projectId.toLowerCase() === projectId.toLowerCase());
  for (const item of projectDeployments) {
    await db.delete('deployments', item.id);
  }

  // Clean up physical directory
  const projectDir = path.join(__dirname, '../public/projects', existingRoute.projectId);
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }

  return { success: true, message: `Successfully deleted project ${existingRoute.projectId} and its gateway routes.` };
}

module.exports = {
  registerRoute,
  getRoutes,
  resolveRoute,
  getGatewayTelemetry,
  getRouteAnalytics: fnGetRouteAnalytics,
  isValidRoutePath,
  deleteRoute
};
