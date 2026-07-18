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
 * Generates highly customizable, beautiful offline multi-page layout templates based on prompt keywords.
 */
function generateOfflineMultiPageLayout(prompt, options = {}) {
  const query = prompt.toLowerCase();
  
  // 1. Analyze prompt to extract industry category
  let category = 'business'; // default fallback
  if (query.match(/\b(cafe|coffee|bakery|tea|brew|espresso|roast|cup|mug|cappuccino|latte)\b/)) {
    category = 'cafe';
  } else if (query.match(/\b(restaurant|food|sushi|dining|pizza|bites|kitchen|steak|bar|bistro|diner|eats|pub)\b/)) {
    category = 'restaurant';
  } else if (query.match(/\b(saas|crypto|analytics|dashboard|cloud|tech|ai|neural|kubernetes|cluster|node|software|app|platform|telemetry)\b/)) {
    category = 'tech';
  } else if (query.match(/\b(portfolio|designer|developer|creative|photography|artist|studio|art|agency|freelancer|photographer|writer)\b/)) {
    category = 'portfolio';
  } else if (query.match(/\b(shop|store|ecommerce|boutique|retail|marketplace|cart|buy|selling|checkout|products)\b/)) {
    category = 'shop';
  } else if (query.match(/\b(fitness|gym|yoga|workout|crossfit|health|clinic|doctor|dentist|physio|pilates|trainer|coach)\b/)) {
    category = 'fitness';
  }

  // 2. Extract brand name
  let clientName = 'ApexDigital';
  if (prompt.match(/for (a|an) ([a-zA-Z0-9\s]+)/i)) {
    const match = prompt.match(/for (a|an) ([a-zA-Z0-9\s]+)/i);
    clientName = match[2].trim().replace(/\b\w/g, c => c.toUpperCase());
  } else if (prompt.match(/called ([a-zA-Z0-9\s]+)/i)) {
    const match = prompt.match(/called ([a-zA-Z0-9\s]+)/i);
    clientName = match[1].trim().replace(/\b\w/g, c => c.toUpperCase());
  } else if (prompt.match(/named ([a-zA-Z0-9\s]+)/i)) {
    const match = prompt.match(/named ([a-zA-Z0-9\s]+)/i);
    clientName = match[1].trim().replace(/\b\w/g, c => c.toUpperCase());
  }

  // 3. Choose layout style features, typography & colors
  let styleType = 'modern';
  if (query.match(/\b(cyberpunk|neon|synthwave|sci-fi|glitch)\b/)) {
    styleType = 'cyberpunk';
  } else if (query.match(/\b(luxury|gold|elegant|royal|brass|classic|premium|elite)\b/)) {
    styleType = 'luxury';
  } else if (query.match(/\b(minimal|clean|simple|monochrome|basic|sleek)\b/)) {
    styleType = 'minimal';
  } else if (query.match(/\b(glassmorphism|frosted|blur|translucent|glass)\b/)) {
    styleType = 'glassmorphism';
  }

  let isDark = true;
  if (query.match(/\b(light|white|clean|day|bright|snow)\b/)) {
    isDark = false;
  }

  // Build the palette
  let theme = {
    isDark,
    fontHead: "'Outfit', sans-serif",
    fontBody: "'Inter', sans-serif",
    fontImport: "family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;800",
    primary: options.primaryColor || '#6366f1',
    secondary: options.secondaryColor || '#06b6d4',
    accent: '#a855f7',
    bgStart: isDark ? '#0f172a' : '#f8fafc',
    bgEnd: isDark ? '#020617' : '#f1f5f9',
    textColor: isDark ? '#f3f4f6' : '#1e293b',
    textMuted: isDark ? '#9ca3af' : '#64748b',
    cardBg: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    backdropBlur: '12px',
    shadowGlow: isDark ? '0 8px 30px rgba(99, 102, 241, 0.15)' : '0 8px 30px rgba(0, 0, 0, 0.03)',
    cssExtra: ''
  };

  // Color overrides based on prompt keywords
  if (query.match(/\b(rose|pink|crimson|ruby)\b/)) {
    theme.primary = '#f43f5e';
    theme.secondary = '#fb7185';
    theme.accent = '#ec4899';
  } else if (query.match(/\b(emerald|green|mint|teal|nature|olive)\b/)) {
    theme.primary = '#10b981';
    theme.secondary = '#34d399';
    theme.accent = '#0d9488';
  } else if (query.match(/\b(orange|coral|amber|sunset|warm)\b/)) {
    theme.primary = '#f97316';
    theme.secondary = '#fb923c';
    theme.accent = '#f59e0b';
  } else if (query.match(/\b(gold|yellow|brass)\b/)) {
    theme.primary = '#d4af37';
    theme.secondary = '#eab308';
    theme.accent = '#aa820a';
  } else if (query.match(/\b(purple|violet|lavender|indigo)\b/)) {
    theme.primary = '#8b5cf6';
    theme.secondary = '#c084fc';
    theme.accent = '#6366f1';
  } else if (query.match(/\b(blue|sky|cyan|ocean|ice)\b/)) {
    theme.primary = '#3b82f6';
    theme.secondary = '#60a5fa';
    theme.accent = '#06b6d4';
  }

  // Apply style presets
  if (styleType === 'cyberpunk') {
    theme.isDark = true;
    theme.fontHead = "'Space Grotesk', sans-serif";
    theme.fontBody = "'Space Grotesk', sans-serif";
    theme.fontImport = "family=Space+Grotesk:wght@400;600;700";
    theme.primary = theme.primary === '#6366f1' ? '#ff007f' : theme.primary;
    theme.secondary = theme.secondary === '#06b6d4' ? '#00f0ff' : theme.secondary;
    theme.accent = '#ffea00';
    theme.bgStart = '#06010f';
    theme.bgEnd = '#020005';
    theme.cardBg = 'rgba(255, 0, 127, 0.03)';
    theme.cardBorder = 'rgba(0, 240, 255, 0.15)';
    theme.shadowGlow = '0 0 15px rgba(0, 240, 255, 0.25)';
    theme.cssExtra = `
      .card { box-shadow: 0 0 10px rgba(0, 240, 255, 0.05); text-transform: uppercase; }
      .card h3, .section-title { font-family: 'Space Grotesk', sans-serif; letter-spacing: -1px; }
      .btn { border-radius: 0px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; border: 1px solid var(--primary); }
      .btn-primary { background: var(--primary); box-shadow: 0 0 15px var(--primary); text-shadow: 0 0 5px #fff; }
      .btn-primary:hover { background: var(--secondary); box-shadow: 0 0 25px var(--secondary); }
    `;
  } else if (styleType === 'luxury') {
    theme.fontHead = "'Playfair Display', serif";
    theme.fontBody = "'Lora', serif";
    theme.fontImport = "family=Lora:ital,wght@0,400;0,500;1,400&family=Playfair+Display:wght@500;700;900";
    theme.primary = '#d4af37';
    theme.secondary = '#9a7515';
    theme.accent = '#ffffff';
    if (theme.isDark) {
      theme.bgStart = '#0e0f12';
      theme.bgEnd = '#050507';
      theme.cardBg = 'rgba(212, 175, 55, 0.015)';
      theme.cardBorder = 'rgba(212, 175, 55, 0.08)';
      theme.shadowGlow = '0 10px 40px rgba(212, 175, 55, 0.05)';
    } else {
      theme.bgStart = '#fdfdfb';
      theme.bgEnd = '#f7f6f0';
      theme.textColor = '#1c1c1c';
      theme.cardBg = 'rgba(212, 175, 55, 0.03)';
      theme.cardBorder = 'rgba(212, 175, 55, 0.15)';
    }
    theme.cssExtra = `
      .title, .section-title, .logo { font-style: italic; }
      .btn { border-radius: 40px; font-family: var(--font-head); text-transform: uppercase; letter-spacing: 1.5px; }
    `;
  } else if (styleType === 'minimal') {
    theme.fontHead = "'Inter', sans-serif";
    theme.fontBody = "'Inter', sans-serif";
    theme.fontImport = "family=Inter:wght@300;400;600;800";
    theme.primary = theme.isDark ? '#f8fafc' : '#0f172a';
    theme.secondary = theme.isDark ? '#cbd5e1' : '#475569';
    theme.accent = '#64748b';
    theme.shadowGlow = 'none';
    theme.cardBg = 'transparent';
    theme.cardBorder = theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    theme.cssExtra = `
      .card { border-radius: 4px; transition: background 0.3s; }
      .card:hover { background: ${theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)'}; }
      .btn { border-radius: 4px; }
    `;
  } else if (styleType === 'glassmorphism') {
    theme.isDark = true;
    theme.bgStart = '#030510';
    theme.bgEnd = '#010206';
    theme.cardBg = 'rgba(255, 255, 255, 0.03)';
    theme.cardBorder = 'rgba(255, 255, 255, 0.08)';
    theme.backdropBlur = '20px';
    theme.cssExtra = `
      .card, .nav, .pricing-card, .contact-card, .cart-drawer, .ticket-card {
        backdrop-filter: blur(var(--blur-amount));
        -webkit-backdrop-filter: blur(var(--blur-amount));
      }
    `;
  }

  // 4. Construct customized components based on category
  const dynamicSections = compileIndustryHTML(category, clientName, theme, prompt);
  
  // 5. Build full page files
  const index = assembleHTML(clientName, 'index', dynamicSections.index, theme);
  const about = assembleHTML(clientName, 'about', dynamicSections.about, theme);
  const contact = assembleHTML(clientName, 'contact', dynamicSections.contact, theme);
  const css = assembleCSS(theme);
  const js = assembleJS(category, theme);

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

/**
 * Compiles specific sections and widgets for index, about, and contact based on industry category.
 */
function compileIndustryHTML(category, clientName, theme, prompt) {
  let index = '';
  let about = '';
  let contact = '';

  const activeLink = (page, current) => page === current ? 'class="active"' : '';

  if (category === 'cafe' || category === 'restaurant') {
    const isCafe = category === 'cafe';
    const menuTitle = isCafe ? 'Specialty Brews & Bakery' : 'Signature Culinary Creations';
    const heroTitle = isCafe ? 'Fuel Your Spirit,<br>Sip by Sip.' : 'Crafting Culinary<br>Excellence.';
    const heroSubtitle = isCafe ? `Welcome to ${clientName} — a premium sanctuary crafted for specialty coffee enthusiasts and artisan bakers.` : `Indulge in an immersive dining experience at ${clientName} — curated signature culinary arts.`;

    const menuItems = isCafe ? [
      { name: 'Saffron Gold Latte', desc: 'Espresso infused with rare Iranian saffron and organic gold flake dust.', price: '$9.50', tag: 'Signature' },
      { name: 'Smoked Vanilla Nitro Cold Brew', desc: 'Cold brew slow-infused with oak-smoke vanilla bean cream.', price: '$6.50', tag: 'Popular' },
      { name: 'Matcha Blossom Cappuccino', desc: 'Japanese ceremonial grade matcha layered with cherry blossom cream.', price: '$7.00', tag: 'Vegan' },
      { name: 'Artisan Pistachio Sourdough Croissant', desc: 'Flaky 24-hour laminated pastry stuffed with wild pistachio paste.', price: '$8.00', tag: 'Bakery' }
    ] : [
      { name: 'Truffle Glazed Ribeye Steak', desc: 'Prime ribeye charcoal-seared, basted in rosemary butter, black truffle glaze.', price: '$42.00', tag: 'Signature' },
      { name: 'Crispy Saffron Lobster Ravioli', desc: 'Hand-rolled lobster ravioli served in creamy saffron champagne reduction.', price: '$36.00', tag: 'Signature' },
      { name: 'Burrata Wild Honey Crostini', desc: 'Fresh burrata, heirloom tomatoes, roasted figs, drizzled in organic honey.', price: '$18.00', tag: 'Starter' },
      { name: 'Smoked Sea Salt Caramel Mousse', desc: 'Dark chocolate mousse casing, liquid caramel core, Maldon sea salt flakes.', price: '$14.00', tag: 'Dessert' }
    ];

    index = `
      <header class="hero animate-fade">
        <div class="badge">${category.toUpperCase()} WORKSPACE</div>
        <h1 class="title">${heroTitle}</h1>
        <p class="subtitle">${heroSubtitle}</p>
        <p class="prompt-credit">Theme: "${prompt}"</p>
        <div class="actions">
          <a href="#reservation" class="btn btn-primary">Book a Table</a>
          <a href="#menu" class="btn btn-secondary">Explore Menu</a>
        </div>
      </header>

      <section class="section" id="menu">
        <div class="section-header-centered">
          <h2 class="section-title">${menuTitle}</h2>
          <p class="section-subtitle">Click items to add them to your interactive dining payload cart.</p>
        </div>
        
        <div class="menu-filters">
          <button class="filter-tab active" onclick="filterMenu('all')">All Offerings</button>
          <button class="filter-tab" onclick="filterMenu('signature')">Signature</button>
          <button class="filter-tab" onclick="filterMenu('popular')">Popular/Starter</button>
          <button class="filter-tab" onclick="filterMenu('other')">Other Specs</button>
        </div>

        <div class="grid menu-grid">
          ${menuItems.map(item => `
            <div class="card menu-card" data-category="${item.tag.toLowerCase()}">
              <div class="menu-card-header">
                <h3>${item.name}</h3>
                <span class="menu-price">${item.price}</span>
              </div>
              <p class="menu-desc">${item.desc}</p>
              <div class="menu-card-footer">
                <span class="badge-tag">${item.tag}</span>
                <button class="btn-add-cart" onclick="addToCart('${item.name}', ${parseFloat(item.price.replace('$',''))})">+ Add to Order</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="section section-alt" id="reservation">
        <div class="card contact-card reservation-card">
          <h2>Interactive Reservation Node</h2>
          <p>Configure your dining details below to launch table booking verification sequence.</p>
          <form id="reservation-form" onsubmit="handleReservation(event)">
            <div class="form-row">
              <input type="text" id="res-name" placeholder="Full Name" required>
              <input type="email" id="res-email" placeholder="Email Address" required>
            </div>
            <div class="form-row">
              <input type="date" id="res-date" required>
              <input type="time" id="res-time" required>
            </div>
            <div class="form-row">
              <select id="res-guests" required>
                <option value="2">2 Guests / Table</option>
                <option value="4">4 Guests / Family</option>
                <option value="6">6 Guests / Boardroom</option>
                <option value="8">8+ Guests / Event</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Verify & Book Table</button>
          </form>
        </div>
      </section>
    `;

    about = `
      <section class="section animate-fade">
        <div class="about-container">
          <span class="badge">OUR ANCESTRY</span>
          <h2 class="section-title">Rooted in Tradition,<br>Refined by Code</h2>
          <p class="about-text">
            At ${clientName}, we treat dining as a high-concurrency operation. Every recipe is structured, tested, and optimized. Our kitchen operates under zero-trust hygiene filters, and our coffee beans are roasted following precise thermal algorithms.
          </p>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-number" data-count="15000">0</span>
              <span class="stat-label">Espressos Brewed</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="98">0</span>
              <span class="stat-label">Satisfaction Ping %</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="12">0</span>
              <span class="stat-label">Master Roasters/Chefs</span>
            </div>
          </div>
        </div>
      </section>
    `;

  } else if (category === 'tech') {
    index = `
      <header class="hero animate-fade">
        <div class="badge">CORE SYSTEM INTEGRATED</div>
        <h1 class="title">Orchestrate Your Operations<br><span class="accent">At Infinite Scale</span></h1>
        <p class="subtitle">Next-generation cloud infrastructure, API gateways, and vector data networks constructed for: "${prompt}"</p>
        <div class="actions">
          <a href="#calculator" class="btn btn-primary">Resource Calculator</a>
          <a href="contact.html" class="btn btn-secondary">Onboard Cluster</a>
        </div>
      </header>

      <section class="section" id="nodes-telemetry">
        <div class="section-header-centered">
          <h2 class="section-title">Cluster System Telemetry</h2>
          <p class="section-subtitle">Real-time mock operations streaming directly from your local web app workspace.</p>
        </div>
        <div class="grid feature-grid">
          <div class="card telemetry-card">
            <h3>Edge Ingress API Gateway</h3>
            <div class="telemetry-bar-wrapper">
              <div class="telemetry-bar-label">Throughput load: <span id="ingress-val">42%</span></div>
              <div class="telemetry-bar"><div class="telemetry-fill" id="ingress-bar" style="width: 42%;"></div></div>
            </div>
            <p>Maps subpaths like <code>/project/called</code> to static directory matrices.</p>
          </div>
          <div class="card telemetry-card">
            <h3>Database Caching Clusters</h3>
            <div class="telemetry-bar-wrapper">
              <div class="telemetry-bar-label">Redis Cache Hit Rate: <span id="db-val">91%</span></div>
              <div class="telemetry-bar"><div class="telemetry-fill" id="db-bar" style="width: 91%;"></div></div>
            </div>
            <p>Maintains persistent local JSON backups when Cloud Firebase is offline.</p>
          </div>
          <div class="card telemetry-card">
            <h3>Neural Core Engine</h3>
            <div class="telemetry-bar-wrapper">
              <div class="telemetry-bar-label">Thread Allocation: <span id="ai-val">18%</span></div>
              <div class="telemetry-bar"><div class="telemetry-fill" id="ai-bar" style="width: 18%;"></div></div>
            </div>
            <p>Offline Synapse NLP core parsing custom heuristics in micro-seconds.</p>
          </div>
        </div>
      </section>

      <section class="section section-alt" id="calculator">
        <div class="card contact-card calculator-card">
          <h2>Interactive Node Budget Calculator</h2>
          <p>Move the controls to simulate monthly deployment operational pricing.</p>
          <div class="calc-control">
            <label for="calc-users">Monthly Active Compute Seats: <span id="users-label" class="accent-bold">12</span></label>
            <input type="range" id="calc-users" min="1" max="100" value="12" oninput="updateCalculator()">
          </div>
          <div class="calc-checkboxes">
            <label class="checkbox-container">
              <input type="checkbox" id="calc-security" onchange="updateCalculator()">
              <span>Deploy Ingress TLS Security Layer (+$50)</span>
            </label>
            <label class="checkbox-container">
              <input type="checkbox" id="calc-support" onchange="updateCalculator()">
              <span>24/7 Dedicated Slack SLA support (+$90)</span>
            </label>
          </div>
          <div class="calc-result-box">
            <div class="calc-price-title">Calculated Infrastructure Proposal</div>
            <div class="calc-price"><span class="currency">$</span><span id="calc-total">239</span><span class="period">/mo</span></div>
          </div>
        </div>
      </section>
    `;

    about = `
      <section class="section animate-fade">
        <h2 class="section-title">Architecture Architecture</h2>
        <div class="about-container">
          <p class="about-text">
            Our technology is built to resist degradation. Utilizing multi-region edge gateways and distributed Docker casings, ${clientName} guarantees 99.99% core responsive uptime.
          </p>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-number" data-count="14">0</span>
              <span class="stat-label">Global Edge PoPs</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="320">0</span>
              <span class="stat-label">Terabytes Data Routed</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="8">0</span>
              <span class="stat-label">Self-healing Pods</span>
            </div>
          </div>
        </div>
      </section>
    `;

  } else if (category === 'portfolio') {
    index = `
      <header class="hero animate-fade">
        <div class="badge">CREATIVE DIGITAL DESIGN</div>
        <h1 class="title">Engineering Visual Realism<br>Through Custom Code</h1>
        <p class="subtitle">Ecosystem crafted for: "${prompt}" — Powered by CONCODE AI Studio.</p>
        <div class="actions">
          <a href="#works" class="btn btn-primary">Inspect Works</a>
          <a href="contact.html" class="btn btn-secondary">Contact Studio</a>
        </div>
      </header>

      <section class="section" id="works">
        <div class="section-header-centered">
          <h2 class="section-title">Selected Case Studies</h2>
          <p class="section-subtitle">Click filters to navigate project taxonomy matrices.</p>
        </div>
        
        <div class="menu-filters">
          <button class="filter-tab active" onclick="filterGallery('all')">All Projects</button>
          <button class="filter-tab" onclick="filterGallery('webgl')">3D WebGL</button>
          <button class="filter-tab" onclick="filterGallery('systems')">Systems Architecture</button>
        </div>

        <div class="grid portfolio-gallery-grid">
          <div class="card portfolio-card" data-cat="webgl" onclick="openProjectModal('NeuroRouter', 'A WebGL telemetry interface mapping distributed routing node graphs.', ['Three.js', 'GLSL Shaders', 'WebSockets'])">
            <h3>NeuroRouter 3D</h3>
            <p>High-concurrency graphic loop rendering 10k nodes in browser canvas.</p>
            <span class="badge-tag">WebGL</span>
          </div>
          <div class="card portfolio-card" data-cat="systems" onclick="openProjectModal('Concode CLI', 'An interactive client-side CLI portfolio rendering system telemetry.', ['Node.js', 'Shell scripting', 'Terminals'])">
            <h3>Concode CLI Kernel</h3>
            <p>Secure CLI emulator running custom commands offline.</p>
            <span class="badge-tag">Systems</span>
          </div>
          <div class="card portfolio-card" data-cat="webgl" onclick="openProjectModal('Glassmorphic UI', 'A CSS variables system generating glass widgets with backdrop-filters.', ['CSS Grid', 'Tailwind', 'Aesthetics'])">
            <h3>Vibrant Glassmorphism</h3>
            <p>Frosted cards, animated neon glows, and Outfit typography.</p>
            <span class="badge-tag">WebGL</span>
          </div>
        </div>
      </section>
    `;

    about = `
      <section class="section animate-fade">
        <h2 class="section-title">Our Creative Ethos</h2>
        <div class="about-container">
          <p class="about-text">
            We operate at the intersection of pixel-perfect typography and zero-overhead performance. Code is our canvas, and performance is our primary aesthetic variable.
          </p>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-number" data-count="45">0</span>
              <span class="stat-label">Prototypes Shipped</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="12">0</span>
              <span class="stat-label">Design Accolades</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="100">0</span>
              <span class="stat-label">Client Trust %</span>
            </div>
          </div>
        </div>
      </section>
    `;

  } else {
    // Default business/service category
    index = `
      <header class="hero animate-fade">
        <div class="badge">CONCODE PARTNER DEPLOYMENT</div>
        <h1 class="title">Bespoke Digital Systems<br>Built Natively From Scratch</h1>
        <p class="subtitle">Custom parameters initialized for: "${prompt}". High-performance code pipelines tailored for your objective.</p>
        <div class="actions">
          <a href="contact.html" class="btn btn-primary">Start Onboarding</a>
          <a href="#offerings" class="btn btn-secondary">Our Capabilities</a>
        </div>
      </header>

      <section class="section" id="offerings">
        <h2 class="section-title">Core Subsystems Map</h2>
        <div class="grid feature-grid">
          <div class="card">
            <h3>UI / UX Studio Layout</h3>
            <p>Custom Google Font stacks, CSS custom variables, and responsive flex grid architectures designed to load instantly.</p>
          </div>
          <div class="card">
            <h3>API Gateway Routing</h3>
            <p>Edge path resolution mapping requests securely. Configures custom domains and requests per minute (rpm) limits.</p>
          </div>
          <div class="card">
            <h3>CI/CD Cloud DevOps</h3>
            <p>Terraform configs, Docker image builds, and automated Kubernetes container deployment flows mapped dynamically.</p>
          </div>
        </div>
      </section>
    `;

    about = `
      <section class="section animate-fade">
        <h2 class="section-title">Our Mission Objective</h2>
        <div class="about-container">
          <p class="about-text">
            We help companies build high-fidelity digital platforms. By coupling design aesthetics with advanced software engineering, we deliver robust solutions that solve real business needs.
          </p>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-number" data-count="50">0</span>
              <span class="stat-label">Active Deployments</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="100">0</span>
              <span class="stat-label">Performance Core %</span>
            </div>
            <div class="stat-card">
              <span class="stat-number" data-count="24">0</span>
              <span class="stat-label">Support Hours SLA</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // Common Contact page template (uses micro-console logging)
  contact = `
    <section class="section animate-fade">
      <div class="card contact-card">
        <h2>Establish Secure Ingress Link</h2>
        <p>Submit your packet parameters below to transmit payload data directly to our database logs.</p>
        
        <form id="client-contact-form" onsubmit="submitClientContact(event)">
          <div class="form-row">
            <input type="text" id="contact-name" placeholder="Your Name" required>
            <input type="email" id="contact-email" placeholder="Your Email" required>
          </div>
          <textarea id="contact-message" placeholder="Input message payload parameters (min 10 characters)..." required rows="5"></textarea>
          
          <button type="submit" class="btn btn-primary" id="btn-submit-contact" style="width:100%;">Transmit Payload</button>
        </form>

        <div class="contact-console-panel hidden" id="contact-console">
          <div class="console-header">SYSTEM STREAM LOGS</div>
          <div class="console-body" id="contact-console-logs"></div>
        </div>
      </div>
    </section>
  `;

  return { index, about, contact };
}

/**
 * Assembles HTML boilerplate including navigation, stylesheet imports, script bindings, and footer.
 */
function assembleHTML(clientName, pageName, innerContent, theme) {
  const isIndex = pageName === 'index';
  const isAbout = pageName === 'about';
  const isContact = pageName === 'contact';

  const activeClass = (active) => active ? 'class="active"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${clientName} — ${pageName.toUpperCase()}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?${theme.fontImport}&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="logo">&lt;${clientName} /&gt;</a>
      <ul class="nav-links" id="nav-links">
        <li><a href="index.html" ${activeClass(isIndex)}>Home</a></li>
        <li><a href="about.html" ${activeClass(isAbout)}>About</a></li>
        <li><a href="contact.html" ${activeClass(isContact)}>Contact</a></li>
      </ul>
      <div class="nav-cart-wrapper" onclick="toggleCartDrawer()">
        <span class="cart-icon">🛒</span>
        <span class="cart-badge" id="cart-badge-count">0</span>
      </div>
    </div>
  </nav>

  <main>
    ${innerContent}
  </main>

  <!-- Interactive Overlays/Drawers -->
  <!-- 1. Side Cart Drawer -->
  <div class="cart-drawer-overlay" id="cart-drawer-overlay" onclick="toggleCartDrawer()"></div>
  <div class="cart-drawer" id="cart-drawer">
    <div class="cart-header">
      <h3>Active Order Payload</h3>
      <button class="btn-close-drawer" onclick="toggleCartDrawer()">×</button>
    </div>
    <div class="cart-items" id="cart-drawer-items">
      <div class="cart-empty-message">Your order parameters queue is empty.</div>
    </div>
    <div class="cart-footer">
      <div class="cart-summary">
        <span>Subtotal</span>
        <span id="cart-subtotal">$0.00</span>
      </div>
      <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="checkoutOrder()">Deploy Transaction</button>
    </div>
  </div>

  <!-- 2. Interactive Ticket Overlay -->
  <div class="ticket-modal" id="ticket-modal">
    <div class="ticket-modal-backdrop" onclick="closeTicketModal()"></div>
    <div class="card ticket-card animate-fade">
      <div class="ticket-header">
        <div class="ticket-logo">✦ ${clientName}</div>
        <div class="ticket-status-badge">RESERVED</div>
      </div>
      <div class="ticket-body">
        <div class="ticket-title">TABLE RESERVATION INGRESS</div>
        <div class="ticket-grid">
          <div class="ticket-field">
            <span class="ticket-label">HOLDER</span>
            <span class="ticket-val" id="t-holder">Operator</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-label">TICKET KEY</span>
            <span class="ticket-val font-mono" id="t-key">CC-98042</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-label">DATE MATRIX</span>
            <span class="ticket-val" id="t-date">2026-07-18</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-label">CLOCK STAMP</span>
            <span class="ticket-val" id="t-time">19:30</span>
          </div>
          <div class="ticket-field" style="grid-column: span 2;">
            <span class="ticket-label">RELIABILITY FILTER</span>
            <span class="ticket-val text-green">✓ Ingress Health Check Approved</span>
          </div>
        </div>
      </div>
      <button class="btn btn-secondary" style="width:100%; margin-top:20px;" onclick="closeTicketModal()">Close Ticket</button>
    </div>
  </div>

  <!-- 3. Portfolio Projects Details Modal -->
  <div class="project-modal" id="project-modal">
    <div class="project-modal-backdrop" onclick="closeProjectModal()"></div>
    <div class="card project-modal-card animate-fade">
      <h2 id="pm-title">Project Title</h2>
      <p id="pm-desc" style="margin: 15px 0; font-size:15px;"></p>
      <div class="project-modal-tags" id="pm-tags" style="display:flex; gap:10px; margin-bottom:20px;"></div>
      <button class="btn btn-secondary" style="width:100%;" onclick="closeProjectModal()">Close Specs</button>
    </div>
  </div>

  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${clientName}. Constructed by CONCODE AI Studio Fallbacks.</p>
    </div>
  </footer>
</body>
</html>`;
}

/**
 * Returns premium custom responsive CSS stylesheet styling for generated components.
 */
function assembleCSS(theme) {
  return `:root {
  --primary: ${theme.primary};
  --secondary: ${theme.secondary};
  --accent: ${theme.accent};
  --bg-start: ${theme.bgStart};
  --bg-end: ${theme.bgEnd};
  --text-color: ${theme.textColor};
  --text-muted: ${theme.textMuted};
  --card-bg: ${theme.cardBg};
  --card-border: ${theme.cardBorder};
  --blur-amount: ${theme.backdropBlur};
  --shadow-glow: ${theme.shadowGlow};
  --font-head: ${theme.fontHead};
  --font-body: ${theme.fontBody};
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-body);
  background: linear-gradient(135deg, var(--bg-start) 0%, var(--bg-end) 100%);
  color: var(--text-color);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main { flex: 1; }

.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--card-border);
  background: rgba(${theme.isDark ? '2,6,23' : '248,250,252'}, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.nav-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 8%;
}

.logo {
  font-family: var(--font-head);
  font-size: 20px;
  font-weight: 800;
  text-decoration: none;
  color: var(--primary);
  letter-spacing: -0.5px;
}

.nav-links {
  display: flex;
  gap: 30px;
  list-style: none;
}

.nav-links a {
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 500;
  font-size: 14px;
  transition: color 0.3s;
}

.nav-links a:hover, .nav-links a.active {
  color: var(--primary);
}

.nav-cart-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 6px 14px;
  border-radius: 30px;
  transition: transform 0.3s;
}

.nav-cart-wrapper:hover {
  transform: scale(1.05);
}

.cart-badge {
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 7px;
  border-radius: 10px;
}

.hero {
  padding: 120px 8% 80px 8%;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid var(--card-border);
  color: var(--primary);
  border-radius: 30px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  margin-bottom: 24px;
}

.title {
  font-family: var(--font-head);
  font-size: 54px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -1.5px;
  margin-bottom: 20px;
  color: ${theme.isDark ? '#fff' : '#0f172a'};
}

.accent {
  background: linear-gradient(to right, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-muted);
  font-size: 18px;
  margin-bottom: 40px;
}

.prompt-credit {
  font-size: 13px;
  color: var(--text-muted);
  opacity: 0.5;
  margin-top: -30px;
  margin-bottom: 40px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  border: none;
  box-shadow: var(--shadow-glow);
}

.btn-primary:hover {
  background: var(--secondary);
}

.btn-secondary {
  border: 1px solid var(--card-border);
  color: var(--text-color);
  background: var(--card-bg);
}

.btn-secondary:hover {
  background: rgba(${theme.isDark ? '255,255,255' : '0,0,0'}, 0.05);
}

.section {
  padding: 80px 8%;
  max-width: 1200px;
  margin: 0 auto;
}

.section-alt {
  background: rgba(${theme.isDark ? '255,255,255' : '0,0,0'}, 0.01);
  border-top: 1px solid var(--card-border);
  border-bottom: 1px solid var(--card-border);
}

.section-header-centered {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 50px auto;
}

.section-title {
  font-family: var(--font-head);
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 15px;
}

.section-subtitle {
  color: var(--text-muted);
  font-size: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 30px;
  border-radius: 12px;
  transition: transform 0.3s, border-color 0.3s;
}

.card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}

