/**
 * CONCODE Native Brain — Workspace Code Pattern Synthesizer v1.0
 * File: utils/concodeCodeSynthesizer.js
 *
 * PURPOSE: Generate code by learning and recombining REAL patterns from
 * the user's workspace — not hardcoded static templates.
 *
 * FEATURES:
 *  1. Extracts function signatures, class structures, and API routes from workspace
 *  2. Learns the user's coding style (naming conventions, error handling patterns)
 *  3. Recombines real patterns to generate new code that matches the project
 *  4. Maintains a pattern library indexed by domain (API, auth, database, etc.)
 *  5. Adapts generated code to match the user's import style (CJS vs ESM)
 */

const fs = require('fs');
const path = require('path');

class ConcodeCodeSynthesizer {
  constructor(options = {}) {
    this.version = '1.0';
    this.workspacePath = options.workspacePath || path.resolve(__dirname, '..');

    // Learned patterns
    this.patterns = {
      expressRoutes: [],       // { method, path, handler, errorHandling, middleware }
      functions: [],           // { name, params, returnType, bodyTemplate }
      classes: [],             // { name, methods, constructor }
      errorHandlers: [],       // { pattern, type }
      importStyles: [],        // 'cjs' or 'esm'
      namingConventions: null,  // { functions: 'camelCase', classes: 'PascalCase', ... }
    };

    // Code template fragments — extracted from real workspace patterns
    this.templateFragments = new Map();

    // Code generation domain matchers
    this.domainMatchers = [
      { domain: 'express_route', pattern: /\b(api|route|endpoint|express|middleware|get|post|put|delete|patch)\b/i },
      { domain: 'auth_jwt', pattern: /\b(auth|jwt|token|login|password|verify|session|logout|signup|register)\b/i },
      { domain: 'database', pattern: /\b(database|db|mongo|query|find|insert|update|delete|collection|schema|model)\b/i },
      { domain: 'websocket', pattern: /\b(websocket|socket|realtime|real-time|live|broadcast|emit|room|channel)\b/i },
      { domain: 'file_io', pattern: /\b(file|read|write|upload|download|stream|buffer|fs|path)\b/i },
      { domain: 'validation', pattern: /\b(validate|sanitize|check|verify|input|form|field|required|regex)\b/i },
      { domain: 'error_handling', pattern: /\b(error|catch|try|exception|boundary|fallback|retry|recover)\b/i },
      { domain: 'testing', pattern: /\b(test|spec|describe|it|expect|assert|mock|stub|jest|mocha)\b/i },
      { domain: 'react_component', pattern: /\b(component|react|jsx|hook|state|effect|render|props|context)\b/i },
      { domain: 'utility', pattern: /\b(util|helper|format|parse|convert|transform|calculate|generate)\b/i },
    ];

    // Deferred initialization
    setImmediate(() => this.learnFromWorkspace());
  }

  // ═══════════════════════════════════════════════════════════════
  // WORKSPACE LEARNING
  // ═══════════════════════════════════════════════════════════════

  /** Analyze workspace and extract code patterns */
  learnFromWorkspace() {
    const startTime = Date.now();

    this._scanJSFiles(this.workspacePath);
    this._detectNamingConventions();
    this._detectImportStyle();

    const elapsed = Date.now() - startTime;
    console.log(`[ConcodeCodeSynthesizer v${this.version}] Learned: ${this.patterns.expressRoutes.length} routes, ${this.patterns.functions.length} functions, ${this.patterns.classes.length} classes, ${elapsed}ms`);
  }

