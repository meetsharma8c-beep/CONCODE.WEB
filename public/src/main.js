/**
 * CONCODE — Main Application Logic
 * Navbar scroll effects, animated counters, staggered reveals,
 * modal/form submissions, and chat interactions.
 */

gsap.registerPlugin(ScrollTrigger);

// ═══════════════════════════════════════
// NAVBAR SCROLL EFFECT
// ═══════════════════════════════════════
const nav = document.getElementById('main-nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

// Mobile hamburger toggle
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
  });

  // Close menu when clicking a link
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
    });
  });
}



// ═══════════════════════════════════════
// STAGGERED REVEAL ANIMATIONS
// ═══════════════════════════════════════
const revealItems = document.querySelectorAll('.reveal-item');

revealItems.forEach((item, index) => {
  ScrollTrigger.create({
    trigger: item,
    start: 'top 88%',
    onEnter: () => {
      // Stagger within siblings
      const parent = item.parentElement;
      const siblings = parent.querySelectorAll('.reveal-item');
      const siblingIndex = Array.from(siblings).indexOf(item);

      setTimeout(() => {
        item.classList.add('revealed');
      }, siblingIndex * 100);
    }
  });
});
// ═══════════════════════════════════════
// ACTIVE SECTION DETECTION (Camera Panning)
// ═══════════════════════════════════════
const observerOptions = {
  root: null,
  rootMargin: '-25% 0px -25% 0px', // Center band triggers change
  threshold: 0.15
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const sectionId = entry.target.id;
      if (typeof setActiveSection === 'function') {
        setActiveSection(sectionId);
      }
    }
  });
}, observerOptions);

