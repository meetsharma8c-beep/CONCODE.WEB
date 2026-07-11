const fs = require('fs');
const path = require('path');
const gateway = require('./gateway');

// Try to load Gemini client if configured
let ai = null;
try {
  const { GoogleGenAI } = require('@google/genai');
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.log("Studio: Gemini API client initialization bypassed.");
}

/**
 * Main entrance to generate a website.
 * @param {string} projectId 
 * @param {string} prompt 
 * @param {Object} options - custom styling colors, fonts
 * @returns {Promise<Object>}
 */
async function fnGenerateWebsite(projectId, prompt, options = {}) {
  const normalizedId = projectId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (!normalizedId) {
    throw new Error('Invalid project ID. Must contain alphanumeric, hyphens, or underscores only.');
  }

  const projectDir = path.join(__dirname, '../public/projects', normalizedId);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  let siteData = {
    pages: {
      'index.html': '',
      'about.html': '',
      'contact.html': ''
    },
    css: '',
    js: ''
  };

  if (ai) {
    try {
      console.log(`[STUDIO] Requesting Gemini to generate custom website files for: "${prompt}"`);
      
      const systemInstructions = `
You are an expert front-end developer. Generate a premium, production-ready website code based on the user's request.
Generate THREE files: index.html (main page), about.html (info page), contact.html (contact form), along with style.css and app.js.
Return a structured JSON object containing precisely:
1. "index": Complete HTML code for index.html.
2. "about": Complete HTML code for about.html.
3. "contact": Complete HTML code for contact.html.
4. "css": A comprehensive stylesheet for all three pages.
5. "js": A comprehensive client script for all three pages.

In each HTML, link them as:
<link rel="stylesheet" href="style.css">
<script src="app.js" defer></script>

Return a parseable JSON object matching this schema:
{
  "index": "string",
  "about": "string",
  "contact": "string",
  "css": "string",
  "js": "string"
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `Generate code for: "${prompt}"` }] }
        ],
        config: {
          systemInstruction: systemInstructions,
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      
      siteData.pages['index.html'] = parsed.index || parsed.html;
      siteData.pages['about.html'] = parsed.about || '<h1>About Page</h1>';
      siteData.pages['contact.html'] = parsed.contact || '<h1>Contact Page</h1>';
      siteData.css = parsed.css;
      siteData.js = parsed.js;
      
    } catch (err) {
      console.error('[STUDIO] Gemini generation failed, falling back to local layout generator:', err);
      siteData = generateOfflineMultiPageLayout(prompt, options);
    }
  } else {
    console.log('[STUDIO] GEMINI_API_KEY is not defined, generating local offline premium layout.');
    siteData = generateOfflineMultiPageLayout(prompt, options);
  }

  // Ensure default structures are present
  if (!siteData.pages['index.html']) siteData.pages['index.html'] = '<h1>Project Workspace</h1>';
  if (!siteData.css) siteData.css = 'body { font-family: sans-serif; background: #0b0f19; color: #fff; }';
  if (!siteData.js) siteData.js = '// Empty app logic';

  // Write all pages
  Object.keys(siteData.pages).forEach(filename => {
    fs.writeFileSync(path.join(projectDir, filename), siteData.pages[filename], 'utf8');
  });

  // Write style and JS files
  fs.writeFileSync(path.join(projectDir, 'style.css'), siteData.css, 'utf8');
  fs.writeFileSync(path.join(projectDir, 'app.js'), siteData.js, 'utf8');

  // Register in the API Gateway (maps /project/:projectId)
  await gateway.registerRoute(normalizedId);

  return {
    projectId: normalizedId,
    previewUrl: `/project/${normalizedId}/`,
    pages: Object.keys(siteData.pages),
    files: [...Object.keys(siteData.pages), 'style.css', 'app.js'],
    theme: prompt.toLowerCase().includes('light') ? 'light' : 'dark'
  };
}

/**
 * Generates beautiful, styled offline multi-page layout templates.
 */
function generateOfflineMultiPageLayout(prompt, options = {}) {
  const query = prompt.toLowerCase();
  
  // Extract theme colors
  let primaryColor = options.primaryColor || '#6366f1'; // Default Indigo
  let secondaryColor = options.secondaryColor || '#06b6d4'; // Default Cyan
  let bgGradientStart = '#0f172a'; // Default slate dark
  let bgGradientEnd = '#020617';

  if (query.includes('rose') || query.includes('red') || query.includes('pink')) {
    primaryColor = '#f43f5e'; // Rose
    secondaryColor = '#fb7185';
  } else if (query.includes('emerald') || query.includes('green') || query.includes('mint')) {
    primaryColor = '#10b981'; // Emerald
    secondaryColor = '#34d399';
  } else if (query.includes('gold') || query.includes('yellow') || query.includes('amber')) {
    primaryColor = '#eab308'; // Gold
    secondaryColor = '#facc15';
  } else if (query.includes('orange') || query.includes('coral')) {
    primaryColor = '#f97316'; // Orange
    secondaryColor = '#fb923c';
  }

  if (query.includes('light') || query.includes('white') || query.includes('clean')) {
    bgGradientStart = '#f8fafc'; // Slate light
    bgGradientEnd = '#f1f5f9';
  }

  // Extract client name
  let clientName = 'ApexDigital';
  if (prompt.match(/for (a|an) ([a-zA-Z0-9\s]+)/i)) {
    const match = prompt.match(/for (a|an) ([a-zA-Z0-9\s]+)/i);
    clientName = match[2].trim().replace(/\b\w/g, c => c.toUpperCase());
  } else if (prompt.match(/called ([a-zA-Z0-9\s]+)/i)) {
    const match = prompt.match(/called ([a-zA-Z0-9\s]+)/i);
    clientName = match[1].trim().replace(/\b\w/g, c => c.toUpperCase());
  }

  // Choose template layout
  let templateGen = getGeneralMultiPageTemplate;
  if (query.includes('portfolio') || query.includes('designer') || query.includes('developer')) {
    templateGen = getPortfolioMultiPageTemplate;
  } else if (query.includes('dashboard') || query.includes('crypto') || query.includes('analytics') || query.includes('saas')) {
    templateGen = getSaaSMultiPageTemplate;
  }

  return templateGen(clientName, prompt, primaryColor, secondaryColor, bgGradientStart, bgGradientEnd);
}

// ═══════════════════════════════════════
// MULTI-PAGE OFFLINE CODE GENERATORS
// ═══════════════════════════════════════

function getPortfolioMultiPageTemplate(name, prompt, primary, secondary, bgStart, bgEnd) {
  const isDark = bgStart === '#0f172a';
  const textColor = isDark ? '#f3f4f6' : '#1e293b';
  const textMuted = isDark ? '#9ca3af' : '#64748b';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Creative Portfolio</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">&lt;${name} /&gt;</div>
    <ul class="nav-links">
      <li><a href="index.html" class="active">Home</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul>
  </nav>

  <header class="hero animate-fade">
    <div class="badge">DESIGN WORKSPACE</div>
    <h1 class="title">Crafting Premium<br><span class="accent">Digital Realism</span></h1>
    <p class="subtitle">Ecosystem designed for: "${prompt}" — Powered by CONCODE AI Studio.</p>
    <div class="actions">
      <a href="contact.html" class="btn btn-primary">Start a Project</a>
      <a href="about.html" class="btn btn-secondary">Read Story</a>
    </div>
  </header>

  <section class="section">
    <h2 class="section-title">Selected Masterpieces</h2>
    <div class="grid">
      <div class="card">
        <div class="card-img" style="background: linear-gradient(135deg, ${primary}, ${secondary})"></div>
        <h3>NeuroRouter WebGL</h3>
        <p>A cinematic WebGL telemetry interface mapping distributed routing node graphs.</p>
      </div>
      <div class="card">
        <div class="card-img" style="background: linear-gradient(135deg, ${secondary}, #a855f7)"></div>
        <h3>E-Commerce Kernel</h3>
        <p>Ultra-fast GraphQL microservice routing 15k orders per minute concurrently.</p>
      </div>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Constructed by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const about = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Creative Portfolio</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">&lt;${name} /&gt;</div>
    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html" class="active">About</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul>
  </nav>

  <section class="section animate-fade">
    <div class="about-container">
      <h2 class="section-title">About ${name}</h2>
      <p class="about-text">
        We code solutions that give you an unfair advantage. This digital ecosystem leverages high-performance code pipelines, 
        responsive grid frameworks, and custom WebGL styling architectures to tell compelling brand stories.
      </p>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-number">45+</span>
          <span class="stat-label">Projects Completed</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">60k</span>
          <span class="stat-label">Lines of Code</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">100%</span>
          <span class="stat-label">Client Trust</span>
        </div>
      </div>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Constructed by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const contact = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Creative Portfolio</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">&lt;${name} /&gt;</div>
    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="contact.html" class="active">Contact</a></li>
    </ul>
  </nav>

  <section class="section animate-fade">
    <div class="card contact-card">
      <h2>Let's build something grand.</h2>
      <p>Submit your parameters and launch your platform rollout sequence.</p>
      <form id="contact-form">
        <input type="text" id="name" placeholder="Your Name" required>
        <input type="email" id="email" placeholder="Your Email" required>
        <textarea id="message" placeholder="Describe your ecosystem objective..." required rows="4"></textarea>
        <button type="submit" class="btn btn-primary">Submit Payload</button>
      </form>
      <div id="form-msg" class="form-msg"></div>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Constructed by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const css = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(185deg, ${bgStart} 0%, ${bgEnd} 100%);
  color: ${textColor};
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 8%;
  border-bottom: 1px solid ${borderCol};
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 600;
  color: ${primary};
}
.nav-links {
  display: flex;
  list-style: none;
  gap: 30px;
}
.nav-links a {
  color: ${textMuted};
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s;
}
.nav-links a:hover, .nav-links a.active { color: ${primary}; }
.hero {
  padding: 100px 8% 80px 8%;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}
.badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid rgba(0, 240, 255, 0.1);
  color: ${primary};
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 24px;
  font-family: 'JetBrains Mono', monospace;
}
.title {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -1px;
  margin-bottom: 20px;
  color: ${isDark ? '#fff' : '#000'};
}
.accent {
  background: linear-gradient(to right, ${primary}, ${secondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  color: ${textMuted};
  font-size: 18px;
  margin-bottom: 40px;
}
.actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}
.btn {
  display: inline-block;
  padding: 14px 28px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-primary {
  background-color: ${primary};
  color: ${isDark ? '#030712' : '#fff'};
  border: none;
}
.btn-primary:hover {
  background-color: ${secondary};
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}
.btn-secondary {
  border: 1px solid ${borderCol};
  color: ${textColor};
  background: transparent;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
}
.section {
  padding: 80px 8%;
  max-width: 1200px;
  margin: 0 auto;
  flex: 1;
}
.section-title {
  font-size: 32px;
  margin-bottom: 40px;
  border-left: 4px solid ${primary};
  padding-left: 15px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}
.card {
  background: ${cardBg};
  border: 1px solid ${borderCol};
  border-radius: 12px;
  padding: 24px;
  transition: transform 0.3s, border-color 0.3s;
}
.card:hover {
  transform: translateY(-5px);
  border-color: ${primary};
}
.card-img {
  height: 200px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.about-container { max-width: 800px; margin: 0 auto; }
.about-text { font-size: 20px; color: ${textMuted}; margin-bottom: 50px; }
.stats-grid { display: flex; gap: 40px; }
.stat-card {
  background: ${cardBg};
  border: 1px solid ${borderCol};
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  flex: 1;
}
.stat-number { display: block; font-size: 36px; font-weight: 800; color: ${primary}; }
.stat-label { font-size: 13px; color: ${textMuted}; }
.contact-card {
  max-width: 600px;
  margin: 0 auto;
}
.contact-card h2 { margin-bottom: 10px; text-align: center; }
.contact-card p { text-align: center; color: ${textMuted}; margin-bottom: 30px; }
form { display: flex; flex-direction: column; gap: 20px; }
form input, form textarea {
  background: ${isDark ? '#111827' : '#fff'};
  border: 1px solid ${borderCol};
  padding: 14px;
  border-radius: 8px;
  color: ${textColor};
  font-family: inherit;
}
form input:focus, form textarea:focus {
  border-color: ${primary};
  outline: none;
}
.form-msg {
  margin-top: 15px;
  text-align: center;
  font-weight: 500;
}
footer {
  text-align: center;
  padding: 40px;
  border-top: 1px solid ${borderCol};
  color: #6b7280;
  font-size: 14px;
}
.animate-fade {
  animation: fadeIn 0.8s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}`;

  const js = `// Setup Client Submissions Form handlers
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const msgEl = document.getElementById('form-msg');
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    msgEl.style.color = '${primary}';
    msgEl.innerText = '→ Connecting core network gateways...';
    
    // Call the master system API contact directly
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          msgEl.style.color = '#10b981';
          msgEl.innerText = '✓ Success! Your request payload has been saved and registered.';
          form.reset();
        } else {
          msgEl.style.color = '#ef4444';
          msgEl.innerText = 'Error: ' + data.error.message;
        }
      })
      .catch(err => {
        msgEl.style.color = '#e2af1b';
        msgEl.innerText = 'Network warning. Payload stored locally.';
      });
  });
}`;

  return {
    pages: {
      'index.html': index,
      'about.html': about,
      'contact.html': contact
    },
    css,
    js
  };
}

function getSaaSMultiPageTemplate(name, prompt, primary, secondary, bgStart, bgEnd) {
  const isDark = bgStart === '#0f172a';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#111827' : '#fff';
  const borderCol = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Cloud Engine Platform</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">✦ ${name}</div>
    <ul class="nav-links">
      <li><a href="index.html" class="active">Home</a></li>
      <li><a href="about.html">Architecture</a></li>
      <li><a href="contact.html">Onboard</a></li>
    </ul>
  </nav>

  <header class="hero animate-fade">
    <div class="badge">INTEGRATIVE CLOUD PLATFORM</div>
    <h1 class="title">Accelerate Your Core<br><span class="gradient-text">Neural Operations</span></h1>
    <p class="subtitle">Dynamic orchestrations configured for: "${prompt}"</p>
    <div class="actions">
      <a href="contact.html" class="btn btn-primary">Provision Node Cluster</a>
      <a href="about.html" class="btn btn-secondary">Ecosystem Specs</a>
    </div>
  </header>

  <section class="section">
    <div class="features-grid">
      <div class="feature-card">
        <h3>Auto-Scaling Kubernetes</h3>
        <p>Continuous health probes monitor active pods and scale compute limits dynamically.</p>
      </div>
      <div class="feature-card">
        <h3>Vector Embeddings Cache</h3>
        <p>Pre-routes semantic vector queries to Redis shards, slashing latency parameters by 60%.</p>
      </div>
      <div class="feature-card">
        <h3>Zero-Trust Data Tunnel</h3>
        <p>Hardens ingress routing with dynamic SSL handshakes and distributed rate filters.</p>
      </div>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Powered by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const about = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Cloud Engine Platform</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">✦ ${name}</div>
    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html" class="active">Architecture</a></li>
      <li><a href="contact.html">Onboard</a></li>
    </ul>
  </nav>

  <section class="section animate-fade">
    <h2 class="section-title">Ecosystem Specifications</h2>
    <div class="about-container">
      <p class="about-text">
        This cloud infrastructure runs on top of distributed Kubernetes pods. 
        It integrates our custom caching layers to deliver microsecond latency on high-throughput route gates.
      </p>
      <div class="stat-card">
        <h3>System Telemetry Matrix</h3>
        <ul style="list-style:none; padding:15px; text-align:left; color:${textColor}; font-family:'JetBrains Mono',monospace;">
          <li style="margin-bottom:10px;">→ API Edge Gateway: <span style="color:${primary};">CONNECTED</span></li>
          <li style="margin-bottom:10px;">→ Auto-Scaling Replica Pods: 12 active</li>
          <li style="margin-bottom:10px;">→ System Load Average: 18%</li>
          <li>→ Ingress Error Rate: 0.00%</li>
        </ul>
      </div>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Powered by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const contact = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Cloud Engine Platform</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">✦ ${name}</div>
    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">Architecture</a></li>
      <li><a href="contact.html" class="active">Onboard</a></li>
    </ul>
  </nav>

  <section class="section animate-fade">
    <div class="card contact-card">
      <h2>Ecosystem Onboarding</h2>
      <p>Submit your parameters to auto-provision a sandbox node environment.</p>
      <form id="onboard-form">
        <input type="text" id="client-name" placeholder="Client / Project Name" required>
        <input type="email" id="client-email" placeholder="Contact Email" required>
        <select id="client-module" required style="width:100%; background:${isDark ? '#020617' : '#f1f5f9'}; color:${textColor}; border:1px solid ${borderCol}; padding:14px; border-radius:8px;">
          <option value="DevOps">DevOps Setup</option>
          <option value="Integrative AI">Integrative AI API</option>
          <option value="WebGL Engine">WebGL Graphics Engine</option>
        </select>
        <textarea id="project-desc" placeholder="Describe deployment goals..." required rows="3"></textarea>
        <button type="submit" class="btn btn-primary" style="width:100%;">Provision Cluster</button>
      </form>
      <div id="form-msg" class="form-msg"></div>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Powered by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const css = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', sans-serif;
  background-color: ${bgStart};
  color: ${textColor};
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 8%;
  border-bottom: 1px solid ${borderCol};
}
.logo {
  font-size: 22px;
  font-weight: 700;
  color: ${isDark ? '#fff' : '#000'};
  letter-spacing: -0.5px;
}
.nav-links {
  display: flex;
  gap: 25px;
  list-style: none;
}
.nav-links a {
  color: ${textMuted};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s;
}
.nav-links a:hover, .nav-links a.active { color: ${primary}; }
.hero {
  padding: 120px 8% 80px 8%;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}
.badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(129, 140, 248, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.1);
  color: ${primary};
  border-radius: 30px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  margin-bottom: 24px;
  font-family: 'JetBrains Mono', monospace;
}
.title {
  font-size: 60px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -1.5px;
  color: ${isDark ? '#fff' : '#000'};
  margin-bottom: 20px;
}
.gradient-text {
  background: linear-gradient(to right, ${primary}, ${secondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  color: ${textMuted};
  font-size: 18px;
  margin-bottom: 40px;
}
.actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}
.btn {
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 15px;
  text-decoration: none;
}
.btn-primary {
  background-color: ${primary};
  color: #fff;
  border: none;
}
.btn-primary:hover {
  background-color: ${secondary};
  box-shadow: 0 0 25px rgba(99, 102, 241, 0.2);
}
.btn-secondary {
  border: 1px solid ${borderCol};
  color: ${textColor};
  background: rgba(255,255,255,0.02);
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.06);
}
.section {
  padding: 80px 8%;
  max-width: 1100px;
  margin: 0 auto;
  flex: 1;
}
.section-title {
  font-size: 32px;
  margin-bottom: 30px;
  text-align: center;
  color: ${isDark ? '#fff' : '#000'};
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}
.feature-card {
  background: ${cardBg};
  border: 1px solid ${borderCol};
  border-radius: 12px;
  padding: 30px;
}
.feature-card h3 { margin-bottom: 12px; font-size: 20px; color: ${isDark ? '#fff' : '#000'}; }
.feature-card p { color: ${textMuted}; font-size: 14px; }
.about-container { max-width: 800px; margin: 0 auto; text-align: center; }
.about-text { font-size: 18px; color: ${textMuted}; margin-bottom: 40px; }
.stat-card {
  background: ${isDark ? '#020617' : '#f8fafc'};
  border: 1px solid ${borderCol};
  padding: 30px;
  border-radius: 8px;
}
.contact-card {
  max-width: 600px;
  margin: 0 auto;
  background: ${cardBg};
  border: 1px solid ${borderCol};
  padding: 40px 30px;
  border-radius: 8px;
}
.contact-card h2 { margin-bottom: 10px; text-align: center; }
.contact-card p { text-align: center; color: ${textMuted}; margin-bottom: 30px; }
form { display: flex; flex-direction: column; gap: 15px; }
form input, form textarea {
  background: ${isDark ? '#020617' : '#f1f5f9'};
  border: 1px solid ${borderCol};
  padding: 14px;
  border-radius: 8px;
  color: ${textColor};
  font-family: inherit;
}
form input:focus, form textarea:focus {
  border-color: ${primary};
  outline: none;
}
.form-msg {
  margin-top: 15px;
  text-align: center;
  font-weight: 500;
}
footer {
  text-align: center;
  padding: 50px;
  color: #475569;
  font-size: 13px;
  border-top: 1px solid ${borderCol};
}
.animate-fade {
  animation: fadeIn 0.8s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}`;

  const js = `// Setup Onboard submissions
const form = document.getElementById('onboard-form');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const msgEl = document.getElementById('form-msg');
    const name = document.getElementById('client-name').value;
    const email = document.getElementById('client-email').value;
    const serviceType = document.getElementById('client-module').value;
    const description = document.getElementById('project-desc').value;

    msgEl.style.color = '${primary}';
    msgEl.innerText = '→ Connecting core network gateways...';
    
    // Call the master system API contact directly
    fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, serviceType, description })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          msgEl.style.color = '#10b981';
          msgEl.innerText = '✓ Success! Cluster setup initialization sequence deployed.';
          form.reset();
        } else {
          msgEl.style.color = '#ef4444';
          msgEl.innerText = 'Error: ' + data.error.message;
        }
      })
      .catch(err => {
        msgEl.style.color = '#e2af1b';
        msgEl.innerText = 'Warning. Inquiry queued locally.';
      });
  });
}`;

  return {
    pages: {
      'index.html': index,
      'about.html': about,
      'contact.html': contact
    },
    css,
    js
  };
}

function getGeneralMultiPageTemplate(name, prompt, primary, secondary, bgStart, bgEnd) {
  // Simple Fallback template
  const isDark = bgStart === '#0f172a';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">✦ ${name}</div>
    <ul class="nav-links">
      <li><a href="index.html" class="active">Home</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul>
  </nav>

  <header class="hero">
    <h1 class="title">Dynamic Engineering for<br><span class="accent">${name}</span></h1>
    <p class="subtitle">Custom parameters configured for: "${prompt}"</p>
    <a href="contact.html" class="btn">Initiate Connection</a>
  </header>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Powered by CONCODE AI Studio Fallbacks.</p>
  </footer>
</body>
</html>`;

  const about = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — About</title>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">✦ ${name}</div>
    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html" class="active">About</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul>
  </nav>

  <section class="section">
    <h2>About ${name}</h2>
    <p style="margin-top:20px;">We architect digital products that scale. This space serves as the core workspace hub.</p>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Powered by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const contact = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Contact</title>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="logo">✦ ${name}</div>
    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="contact.html" class="active">Contact</a></li>
    </ul>
  </nav>

  <section class="section">
    <div class="card">
      <h2>Establish Connection Link</h2>
      <form id="general-form">
        <input type="text" placeholder="Full Name" required>
        <input type="email" placeholder="Email Address" required>
        <button type="submit">Deploy Request</button>
      </form>
      <div id="general-msg" class="msg"></div>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${name}. Powered by CONCODE AI Studio.</p>
  </footer>
