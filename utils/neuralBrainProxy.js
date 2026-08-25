/**
 * CONCODE Neural Brain Proxy — Server-Side Integration Module
 * 
 * Connects the Express website to the Python FastAPI Neural Brain
 * running on localhost:8000. Provides automatic fallback to the
 * existing JS concodeBrainEngine if the neural brain is offline.
 * 
 * Architecture:
 *   Website (Express :3000) → neuralBrainProxy → Python Brain (FastAPI :8000)
 *                                              ↘ JS concodeBrainEngine (fallback)
 */

const NEURAL_BRAIN_BASE = process.env.NEURAL_BRAIN_URL || 'http://localhost:8000';
const COGNITIVE_ENDPOINT = `${NEURAL_BRAIN_BASE}/api/v1/cognitive`;
const HEALTH_ENDPOINT = `${NEURAL_BRAIN_BASE}/health`;
const STATUS_ENDPOINT = `${NEURAL_BRAIN_BASE}/api/v1/status`;
const GUILDS_ENDPOINT = `${NEURAL_BRAIN_BASE}/api/v1/guilds`;

// API key for the neural brain (optional — unset = dev mode)
const BRAIN_API_KEY = process.env.CONCODE_API_KEY || null;

// Timeout for neural brain requests (ms)
const BRAIN_TIMEOUT_MS = parseInt(process.env.BRAIN_TIMEOUT_MS, 10) || 30000;

// Cache the online status for 10 seconds to avoid hammering health checks
let _onlineCache = { isOnline: false, checkedAt: 0 };
const ONLINE_CACHE_TTL_MS = 10000;


/**
 * Check if the Python Neural Brain server is reachable.
 * Results are cached for 10 seconds.
 * @returns {Promise<boolean>}
 */
async function isNeuralBrainOnline() {
  const now = Date.now();
  if (now - _onlineCache.checkedAt < ONLINE_CACHE_TTL_MS) {
    return _onlineCache.isOnline;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(HEALTH_ENDPOINT, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    const online = data.status === 'healthy';

    _onlineCache = { isOnline: online, checkedAt: now };
    return online;
  } catch (err) {
    _onlineCache = { isOnline: false, checkedAt: now };
    return false;
  }
}


// Limits matching CONCODE_BRAIN src/config.py
const MAX_QUERY_LENGTH = 4096;
const MAX_WORKSPACE_FILES = 50;
const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB
const MAX_TOTAL_WORKSPACE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Sanitize and validate workspace files before forwarding to Python Brain.
 * @param {Object} filesMap - Map of filename -> content string
 * @returns {Object} Sanitized workspace files map
 */
function sanitizeWorkspaceFiles(filesMap) {
  if (!filesMap || typeof filesMap !== 'object') return {};

  const sanitized = {};
  let totalBytes = 0;
  const keys = Object.keys(filesMap).slice(0, MAX_WORKSPACE_FILES);

  for (const filename of keys) {
    let content = filesMap[filename];
    if (typeof content !== 'string') continue;

    // Truncate file if over individual size limit
    if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE_BYTES) {
      content = content.slice(0, MAX_FILE_SIZE_BYTES) + '\n/* [CONCODE PROXY: Truncated to 100KB] */';
    }

    const fileBytes = Buffer.byteLength(content, 'utf8');
    if (totalBytes + fileBytes > MAX_TOTAL_WORKSPACE_BYTES) {
      console.warn(`[neuralBrainProxy] Workspace total payload exceeded 2MB limit. Omitting ${filename}`);
      break;
    }

    sanitized[filename] = content;
    totalBytes += fileBytes;
  }

  return sanitized;
}

/**
 * Send a cognitive query to the Python Neural Brain.
 * 
 * @param {string} query - The user's natural language prompt
 * @param {Object} options
 * @param {string} [options.sessionId] - Session ID for conversation continuity
 * @param {Object} [options.workspaceFiles] - Map of filename -> content
 * @param {string} [options.mode] - 'text' or 'code'
 * @returns {Promise<Object>} - The neural brain's full response
 * @throws {Error} if the brain is unreachable or returns an error
 */
async function queryCognitive(query, options = {}) {
  const {
    sessionId = 'default_session',
    workspaceFiles = {},
    mode = 'text',
  } = options;

  const sanitizedQuery = (query || '').slice(0, MAX_QUERY_LENGTH).trim();
  const sanitizedFiles = sanitizeWorkspaceFiles(workspaceFiles);

  const payload = {
    query: sanitizedQuery,
    workspace_files: sanitizedFiles,
    session_id: sessionId,
    mode,
  };

  const headers = {
    'Content-Type': 'application/json',
  };
  if (BRAIN_API_KEY) {
    headers['X-API-Key'] = BRAIN_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRAIN_TIMEOUT_MS);

  try {
    const response = await fetch(COGNITIVE_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Neural Brain API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return {
      code: data.code || '',
      guild: data.guild || 'fullstack',
      guild_icon: data.guild_icon || '⚡',
      confidence: data.confidence || 0.8,
      repair_applied: Boolean(data.repair_applied),
      session_id: data.session_id || sessionId,
      sentiment: data.sentiment || 'neutral',
      personalized_message: data.personalized_message || '',
      is_clarifying: Boolean(data.is_clarifying),
      clarifying_question: data.clarifying_question || null,
      subsystems: data.subsystems || {},
      latency_ms: data.latency_ms || 0,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Neural Brain timed out after ${BRAIN_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}


/**
 * Get the full system status from the Python Neural Brain.
 * @returns {Promise<Object>}
 */
async function getNeuralStatus() {
  const headers = {};
  if (BRAIN_API_KEY) {
    headers['X-API-Key'] = BRAIN_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(STATUS_ENDPOINT, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Status endpoint returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    return {
      status: 'OFFLINE',
      error: err.message,
    };
  }
}


/**
 * Get the guild list from the Python Neural Brain.
 * @returns {Promise<Object>}
 */
async function getNeuralGuilds() {
  const headers = {};
  if (BRAIN_API_KEY) {
    headers['X-API-Key'] = BRAIN_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(GUILDS_ENDPOINT, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Guilds endpoint returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    return { guilds: [], count: 0, error: err.message };
  }
}


module.exports = {
  isNeuralBrainOnline,
  queryCognitive,
  getNeuralStatus,
  getNeuralGuilds,
  NEURAL_BRAIN_BASE,
};
