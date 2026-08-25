/**
 * CONCODE Neural Brain — Website Integration Client
 * 
 * Drop this script into your Antigravity-built website to connect
 * to the local CONCODE Neural Brain API running on your MacBook.
 * 
 * Usage:
 *   1. Start the brain server: cd CONCODE_BRAIN && ./start.sh
 *   2. Include this script in your HTML: <script src="concode_brain_client.js"></script>
 *   3. Call: ConcodeBrain.query("Fix this bug in my login form")
 */

const ConcodeBrain = (() => {
  // ── Configuration & State ─────────────────────────────────────
  let config = {
    apiBase: 'http://localhost:8000',
    proxyUrl: '/api/chat',
    useProxy: false,
    apiKey: null,
  };

  let sessionId = crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

  // ── Guild Icons ────────────────────────────────────────────
  const GUILD_ICONS = {
    debugger: '[DEBUG]', webgl: '[WEBGL]', ai_ml: '[AI_ML]', qa: '[QA]',
    security: '[SEC]', performance: '[PERF]', database: '[DB]',
    ui_ux: '[UIUX]', devops: '[DEVOPS]', api: '[API]', fullstack: '[FULLSTACK]',
    mobile: '[MOBILE]', blockchain: '[CHAIN]', conversational: '[CHAT]'
  };

  /**
   * Configure the client settings.
   * @param {Object} opts - Options: { apiBase, proxyUrl, useProxy, apiKey }
   */
  function init(opts = {}) {
    if (opts.apiBase) config.apiBase = opts.apiBase;
    if (opts.proxyUrl) config.proxyUrl = opts.proxyUrl;
    if (typeof opts.useProxy === 'boolean') config.useProxy = opts.useProxy;
    if (opts.apiKey) config.apiKey = opts.apiKey;
  }

  // ── Collect Open Editor Files ──────────────────────────────
  function collectWorkspaceFiles() {
    const files = {};
    const MAX_FILES = 50;
    const MAX_FILE_CHARS = 100000;

    // Helper to safely store truncated file
    const addFile = (name, content) => {
      if (Object.keys(files).length >= MAX_FILES) return;
      if (typeof content === 'string') {
        files[name] = content.length > MAX_FILE_CHARS
          ? content.slice(0, MAX_FILE_CHARS) + '\n/* [Truncated] */'
          : content;
      }
    };

    // Try to collect from Antigravity editor API
    if (window.antigravity && window.antigravity.getOpenFiles) {
      try {
        const openFiles = window.antigravity.getOpenFiles();
        openFiles.forEach(file => {
          addFile(file.name, file.content);
        });
        return files;
      } catch (e) {
        console.warn('[ConcodeBrain] Could not access Antigravity editor API:', e);
      }
    }

    // CodeMirror
    const cmElements = document.querySelectorAll('.CodeMirror');
    cmElements.forEach((el, i) => {
      if (el.CodeMirror) {
        addFile(`editor_${i}.js`, el.CodeMirror.getValue());
      }
    });

    // Monaco Editor
    if (window.monaco && window.monaco.editor) {
      const models = window.monaco.editor.getModels();
      models.forEach((model, i) => {
        const uri = model.uri.toString();
        const name = uri.split('/').pop() || `monaco_${i}.js`;
        addFile(name, model.getValue());
      });
    }

    // Ace Editor
    const aceElements = document.querySelectorAll('.ace_editor');
    aceElements.forEach((el, i) => {
      if (el.env && el.env.editor) {
        addFile(`ace_${i}.js`, el.env.editor.getValue());
      }
    });

    return files;
  }

  // ── Main Query Function ────────────────────────────────────
  async function query(userPrompt, options = {}) {
    const {
      includeWorkspace = true,
      mode = 'text',
      onGuildDetected = null,
      onCodeGenerated = null,
      onClarificationRequired = null,
      onSentimentDetected = null,
    } = options;

    const workspaceFiles = includeWorkspace ? collectWorkspaceFiles() : {};

    const payload = {
      query: userPrompt,
      workspace_files: workspaceFiles,
      session_id: sessionId,
      mode: mode,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    const targetUrl = config.useProxy
      ? config.proxyUrl
      : `${config.apiBase}/api/v1/cognitive`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(config.useProxy ? { input: userPrompt, sessionId, workspaceFiles } : payload),
      });

      if (!response.ok) {
        throw new Error(`Brain API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Social Intelligence Callbacks
      if (result.sentiment && onSentimentDetected) {
        onSentimentDetected(result.sentiment, result.personalized_message || '');
      }
      if (result.is_clarifying && onClarificationRequired) {
        onClarificationRequired(result.clarifying_question || result.code);
      }

      // Guild & Code Callbacks
      if (onGuildDetected && result.guild) {
        onGuildDetected(result.guild, result.guild_icon || '⚡', result.confidence || 1.0);
      }
      if (onCodeGenerated && result.code) {
        onCodeGenerated(result.code, result.repair_applied || false);
      }

      return result;
    } catch (error) {
      console.error('[ConcodeBrain] Query failed:', error);
      throw error;
    }
  }

  // ── Insert Code into Editor ────────────────────────────────
  function insertCode(code) {
    if (!code) return false;

    // Antigravity editor
    if (window.antigravity && window.antigravity.insertText) {
      window.antigravity.insertText(code);
      return true;
    }

    // Monaco Editor
    if (window.monaco && window.monaco.editor) {
      const editor = window.monaco.editor.getEditors()[0];
      if (editor) {
        const selection = editor.getSelection();
        editor.executeEdits('concode-brain', [{
          range: selection,
          text: code,
          forceMoveMarkers: true,
        }]);
        return true;
      }
    }

    // CodeMirror
    const cm = document.querySelector('.CodeMirror');
    if (cm && cm.CodeMirror) {
      const doc = cm.CodeMirror.getDoc();
      const cursor = doc.getCursor();
      doc.replaceRange(code, cursor);
      return true;
    }

    // Ace Editor
    const ace = document.querySelector('.ace_editor');
    if (ace && ace.env && ace.env.editor) {
      ace.env.editor.insert(code);
      return true;
    }

    // Fallback: copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        console.log('[ConcodeBrain] Code copied to clipboard (no editor detected)');
      });
    }
    return false;
  }

  // ── Full Pipeline: Query + Insert ──────────────────────────
  async function queryAndInsert(userPrompt, options = {}) {
    const result = await query(userPrompt, options);
    if (result && result.code && !result.is_clarifying) {
      insertCode(result.code);
    }
    return result;
  }

  // ── Status & Health ────────────────────────────────────────
  async function getStatus() {
    const targetUrl = config.useProxy
      ? '/api/brain/status'
      : `${config.apiBase}/api/v1/status`;
    const response = await fetch(targetUrl);
    return response.json();
  }

  async function getGuilds() {
    const targetUrl = config.useProxy
      ? '/api/brain/guilds'
      : `${config.apiBase}/api/v1/guilds`;
    const response = await fetch(targetUrl);
    return response.json();
  }

  async function isOnline() {
    try {
      const targetUrl = config.useProxy
        ? '/api/brain/health'
        : `${config.apiBase}/health`;
      const response = await fetch(targetUrl, { signal: AbortSignal.timeout(2000) });
      const data = await response.json();
      return data.status === 'healthy' || data.online === true;
    } catch {
      return false;
    }
  }

  // ── Session Management ─────────────────────────────────────
  function resetSession() {
    sessionId = crypto.randomUUID ? crypto.randomUUID() :
      Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    init,
    query,
    insertCode,
    queryAndInsert,
    getStatus,
    getGuilds,
    isOnline,
    resetSession,
    collectWorkspaceFiles,
    GUILD_ICONS,
    get sessionId() { return sessionId; },
    get config() { return { ...config }; }
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConcodeBrain;
}