/* Category Specific: Menu Grid styles */
.menu-filters {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 40px;
}

.filter-tab {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-muted);
  padding: 8px 18px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-tab:hover, .filter-tab.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.menu-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.menu-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.menu-price {
  color: var(--primary);
  font-weight: 700;
  font-family: var(--font-head);
  font-size: 18px;
}

.menu-desc {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 20px;
  flex: 1;
}

.menu-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--secondary);
}

.btn-add-cart {
  background: transparent;
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-add-cart:hover {
  background: var(--primary);
  color: #fff;
}

/* Category Specific: Telemetry meters */
.telemetry-bar-wrapper {
  margin: 15px 0;
}

.telemetry-bar-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
}

.telemetry-bar {
  background: var(--card-border);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.telemetry-fill {
  background: var(--primary);
  height: 100%;
  border-radius: 4px;
  transition: width 1s ease-in-out;
}

/* Category Specific: Slider Calculator */
.calc-control {
  margin: 20px 0;
}

.calc-control label {
  display: block;
  font-size: 14px;
  margin-bottom: 8px;
}

.accent-bold {
  color: var(--primary);
  font-weight: 700;
  font-size: 18px;
}

input[type=range] {
  width: 100%;
  accent-color: var(--primary);
}

.calc-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 25px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
}