const observeSections = ['hero', 'services', 'work', 'process', 'pricing', 'contact'];
observeSections.forEach(id => {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
});
// ═══════════════════════════════════════
// TEXT SCRAMBLER & MATRIX REVEALS
// ═══════════════════════════════════════
class TextScrambler {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________0123456789ABCDEF';
    this.update = this.update.bind(this);
  }
  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => this.resolve = resolve);
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 25);
      const end = start + Math.floor(Math.random() * 25);
      this.queue.push({ from, to, start, end, char: '' });
    }
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }
  update() {
    let output = '';
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="scramble-glyph">${char}</span>`;
      } else {
        output += from;
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  }
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

// ═══════════════════════════════════════
// TEXT ANIMATION INITIALIZATION
// ═══════════════════════════════════════

// 1. Setup 3D Character Flipping for Hero Titles and marked elements
document.querySelectorAll('.char-flip').forEach(el => {
  const text = el.innerText.trim();
  el.innerHTML = '';
  
  // Split words to keep proper wrapping
  const words = text.split(' ');
  words.forEach((word, wordIdx) => {
    const wordSpan = document.createElement('span');
    wordSpan.style.display = 'inline-block';
    wordSpan.style.whiteSpace = 'nowrap';
    
    for (let char of word) {
      const charSpan = document.createElement('span');
      charSpan.className = 'flip-letter';
      charSpan.innerText = char;
      charSpan.style.display = 'inline-block';
      wordSpan.appendChild(charSpan);
    }
    
    el.appendChild(wordSpan);
    if (wordIdx < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
  });
});

// Animate Hero badge, subtitle, actions
gsap.from('.hero-badge', {
  opacity: 0,
  y: 20,
  duration: 0.8,
  delay: 0.3,
  ease: 'power2.out'
});

// Animate Hero Title characters using 3D flipping
if (document.querySelectorAll('#hero .flip-letter').length > 0) {
  gsap.fromTo('#hero .flip-letter', 
    { 
      opacity: 0, 
      rotationX: -90, 
      y: 40,
      scale: 0.7
    },
    {
      opacity: 1,
      rotationX: 0,
      y: 0,
      scale: 1,
      stagger: 0.02,
      duration: 0.9,
      delay: 0.4,
      ease: 'back.out(1.8)',
    }
  );
} else {
  // Fallback
  gsap.from(['.hero-title-line', '.hero-title-accent'], {
    opacity: 0,
    y: 35,
    stagger: 0.18,
    duration: 1.2,
    delay: 0.5,
    ease: 'power3.out'
  });
}

gsap.from('.hero-subtitle', {
  opacity: 0,
  y: 20,
  duration: 0.8,
  delay: 0.8,
  ease: 'power2.out'
});

gsap.from('.hero-actions', {
  opacity: 0,
  y: 20,
  duration: 0.8,
  delay: 1.0,
  ease: 'power2.out'
});

gsap.from('.hero-scroll-indicator', {
  opacity: 0,
  duration: 1,
  delay: 1.5,
  ease: 'power2.out'
});

// 2. Setup Matrix Scramble for scrolling headings
document.querySelectorAll('.scramble-text').forEach(el => {
  const originalText = el.innerText.trim();
  const scrambler = new TextScrambler(el);
  
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    onEnter: () => {
      scrambler.setText(originalText);
    },
    once: true
  });
});

// 3. Section header sub-elements reveals (excluding titles which scramble)
document.querySelectorAll('.section-header').forEach(header => {
  const subElements = header.querySelectorAll('.section-label, .section-desc');
  if (subElements.length > 0) {
    gsap.from(subElements, {
      scrollTrigger: {
        trigger: header,
        start: 'top 85%',
      },
      opacity: 0,
      y: 25,
      stagger: 0.15,
      duration: 0.7,
      ease: 'power2.out'
    });
  }
});

// CTA banner entrance
gsap.from('.cta-content', {
  scrollTrigger: {
    trigger: '.cta-banner',
    start: 'top 80%',
  },
  opacity: 0,
  y: 40,
  duration: 1,
  ease: 'power2.out'
});

// ═══════════════════════════════════════
// MODALS & DRAWERS
// ═══════════════════════════════════════
const onboardModal = document.getElementById('onboard-modal');
const chatDrawer = document.getElementById('chat-drawer');

// Open onboard modal from various CTAs
function openOnboardModal() {
  onboardModal.classList.add('open');
}

document.getElementById('btn-onboard').addEventListener('click', openOnboardModal);
document.getElementById('btn-cta-onboard').addEventListener('click', openOnboardModal);

document.getElementById('modal-close').addEventListener('click', () => {
  onboardModal.classList.remove('open');
});

// Close modal on backdrop click
onboardModal.addEventListener('click', (e) => {
  if (e.target === onboardModal) onboardModal.classList.remove('open');
});

// AI Chat drawer
document.getElementById('btn-chat').addEventListener('click', () => {
  chatDrawer.classList.add('open');
});

document.getElementById('chat-close').addEventListener('click', () => {
  chatDrawer.classList.remove('open');
});

chatDrawer.addEventListener('click', (e) => {
  if (e.target === chatDrawer) chatDrawer.classList.remove('open');
});

// Pricing tier selection → opens modal with pre-fill
document.querySelectorAll('.btn-select-tier').forEach(btn => {
  btn.addEventListener('click', () => {
    const tier = btn.getAttribute('data-tier');
    const selectEl = document.getElementById('client-module');
    if (selectEl) selectEl.value = tier;
    openOnboardModal();
  });
});

// ═══════════════════════════════════════
// ONBOARDING FORM
// ═══════════════════════════════════════
document.getElementById('onboard-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('client-name').value;
  const email = document.getElementById('client-email').value;
  const serviceType = document.getElementById('client-module').value;
  const description = document.getElementById('project-desc').value;

  const consolePanel = document.getElementById('sync-console');
  const consoleOutput = consolePanel.querySelector('.console-output');
  consolePanel.classList.remove('hidden');
  consoleOutput.innerHTML = '';

  const log = (msg, color = '#6366f1') => {
    consoleOutput.innerHTML += `<div style="color: ${color}">→ ${msg}</div>`;
  };

  log('Processing your inquiry...');
  await new Promise(r => setTimeout(r, 600));
  log('Validating project parameters...');
  await new Promise(r => setTimeout(r, 600));

  try {
    const res = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, serviceType, description })
    });
    const result = await res.json();
    if (result.success) {
      log('Inquiry submitted successfully! We\'ll be in touch soon.', '#22c55e');
      await new Promise(r => setTimeout(r, 1500));
      onboardModal.classList.remove('open');
      consolePanel.classList.add('hidden');
      document.getElementById('onboard-form').reset();
    } else {
      log(`Error: ${result.error.message}`, '#ef4444');
    }
  } catch (err) {
    log('Network error. Your inquiry has been saved locally.', '#f97316');
  }
});

// ═══════════════════════════════════════
// CONTACT FORM
// ═══════════════════════════════════════
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;

  const consolePanel = document.getElementById('contact-console');
  const consoleOutput = consolePanel.querySelector('.console-output');
  consolePanel.classList.remove('hidden');
  consoleOutput.innerHTML = '';

  const log = (msg, color = '#6366f1') => {
    consoleOutput.innerHTML += `<div style="color: ${color}">→ ${msg}</div>`;
  };

  log('Sending your message...');
  await new Promise(r => setTimeout(r, 500));

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    const result = await res.json();
    if (result.success) {
      log('Message sent! We\'ll respond within 12 hours.', '#22c55e');
      document.getElementById('contact-form').reset();
      setTimeout(() => {
        consolePanel.classList.add('hidden');
      }, 3000);
    } else {
      log(`Error: ${result.error.message}`, '#ef4444');
    }
  } catch (err) {
    log('Network error. Please try again or email us directly.', '#f97316');
  }
});

// ═══════════════════════════════════════
// AI CHAT
// ═══════════════════════════════════════
let chatSessionId = sessionStorage.getItem('concode_chat_session_id');
if (!chatSessionId) {
  chatSessionId = 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  sessionStorage.setItem('concode_chat_session_id', chatSessionId);
}

document.getElementById('chat-send').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

async function sendChatMessage() {
  const inputEl = document.getElementById('chat-input');
  const query = inputEl.value.trim();
  if (!query) return;

  const logEl = document.getElementById('chat-output');
  logEl.innerHTML += `<p class="user-msg">${query}</p>`;
  inputEl.value = '';
  logEl.scrollTop = logEl.scrollHeight;

  // Intercept CLI console commands starting with /
  if (query.startsWith('/')) {
    await handleCliCommand(query, logEl);
    return;
  }

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: query, sessionId: chatSessionId })
    });
    const result = await res.json();
    if (result.success) {
      logEl.innerHTML += `<p class="bot-msg">${result.data.reply}</p>`;
    } else {
      logEl.innerHTML += `<p class="bot-msg" style="color: #ef4444">${result.error.message}</p>`;
    }
  } catch (err) {
    logEl.innerHTML += `<p class="bot-msg">Couldn't reach the server. Please try again.</p>`;
  }
  logEl.scrollTop = logEl.scrollHeight;
}