</body>
</html>`;

  const css = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: sans-serif;
  background-color: ${bgStart};
  color: ${textColor};
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 8%;
  border-bottom: 1px solid ${borderCol};
}
.logo { font-size: 20px; font-weight: 700; color: ${primary}; }
.nav-links { display: flex; gap: 20px; list-style: none; }
.nav-links a { color: ${textColor}; opacity: 0.8; text-decoration: none; transition: opacity 0.3s; }
.nav-links a:hover, .nav-links a.active { opacity: 1; color: ${primary}; }
.hero {
  flex: 1;
  padding: 100px 8% 50px 8%;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}
.title { font-size: 48px; font-weight: 800; margin-bottom: 20px; line-height: 1.2; }
.accent { color: ${primary}; }
.subtitle { color: ${textColor}; opacity: 0.6; font-size: 18px; margin-bottom: 40px; }
.btn {
  display: inline-block;
  padding: 14px 30px;
  background: ${primary};
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  border-radius: 6px;
  transition: all 0.3s;
}
.btn:hover {
  background: ${secondary};
}
.section { padding: 80px 8%; max-width: 800px; margin: 0 auto; flex: 1; }
.card {
  background: ${cardBg};
  border: 1px solid ${borderCol};
  border-radius: 8px;
  padding: 30px;
}
.card h2 { font-size: 24px; margin-bottom: 20px; text-align: center; }
form { display: flex; flex-direction: column; gap: 15px; }
form input {
  background: ${isDark ? '#1e293b' : '#fff'};
  border: 1px solid ${borderCol};
  color: ${textColor};
  padding: 12px;
  border-radius: 6px;
}
form button {
  background: ${primary};
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.msg { margin-top: 15px; text-align: center; font-weight: 500; color: ${primary}; }
footer { text-align: center; padding: 30px; border-top: 1px solid ${borderCol}; color: #475569; font-size: 13px; }`;

  const js = `// Setup forms
const f = document.getElementById('general-form');
if (f) {
  f.addEventListener('submit', function(e) {
    e.preventDefault();
    const msg = document.getElementById('general-msg');
    msg.innerText = 'Connecting gateway...';
    setTimeout(() => {
      msg.style.color = '#10b981';
      msg.innerText = '✓ Success!';
    }, 800);
  });
}`;

  return {
    pages: {
      'index.html': index,
      'about.html': about,
      'contact.html': contact
    },
    css,
    js
  };
}

module.exports = {
  generateWebsite: fnGenerateWebsite
};