.calc-result-box {
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid var(--card-border);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.calc-price-title {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.calc-price {
  font-family: var(--font-head);
  font-size: 42px;
  font-weight: 800;
  color: var(--primary);
  margin-top: 5px;
}

.calc-price .currency { font-size: 20px; }
.calc-price .period { font-size: 14px; color: var(--text-muted); font-weight: normal; }

/* Portfolio Projects */
.portfolio-gallery-grid .card {
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 200px;
}

.portfolio-gallery-grid h3 {
  font-size: 22px;
  font-family: var(--font-head);
}

/* Common Reservation/Booking and Contact forms */
.contact-card {
  max-width: 600px;
  margin: 0 auto;
}

.contact-card h2 { text-align: center; margin-bottom: 8px; font-family: var(--font-head); }
.contact-card p { text-align: center; color: var(--text-muted); font-size: 14px; margin-bottom: 30px; }

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row input, .form-row select {
  flex: 1;
}

input, textarea, select {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 14px;
  border-radius: 8px;
  color: var(--text-color);
  font-family: inherit;
  font-size: 14px;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--primary);
  outline: none;
}

/* Micro-console layout inside Contact */
.contact-console-panel {
  margin-top: 30px;
  background: #020617;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  overflow: hidden;
}

.console-header {
  background: #0f172a;
  padding: 6px 12px;
  font-family: monospace;
  font-size: 11px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--card-border);
}

