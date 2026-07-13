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

// 1. Setup Typewriter Animation for Hero Title
const line1 = document.getElementById('typewriter-line-1');
const line2 = document.getElementById('typewriter-line-2');
const cursor = document.getElementById('typewriter-cursor');

const line1Text = "We Build Systems";
const line2Text = "That Scale.";

function typeWriter(el, text, speed, callback) {
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      // Human-like typing rhythm (random variable timing)
      const delay = speed + (Math.random() * 40 - 20);
      setTimeout(type, Math.max(30, delay));
    } else if (callback) {
      callback();
    }
  }
  type();
}

// Animate Hero badge, subtitle, actions
gsap.from('.hero-badge', {
  opacity: 0,
  y: 20,
  duration: 0.8,
  delay: 0.3,
  ease: 'power2.out'
});

// Trigger typewriter after badge mounts
setTimeout(() => {
  typeWriter(line1, line1Text, 70, () => {
    // Move cursor to line 2
    if (cursor && line2) {
      line2.parentNode.appendChild(cursor);
    }
    setTimeout(() => {
      typeWriter(line2, line2Text, 85);
    }, 300);
  });
}, 700);

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
      logEl.innerHTML += `<div class="bot-msg">${marked.parse(result.data.reply)}</div>`;
    } else {
      logEl.innerHTML += `<div class="bot-msg" style="color: #ef4444">${result.error.message}</div>`;
    }
  } catch (err) {
    logEl.innerHTML += `<div class="bot-msg" style="color: #ef4444">Couldn't reach the server. Please try again.</div>`;
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
  antigravity: {
    title: "System Inspector — Antigravity Dashboard",
    latency: "Direct Inject",
    concurrency: "Local Hooks",
    saving: "No copy-paste",
    summary: "Antigravity operates as a glassmorphic stealth desktop overlay written in Python (PySide6) that hooks into Microsoft Word, Excel, and Notepad using Win32 API and COM automation. It detects hotkeys (Ctrl+Shift+I) and streams Gemini 3.5 Flash responses directly at the active cursor position.",
    tabs: [
      {
        name: "Hotkey Listener (Python)",
        code: `# main.py - Win32 Hotkey Listener & Injection Worker
import win32con
import win32api
import time
from PySide6.QtCore import QThread, Signal

class HotkeyWorker(QThread):
    triggered = Signal()
    
    def run(self):
        # Poll Ctrl+Shift+I hotkey state using Win32 API GetAsyncKeyState
        while True:
            ctrl = win32api.GetAsyncKeyState(win32con.VK_CONTROL) & 0x8000
            shift = win32api.GetAsyncKeyState(win32con.VK_SHIFT) & 0x8000
            i_key = win32api.GetAsyncKeyState(ord('I')) & 0x8000
            
            if ctrl and shift and i_key:
                self.triggered.emit()
                time.sleep(0.5)  # Prevent repeat triggers
            time.sleep(0.05)`
      },
      {
        name: "Word COM (Python)",
        code: `# connector.py - Microsoft Word COM Automation
import win32com.client

class WordConnector:
    def __init__(self):
        self.app = None
        
    def get_active_document(self):
        try:
            # Connect to active Word COM instance
            self.app = win32com.client.GetActiveObject("Word.Application")
            return self.app.ActiveDocument
        except Exception as e:
            print(f"COM connection failed: {e}")
            return None
            
    def inject_text(self, text):
        doc = self.get_active_document()
        if doc:
            selection = self.app.Selection
            selection.TypeText(text)
            print("Injected text at active cursor.")`
      }
    ],
    simLogs: [
      "Starting Antigravity system hooks simulation...",
      "Binding Win32 API hotkey listener thread... OK",
      "Scanning for Microsoft Word running process... CONNECTED",
      "Active cursor handle hooked via win32com.client.ActiveDocument",
      "Injecting mock hotkey trigger event [Ctrl+Shift+I]...",
      "Reading preceding paragraph context: 'How does photosynthesis work?'",
      "Sending prompt package to Google Gemini API core...",
      "Receiving response data stream (skipping thinking steps)... OK",
      "Streaming inline text tokens directly into document range...",
      "Simulation complete. Text injected at target cursor."
    ]
  },
  aisigma: {
    title: "System Inspector — AI Sigma Gateway",
    latency: "8ms",
    concurrency: "20k/s",
    saving: "Firestore Core",
    summary: "AI Sigma is a secure, cross-platform AI gateway combining an Expo Router (React Native) client, a secure Express.js proxy server with Helmet/Rate-Limit protection, and Firestore/Firebase Functions for automated news seeding.",
    tabs: [
      {
        name: "Server Proxy (JS)",
        code: `// server/index.js - Secure API Proxy Gateway
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGINS.split(',') }));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: "Rate limit exceeded" }
});

app.post('/api/gateway/chat', limiter, async (req, res) => {
  const { message, model } = req.body;
  console.log(\`[PROXY] Routing prompt to OpenRouter model: \${model}\`);
  // Proxy requests securely to prevent exposing client keys
  // ...
});`
      },
      {
        name: "Client Hook (TS)",
        code: `// lib/useChat.ts - React Native Chat Hook with Zustand
import { create } from 'zustand';

interface ChatState {
  messages: Array<{ id: string; text: string; role: 'user' | 'bot' }>;
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  sendMessage: async (text) => {
    set(state => ({ messages: [...state.messages, { id: Math.random().toString(), text, role: 'user' }], isLoading: true }));
    const res = await fetch('/api/gateway/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    set(state => ({ messages: [...state.messages, { id: Math.random().toString(), text: data.reply, role: 'bot' }], isLoading: false }));
  }
}));`
      }
    ],
    simLogs: [
      "Initializing AI Sigma dev server stream...",
      "Reading environment configs (Firebase PROJECT_ID: ai-sigma)...",
      "Spinning up secure Express proxy server on localhost:3001... OK",
      "Binding Router gates for OpenRouter & Anthropic models...",
      "Simulating client connection burst (15,000 requests/sec)...",
      "Gateway Rate Limit verification check: 100% SUCCESS",
      "[PROXY] Claude-3.5-Sonnet routed (latency: 180ms)",
      "[PROXY] Gemini-1.5-Pro routed (latency: 95ms)",
      "[FUNCTIONS] Executing scheduled news API sync... 5 articles seeded.",
      "AI Sigma API gateway telemetry verified."
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

// ═══════════════════════════════════════
// SERVICE CARDS TOGGLE
// ═══════════════════════════════════════
document.querySelectorAll('.service-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    card.classList.toggle('active');
  });
});