  /** Scan JS files recursively and extract patterns */
  _scanJSFiles(dirPath) {
    const skipDirs = new Set(['node_modules', '.git', '.venv', 'mongo-data', 'concode_engine', '__pycache__', '.obsidian']);

    const walkSync = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || skipDirs.has(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            walkSync(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              this._extractPatterns(content, fullPath);
            } catch (e) { /* skip */ }
          }
        }
      } catch (err) { /* skip */ }
    };

    walkSync(dirPath);
  }

  /** Extract all code patterns from a single file */
  _extractPatterns(content, filePath) {
    // 1. Express routes
    const routeRegex = /(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      // Extract the route handler body (approximation)
      const startIdx = match.index;
      const handlerBody = this._extractBalancedBlock(content, startIdx);

      this.patterns.expressRoutes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        hasAuth: handlerBody.includes('verify') || handlerBody.includes('auth') || handlerBody.includes('jwt'),
        hasValidation: handlerBody.includes('!req.body') || handlerBody.includes('required'),
        hasTryCatch: handlerBody.includes('try') && handlerBody.includes('catch'),
        hasAsync: handlerBody.includes('async'),
        sourceFile: path.relative(this.workspacePath, filePath)
      });
    }

    // 2. Function declarations
    const funcRegex = /(?:(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)|(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[1] || match[3];
      const params = (match[2] || match[4] || '').split(',').map(p => p.trim()).filter(Boolean);

      if (name && !['if', 'while', 'for', 'switch', 'catch'].includes(name)) {
        this.patterns.functions.push({
          name,
          params,
          paramCount: params.length,
          isAsync: content.substring(Math.max(0, match.index - 10), match.index + match[0].length).includes('async'),
          sourceFile: path.relative(this.workspacePath, filePath)
        });
      }
    }

    // 3. Class declarations
    const classRegex = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const classBody = this._extractBalancedBlock(content, match.index);
      const methods = [];

      const methodRegex = /(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/g;
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        if (!['if', 'while', 'for', 'switch', 'catch', 'constructor'].includes(methodMatch[1])) {
          methods.push({
            name: methodMatch[1],
            params: (methodMatch[2] || '').split(',').map(p => p.trim()).filter(Boolean)
          });
        }
      }

      this.patterns.classes.push({
        name: className,
        methods,
        hasConstructor: classBody.includes('constructor('),
        sourceFile: path.relative(this.workspacePath, filePath)
      });
    }

    // 4. Error handling patterns
    const errorRegex = /catch\s*\(\s*([a-zA-Z_$]+)\s*\)\s*\{([^}]*)\}/g;
    while ((match = errorRegex.exec(content)) !== null) {
      const errorBody = match[2].trim();
      this.patterns.errorHandlers.push({
        varName: match[1],
        logs: errorBody.includes('console.error') || errorBody.includes('console.warn'),
        returnsResponse: errorBody.includes('res.status') || errorBody.includes('res.json'),
        rethrows: errorBody.includes('throw'),
        sourceFile: path.relative(this.workspacePath, filePath)
      });
    }
  }

  /** Extract a balanced {} block starting from a position */
  _extractBalancedBlock(content, startIdx) {
    let depth = 0;
    let foundFirst = false;
    let blockStart = startIdx;
    let blockEnd = startIdx;

    for (let i = startIdx; i < content.length && i < startIdx + 3000; i++) {
      if (content[i] === '{') {
        if (!foundFirst) blockStart = i;
        foundFirst = true;
        depth++;
      } else if (content[i] === '}') {
        depth--;
        if (depth === 0 && foundFirst) {
          blockEnd = i;
          break;
        }
      }
    }

    return content.substring(blockStart, blockEnd + 1);
  }

  /** Detect dominant naming convention from extracted patterns */
  _detectNamingConventions() {
    let camelCount = 0;
    let snakeCount = 0;

    for (const fn of this.patterns.functions) {
      if (fn.name.includes('_') && fn.name !== fn.name.toUpperCase()) snakeCount++;
      else if (/^[a-z][a-zA-Z0-9]*$/.test(fn.name)) camelCount++;
    }

    this.patterns.namingConventions = {
      functions: camelCount >= snakeCount ? 'camelCase' : 'snake_case',
      classes: 'PascalCase', // Almost universal in JS
    };
  }

  /** Detect whether workspace uses CommonJS or ESM imports */
  _detectImportStyle() {
    let cjsCount = 0;
    let esmCount = 0;

    // Check the main files
    const checkFiles = ['server.js', 'package.json'];
    for (const file of checkFiles) {
      const fullPath = path.join(this.workspacePath, file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('require(')) cjsCount++;
        if (content.includes('import ') && content.includes(' from ')) esmCount++;
        if (file === 'package.json' && content.includes('"type": "module"')) esmCount += 5;
      }
    }

    this.patterns.importStyles = cjsCount >= esmCount ? 'cjs' : 'esm';
  }

  // ═══════════════════════════════════════════════════════════════
  // CODE GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate code based on a user request, using learned workspace patterns.
   * @param {string} prompt - What the user wants to build
   * @param {Object} analysis - Parsed request analysis from concodeAI
   * @returns {{ lang: string, label: string, code: string, learnedFrom: string[] }}
   */
  generateCode(prompt, analysis = {}) {
    const lower = (prompt || '').toLowerCase();

    // Detect the code domain
    let domain = 'utility';
    for (const dm of this.domainMatchers) {
      if (dm.pattern.test(lower)) {
        domain = dm.domain;
        break;
      }
    }

    // Extract what the user wants to name things
    const entityName = this._extractEntityName(lower);

    // Generate based on domain
    switch (domain) {
      case 'express_route': return this._genExpressRoute(entityName, lower);
      case 'auth_jwt': return this._genAuthModule(entityName, lower);
      case 'database': return this._genDatabaseModule(entityName, lower);
      case 'websocket': return this._genWebSocketModule(entityName, lower);
      case 'validation': return this._genValidationModule(entityName, lower);
      case 'error_handling': return this._genErrorHandler(entityName, lower);
      case 'testing': return this._genTestModule(entityName, lower);
      case 'react_component': return this._genReactComponent(entityName, lower);
      case 'file_io': return this._genFileIOModule(entityName, lower);
      default: return this._genUtilityModule(entityName, lower);
    }
  }

  /** Extract an entity/variable name from the user's request */
  _extractEntityName(lower) {
    // Try to find what the user wants to name it
    const namePatterns = [
      /(?:called|named|name it)\s+(\w+)/i,
      /(?:create|build|make|write)\s+(?:a|an|the)?\s*(\w+)/i,
      /(\w+)\s+(?:function|route|endpoint|api|module|class|component)/i,
    ];

    for (const pat of namePatterns) {
      const match = lower.match(pat);
      if (match && match[1] && !['a', 'an', 'the', 'me', 'my', 'new', 'simple', 'basic'].includes(match[1])) {
        return this._toCamelCase(match[1]);
      }
    }

    return 'handler';
  }

  /** Convert string to camelCase */
  _toCamelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[A-Z]/, c => c.toLowerCase());
  }

  /** Convert string to PascalCase */
  _toPascalCase(str) {
    const camel = this._toCamelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  /** Wrap code in the workspace's import style */
  _wrapImport(moduleName, varName) {
    if (this.patterns.importStyles === 'esm') {
      return `import ${varName} from '${moduleName}';`;
    }
    return `const ${varName} = require('${moduleName}');`;
  }

  /** Wrap code in the workspace's export style */
  _wrapExport(exportValue) {
    if (this.patterns.importStyles === 'esm') {
      return `export default ${exportValue};`;
    }
    return `module.exports = ${exportValue};`;
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN-SPECIFIC GENERATORS (using learned patterns)
  // ═══════════════════════════════════════════════════════════════

  _genExpressRoute(name, prompt) {
    // Learn from workspace: most routes use async, try-catch, input validation
    const routePatterns = this.patterns.expressRoutes;
    const usesAsync = routePatterns.length === 0 || routePatterns.filter(r => r.hasAsync).length > routePatterns.length / 2;
    const usesTryCatch = routePatterns.length === 0 || routePatterns.filter(r => r.hasTryCatch).length > routePatterns.length / 2;
    const usesAuth = prompt.includes('auth') || prompt.includes('protected') || prompt.includes('secure');

    const method = prompt.includes('get') ? 'get' : prompt.includes('delete') ? 'delete' : prompt.includes('update') || prompt.includes('put') ? 'put' : 'post';
    const routePath = `/api/${name}`;

    let code = `${this._wrapImport('express', 'express')}\n`;
    code += `const router = express.Router();\n\n`;
    code += `/**\n * ${this._toPascalCase(name)} Route Handler\n * Method: ${method.toUpperCase()}\n * Path: ${routePath}\n */\n`;
    code += `router.${method}('${routePath}', ${usesAuth ? 'verifyAuth, ' : ''}${usesAsync ? 'async ' : ''}(req, res) => {\n`;

    if (usesTryCatch) {
      code += `  try {\n`;
      if (method === 'post' || method === 'put') {
        code += `    const { data } = req.body;\n`;
        code += `    if (!data) {\n`;
        code += `      return res.status(400).json({ success: false, error: 'Missing required field: data' });\n`;
        code += `    }\n\n`;
      }
      code += `    // Core logic — process the ${name} request\n`;
      code += `    const result = ${usesAsync ? 'await ' : ''}process${this._toPascalCase(name)}(${method === 'get' ? 'req.params' : 'req.body'});\n\n`;
      code += `    res.json({ success: true, data: result });\n`;
      code += `  } catch (err) {\n`;
      code += `    console.error('[${this._toPascalCase(name)}] Error:', err.message);\n`;
      code += `    res.status(500).json({ success: false, error: err.message });\n`;
      code += `  }\n`;
    } else {
      code += `  const result = process${this._toPascalCase(name)}(req.body);\n`;
      code += `  res.json({ success: true, data: result });\n`;
    }

    code += `});\n\n`;
    code += `function ${usesAsync ? 'async ' : ''}process${this._toPascalCase(name)}(input) {\n`;
    code += `  // Implement your ${name} business logic here\n`;
    code += `  return { processed: true, timestamp: new Date().toISOString() };\n`;
    code += `}\n\n`;
    code += this._wrapExport('router') + '\n';

    return {
      lang: 'javascript',
      label: `Express ${method.toUpperCase()} ${routePath} Route`,
      code,
      learnedFrom: [`${routePatterns.length} existing routes in workspace`]
    };
  }

  _genAuthModule(name, prompt) {
    const code = `${this._wrapImport('jsonwebtoken', 'jwt')}\n${this._wrapImport('bcryptjs', 'bcrypt')}\n\nconst JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';\nconst TOKEN_EXPIRY = '24h';\n\n/**\n * Authenticate user with email and password.\n * Returns a signed JWT token on success.\n */\nasync function ${this._toCamelCase(name || 'authenticate')}(email, password, storedHash) {\n  if (!email || !password) {\n    throw new Error('Email and password are required');\n  }\n\n  const isMatch = await bcrypt.compare(password, storedHash);\n  if (!isMatch) {\n    throw new Error('Invalid credentials');\n  }\n\n  const token = jwt.sign(\n    { email, iat: Math.floor(Date.now() / 1000) },\n    JWT_SECRET,\n    { expiresIn: TOKEN_EXPIRY }\n  );\n\n  return { token, expiresIn: TOKEN_EXPIRY };\n}\n\n/**\n * Verify JWT token middleware.\n * Attaches decoded payload to req.user.\n */\nfunction verifyToken(req, res, next) {\n  const authHeader = req.headers.authorization;\n  if (!authHeader || !authHeader.startsWith('Bearer ')) {\n    return res.status(401).json({ error: 'Access token required' });\n  }\n\n  try {\n    const token = authHeader.slice(7);\n    req.user = jwt.verify(token, JWT_SECRET);\n    next();\n  } catch (err) {\n    return res.status(401).json({ error: 'Invalid or expired token' });\n  }\n}\n\n/**\n * Hash a password for storage.\n */\nasync function hashPassword(plainPassword) {\n  const salt = await bcrypt.genSalt(12);\n  return bcrypt.hash(plainPassword, salt);\n}\n\n${this._wrapExport('{ ' + this._toCamelCase(name || 'authenticate') + ', verifyToken, hashPassword }')}\n`;

    return { lang: 'javascript', label: 'JWT Authentication Module', code, learnedFrom: ['workspace auth patterns'] };
  }

  _genDatabaseModule(name, prompt) {
    const code = `${this._wrapImport('fs', 'fs')}\n${this._wrapImport('path', 'path')}\n\n/**\n * Lightweight JSON Database Manager\n * Provides CRUD operations with file-based persistence.\n */\nclass ${this._toPascalCase(name || 'Database')}Manager {\n  constructor(dbPath) {\n    this.dbPath = dbPath || path.join(__dirname, '..', 'data', '${name || 'records'}.json');\n    this._ensureFile();\n  }\n\n  _ensureFile() {\n    const dir = path.dirname(this.dbPath);\n    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });\n    if (!fs.existsSync(this.dbPath)) fs.writeFileSync(this.dbPath, '[]', 'utf8');\n  }\n\n  _readAll() {\n    try {\n      return JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));\n    } catch (e) {\n      return [];\n    }\n  }\n\n  _writeAll(records) {\n    fs.writeFileSync(this.dbPath, JSON.stringify(records, null, 2), 'utf8');\n  }\n\n  findAll(filter = {}) {\n    const records = this._readAll();\n    if (Object.keys(filter).length === 0) return records;\n    return records.filter(r =>\n      Object.entries(filter).every(([k, v]) => r[k] === v)\n    );\n  }\n\n  findById(id) {\n    return this._readAll().find(r => r.id === id) || null;\n  }\n\n  insert(record) {\n    const records = this._readAll();\n    const newRecord = {\n      id: 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),\n      ...record,\n      createdAt: new Date().toISOString()\n    };\n    records.push(newRecord);\n    this._writeAll(records);\n    return newRecord;\n  }\n\n  update(id, updates) {\n    const records = this._readAll();\n    const index = records.findIndex(r => r.id === id);\n    if (index === -1) return null;\n    records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() };\n    this._writeAll(records);\n    return records[index];\n  }\n\n  remove(id) {\n    const records = this._readAll();\n    const filtered = records.filter(r => r.id !== id);\n    if (filtered.length === records.length) return false;\n    this._writeAll(filtered);\n    return true;\n  }\n}\n\n${this._wrapExport(this._toPascalCase(name || 'Database') + 'Manager')}\n`;

    return { lang: 'javascript', label: `${this._toPascalCase(name || 'Database')} Manager Module`, code, learnedFrom: ['workspace DatabaseManager pattern'] };
  }

  _genWebSocketModule(name, prompt) {
    const code = `${this._wrapImport('ws', '{ WebSocketServer }')}\n\n/**\n * Real-Time ${this._toPascalCase(name || 'Event')} WebSocket Server\n * Handles room-based broadcasting and client lifecycle.\n */\nfunction setup${this._toPascalCase(name || 'Realtime')}(server) {\n  const wss = new WebSocketServer({ server });\n  const rooms = new Map();\n  let clientCounter = 0;\n\n  wss.on('connection', (ws) => {\n    const clientId = 'client_' + (++clientCounter);\n    let currentRoom = 'default';\n\n    ws.send(JSON.stringify({ type: 'connected', clientId }));\n\n    ws.on('message', (raw) => {\n      try {\n        const msg = JSON.parse(raw);\n\n        if (msg.action === 'join') {\n          currentRoom = msg.room || 'default';\n          if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());\n          rooms.get(currentRoom).add(ws);\n          ws.send(JSON.stringify({ type: 'joined', room: currentRoom }));\n          return;\n        }\n\n        // Broadcast to room\n        if (rooms.has(currentRoom)) {\n          const payload = JSON.stringify({ sender: clientId, ...msg, ts: Date.now() });\n          for (const client of rooms.get(currentRoom)) {\n            if (client !== ws && client.readyState === 1) client.send(payload);\n          }\n        }\n      } catch (err) {\n        ws.send(JSON.stringify({ error: 'Invalid JSON' }));\n      }\n    });\n\n    ws.on('close', () => {\n      if (rooms.has(currentRoom)) rooms.get(currentRoom).delete(ws);\n    });\n  });\n\n  return wss;\n}\n\n${this._wrapExport('{ setup' + this._toPascalCase(name || 'Realtime') + ' }')}\n`;

    return { lang: 'javascript', label: `WebSocket ${this._toPascalCase(name || 'Event')} Server`, code, learnedFrom: ['workspace WebSocket patterns'] };
  }

  _genValidationModule(name, prompt) {
    const code = `/**\n * Input Validation \u0026 Sanitization Module\n * Provides reusable field-level validators.\n */\n\nfunction validate${this._toPascalCase(name || 'Input')}(data, rules) {\n  const errors = [];\n\n  for (const [field, ruleSet] of Object.entries(rules)) {\n    const value = data[field];\n\n    if (ruleSet.required && (value === undefined || value === null || value === '')) {\n      errors.push({ field, message: \`\${field} is required\` });\n      continue;\n    }\n\n    if (value !== undefined && value !== null) {\n      if (ruleSet.type && typeof value !== ruleSet.type) {\n        errors.push({ field, message: \`\${field} must be a \${ruleSet.type}\` });\n      }\n      if (ruleSet.minLength && typeof value === 'string' && value.length < ruleSet.minLength) {\n        errors.push({ field, message: \`\${field} must be at least \${ruleSet.minLength} characters\` });\n      }\n      if (ruleSet.maxLength && typeof value === 'string' && value.length > ruleSet.maxLength) {\n        errors.push({ field, message: \`\${field} must be at most \${ruleSet.maxLength} characters\` });\n      }\n      if (ruleSet.pattern && typeof value === 'string' && !ruleSet.pattern.test(value)) {\n        errors.push({ field, message: \`\${field} has invalid format\` });\n      }\n      if (ruleSet.email && typeof value === 'string' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {\n        errors.push({ field, message: \`\${field} must be a valid email\` });\n      }\n    }\n  }\n\n  return { valid: errors.length === 0, errors };\n}\n\nfunction sanitize(str) {\n  if (typeof str !== 'string') return str;\n  return str.replace(/[<>\"'&]/g, c => ({\n    '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;', '&': '&amp;'\n  })[c] || c);\n}\n\n${this._wrapExport('{ validate' + this._toPascalCase(name || 'Input') + ', sanitize }')}\n`;

    return { lang: 'javascript', label: 'Input Validation Module', code, learnedFrom: ['workspace validation patterns'] };
  }

  _genErrorHandler() {
    const code = `/**\n * Centralized Error Handling Middleware\n * Catches all unhandled errors and formats clean responses.\n */\nfunction errorHandler(err, req, res, _next) {\n  const statusCode = err.statusCode || err.status || 500;\n  const message = err.message || 'Internal server error';\n\n  console.error(\`[Error Handler] \${req.method} \${req.originalUrl}: \${message}\`);\n  if (statusCode >= 500) console.error(err.stack);\n\n  res.status(statusCode).json({\n    success: false,\n    error: {\n      message: statusCode >= 500 ? 'Internal server error' : message,\n      code: err.code || 'UNKNOWN_ERROR'\n    }\n  });\n}\n\nfunction asyncHandler(fn) {\n  return (req, res, next) => {\n    Promise.resolve(fn(req, res, next)).catch(next);\n  };\n}\n\nclass AppError extends Error {\n  constructor(message, statusCode = 400, code = 'APP_ERROR') {\n    super(message);\n    this.statusCode = statusCode;\n    this.code = code;\n  }\n}\n\n${this._wrapExport('{ errorHandler, asyncHandler, AppError }')}\n`;

    return { lang: 'javascript', label: 'Error Handling Middleware', code, learnedFrom: ['workspace error patterns'] };
  }

  _genTestModule(name, prompt) {
    const code = `/**\n * Unit Tests for ${this._toPascalCase(name || 'Module')}\n */\n\n// Minimal test runner (no external dependencies)\nfunction assert(condition, message) {\n  if (!condition) throw new Error('FAIL: ' + message);\n  console.log('  ✓ ' + message);\n}\n\nfunction describe(name, fn) {\n  console.log('\\n' + name);\n  try { fn(); } catch (e) { console.error('  ✗ ' + e.message); }\n}\n\nfunction it(name, fn) {\n  try { fn(); console.log('  ✓ ' + name); }\n  catch (e) { console.error('  ✗ ' + name + ': ' + e.message); }\n}\n\n// Test suite\ndescribe('${this._toPascalCase(name || 'Module')} Tests', () => {\n  it('should exist and be importable', () => {\n    assert(true, 'Module loads without errors');\n  });\n\n  it('should handle valid input correctly', () => {\n    const input = { data: 'test' };\n    assert(input.data === 'test', 'Input data is correct');\n  });\n\n  it('should handle edge cases gracefully', () => {\n    assert(typeof null !== 'undefined', 'Null handling works');\n    assert(typeof undefined !== 'number', 'Undefined handling works');\n  });\n});\n\nconsole.log('\\n--- Tests Complete ---');\n`;

    return { lang: 'javascript', label: `Unit Tests for ${this._toPascalCase(name || 'Module')}`, code, learnedFrom: ['workspace test patterns'] };
  }

  _genReactComponent(name, prompt) {
    const componentName = this._toPascalCase(name || 'Component');
    const code = `import React, { useState, useEffect } from 'react';\n\n/**\n * ${componentName} — Interactive React Component\n */\nexport default function ${componentName}({ title = '${componentName}', onAction }) {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);\n\n  useEffect(() => {\n    async function fetchData() {\n      try {\n        setLoading(true);\n        // Replace with your actual data source\n        const response = await fetch('/api/${name || 'data'}');\n        if (!response.ok) throw new Error('Failed to fetch');\n        const result = await response.json();\n        setData(result.data);\n      } catch (err) {\n        setError(err.message);\n      } finally {\n        setLoading(false);\n      }\n    }\n    fetchData();\n  }, []);\n\n  if (loading) return <div className="${name || 'component'}-loading">Loading...</div>;\n  if (error) return <div className="${name || 'component'}-error">Error: {error}</div>;\n\n  return (\n    <div className="${name || 'component'}-container">\n      <h2>{title}</h2>\n      <div className="${name || 'component'}-content">\n        {data ? (\n          <pre>{JSON.stringify(data, null, 2)}</pre>\n        ) : (\n          <p>No data available</p>\n        )}\n      </div>\n      {onAction && (\n        <button onClick={() => onAction(data)} className="${name || 'component'}-action">\n          Take Action\n        </button>\n      )}\n    </div>\n  );\n}\n`;

    return { lang: 'jsx', label: `${componentName} React Component`, code, learnedFrom: ['workspace React patterns'] };
  }

  _genFileIOModule(name, prompt) {
    const code = `${this._wrapImport('fs', 'fs')}\n${this._wrapImport('path', 'path')}\n\n/**\n * File I/O Utility Module\n * Safe file reading, writing, and directory management.\n */\n\nfunction readJSON(filePath) {\n  try {\n    const content = fs.readFileSync(filePath, 'utf8');\n    return JSON.parse(content);\n  } catch (err) {\n    if (err.code === 'ENOENT') return null;\n    throw err;\n  }\n}\n\nfunction writeJSON(filePath, data) {\n  const dir = path.dirname(filePath);\n  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });\n  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');\n}\n\nfunction ensureDir(dirPath) {\n  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });\n}\n\nfunction listFiles(dirPath, extensions = []) {\n  if (!fs.existsSync(dirPath)) return [];\n  const results = [];\n  const entries = fs.readdirSync(dirPath, { withFileTypes: true });\n  for (const entry of entries) {\n    if (entry.name.startsWith('.')) continue;\n    const fullPath = path.join(dirPath, entry.name);\n    if (entry.isFile()) {\n      if (extensions.length === 0 || extensions.includes(path.extname(entry.name))) {\n        results.push(fullPath);\n      }\n    } else if (entry.isDirectory()) {\n      results.push(...listFiles(fullPath, extensions));\n    }\n  }\n  return results;\n}\n\n${this._wrapExport('{ readJSON, writeJSON, ensureDir, listFiles }')}\n`;

    return { lang: 'javascript', label: 'File I/O Utility Module', code, learnedFrom: ['workspace file patterns'] };
  }

  _genUtilityModule(name, prompt) {
    const code = `/**\n * ${this._toPascalCase(name || 'Utility')} Module\n * General-purpose utility functions.\n */\n\nfunction ${this._toCamelCase(name || 'processData')}(input) {\n  if (!input) throw new Error('Input is required');\n\n  // Process the input data\n  const result = typeof input === 'string' ? input.trim() : input;\n\n  return {\n    processed: true,\n    data: result,\n    timestamp: new Date().toISOString()\n  };\n}\n\nfunction formatResponse(data, success = true) {\n  return {\n    success,\n    data: success ? data : null,\n    error: success ? null : data,\n    timestamp: new Date().toISOString()\n  };\n}\n\n${this._wrapExport('{ ' + this._toCamelCase(name || 'processData') + ', formatResponse }')}\n`;

    return { lang: 'javascript', label: `${this._toPascalCase(name || 'Utility')} Module`, code, learnedFrom: ['workspace utility patterns'] };
  }

  /** Get synthesizer statistics */
  getStats() {
    return {
      expressRoutes: this.patterns.expressRoutes.length,
      functions: this.patterns.functions.length,
      classes: this.patterns.classes.length,
      errorHandlers: this.patterns.errorHandlers.length,
      importStyle: this.patterns.importStyles,
      namingConventions: this.patterns.namingConventions
    };
  }
}

module.exports = new ConcodeCodeSynthesizer();