.console-body {
  padding: 15px;
  font-family: monospace;
  font-size: 13px;
  height: 120px;
  overflow-y: auto;
  color: #10b981;
}

.hidden { display: none; }

/* Overlays and Ticket structures */
.cart-drawer-overlay, .ticket-modal-backdrop, .project-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 199;
  display: none;
}

.cart-drawer {
  position: fixed;
  right: -400px;
  top: 0;
  bottom: 0;
  width: 380px;
  background: ${theme.isDark ? '#090d16' : '#fff'};
  border-left: 1px solid var(--card-border);
  z-index: 200;
  display: flex;
  flex-direction: column;
  padding: 24px;
  transition: right 0.3s ease-in-out;
}

.cart-drawer.open { right: 0; }

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--card-border);
}

.btn-close-drawer {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 14px;
}

.cart-item-info h4 { font-weight: 600; }
.cart-item-info span { color: var(--text-muted); font-size: 12px; }

.btn-remove-item {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 12px;
}

.cart-empty-message {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 0;
  font-size: 14px;
}

.cart-footer {
  border-top: 1px solid var(--card-border);
  padding-top: 20px;
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  margin-bottom: 20px;
}

/* Ticket confirmation */
.ticket-modal, .project-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  display: none;
  align-items: center;
  justify-content: center;
}