// ═══════════════════════════════════════
// GITHUB REPOSITORIES DYNAMIC LOADING
// ═══════════════════════════════════════
async function loadGitHubRepos() {
  const grid = document.getElementById('github-portfolio-grid');
  if (!grid) return;

  try {
    const response = await fetch('https://api.github.com/users/meetsharma8c-beep/repos?sort=updated&per_page=10');
    if (!response.ok) throw new Error('API request failed');
    const repos = await response.json();
    
    // Exclude forks and limit to top 3 active repos
    const publicRepos = repos.filter(repo => !repo.fork).slice(0, 3);
    
    const colors = ['#f97316', '#10b981', '#3b82f6']; // Dynamic accents (Orange, Emerald, Blue)

    publicRepos.forEach((repo, index) => {
      const card = document.createElement('div');
      card.className = 'portfolio-card reveal-item';
      card.style.cssText = `--accent: ${colors[index % colors.length]}; cursor: pointer;`;
      
      const number = String(index + 3).padStart(2, '0');
      const language = repo.language || 'Code';
      const description = repo.description || 'Live repository on GitHub. Click to inspect source, stars, and commit telemetry.';

      card.innerHTML = `
        <div class="portfolio-visual">
          <div class="portfolio-gradient"></div>
          <div class="portfolio-number">${number}</div>
        </div>
        <div class="portfolio-info">
          <h3>${repo.name}</h3>
          <p>${description}</p>
          <div class="portfolio-tags">
            <span>${language}</span>
            <span>★ ${repo.stargazers_count}</span>
            <span>⇅ ${repo.forks_count}</span>
          </div>
          <div class="portfolio-inspect-cta">View Repository &rarr;</div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.open(repo.html_url, '_blank');
      });

      grid.appendChild(card);

      // Register ScrollTrigger for the new element
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 88%',
          onEnter: () => {
            const siblings = grid.querySelectorAll('.reveal-item');
            const siblingIndex = Array.from(siblings).indexOf(card);
            setTimeout(() => {
              card.classList.add('revealed');
            }, siblingIndex * 100);
          }
        });
      } else {
        card.classList.add('revealed');
      }
    });
  } catch (error) {
    console.error('Failed to load GitHub repositories:', error);
  }
}

// Call on load
window.addEventListener('DOMContentLoaded', loadGitHubRepos);

// ═══════════════════════════════════════
// DEVELOPER WORKSPACE CONTROL CENTER LOGIC
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.workspace-tab');
  const contents = document.querySelectorAll('.workspace-content');
  const terminalLogs = document.getElementById('workspace-terminal-logs');
  const monitorIframeWrapper = document.getElementById('monitor-iframe-wrapper');
  const monitorTerminalWrapper = document.getElementById('monitor-terminal-wrapper');
  const previewIframe = document.getElementById('workspace-preview-iframe');
  const monitorProjectLabel = document.getElementById('monitor-project-label');
  const statusIndicator = document.querySelector('.monitor-status .status-indicator');
  const statusLabel = document.querySelector('.monitor-status .status-label');

  const devopsProjectSelect = document.getElementById('devops-project-select');

  // Utility to clear console logs
  function clearTerminal() {
    terminalLogs.innerHTML = '';
  }

  // Utility to append log lines
  function printLog(text, type = 'system') {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    terminalLogs.appendChild(line);
    monitorTerminalWrapper.scrollTop = monitorTerminalWrapper.scrollHeight;
  }

  // Swap display panel (iframe or terminal console)
  function showView(viewType) {
    if (viewType === 'iframe') {
      monitorIframeWrapper.style.display = 'block';
      monitorTerminalWrapper.style.display = 'none';
    } else {
      monitorIframeWrapper.style.display = 'none';
      monitorTerminalWrapper.style.display = 'block';
    }
  }

  // Tab switcher
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const activeTabId = `content-${tab.getAttribute('data-tab')}`;
      document.getElementById(activeTabId).classList.add('active');

      printLog(`Switched view context to module: ${tab.innerText.trim().toUpperCase()}`, 'system');
      
      // Auto-toggle views based on tab context
      if (tab.getAttribute('data-tab') === 'studio' && previewIframe.src !== 'about:blank') {
        showView('iframe');
      } else {
        showView('terminal');
      }
    });
  });

  // Fetch active gateway routes to populate devops projects dropdown
  async function syncProjectDropdown() {
    try {
      const res = await fetch('/api/gateway/routes');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        devopsProjectSelect.innerHTML = '<option value="">-- Select Active Project --</option>';
        data.data.forEach(route => {
          const opt = document.createElement('option');
          opt.value = route.projectId;
          opt.innerText = `${route.projectId} (/project/${route.path}/)`;
          devopsProjectSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Failed to sync workspace project dropdown:', e);
    }
  }

  // Sync initially
  syncProjectDropdown();

  // 1. AI WEBSITE STUDIO HANDLER
  const btnStudioBuild = document.getElementById('btn-studio-build');
  const inputProjectId = document.getElementById('studio-project-id');
  const textareaPrompt = document.getElementById('studio-prompt');
  const selectAccent = document.getElementById('studio-accent');

  btnStudioBuild.addEventListener('click', async () => {
    const projectId = inputProjectId.value.trim();
    const prompt = textareaPrompt.value.trim();
    const accent = selectAccent.value;

    if (!projectId || !prompt) {
      alert('Please fill out the Project ID and Design Prompt.');
      return;
    }

    showView('terminal');
    clearTerminal();
    statusIndicator.className = 'status-indicator working';
    statusLabel.innerText = 'BUILDING PROJECT...';
    monitorProjectLabel.innerText = `Project: ${projectId}`;

    printLog(`Initializing AI Studio layout generator for Node ID: "${projectId}"...`, 'system');
    printLog(`Accent styling set to: ${accent}`, 'system');
    printLog(`Prompt: "${prompt}"`, 'input');

    try {
      // Step 1: Generate layout prototype
      const genRes = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, prompt, options: { accentColor: accent } })
      });
      const genData = await genRes.json();

      if (!genData.success) {
        throw new Error(genData.error || 'Prototype generation failed');
      }

      printLog(`✓ Web prototype files generated successfully in public workspace.`, 'success');
      printLog(`Pages created: index.html, about.html, contact.html, style.css, app.js`, 'system');
      printLog(`Connecting routing gateways... Registering path: /project/${projectId}/`, 'system');

      // Step 2: Register gateway route
      const regRes = await fetch('/api/gateway/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, customPath: projectId, rateLimitRpm: 100 })
      });
      const regData = await regRes.json();

      if (!regData.success) {
        throw new Error(regData.error || 'API routing registration failed');
      }

      printLog(`✓ API gateway route mapped active. Port 3000 mapping live.`, 'success');
      printLog(`Launching live interactive layout viewport...`, 'system');

      // Sync the devops select dropdown immediately
      syncProjectDropdown();

      // Show iframe preview
      setTimeout(() => {
        statusIndicator.className = 'status-indicator live';
        statusLabel.innerText = 'MONITOR LIVE';
        previewIframe.src = `/project/${projectId}/`;
        showView('iframe');
      }, 1000);

    } catch (err) {
      printLog(`Error: Construction error: ${err.message}`, 'error');
      statusIndicator.className = 'status-indicator live';
      statusLabel.innerText = 'CONSOLE LIVE';
    }
  });

  // 2. CLOUD DEVOPS PIPELINES HANDLER
  const btnDevopsDeploy = document.getElementById('btn-devops-deploy');
  const selectDevopsProject = document.getElementById('devops-project-select');
  const selectCloudTarget = document.getElementById('devops-cloud-target');

  let pollIntervalId = null;

  btnDevopsDeploy.addEventListener('click', async () => {
    const projectId = selectDevopsProject.value;
    const cloudTarget = selectCloudTarget.value;

    if (!projectId) {
      alert('Please select an active project node to deploy.');
      return;
    }

    if (pollIntervalId) clearInterval(pollIntervalId);

    showView('terminal');
    clearTerminal();
    statusIndicator.className = 'status-indicator working';
    statusLabel.innerText = 'DEPLOYING PIPELINE...';
    monitorProjectLabel.innerText = `Project: ${projectId}`;

    printLog(`Triggering secure DevOps pipeline build sequence for "${projectId}"...`, 'system');
    printLog(`Target Cloud: ${cloudTarget.toUpperCase()}`, 'system');

    try {
      const deployRes = await fetch('/api/devops/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, cloudTarget })
      });
      const deployData = await deployRes.json();

      if (!deployData.success) {
        throw new Error(deployData.error || 'Pipeline queue execution failed');
      }

      printLog(deployData.data.message, 'success');
      printLog(`Generated deployments data file under data/deployments/${projectId}/`, 'system');
      printLog(`Files: ${deployData.data.filesGenerated.join(', ')}`, 'system');
      printLog(`Streaming deployment output sequence telemetry...`, 'system');

      // Poll deployment logs
      const deploymentId = deployData.data.deploymentId;
      let lastLogIndex = 0;
      pollIntervalId = setInterval(async () => {
        try {
          const logRes = await fetch(`/api/devops/logs/${projectId}`);
          const logData = await logRes.json();

          if (logData.success && Array.isArray(logData.data)) {
            const logs = logData.data.filter(l => l.deploymentId === deploymentId);
            if (logs.length > lastLogIndex) {
              for (let i = lastLogIndex; i < logs.length; i++) {
                const log = logs[i];
                const logMsg = log.message || '';
                let lineType = 'system';
                if (logMsg.includes('OK') || logMsg.includes('SUCCESS') || logMsg.includes('Success') || logMsg.includes('complete') || logMsg.includes('completed')) {
                  lineType = 'success';
                } else if (logMsg.includes('error') || logMsg.includes('failed')) {
                  lineType = 'error';
                } else if (logMsg.includes('warning')) {
                  lineType = 'warning';
                }
                
                printLog(logMsg, lineType);
              }
              lastLogIndex = logs.length;

              // Check if completed
              if (logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                const lastLogMsg = lastLog.message || '';
                if (lastLogMsg.includes('completed') || lastLogMsg.includes('complete') || lastLogMsg.includes('failed')) {
                  clearInterval(pollIntervalId);
                  pollIntervalId = null;
                  statusIndicator.className = 'status-indicator live';
                  statusLabel.innerText = 'CONSOLE LIVE';
                  printLog(`DevOps Pipeline run complete. Status: ${lastLogMsg.includes('failed') ? 'FAILED' : 'SUCCESS'}.`, lastLogMsg.includes('failed') ? 'error' : 'success');
                }
              }
            }
          }
        } catch (pollErr) {
          console.error('Error polling deployment logs:', pollErr);
        }
      }, 700);

    } catch (err) {
      printLog(`Error: Deployment trigger failed: ${err.message}`, 'error');
      statusIndicator.className = 'status-indicator live';
      statusLabel.innerText = 'CONSOLE LIVE';
    }
  });

  // 3. DATA ETL MIGRATION HANDLER
  const btnEtlMigrate = document.getElementById('btn-etl-migrate');
  const selectEtlCollection = document.getElementById('etl-collection-target');
  const selectEtlFormat = document.getElementById('etl-format');
  const textareaEtlRaw = document.getElementById('etl-raw-data');

  btnEtlMigrate.addEventListener('click', async () => {
    const collection = selectEtlCollection.value;
    const format = selectEtlFormat.value;
    const rawData = textareaEtlRaw.value.trim();

    if (!rawData) {
      alert('Please paste some raw JSON or CSV data first.');
      return;
    }

    showView('terminal');
    clearTerminal();
    statusIndicator.className = 'status-indicator working';
    statusLabel.innerText = 'MIGRATING DATA...';
    monitorProjectLabel.innerText = `ETL: ${collection}`;

    printLog(`Initializing ETL mapping pipeline targeted at database: "${collection}"...`, 'system');
    printLog(`Data Format: ${format.toUpperCase()}`, 'system');

    try {
      const migrateRes = await fetch('/api/migration/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, rawData, format })
      });
      const migrateData = await migrateRes.json();

      if (!migrateData.success) {
        throw new Error(migrateData.error || 'Migration pipeline execution failed');
      }

      const report = migrateData.data;
      printLog(`✓ ETL Data Migration Job finished. Job ID: ${report.jobId}`, 'success');
      printLog(`Records Processed: ${report.totalRecords}`, 'system');
      printLog(`Successful Imports: ${report.successCount}`, 'success');
      printLog(`Failed Records: ${report.failCount}`, report.failCount > 0 ? 'warning' : 'system');

      if (report.warnings && report.warnings.length > 0) {
        printLog(`Data integrity warnings generated:`, 'warning');
        report.warnings.forEach(warn => printLog(` - ${warn}`, 'warning'));
      } else {
        printLog(`✓ Zero integrity constraints violated. DB indexing complete.`, 'success');
      }

      statusIndicator.className = 'status-indicator live';
      statusLabel.innerText = 'CONSOLE LIVE';

    } catch (err) {
      printLog(`Error: ETL Migration failed: ${err.message}`, 'error');
      statusIndicator.className = 'status-indicator live';
      statusLabel.innerText = 'CONSOLE LIVE';
    }
  });
});



