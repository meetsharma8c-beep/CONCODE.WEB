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
    contact: "Display contact email, channels, or submit a message to the developer.",
    color: "Switch theme colors. Usage: color [matrix|amber|cyan|classic]",
    clear: "Clear the terminal console history.",
    banner: "Reprint ASCII terminal banner.",
    matrix: "Toggle the retro falling Matrix digital rain simulation."
  };

  // Focus input initially
  terminalInput.focus();

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