.ticket-card, .project-modal-card {
  z-index: 201;
  width: 90%;
  max-width: 450px;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px dashed var(--card-border);
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.ticket-logo {
  font-weight: bold;
}

.ticket-status-badge {
  background: rgba(16,185,129,0.1);
  color: #10b981;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 30px;
}

.ticket-title {
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 15px;
}

.ticket-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.ticket-field {
  display: flex;
  flex-direction: column;
}

.ticket-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 3px;
}

.ticket-val {
  font-weight: 600;
  font-size: 14px;
}

.text-green { color: #10b981; }
.font-mono { font-family: monospace; }

/* Stats grid counter animations */
.about-container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.about-text {
  font-size: 18px;
  color: var(--text-muted);
  margin-bottom: 55px;
}

.stats-grid {
  display: flex;
  gap: 30px;
}

.stat-card {
  flex: 1;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 30px;
  border-radius: 12px;
}

.stat-number {
  display: block;
  font-size: 38px;
  font-weight: 800;
  color: var(--primary);
  font-family: var(--font-head);
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Project Modal Tags */
.project-modal-tags span {
  background: var(--card-border);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
}

footer {
  text-align: center;
  padding: 40px;
  border-top: 1px solid var(--card-border);
  color: var(--text-muted);
  font-size: 13px;
  margin-top: 80px;
}

.animate-fade {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

@media(max-width: 768px) {
  .nav-inner { padding: 15px 5%; }
  .nav-links { display: none; }
  .title { font-size: 38px; }
  .stats-grid { flex-direction: column; }
  .form-row { flex-direction: column; gap: 20px; }
}

${theme.cssExtra}`;
}

/**
 * Returns dynamic interactive JS scripts supporting accordions, menus, pricing sliders, calculators, galleries.
 */
function assembleJS(category, theme) {
  return `// CONCODE Dynamic Web App Runtime Controller
const activeCategory = '${category}';
const themePrimary = '${theme.primary}';

// ═══════════════════════════════════════
// DYNAMIC ORDER CART DRAWER
// ═══════════════════════════════════════
let cart = JSON.parse(localStorage.getItem('concode_offline_cart') || '[]');

function updateCartBadge() {
  const badge = document.getElementById('cart-badge-count');
  if (badge) badge.innerText = cart.reduce((acc, item) => acc + item.qty, 0);
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      overlay.style.display = 'block';
      renderCartItems();
    } else {
      overlay.style.display = 'none';
    }
  }
}

function addToCart(name, price) {
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, qty: 1 });
  }
  localStorage.setItem('concode_offline_cart', JSON.stringify(cart));
  updateCartBadge();
  
  // Quick flyout cart
  toggleCartDrawer();
}

