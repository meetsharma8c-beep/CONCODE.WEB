document.addEventListener('DOMContentLoaded', () => {
  const terminalInput = document.getElementById('terminal-input');
  const outputLog = document.getElementById('output-log');
  const terminalScreen = document.getElementById('terminal-screen');
  const sessionTimeEl = document.getElementById('session-time');

  // Set Session Time
  const now = new Date();
  if (sessionTimeEl) {
    sessionTimeEl.innerText = now.toLocaleString();
  }

  // Focus Input on screen click
  terminalScreen.addEventListener('click', () => {
    terminalInput.focus();
  });

  // Initialize 3D Monolith HUD
  initTerminal3D();

  // CLI Command History Tracker
  let commandHistory = [];
  let historyIndex = -1;

  // CLI Core Configuration / Data Model
  const portfolioData = {
    name: "Meet Sharma",
    title: "Full Stack Engineer & WebGL Developer",
    about: "I build high-performance web systems, custom API architectures, and interactive 3D frontend scenes. Specializing in responsive, premium systems designed to provide businesses with a competitive edge.",
    skills: [
      { name: "Node.js / Express", level: 90 },
      { name: "Three.js / WebGL", level: 85 },
      { name: "JavaScript (ES6+)", level: 95 },
      { name: "Database Design (Postgres/Firestore)", level: 80 },
      { name: "DevOps & Cloud (Docker/Kubernetes/IaC)", level: 75 }
    ],
    projects: [
      {
        name: "CONCODE Agency Platform",
        desc: "A custom web agency platform featuring dynamic routing gates, auto-scaling Kubernetes telemetry simulations, and local NLP conversational engines.",
        tech: "Node.js, Express, WebGL, CSS Grid"
      },
      {
        name: "Antigravity Dashboard",
        desc: "A next-generation desktop AI assistant that injects itself directly into Microsoft Word, Excel, and Notepad via Win32 COM APIs.",
        tech: "Python, PySide6, Win32 API, Gemini 3.5 Flash"
      },
      {
        name: "AI Sigma (AI Σ) Gateway",
        desc: "A secure, cross-platform AI gateway combining an Expo Router mobile/web app with a secure Express proxy backend and Firebase Functions.",
        tech: "React Native, Expo, Zustand, Express.js, Firestore"
      }
    ],
    contact: {
      email: "ms.concode@gmail.com",
      phone: "+91 9904717666",
      location: "Vadodara, India",
      socials: {
        github: "github.com/meetsharma8c-beep",
        linkedin: "linkedin.com/in/meet-sharma-b589a1361"
      }
    }
  };

  // Supported CLI Commands
  const COMMANDS = {
    help: "List all available terminal commands.",
    about: "Get an overview of my professional background.",
    skills: "View categorized developer technical skills and progress.",
    projects: "Inspect the collection of recent project rollouts.",
    github: "Fetch and list my public GitHub repositories in real-time.",
    "3d": "Toggle or inspect the 3D Holographic Monolith HUD.",
    contact: "Display contact email, channels, or submit a message to the developer.",
    color: "Switch theme colors. Usage: color [matrix|amber|cyan|classic]",
    clear: "Clear the terminal console history.",
    banner: "Reprint ASCII terminal banner.",
    matrix: "Toggle the retro falling Matrix digital rain simulation."
  };

  // An embedded terminal must not steal focus from the marketing page: doing
  // so scrolls first-time visitors away from the hero. Keep auto-focus only
  // when someone opens the terminal as its own page.
  if (window.self === window.top) {
    terminalInput.focus();
  }

  // Listen for Enter key
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const inputVal = terminalInput.value.trim();
      terminalInput.value = '';
      if (inputVal) {
        handleCommand(inputVal);
      }
    } else if (e.key === 'ArrowUp') {
      // Traverse history backward
      if (commandHistory.length > 0) {
        if (historyIndex === -1) {
          historyIndex = commandHistory.length - 1;
        } else if (historyIndex > 0) {
          historyIndex--;
        }
        terminalInput.value = commandHistory[historyIndex];
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      // Traverse history forward
      if (commandHistory.length > 0 && historyIndex !== -1) {
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          terminalInput.value = commandHistory[historyIndex];
        } else {
          historyIndex = -1;
          terminalInput.value = '';
        }
      }
      e.preventDefault();
    }
  });

  // Handle Command Logic
  function handleCommand(cmdString) {
    // Add to history
    commandHistory.push(cmdString);
    historyIndex = -1; // Reset tracker

    // Write echo of command
    appendOutputLine(`visitor@concode:~$ ${cmdString}`, 'prompt');

    // CRT screen flicker and 3D monolith excitation micro-animation
    terminalScreen.classList.remove('crt-flicker-pulse');
    void terminalScreen.offsetWidth;
    terminalScreen.classList.add('crt-flicker-pulse');
    if (window.pulseTerminalMonolith) window.pulseTerminalMonolith(1.2);

    // Parse command parameters
    const parts = cmdString.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const logBox = document.createElement('div');
    logBox.className = 'command-output';

    let outputHtml = '';

    switch (cmd) {
      case 'help':
        outputHtml = '<p class="text-muted">Available commands in CONCODE CLI:</p><br>';
        Object.keys(COMMANDS).forEach(key => {
          outputHtml += `<p><span class="text-warning">${key.padEnd(10)}</span> — ${COMMANDS[key]}</p>`;
        });
        break;

      case '3d':
        if (window.toggle3DHUD) window.toggle3DHUD(true);
        if (window.pulseTerminalMonolith) window.pulseTerminalMonolith(2.8);
        outputHtml = `
          <p class="text-cyan">>> 3D QUANTUM DATA MONOLITH // HUD ACTIVATED</p>
          <br>
          <p>Rendering interactive 3D WebGL Monolith &amp; Quantum Cube in real-time.</p>
          <p><span class="text-warning">Telemetry:</span> 3-axis gimbal ring rotation, phosphor particle cloud, high-contrast CRT shader aesthetics.</p>
          <p class="text-muted">Interactive: Drag viewport with mouse/touch to inspect geometry. Click [PULSE] in HUD for tensor excitation.</p>
        `;
        break;

      case 'about':
        outputHtml = `
          <p class="text-success">${portfolioData.name} — ${portfolioData.title}</p>
          <br>
          <p>${portfolioData.about}</p>
          <br>
          <p class="text-muted">Currently based in ${portfolioData.contact.location}. Open for contract commissions and technical collaborations.</p>
        `;
        break;

      case 'skills':
        outputHtml = '<p class="text-muted">Core Technology Stack Telemetry:</p><br>';
        portfolioData.skills.forEach(skill => {
          const filledCount = Math.floor(skill.level / 10);
          const barText = '█'.repeat(filledCount) + '░'.repeat(10 - filledCount);
          outputHtml += `
            <div class="progress-bar-container">
              <span class="text-cyan" style="display:inline-block; width:220px;">${skill.name}</span>
              <span class="bar">${barText}</span>
              <span class="text-muted">${skill.level}%</span>
            </div>
          `;
        });
        break;

      case 'projects':
        outputHtml = '<p class="text-muted">Active Node Deployments:</p><br>';
        portfolioData.projects.forEach((proj, idx) => {
          outputHtml += `
            <p><span class="text-success">[0${idx + 1}] ${proj.name}</span></p>
            <p style="padding-left:15px; margin-bottom:5px;">${proj.desc}</p>
            <p style="padding-left:15px; font-size:12px; margin-bottom:12px;"><span class="text-warning">Stack:</span> <code class="text-muted">${proj.tech}</code></p>
          `;
        });
        outputHtml += `<p class="text-muted" style="margin-top:10px;">Tip: Type <span class="text-warning">github</span> to fetch live public repositories from GitHub!</p>`;
        break;

      case 'contact':
        if (args[0] === 'msg') {
          const clientMsg = args.slice(1).join(' ').replace(/["']/g, '');
          if (!clientMsg) {
            outputHtml = '<p class="text-danger">Syntax error. Usage: contact msg "your message here"</p>';
          } else {
            outputHtml = '<p class="text-cyan">Connecting edge networks... Registering lead...</p>';
            submitLeadToDatabase(clientMsg, logBox);
            // Submit lead asynchronously, logBox will be updated by submit function
            logBox.innerHTML = outputHtml;
            outputLog.appendChild(logBox);
            scrollToBottom();
            return;
          }
        } else {
          outputHtml = `
            <p><span class="text-cyan">Email:</span>    <a href="mailto:${portfolioData.contact.email}" style="color:inherit; text-decoration:underline;">${portfolioData.contact.email}</a></p>
            <p><span class="text-cyan">Phone:</span>    ${portfolioData.contact.phone}</p>
            <p><span class="text-cyan">Location:</span> ${portfolioData.contact.location}</p>
            <p><span class="text-cyan">GitHub:</span>   <a href="https://${portfolioData.contact.socials.github}" target="_blank" style="color:inherit;">${portfolioData.contact.socials.github}</a></p>
            <p><span class="text-cyan">LinkedIn:</span> <a href="https://${portfolioData.contact.socials.linkedin}" target="_blank" style="color:inherit;">${portfolioData.contact.socials.linkedin}</a></p>
            <br>
            <p class="text-muted">Tip: Submit an inquiry directly from this CLI! Type: <span class="text-warning">contact msg "write your message"</span></p>
          `;
        }
        break;

      case 'color':
        const theme = args[0] ? args[0].toLowerCase() : '';
        if (['matrix', 'amber', 'cyan', 'classic'].includes(theme)) {
          document.body.className = `theme-${theme}`;
          if (window.updateMonolithThemeColor) window.updateMonolithThemeColor(theme);
          if (window.pulseTerminalMonolith) window.pulseTerminalMonolith(1.8);
          outputHtml = `<p class="text-success">Theme configuration changed successfully to: ${theme.toUpperCase()}</p>`;
        } else {
          outputHtml = '<p class="text-danger">Invalid color scheme. Options: color [matrix|amber|cyan|classic]</p>';
        }
        break;

      case 'clear':
        outputLog.innerHTML = '';
        return;

      case 'banner':
        outputHtml = `<pre class="ascii-banner">
███╗   ███╗███████╗   ██████╗  ██████╗ ██████╗████████╗
████╗ ████║██╔════╝   ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝
██╔████╔██║███████╗   ██████╔╝██║   ██║██████╔╝   ██║   
██║╚██╔╝██║╚════██║   ██╔═══╝ ██║   ██║██╔══██╗   ██║   
██║ ╚═╝ ██║███████║   ██║     ╚██████╔╝██║  ██║   ██║   
╚═╝     ╚═╝╚══════╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
        </pre>
        <p>CONCODE Core CLI (v2.8.5-stable)</p>
        <br>`;
        break;

      case 'matrix':
        toggleMatrixRain();
        outputHtml = '<p class="text-success">Toggled Matrix digital rain background simulation.</p>';
        break;

      case 'github':
        outputHtml = '<p class="text-cyan">Connecting to GitHub API... Retrieving repositories...</p>';
        fetchGitHubRepos(logBox);
        logBox.innerHTML = outputHtml;
        outputLog.appendChild(logBox);
        scrollToBottom();
        return;

      default:
        outputHtml = `<p class="text-danger">Command not found: "${cmd}". Type <span class="text-warning">help</span> to list commands.</p>`;
    }

    logBox.innerHTML = outputHtml;
    outputLog.appendChild(logBox);
    scrollToBottom();
  }

  function appendOutputLine(text, className = '') {
    const p = document.createElement('p');
    if (className) p.className = className;
    p.innerText = text;
    outputLog.appendChild(p);
    scrollToBottom();
  }

  function scrollToBottom() {
    terminalScreen.scrollTop = terminalScreen.scrollHeight;
  }

  // Handle lead submission via CLI API Endpoint
  function submitLeadToDatabase(messageText, logBox) {
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "CLI Visitor",
        email: "ms.concode@gmail.com",
        message: `CLI Submission: ${messageText}`
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          logBox.innerHTML = '<p class="text-success"> Inquiry package submitted successfully to developer database.</p>';
        } else {
          logBox.innerHTML = `<p class="text-danger">Submission error: ${data.error.message}</p>`;
        }
        scrollToBottom();
      })
      .catch(err => {
        logBox.innerHTML = '<p class="text-danger">Network error: Failed to reach API gateways.</p>';
        scrollToBottom();
      });
  }

  // GitHub Repositories Live Fetching
  let cachedRepos = null;

  function fetchGitHubRepos(logBox) {
    if (cachedRepos) {
      renderRepos(cachedRepos, logBox);
      return;
    }

    fetch('https://api.github.com/users/meetsharma8c-beep/repos?sort=updated&per_page=10')
      .then(res => {
        if (!res.ok) {
          throw new Error(`GitHub API returned status ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        cachedRepos = data.filter(repo => !repo.fork); // exclude forks
        renderRepos(cachedRepos, logBox);
      })
      .catch(err => {
        logBox.innerHTML = `<p class="text-danger">Failed to fetch repositories: ${err.message}</p>
                            <p class="text-muted">You can view my repositories directly on GitHub: <a href="https://github.com/meetsharma8c-beep" target="_blank" style="color:var(--cyan-color); text-decoration:underline;">github.com/meetsharma8c-beep</a></p>`;
        scrollToBottom();
      });
  }

  function renderRepos(repos, logBox) {
    if (repos.length === 0) {
      logBox.innerHTML = '<p class="text-warning">No public repositories found for this account.</p>';
      scrollToBottom();
      return;
    }

    let html = '<p class="text-muted">Live public GitHub repositories:</p><br>';
    repos.forEach((repo, idx) => {
      const languageText = repo.language ? ` [${repo.language}]` : '';
      const stars = repo.stargazers_count > 0 ? `  ${repo.stargazers_count}` : '';
      const forks = repo.forks_count > 0 ? ` ⇅ ${repo.forks_count}` : '';
      const description = repo.description || 'No description provided.';
      
      html += `
        <p><span class="text-success">[0${idx + 1}] ${repo.name}</span><span class="text-cyan">${languageText}</span><span class="text-warning">${stars}${forks}</span></p>
        <p style="padding-left:15px; margin-bottom:5px;">${description}</p>
        <p style="padding-left:15px; font-size:12px; margin-bottom:12px;"><span class="text-warning">Link:</span> <a href="${repo.html_url}" target="_blank" style="color:inherit; text-decoration:underline;">${repo.html_url.replace('https://', '')}</a></p>
      `;
    });
    logBox.innerHTML = html;
    scrollToBottom();
  }

  // Matrix Digital Rain Logic
  const canvas = document.getElementById('matrix-canvas');
  const ctx = canvas.getContext('2d');
  let animationFrameId = null;

  // Resize canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ';
  const fontSize = 14;
  let columns = canvas.width / fontSize;
  let drops = [];

  function initDrops() {
    columns = canvas.width / fontSize;
    drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }
  }

  function drawMatrix() {
    // Semi-transparent background to clear screen and leave trails
    ctx.fillStyle = 'rgba(12, 15, 18, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get current theme color
    let charColor = '#39ff14'; // Matrix
    if (document.body.classList.contains('theme-amber')) charColor = '#ffb000';
    else if (document.body.classList.contains('theme-cyan')) charColor = '#00f0ff';
    else if (document.body.classList.contains('theme-classic')) charColor = '#ffffff';

    ctx.fillStyle = charColor;
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      // Pick random character
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      // Reset drops that fall off or randomly
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  function toggleMatrixRain() {
    if (canvas.style.display === 'block') {
      canvas.style.display = 'none';
      if (animationFrameId) {
        clearInterval(animationFrameId);
        animationFrameId = null;
      }
    } else {
      canvas.style.display = 'block';
      initDrops();
      animationFrameId = setInterval(drawMatrix, 35);
    }
  }
});

// ============================================================================
// 3D QUANTUM DATA MONOLITH & CYBER CUBE (THREE.JS ENGINE)
// ============================================================================
let monolithScene, monolithCamera, monolithRenderer;
let monolithGroup, monolithCore, monolithOcta, ringYaw, ringPitch, ringRoll, monolithDust;
let monolithLightPrimary, monolithLightSecondary;
let monolithMatFrame, monolithMatOcta, monolithMatCore;
let isMonolithDragging = false;
let monolithPrevMouse = { x: 0, y: 0 };
let monolithRotVel = { x: 0, y: 0.005 };
let monolithPulseBoost = 0;
let isHUDOpen = true;

window.toggle3DHUD = function(forceOpen) {
  const hud = document.getElementById('terminal-3d-hud');
  const btn = document.getElementById('btn-toggle-3d');
  if (!hud) return;

  if (forceOpen === true) {
    isHUDOpen = true;
  } else if (forceOpen === false) {
    isHUDOpen = false;
  } else {
    isHUDOpen = !isHUDOpen;
  }

  if (isHUDOpen) {
    hud.classList.remove('closed');
    if (btn) btn.innerText = '[3D HUD: ON]';
  } else {
    hud.classList.add('closed');
    if (btn) btn.innerText = '[3D HUD: OFF]';
  }
};

window.pulseTerminalMonolith = function(multiplier = 1.0) {
  monolithPulseBoost = Math.max(monolithPulseBoost, multiplier);
  monolithRotVel.y += 0.025 * multiplier;
  monolithRotVel.x += (Math.random() - 0.5) * 0.02 * multiplier;
  if (monolithCore) {
    monolithCore.scale.set(1.6 * multiplier, 1.6 * multiplier, 1.6 * multiplier);
  }
};

window.updateMonolithThemeColor = function(themeName) {
  let hexColor = 0x39ff14;
  let secColor = 0x00f0ff;
  if (themeName === 'amber') {
    hexColor = 0xffb000;
    secColor = 0xff5500;
  } else if (themeName === 'cyan') {
    hexColor = 0x00f0ff;
    secColor = 0x7000ff;
  } else if (themeName === 'classic') {
    hexColor = 0xffffff;
    secColor = 0x8c96a3;
  }

  if (monolithMatFrame) monolithMatFrame.color.setHex(hexColor);
  if (monolithMatCore) {
    monolithMatCore.color.setHex(hexColor);
    monolithMatCore.emissive.setHex(hexColor);
  }
  if (monolithMatOcta) monolithMatOcta.color.setHex(secColor);
  if (monolithLightPrimary) monolithLightPrimary.color.setHex(hexColor);
  if (monolithLightSecondary) monolithLightSecondary.color.setHex(secColor);
};

window.initTerminal3D = function() {
  const canvas = document.getElementById('terminal-3d-canvas');
  if (!canvas) return;

  if (typeof THREE === 'undefined') {
    setTimeout(initTerminal3D, 80);
    return;
  }

  const container = canvas.parentElement;
  const width = container.clientWidth || 270;
  const height = container.clientHeight || 200;

  // Scene & Camera
  monolithScene = new THREE.Scene();
  monolithCamera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
  monolithCamera.position.set(0, 0, 15);

  // WebGL Renderer
  monolithRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  monolithRenderer.setSize(width, height);
  monolithRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Monolith Group
  monolithGroup = new THREE.Group();
  monolithScene.add(monolithGroup);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  monolithScene.add(ambient);

  monolithLightPrimary = new THREE.PointLight(0x39ff14, 2.5, 30);
  monolithLightPrimary.position.set(0, 5, 8);
  monolithScene.add(monolithLightPrimary);

  monolithLightSecondary = new THREE.PointLight(0x00f0ff, 2.0, 30);
  monolithLightSecondary.position.set(0, -5, -8);
  monolithScene.add(monolithLightSecondary);

  // Outer Box Frame
  const boxGeo = new THREE.BoxGeometry(4.2, 5.2, 4.2);
  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  monolithMatFrame = new THREE.LineBasicMaterial({ color: 0x39ff14, linewidth: 2 });
  const boxWireframe = new THREE.LineSegments(edgesGeo, monolithMatFrame);
  monolithGroup.add(boxWireframe);

  // Corner Bracket Markers
  const cornerMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true });
  const cornerGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const cornerOffsets = [
    [-2.1, -2.6, -2.1], [2.1, -2.6, -2.1], [-2.1, 2.6, -2.1], [2.1, 2.6, -2.1],
    [-2.1, -2.6, 2.1], [2.1, -2.6, 2.1], [-2.1, 2.6, 2.1], [2.1, 2.6, 2.1]
  ];
  cornerOffsets.forEach(pos => {
    const cMesh = new THREE.Mesh(cornerGeo, cornerMat);
    cMesh.position.set(pos[0], pos[1], pos[2]);
    monolithGroup.add(cMesh);
  });

  // Inner Nested Octahedron
  const octaGeo = new THREE.OctahedronGeometry(2.0, 0);
  monolithMatOcta = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.75 });
  monolithOcta = new THREE.Mesh(octaGeo, monolithMatOcta);
  monolithGroup.add(monolithOcta);

  // Core Glowing Quantum Sphere
  const coreGeo = new THREE.SphereGeometry(0.9, 16, 16);
  monolithMatCore = new THREE.MeshStandardMaterial({
    color: 0x39ff14,
    emissive: 0x39ff14,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.8
  });
  monolithCore = new THREE.Mesh(coreGeo, monolithMatCore);
  monolithGroup.add(monolithCore);

  // 3 Orthogonal Gimbal Rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true, transparent: true, opacity: 0.5 });
  ringYaw = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.04, 6, 36), ringMat);
  ringPitch = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.04, 6, 36), ringMat);
  ringRoll = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.04, 6, 36), ringMat);
  ringPitch.rotation.x = Math.PI / 2;
  ringRoll.rotation.y = Math.PI / 2;
  monolithGroup.add(ringYaw);
  monolithGroup.add(ringPitch);
  monolithGroup.add(ringRoll);

  // Phosphor Matrix Particles
  const particleCount = 140;
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    partPos[i * 3] = (Math.random() - 0.5) * 8;
    partPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    partPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
  const partMat = new THREE.PointsMaterial({ size: 0.16, color: 0x39ff14, transparent: true, opacity: 0.65 });
  monolithDust = new THREE.Points(partGeo, partMat);
  monolithGroup.add(monolithDust);

  // Mouse & Touch Drag Controls
  function onStart(x, y) {
    isMonolithDragging = true;
    monolithPrevMouse = { x, y };
  }
  function onMove(x, y) {
    if (!isMonolithDragging) return;
    const dx = x - monolithPrevMouse.x;
    const dy = y - monolithPrevMouse.y;
    monolithRotVel.y += dx * 0.001;
    monolithRotVel.x += dy * 0.001;
    monolithPrevMouse = { x, y };
  }
  function onEnd() {
    isMonolithDragging = false;
  }

  container.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onEnd);

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchend', onEnd);

  // Resize Observer
  const resizeObs = new ResizeObserver(() => {
    const w = container.clientWidth || 270;
    const h = container.clientHeight || 200;
    monolithCamera.aspect = w / h;
    monolithCamera.updateProjectionMatrix();
    monolithRenderer.setSize(w, h);
  });
  resizeObs.observe(container);

  // Render Loop
  function animateMonolith() {
    requestAnimationFrame(animateMonolith);

    // Damping & Inertia
    monolithGroup.rotation.y += monolithRotVel.y;
    monolithGroup.rotation.x += monolithRotVel.x;
    monolithRotVel.y *= 0.94;
    monolithRotVel.x *= 0.94;

    // Base idle rotation
    if (!isMonolithDragging) {
      monolithGroup.rotation.y += 0.006 + monolithPulseBoost * 0.03;
      monolithGroup.rotation.x += 0.003;
    }

    // Gimbal Ring Rotations
    ringYaw.rotation.z += 0.012 + monolithPulseBoost * 0.04;
    ringPitch.rotation.y += 0.015 + monolithPulseBoost * 0.04;
    ringRoll.rotation.x += 0.018 + monolithPulseBoost * 0.04;

    // Octahedron Counter-spin
    if (monolithOcta) {
      monolithOcta.rotation.y -= 0.01;
      monolithOcta.rotation.z += 0.008;
    }

    // Core Breath & Relaxation
    if (monolithCore) {
      const breath = 1.0 + Math.sin(Date.now() * 0.004) * 0.08 + monolithPulseBoost * 0.4;
      monolithCore.scale.lerp(new THREE.Vector3(breath, breath, breath), 0.1);
    }

    // Pulse decay
    if (monolithPulseBoost > 0) {
      monolithPulseBoost *= 0.93;
      if (monolithPulseBoost < 0.005) monolithPulseBoost = 0;
    }

    // Particle drift
    if (monolithDust) {
      monolithDust.rotation.y += 0.002;
    }

    monolithRenderer.render(monolithScene, monolithCamera);
  }
  animateMonolith();
};