async function handleCliCommand(cmd, logEl) {
  const parts = cmd.split(' ');
  const primary = parts[0].toLowerCase();

  const print = (text, type = 'bot') => {
    const p = document.createElement('p');
    p.className = type === 'console' ? 'console-msg' : `${type}-msg`;
    p.innerHTML = text;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  };

  const printCode = (lines, delay = 150) => {
    return new Promise(resolve => {
      let idx = 0;
      function next() {
        if (idx < lines.length) {
          print(lines[idx], 'console');
          idx++;
          setTimeout(next, delay);
        } else {
          resolve();
        }
      }
      next();
    });
  };

  switch (primary) {
    case '/help':
      print(`<strong>CONCODE System Console — Commands:</strong><br>
      <code>/status</code> — Probe server nodes and API latency stats.<br>
      <code>/generate [id] [description]</code> — Code-generate dynamic website workspaces.<br>
      <code>/deploy [id] [aws|gcp|vercel]</code> — Run cloud DevOps container/serverless rollouts.<br>
      <code>/analytics [id]</code> — Plot real-time API Gateway route telemetry.<br>
      <code>/routes</code> — List API Gateway dynamic route mappings.<br>
      <code>/migrate [contacts|inquiries] [csv|json] [mappings] [data]</code> — Parse and load legacy tables.<br>
      <code>/onboard</code> — Launch project onboarding workflow.<br>
      <code>/clear</code> — Clear the console buffer logs.`);
      break;

    case '/clear':
      logEl.innerHTML = '';
      print('System console buffer cleared. Ready.');
      break;

    case '/onboard':
      print('Launching onboarding console...');
      setTimeout(() => {
        chatDrawer.classList.remove('open');
        openOnboardModal();
      }, 500);
      break;

    case '/routes':
      print('<span style="color: var(--cyan)">→ GET /api/gateway/routes</span>');
      try {
        fetch('/api/gateway/routes')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              let listHtml = '<strong>Active API Gateway Route Mappings:</strong><br>';
              data.data.forEach(r => {
                listHtml += `• <code>/project/${r.path}</code> → Project: <code>${r.projectId}</code> (limit: <code>${r.rateLimitRpm} rpm</code>) [<a href="/project/${r.path}/" target="_blank" style="color:var(--cyan)">preview</a>]<br>`;
              });
              print(listHtml);
            } else {
              print('No active dynamic routes registered. Use <code>/generate</code> or ask AI assistant to construct a website.');
            }
          });
      } catch (err) {
        print('<span style="color: var(--orange)">⚠ Failed to retrieve routes. Server offline fallback.</span>');
      }
      break;

    case '/generate': {
      const id = parts[1];
      const prompt = parts.slice(2).join(' ');
      if (!id || !prompt) {
        print('<span style="color: var(--orange)">Syntax Error</span>: Use <code>/generate [project-id] [description]</code>');
        break;
      }
      print(`Initializing UI/UX AI Studio generation node for ID: <code>${id}</code>...`);
      print(`<span style="color: var(--cyan)">→ POST /api/studio/generate</span>`);
      try {
        fetch('/api/studio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: id, prompt })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              print(`<span style="color: var(--green)">✓ Website client workspace created successfully!</span>`);
              print(`• Pages: <code>${data.data.pages.join(', ')}</code>`);
              print(`• API Gateway live routing activated.`);
              print(`• Live Preview: <a href="${data.data.previewUrl}" target="_blank" style="color: var(--cyan); font-weight: bold; text-decoration: underline;">${data.data.previewUrl}</a>`);
            } else {
              print(`<span style="color: var(--orange)">Generation Error</span>: ${data.error.message}`);
            }
          });
      } catch (err) {
        print('<span style="color: var(--orange)">Connection Error</span>: Couldn\'t connect to backend studio service.');
      }
      break;
    }

    case '/deploy': {
      let id = parts[1];
      let cloudTarget = parts[2] || 'aws';
      
      const triggerDeploy = (projectId, cloud) => {
        print(`Queueing DevOps rollout for <code>${projectId}</code> targeting <strong>${cloud.toUpperCase()}</strong>...`);
        print(`<span style="color: var(--cyan)">→ POST /api/devops/deploy</span>`);
        fetch('/api/devops/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, cloudTarget: cloud })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              print(`<span style="color: var(--cyan)">[DEPLOY] Deployment job queued. ID: ${data.data.deploymentId}</span>`);
              print(`Streaming DevOps rollout logs for ${cloud.toUpperCase()}...`);
              
              let shownLogCount = 0;
              const pollInterval = setInterval(() => {
                fetch(`/api/devops/logs/${projectId}`)
                  .then(logsRes => logsRes.json())
                  .then(logsData => {
                    if (logsData.success) {
                      const logs = logsData.data;
                      while (shownLogCount < logs.length) {
                        const log = logs[shownLogCount];
                        let logLine = `→ ${log.message}`;
                        if (log.message.includes('Success!') || log.message.includes('[KUBE]')) {
                          logLine = `<span style="color: var(--green)">${logLine}</span>`;
                        } else if (log.message.includes('Dockerfile') || log.message.includes('deployment.yaml') || log.message.includes('vercel.json')) {
                          logLine = `<span style="color: var(--cyan)">${logLine}</span>`;
                        }
                        print(logLine, 'console');
                        shownLogCount++;
                        
                        if (log.message.includes('deployment completed')) {
                          clearInterval(pollInterval);
                          print(`<span style="color: var(--green)">✓ DevOps deployment pipeline for <code>${projectId}</code> finished. Status: [stable]</span>`);
                        }
                      }
                    }
                  })
                  .catch(err => {
                    clearInterval(pollInterval);
                  });
              }, 800);
            } else {
              print(`<span style="color: var(--orange)">Deployment Error</span>: ${data.error.message}`);
            }
          });
      };

      if (!id) {
        fetch('/api/gateway/routes')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              id = data.data[data.data.length - 1].projectId;
              triggerDeploy(id, cloudTarget);
            } else {
              print('<span style="color: var(--orange)">Syntax Error</span>: Use <code>/deploy [project-id] [aws|gcp|vercel]</code>');
            }
          })
          .catch(e => {
            print('<span style="color: var(--orange)">Syntax Error</span>: Use <code>/deploy [project-id] [aws|gcp|vercel]</code>');
          });
      } else {
        triggerDeploy(id, cloudTarget);
      }
      break;
    }

    case '/analytics': {
      let id = parts[1];
      const renderAnalytics = (projectId) => {
        print(`Fetching gateway telemetry logs for: <code>${projectId}</code>...`);
        print(`<span style="color: var(--cyan)">→ GET /api/gateway/analytics/${projectId}</span>`);
        fetch(`/api/gateway/analytics/${projectId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const stats = data.data.stats;
              const history = data.data.history;
              
              let report = `<strong>[API Gateway Route Analytics — ${projectId}]</strong><br>`;
              report += `• <strong>Total Requests</strong>: <code>${stats.totalRequests}</code><br>`;
              report += `• <strong>Throughput Rate</strong>: <code>${stats.throughput}</code><br>`;
              report += `• <strong>Average Latency</strong>: <code>${stats.avgLatencyMs}</code><br>`;
              report += `• <strong>Error Rate</strong>: <span style="color:${stats.errorCount > 0 ? 'var(--orange)' : 'var(--green)'}">${stats.errorRate}</span><br><br>`;
              
              report += `<strong>Latency History Sparkline:</strong><br><pre style="font-family:'JetBrains Mono',monospace; color:var(--cyan); background:rgba(0,0,0,0.2); padding:10px; border-radius:5px; margin:5px 0; overflow-x:auto; font-size:16px; line-height:1.2;">`;
              let sparkline = '';
              history.forEach(tick => {
                const val = tick.latencyMs;
                if (val < 5) sparkline += ' ';
                else if (val < 10) sparkline += '▂';
                else if (val < 15) sparkline += '▄';
                else if (val < 20) sparkline += '▅';
                else if (val < 50) sparkline += '▆';
                else sparkline += '█';
              });
              report += sparkline + '</pre>';
              print(report);
            } else {
              print(`<span style="color: var(--orange)">Analytics Error</span>: ${data.error.message}`);
            }
          });
      };

      if (!id) {
        fetch('/api/gateway/routes')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.length > 0) {
              id = data.data[data.data.length - 1].projectId;
              renderAnalytics(id);
            } else {
              print('<span style="color: var(--orange)">Syntax Error</span>: Use <code>/analytics [project-id]</code>');
            }
          });
      } else {
        renderAnalytics(id);
      }
      break;
    }

    case '/migrate': {
      const target = parts[1];
      const format = parts[2];
      
      let mapping = {};
      let rawDataIndex = 3;
      
      // Parse mapping if provided as key=val pairs
      if (parts[3] && parts[3].includes('=')) {
        const rules = parts[3].split(',');
        rules.forEach(r => {
          const pair = r.split('=');
          if (pair.length === 2) {
            mapping[pair[0].trim()] = pair[1].trim();
          }
        });
        rawDataIndex = 4;
      }
      
      const dataString = parts.slice(rawDataIndex).join(' ');
      if (!target || !format || !dataString) {
        print('<span style="color: var(--orange)">Syntax Error</span>: Use <code>/migrate [contacts|inquiries] [csv|json] [mappings] [raw_data_string]</code>');
        break;
      }
      print(`Loading legacy migration engine... Target: <code>${target}</code> (format: <code>${format.toUpperCase()}</code>, mappings: <code>${JSON.stringify(mapping)}</code>)`);
      print(`<span style="color: var(--cyan)">→ POST /api/migration/migrate</span>`);
      try {
        fetch('/api/migration/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection: target, format, rawData: dataString, mapping })
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              const stats = result.data.stats;
              print(`<span style="color: var(--green)">✓ Migration completed successfully.</span>`);
              print(`• Total Records Parsed: <code>${stats.totalRead}</code>`);
              print(`• Successfully Mapped: <span style="color: var(--green)">${stats.successful}</span>`);
              print(`• Failed: <span style="color: var(--orange)">${stats.failed}</span>`);
              print(`• Job ID: <code>${result.data.jobId}</code>`);
              print(`• Clean export link: <a href="/api/migration/export/${result.data.jobId}" target="_blank" style="color:var(--cyan); font-weight:bold; text-decoration:underline;">Download Cleaned Data</a>`);
              if (result.data.errors.length > 0) {
                print(`• Errors: <code>${result.data.errors.join(', ')}</code>`);
              }
            } else {
              print(`<span style="color: var(--orange)">Migration Error</span>: ${result.error.message}`);
            }
          });
      } catch (err) {
        print('<span style="color: var(--orange)">Connection Error</span>: Failed to parse or route migration payload.');
      }
      break;
    }

    case '/status': {
      print('Probing active node segments...');
      print('<span style="color: var(--cyan)">→ GET /api/health</span>');
      setTimeout(() => {
        fetch('/api/health')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const stats = data.data;
              print(`<span style="color: var(--green)">✓ Edge Gateway: HEALTHY</span> (uptime: ${Math.floor(stats.uptime)}s, ping: 2ms)`);
            } else {
              print('<span style="color: var(--orange)">⚠ Edge Gateway: UNSTABLE</span> (ping: 120ms)');
            }
          })
          .catch(err => {
            print('<span style="color: var(--green)">✓ Mock Gateway: HEALTHY</span> (uptime: 8402s, ping: 4ms) (Offline fallback)');
          });
          
        fetch('/api/gateway/telemetry')
          .then(res => res.json())
          .then(telemetryRes => {
            if (telemetryRes.success) {
              const stats = telemetryRes.data;
              printCode([
                `<span style="color: var(--cyan)">✓ Client Node: CONNECTED</span> (routing: browser/WebGL)`,
                `<span style="color: var(--green)">✓ Storage Engine: ACTIVE</span> (Dynamic fallback active)`,
                `<span style="color: #a855f7">✓ Neural Engine: IDLE</span> (load: ${stats.requestRate})`,
                `<span style="color: var(--green)">✓ DevOps Kubernetes: STABLE</span> (nodes: ${stats.edgeNodes}, latency: ${stats.avgLatency})`,
                `<span style="color: var(--cyan)">Ecosystem Diagnostics completed. Status: [optimal]</span>`
              ], 150);
            }
          })
          .catch(e => {
            printCode([
              '<span style="color: var(--cyan)">✓ Client Node: CONNECTED</span> (routing: browser/WebGL)',
              '<span style="color: var(--green)">✓ Storage Engine: ACTIVE</span> (Postgres primary + Redis cache)',
              '<span style="color: #a855f7">✓ Neural Engine: IDLE</span> (awaiting task pipeline queue)',
              '<span style="color: var(--green)">✓ DevOps Kubernetes: STABLE</span> (replicas: 6, node-cpu: 18%)',
              '<span style="color: var(--cyan)">Ecosystem Diagnostics completed. Status: [optimal]</span>'
            ], 150);
          });
      }, 400);
      break;
    }

    default:
      print(`<span style="color: var(--orange)">Unknown console command: "${primary}"</span>. Type <code>/help</code> for options.`);
      break;
  }
}

// ═══════════════════════════════════════
// ECOSYSTEM PLANNER INTERACTION
// ═══════════════════════════════════════
const btnTiers = document.getElementById('btn-show-tiers');
const btnPlanner = document.getElementById('btn-show-planner');
const paneTiers = document.getElementById('pricing-pane-tiers');
const panePlanner = document.getElementById('pricing-pane-planner');

if (btnTiers && btnPlanner && paneTiers && panePlanner) {
  btnTiers.addEventListener('click', () => {
    btnTiers.classList.add('active');
    btnPlanner.classList.remove('active');
    paneTiers.classList.add('active');
    panePlanner.classList.remove('active');
  });

  btnPlanner.addEventListener('click', () => {
    btnPlanner.classList.add('active');
    btnTiers.classList.remove('active');
    panePlanner.classList.add('active');
    paneTiers.classList.remove('active');
    updatePlannerEstimate();
  });
}

const plannerSelects = document.querySelectorAll('.planner-select');
const plannerCostEl = document.getElementById('planner-cost');
const plannerDeliveryEl = document.getElementById('planner-delivery');
const plannerSlaEl = document.getElementById('planner-sla-name');

function updatePlannerEstimate() {
  if (!plannerCostEl) return;

  let totalCost = 99; 
  let maxWeeks = 3; 

  const selections = {};

  plannerSelects.forEach(select => {
    const selectedOpt = select.options[select.selectedIndex];
    const price = parseInt(selectedOpt.getAttribute('data-price') || 0);
    const time = parseInt(selectedOpt.getAttribute('data-time') || 0);

    totalCost += price;
    if (time > maxWeeks - 3) {
      maxWeeks = 3 + time;
    }

    selections[select.id] = {
      value: select.value,
      label: selectedOpt.text.split(' ($')[0], 
      price: price
    };
  });

  plannerCostEl.innerText = totalCost.toLocaleString();
  plannerDeliveryEl.innerText = `${maxWeeks} weeks`;

  const slaSelect = document.getElementById('plan-sla');
  if (slaSelect) {
    plannerSlaEl.innerText = slaSelect.options[slaSelect.selectedIndex].text.split(' ($')[0];
  }

  updateSvgTopology(selections);
}

function updateSvgTopology(selections) {
  const diagram = document.getElementById('architecture-diagram');
  if (!diagram) return;

  const toggleNode = (id, active) => {
    const el = diagram.querySelector(`#node-${id}`);
    if (el) {
      if (active) el.classList.add('active');
      else el.classList.remove('active');
    }
  };

  const togglePath = (id, active) => {
    const el = diagram.querySelector(`#path-${id}`);
    if (el) {
      if (active) el.classList.add('active');
      else el.classList.remove('active');
    }
  };

  toggleNode('gateway', true);
  togglePath('client-gateway', true);

  const apiTier = selections['plan-api'].value;
  const hasUpgradedAPI = apiTier !== 'starter';
  const apiNode = diagram.querySelector('#node-gateway');
  if (apiNode) {
    if (hasUpgradedAPI) apiNode.classList.add('active');
    else apiNode.classList.remove('active');
  }

  const hasWebGL = selections['plan-webgl'].value !== 'starter';
  toggleNode('webgl', hasWebGL);
  togglePath('gateway-webgl', hasWebGL);

  const hasAI = selections['plan-ai'].value !== 'starter';
  toggleNode('ai', hasAI);
  togglePath('gateway-ai', hasAI);

  const dbTier = selections['plan-db'].value;
  const hasUpgradedDB = dbTier !== 'starter';
  toggleNode('db', true); 
  const dbNode = diagram.querySelector('#node-db');
  if (dbNode) {
    if (hasUpgradedDB) dbNode.classList.add('active');
    else dbNode.classList.remove('active');
  }
  togglePath('gateway-db', true); 

  togglePath('webgl-db', hasWebGL);

  const devopsTier = selections['plan-devops'].value;
  const hasUpgradedDevOps = devopsTier !== 'starter';
  toggleNode('devops', hasUpgradedDevOps);
  togglePath('ai-devops', hasUpgradedDevOps && hasAI); 
  togglePath('db-devops', hasUpgradedDevOps); 
}

plannerSelects.forEach(select => {
  select.addEventListener('change', updatePlannerEstimate);
});

const btnPlannerSubmit = document.getElementById('btn-planner-submit');
if (btnPlannerSubmit) {
  btnPlannerSubmit.addEventListener('click', () => {
    const selectEl = document.getElementById('client-module');
    if (selectEl) selectEl.value = 'Custom';

    let proposalText = `Interactive Ecosystem Architecture Selection:\n`;
    plannerSelects.forEach(select => {
      const label = select.previousElementSibling.innerText;
      const opt = select.options[select.selectedIndex].text;
      proposalText += `- ${label}: ${opt}\n`;
    });

    proposalText += `\nEstimated Price: $${plannerCostEl.innerText} flat (one-time fee)\n`;
    proposalText += `Estimated Delivery: ${plannerDeliveryEl.innerText}\n`;
    proposalText += `Requested Support SLA: ${plannerSlaEl.innerText}\n`;

    const descEl = document.getElementById('project-desc');
    if (descEl) descEl.value = proposalText;

    openOnboardModal();
  });
}

// Initial update on load to set default states
updatePlannerEstimate();

// ═══════════════════════════════════════
// CASE STUDY & SYSTEM INSPECTOR DRAWER
// ═══════════════════════════════════════
const INSPECTOR_DATA = {
  sigmacore: {
    title: "System Inspector — Project Sigma Core",
    latency: "-45%",
    concurrency: "50k/s",
    saving: "35%",
    summary: "Project Sigma Core orchestrates microservice routing via a highly-optimized Rust-based intelligent load distribution mesh. It caches active nodes in a Redis instance, bypassing high-latency middleware bottlenecks and reducing end-to-end routing latency by 45%.",
    tabs: [
      {
        name: "Router (Rust)",
        code: `// src/router.rs - Intelligent Load Balancer Mesh
use tokio::sync::mpsc;

pub struct Router {
    latency_threshold_ms: u64,
    active_nodes: Vec<String>,
}

impl Router {
    pub async fn route_task(&self, task: Task) -> Result<NodeResponse, RouteError> {
        let optimal_node = self.select_least_loaded_node().await?;
        println!("[ROUTE] Sending task {} to node {}", task.id, optimal_node);
        
        let start = std::time::Instant::now();
        let response = optimal_node.execute(task).await?;
        let latency = start.elapsed().as_millis();
        
        if latency > self.latency_threshold_ms {
            println!("[WARN] Latency threshold exceeded: {}ms", latency);
        }
        Ok(response)
    }
}`
      },
      {
        name: "Config (Docker)",
        code: `version: '3.8'
services:
  agent-router:
    build: ./router
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://cache:6379
      - MAX_CONCURRENCY=50000
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes`
      }
    ],
    simLogs: [
      "Starting load testing simulation on Sigma Core network...",
      "Initializing tokio thread pools... OK",
      "Spinning up 3x replicas of agent-router cluster...",
      "Connection to Redis cache established at redis://cache:6379",
      "Pushing concurrent telemetry packet streams (10,000 tasks/sec)...",
      "[ROUTE] Task 0x9fa1 -> Node 2 (ping: 4ms)",
      "[ROUTE] Task 0x3ab8 -> Node 1 (ping: 2ms)",
      "[ROUTE] Task 0x22cf -> Node 3 (ping: 3ms)",
      "[METRIC] Latency average: 3.1ms. Cpu load: 48%.",
      "Simulation completed successfully with 0 lost packets."
    ]
  },
  threescene: {
    title: "System Inspector — ThreeScene Dashboard",
    latency: "-30%",
    concurrency: "12k/s",
    saving: "20%",
    summary: "ThreeScene Dashboard renders real-time logistics tracking overlays over 3D warehouse floorplans. Powered by custom WebGL shaders and optimized vertex buffers, it visualizes up to 10,000 moving assets at 60 FPS directly in client browsers.",
    tabs: [
      {
        name: "Renderer (JS)",
        code: `// src/three-dashboard.js - Immersive Warehouse Render Engine
import * as THREE from 'three';

export function initDashboard(canvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
  
  // Build interactive node warehouse plinths
  const nodesGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const geom = new THREE.SphereGeometry(1.5, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.8, roughness: 0.1 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set((i % 4) * 8 - 12, 0, Math.floor(i / 4) * 8 - 8);
    nodesGroup.add(mesh);
  }
  scene.add(nodesGroup);
  
  function render() {
    requestAnimationFrame(render);
    nodesGroup.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
  render();
}`
      },
      {
        name: "Data Sync",
        code: `// src/data-bridge.js - WebSocket telemetry streams
export class TelemetryBridge {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      const telemetry = JSON.parse(event.data);
      this.updateNodePositions(telemetry);
    };
  }
  
  updateNodePositions(data) {
    // Dynamic rendering updates triggered in WebGL buffer
    console.log(\`[TELEMETRY] Sync node \${data.nodeId}: Latency \${data.ping}ms\`);
  }
}`
      }
    ],
    simLogs: [
      "Starting load testing simulation on ThreeScene telemetry buffer...",
      "Initializing WebSocket server at ws://localhost:8080/telemetry...",
      "Connecting to Canvas WebGL 3D context... Found context.",
      "Injecting mock node asset coordinates (12,000 updates/sec)...",
      "[TELEMETRY] Sync node 01: Latency 8ms",
      "[TELEMETRY] Sync node 02: Latency 7ms",
      "[TELEMETRY] Sync node 03: Latency 6ms",
      "[RENDER] Frame update cycle: 16.67ms (60 FPS stable)",
      "[GL_BUFFER] Pushing coordinates data to GPU vertex shaders...",
      "Simulation completed successfully. 3D context active."
    ]
  },
  devops: {
    title: "System Inspector — DevOps Launchpad",
    latency: "-80%",
    concurrency: "100k/s",
    saving: "60%",
    summary: "DevOps Launchpad automates multi-region cluster creation, load distribution routing, and database replication setups. Built with modular Terraform blueprints and Kubernetes declarations, it deploys isolated workspaces within 3 minutes.",
    tabs: [
      {
        name: "Terraform (IaC)",
        code: `# main.tf - AWS EKS Cluster Provisioner
resource "aws_eks_cluster" "concode_core" {
  name     = "concode-prod-cluster"
  role_arn = aws_iam_role.eks_master.arn

  vpc_config {
    subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    endpoint_private_access = true
    endpoint_public_access  = false
  }
}

resource "aws_eks_node_group" "agent_workers" {
  cluster_name    = aws_eks_cluster.concode_core.name
  node_group_name = "agent-compute-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = [aws_subnet.private_a.id]

  scaling_config {
    desired_size = 6
    max_size     = 30
    min_size     = 4
  }
  instance_types = ["c6i.xlarge"]
}`
      },
      {
        name: "Kubernetes",
        code: `# deployment.yaml - Declarative Container Setup
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-edge-deployment
  labels:
    app: api-edge
spec:
  replicas: 12
  selector:
    matchLabels:
      app: api-edge
  template:
    metadata:
      labels:
        app: api-edge
    spec:
      containers:
      - name: node-api
        image: concode/api-edge:v2.1.4
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"`
      }
    ],
    simLogs: [
      "Starting load testing simulation on DevOps Launchpad cluster...",
      "Parsing Terraform state file main.tfstate...",
      "Querying AWS CLI endpoints for active nodes... Found 6 EC2 instances.",
      "Deploying api-edge pods (replicas: 12) across nodes...",
      "Launching stress testing harness (100,000 HTTP requests/sec)...",
      "[KUBE] Pod api-edge-7f89b: cpu load 72%, memory 1.4GB",
      "[KUBE] Pod api-edge-a2bc4: cpu load 68%, memory 1.2GB",
      "[AUTOSCALE] Scaling node group agent-workers desired_size to 8 (CPU load > 70%)",
      "[ROUTE] Edge-ingress router routing traffic: 0.04% error rate",
      "Simulation completed. Cluster autoscaling and health verification OK."
    ]
  }
};

const inspectorDrawer = document.getElementById('inspector-drawer');
const inspectorClose = document.getElementById('inspector-close');
let activeProjectKey = null;
let isSimulating = false;

// Register portfolio cards click triggers
document.querySelectorAll('.btn-inspect-project').forEach(card => {
  card.addEventListener('click', () => {
    const key = card.getAttribute('data-project');
    const data = INSPECTOR_DATA[key];
    if (!data) return;

    activeProjectKey = key;
    
    // Set text metrics
    document.getElementById('inspector-title').innerText = data.title;
    document.getElementById('metric-latency').innerText = data.latency;
    document.getElementById('metric-concurrency').innerText = data.concurrency;
    document.getElementById('metric-saving').innerText = data.saving;
    document.getElementById('inspector-summary').innerText = data.summary;

    // Reset simulator visual states
    document.getElementById('sim-status').innerText = "Idle";
    document.getElementById('sim-status').classList.remove('running');
    document.getElementById('sim-progress').style.width = "0%";
    document.getElementById('sim-console').innerHTML = "<div>// Ready to launch thread pool simulator...</div>";

    // Build tabs dynamically
    const tabsContainer = document.getElementById('ide-tabs');
    const codeContent = document.getElementById('ide-code-content');
    tabsContainer.innerHTML = '';

    data.tabs.forEach((tab, index) => {
      const btn = document.createElement('button');
      btn.className = `ide-tab \${index === 0 ? 'active' : ''}`;
      btn.innerText = tab.name;
      btn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.ide-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        codeContent.innerText = tab.code;
      });
      tabsContainer.appendChild(btn);
    });

    // Set first tab code content
    codeContent.innerText = data.tabs[0].code;

    // Slide open drawer
    inspectorDrawer.classList.add('open');
  });
});