function removeFromCart(name) {
  cart = cart.filter(item => item.name !== name);
  localStorage.setItem('concode_offline_cart', JSON.stringify(cart));
  updateCartBadge();
  renderCartItems();
}

function renderCartItems() {
  const itemsContainer = document.getElementById('cart-drawer-items');
  const subtotalEl = document.getElementById('cart-subtotal');
  
  if (!itemsContainer) return;
  itemsContainer.innerHTML = '';
  
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<div class="cart-empty-message">Your order parameters queue is empty.</div>';
    if (subtotalEl) subtotalEl.innerText = '$0.00';
    return;
  }
  
  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.price * item.qty;
    itemsContainer.innerHTML += \\\`
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>\\\\\\\${item.name}</h4>
          <span>\\\\\\\${item.qty} × $\\\\\\\${item.price.toFixed(2)}</span>
        </div>
        <button class="btn-remove-item" onclick="removeFromCart('\\\\\\\\\\\${item.name}')">Remove</button>
      </div>
    \\\`;
  });
  
  if (subtotalEl) subtotalEl.innerText = '$' + subtotal.toFixed(2);
}

function checkoutOrder() {
  if (cart.length === 0) {
    alert('Order payload is empty.');
    return;
  }
  
  alert('✓ Transaction payload generated! Transmitting parameters to system database. Cart cleared.');
  cart = [];
  localStorage.removeItem('concode_offline_cart');
  updateCartBadge();
  toggleCartDrawer();
}

// ═══════════════════════════════════════
// CATEGORY FILTER WIDGET
// ═══════════════════════════════════════
function filterMenu(cat) {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    if (tab.innerText.toLowerCase().includes(cat)) {
      tab.classList.add('active');
    } else if (cat === 'all' && tab.innerText.toLowerCase().includes('all')) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const cards = document.querySelectorAll('.menu-card');
  cards.forEach(card => {
    const itemCat = card.getAttribute('data-category');
    if (cat === 'all' || itemCat === cat) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterGallery(cat) {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    if (tab.innerText.toLowerCase().includes(cat)) {
      tab.classList.add('active');
    } else if (cat === 'all' && tab.innerText.toLowerCase().includes('all')) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const cards = document.querySelectorAll('.portfolio-card');
  cards.forEach(card => {
    const itemCat = card.getAttribute('data-cat');
    if (cat === 'all' || itemCat === cat) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// ═══════════════════════════════════════
// RESERVATION VERIFICATION FLOW
// ═══════════════════════════════════════
function handleReservation(event) {
  event.preventDefault();
  
  const name = document.getElementById('res-name').value;
  const date = document.getElementById('res-date').value;
  const time = document.getElementById('res-time').value;
  
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const oldText = submitBtn.innerText;
  
  submitBtn.disabled = true;
  submitBtn.innerText = 'Calculating node parameters...';
  
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.innerText = oldText;
    
    // Open Ticket Modal
    document.getElementById('t-holder').innerText = name;
    document.getElementById('t-date').innerText = date;
    document.getElementById('t-time').innerText = time;
    document.getElementById('t-key').innerText = 'CC-' + Math.floor(Math.random()*89999 + 10000);
    
    const modal = document.getElementById('ticket-modal');
    if (modal) modal.style.display = 'flex';
    event.target.reset();
  }, 1000);
}

function closeTicketModal() {
  const modal = document.getElementById('ticket-modal');
  if (modal) modal.style.display = 'none';
}

// ═══════════════════════════════════════
// RESOURCE CALCULATOR
// ═══════════════════════════════════════
function updateCalculator() {
  const usersRange = document.getElementById('calc-users');
  const usersLabel = document.getElementById('users-label');
  const secCheck = document.getElementById('calc-security');
  const supportCheck = document.getElementById('calc-support');
  const totalEl = document.getElementById('calc-total');
  
  if (!usersRange || !totalEl) return;
  
  const users = parseInt(usersRange.value);
  usersLabel.innerText = users;
  
  let cost = 99 + (users * 5); // base + user charge
  if (secCheck && secCheck.checked) cost += 50;
  if (supportCheck && supportCheck.checked) cost += 90;
  
  totalEl.innerText = cost;
}

// ═══════════════════════════════════════
// PORTFOLIO DETAILED MODAL
// ═══════════════════════════════════════
function openProjectModal(title, desc, tags) {
  document.getElementById('pm-title').innerText = title;
  document.getElementById('pm-desc').innerText = desc;
  
  const tagsContainer = document.getElementById('pm-tags');
  tagsContainer.innerHTML = '';
  tags.forEach(t => {
    tagsContainer.innerHTML += \\\`<span>\\\\\\\${t}</span>\\\`;
  });
  
  const modal = document.getElementById('project-modal');
  const overlay = document.getElementById('project-modal-backdrop');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (modal) modal.style.display = 'none';
}

// ═══════════════════════════════════════
// CONTACT TRANSMIT LOGS STREAM
// ═══════════════════════════════════════
function submitClientContact(event) {
  event.preventDefault();
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;
  
  const consolePanel = document.getElementById('contact-console');
  const consoleLogs = document.getElementById('contact-console-logs');
  
  consolePanel.classList.remove('hidden');
  consoleLogs.innerHTML = '';
  
  const log = (msg, delay) => {
    return new Promise(resolve => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.innerText = '→ ' + msg;
        consoleLogs.appendChild(div);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
        resolve();
      }, delay);
    });
  };
  
  (async () => {
    await log('Analyzing payload data structure...', 200);
    await log('Authenticating user headers...', 400);
    await log('Mapping request payload keys: name, email, message...', 300);
    await log('Calling platform backend gateway api...', 400);
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      const data = await res.json();
      if (data.success) {
        await log('✓ Transmitted payload successfully! Lead ID: ' + data.data.lead.id, 200);
        event.target.reset();
      } else {
        await log('⚠ Transmission error: ' + data.error.message, 200);
      }
    } catch (e) {
      await log('⚠ Connection fallback. Saving inquiry payload parameters locally...', 300);
    }
  })();
}

// ═══════════════════════════════════════
// STATS COUNTERS INITIALIZATION
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  
  // Trigger counting animations on stats cards
  const stats = document.querySelectorAll('.stat-number');
  stats.forEach(s => {
    const target = parseInt(s.getAttribute('data-count') || 0);
    if (target === 0) return;
    
    let current = 0;
    const increment = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        s.innerText = target + (s.innerText.includes('%') ? '%' : '');
        clearInterval(timer);
      } else {
        s.innerText = current + (s.innerText.includes('%') ? '%' : '');
      }
    }, 20);
  });
  
  // Initialize Tech Telemetry Probes
  if (activeCategory === 'tech') {
    updateCalculator();
    
    // Live update bars simulated jitter
    setInterval(() => {
      const ingressBar = document.getElementById('ingress-bar');
      const ingressVal = document.getElementById('ingress-val');
      if (ingressBar) {
        const val = Math.floor(Math.random() * 20) + 30; // 30-50%
        ingressBar.style.width = val + '%';
        ingressVal.innerText = val + '%';
      }
      
      const dbBar = document.getElementById('db-bar');
      const dbVal = document.getElementById('db-val');
      if (dbBar) {
        const val = Math.floor(Math.random() * 6) + 90; // 90-95%
        dbBar.style.width = val + '%';
        dbVal.innerText = val + '%';
      }

      const aiBar = document.getElementById('ai-bar');
      const aiVal = document.getElementById('ai-val');
      if (aiBar) {
        const val = Math.floor(Math.random() * 10) + 12; // 12-22%
        aiBar.style.width = val + '%';
        aiVal.innerText = val + '%';
      }
    }, 3000);
  }
});
`;
}

module.exports = {
  generateWebsite: fnGenerateWebsite
};