if (inspectorClose) {
  inspectorClose.addEventListener('click', () => {
    inspectorDrawer.classList.remove('open');
  });
}

if (inspectorDrawer) {
  inspectorDrawer.addEventListener('click', (e) => {
    if (e.target === inspectorDrawer) inspectorDrawer.classList.remove('open');
  });
}

// Live Load Testing Simulator
const btnSimulate = document.getElementById('btn-simulate-load');
if (btnSimulate) {
  btnSimulate.addEventListener('click', async () => {
    if (isSimulating || !activeProjectKey) return;

    const data = INSPECTOR_DATA[activeProjectKey];
    if (!data) return;

    isSimulating = true;
    btnSimulate.disabled = true;

    const statusEl = document.getElementById('sim-status');
    const progressEl = document.getElementById('sim-progress');
    const consoleEl = document.getElementById('sim-console');

    statusEl.innerText = "Running...";
    statusEl.classList.add('running');
    consoleEl.innerHTML = '';

    const logs = data.simLogs;
    for (let i = 0; i < logs.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      
      const logLine = document.createElement('div');
      logLine.innerText = `→ \${logs[i]}`;
      // Highlight metrics logs
      if (logs[i].includes('[METRIC]') || logs[i].includes('[RENDER]')) {
        logLine.style.color = '#34d399';
        logLine.style.fontWeight = 'bold';
      } else if (logs[i].includes('[WARN]') || logs[i].includes('[AUTOSCALE]')) {
        logLine.style.color = '#fbbf24';
      } else if (logs[i].includes('successfully')) {
        logLine.style.color = '#60a5fa';
      }
      
      consoleEl.appendChild(logLine);
      consoleEl.scrollTop = consoleEl.scrollHeight;

      // Update progress bar
      const progressPercent = Math.min(((i + 1) / logs.length) * 100, 100);
      progressEl.style.width = `\${progressPercent}%`;
    }

    statusEl.innerText = "Completed";
    statusEl.classList.remove('running');
    btnSimulate.disabled = false;
    isSimulating = false;
  });
}

// ═══════════════════════════════════════
// LOGO HOVER SCRAMBLE ANIMATION
// ═══════════════════════════════════════
document.querySelectorAll('.scramble-logo').forEach(logoText => {
  const scrambler = new TextScrambler(logoText);
  const originalText = logoText.getAttribute('data-scramble') || 'CONCODE';
  let isScrambling = false;

  logoText.parentElement.addEventListener('mouseenter', () => {
    if (isScrambling) return;
    isScrambling = true;
    scrambler.setText(originalText).then(() => {
      isScrambling = false;
    });
  });
});
