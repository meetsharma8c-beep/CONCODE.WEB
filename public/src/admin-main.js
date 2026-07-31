/**
 * CONCODE — Developer Admin Console Application Logic
 * Authentication, dynamic tabs, database queries, and live telemetry.
 */

document.addEventListener('DOMContentLoaded', () => {
  const authDialog = document.getElementById('auth-dialog');
  const authForm = document.getElementById('auth-form');
  const tokenInput = document.getElementById('token-input');
  const authError = document.getElementById('auth-error');
  const logoutBtn = document.getElementById('btn-logout');
  const mainContainer = document.getElementById('admin-container');

  // Telemetry DOM elements
  const telemetryEdgeNodes = document.getElementById('telemetry-edge-nodes');
  const telemetryRequestRate = document.getElementById('telemetry-request-rate');
  const telemetryAvgLatency = document.getElementById('telemetry-avg-latency');
  const telemetryErrorRate = document.getElementById('telemetry-error-rate');
  const telemetryMemoryText = document.getElementById('telemetry-memory-text');
  const telemetryMemoryBar = document.getElementById('telemetry-memory-bar');
  const telemetryTicks = document.getElementById('telemetry-ticks');

  // Check for redirect callback URL parameters token
  const urlParams = new URLSearchParams(window.location.search);
  const queryToken = urlParams.get('token');
  if (queryToken) {
    localStorage.setItem('concode_admin_token', queryToken);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  let activeToken = localStorage.getItem('concode_admin_token') || '';
  let telemetryInterval = null;

  // ═══════════════════════════════════════
  // SECURITY & AUTHENTICATION
  // ═══════════════════════════════════════

  function redirectToLogin() {
    localStorage.removeItem('concode_admin_token');
    if (telemetryInterval) clearInterval(telemetryInterval);
    window.location.href = 'login.html';
  }

  async function validateAndLoad(token) {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'x-admin-token': token }
      });
      const data = await res.json();

      if (data.success) {
        activeToken = token;
        localStorage.setItem('concode_admin_token', token);
        
        // Render all data tables
        renderDashboard(data.data);
        
        // Show main view with smooth entry transition
        mainContainer.classList.add('loaded');
        
        // Start live telemetry polling
        startTelemetryPolling();
        return true;
      } else {
        throw new Error(data.error.message || 'Invalid Token');
      }
    } catch (err) {
      redirectToLogin();
      return false;
    }
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('concode_admin_token');
    if (telemetryInterval) clearInterval(telemetryInterval);
    window.location.href = 'index.html';
  });

  // Init
  if (activeToken) {
    validateAndLoad(activeToken);
  } else {
    redirectToLogin();
  }

  // ═══════════════════════════════════════
  // WORKSPACE TABS INTERACTION
  // ═══════════════════════════════════════
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const pane = document.getElementById(`tab-${targetTab}`);
      if (pane) pane.classList.add('active');
    });
  });

  // ═══════════════════════════════════════
  // DASHBOARD DATA RENDERING
  // ═══════════════════════════════════════
  function renderDashboard(data) {
    // 1. Render Summary stats
    document.getElementById('stat-total-routes').textContent = data.stats.totalRoutes || 0;
    document.getElementById('stat-total-leads').textContent = data.stats.totalInquiries || 0;
    document.getElementById('stat-total-contacts').textContent = data.stats.totalContacts || 0;
    document.getElementById('stat-total-chats').textContent = data.stats.totalChats || 0;

    // 2. Render Routes list
    renderRoutes(data.routes);

    // 3. Render Briefs & Inquiries list
    renderInquiries(data.inquiries);

    // 4. Render Contacts list
    renderContacts(data.contacts);

    // 5. Render Chat logs list & viewer
    renderChats(data.chats);

    // 6. Render DevOps Rollouts list & viewer
    renderDeployments(data.deployments);
  }

  // Render Routes Table
  function renderRoutes(routes) {
    const tbody = document.querySelector('#routes-table tbody');
    tbody.innerHTML = '';

    if (!routes || routes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="no-data-alert"><i></i>No active dynamic routes registered. Use the CLI '/generate' command.</div></td></tr>`;
      return;
    }

    routes.forEach(r => {
      const tr = document.createElement('tr');
      const createdStr = new Date(r.createdAt).toLocaleString();
      const domainStr = r.customDomain
        ? `<span style="color: #00f0ff; font-family: monospace;">${r.customDomain}</span>`
        : '<span style="color: rgba(255,255,255,0.4)">Default Gateway</span>';
      
      tr.innerHTML = `
        <td class="text-mono">${r.projectId}</td>
        <td><a href="/project/${r.path}/" target="_blank" style="color: var(--cyan); font-weight: bold;">/project/${r.path}/</a></td>
        <td>${domainStr}</td>
        <td class="text-mono">${r.rateLimitRpm} rpm</td>
        <td>${createdStr}</td>
        <td style="display: flex; gap: 0.5rem;">
          <a href="/project/${r.path}/" target="_blank" class="btn-action-preview">Preview Site</a>
          <button class="btn-action-delete" data-id="${r.projectId}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach event listeners for delete actions
    tbody.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Are you absolutely sure you want to delete project routing and physical source files for ID: "${id}"? This cannot be undone.`)) {
          btn.textContent = 'Deleting...';
          btn.disabled = true;
          try {
            const res = await fetch(`/api/gateway/route/${id}`, {
              method: 'DELETE'
            });
            const delData = await res.json();
            if (delData.success) {
              // Reload page data silently
              validateAndLoad(activeToken);
            } else {
              alert(`Deletion failed: ${delData.error.message}`);
              btn.textContent = 'Delete';
              btn.disabled = false;
            }
          } catch (err) {
            alert('Failed to connect to gateway service.');
            btn.textContent = 'Delete';
            btn.disabled = false;
          }
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render Inquiries Table
  function renderInquiries(inquiries) {
    const tbody = document.querySelector('#inquiries-table tbody');
    tbody.innerHTML = '';

    if (!inquiries || inquiries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="no-data-alert"><i></i>No developer specs or brief inquiry submissions logged yet.</div></td></tr>`;
      return;
    }

    inquiries.forEach(inq => {
      const tr = document.createElement('tr');
      const createdStr = new Date(inq.createdAt).toLocaleString();
      
      tr.innerHTML = `
        <td><strong>${escapeHtml(inq.name)}</strong></td>
        <td><a href="mailto:${escapeHtml(inq.email)}" style="color:var(--cyan); text-decoration:underline;">${escapeHtml(inq.email)}</a></td>
        <td><span class="badge badge-active">${escapeHtml(inq.serviceType || 'custom')}</span></td>
        <td>${escapeHtml(inq.description)}</td>
        <td class="text-mono">${createdStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Contacts Table
  function renderContacts(contacts) {
    const tbody = document.querySelector('#contacts-table tbody');
    tbody.innerHTML = '';

    if (!contacts || contacts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="no-data-alert"><i></i>No standard contact queries submitted yet.</div></td></tr>`;
      return;
    }

    contacts.forEach(c => {
      const tr = document.createElement('tr');
      const createdStr = new Date(c.createdAt).toLocaleString();
      
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><a href="mailto:${escapeHtml(c.email)}" style="color:var(--cyan); text-decoration:underline;">${escapeHtml(c.email)}</a></td>
        <td>${escapeHtml(c.message)}</td>
        <td class="text-mono">${createdStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Chats
  function renderChats(chats) {
    const sessionList = document.getElementById('chat-sessions-list');
    const messagesBody = document.getElementById('chat-messages-body');
    const activeHeader = document.getElementById('active-session-title');

    sessionList.innerHTML = '';
    messagesBody.innerHTML = '';
    activeHeader.textContent = 'Select a conversation session to view';

    if (!chats || chats.length === 0) {
      sessionList.innerHTML = `<div class="no-data-alert" style="padding:1.5rem; font-size:0.85rem;">No chats logged.</div>`;
      messagesBody.innerHTML = `<div class="no-data-alert"><i></i>Chat history buffer is empty.</div>`;
      return;
    }

    // Group chats by sessionId
    const sessions = {};
    chats.forEach(c => {
      const sId = c.sessionId || 'default_session';
      if (!sessions[sId]) {
        sessions[sId] = [];
      }
      sessions[sId].push(c);
    });

    // Populate left sidebar session items
    Object.keys(sessions).forEach(sId => {
      const item = document.createElement('div');
      item.classList.add('session-item');
      
      const lastChat = sessions[sId][sessions[sId].length - 1];
      const timeStr = new Date(lastChat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(lastChat.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      item.innerHTML = `
        <div class="session-name">${sId === 'default_session' ? 'Default Portal Chat' : sId}</div>
        <div class="session-meta">${sessions[sId].length} messages • ${dateStr} at ${timeStr}</div>
      `;
      
      item.addEventListener('click', () => {
        // Toggle active visual selection
        document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Render messages
        renderSessionMessages(sId, sessions[sId]);
      });

      sessionList.appendChild(item);
    });

    function renderSessionMessages(sId, msgs) {
      activeHeader.textContent = `Session: ${sId === 'default_session' ? 'Default Portal Chat' : sId}`;
      messagesBody.innerHTML = '';

      msgs.forEach(m => {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', m.role === 'bot' ? 'bot' : 'user');
        
        const timestamp = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Output markdown text simply (marked.js is included on head/foot CDNs if needed, or render as safe text lines)
        let processedText = m.text || m.message || '';
        try {
          if (window.marked && typeof window.marked.parse === 'function') {
            processedText = window.marked.parse(processedText);
          }
        } catch(e) {}
        
        bubble.innerHTML = `
          <div class="bubble-text">${processedText}</div>
          <div class="bubble-meta">${m.role === 'bot' ? 'ConCode AI' : 'Client'} • ${timestamp}</div>
        `;
        messagesBody.appendChild(bubble);
      });

      // Scroll to bottom
      messagesBody.scrollTop = messagesBody.scrollHeight;
    }
    }

  // Render DevOps Deployments Rollouts
  function renderDeployments(deployments) {
    const historyList = document.getElementById('deploy-history-list');
    const logsBody = document.getElementById('deploy-logs-body');
    const activeHeader = document.getElementById('active-deploy-title');
    const activeStatus = document.getElementById('active-deploy-status');

    historyList.innerHTML = '';
    logsBody.textContent = 'Select a rollout session to inspect build output logs...';
    activeHeader.textContent = 'Select a deployment rollout';
    activeStatus.textContent = '';
    activeStatus.className = 'badge';

    if (!deployments || deployments.length === 0) {
      historyList.innerHTML = `<div class="no-data-alert" style="padding:1.5rem; font-size:0.85rem;">No deployments registered.</div>`;
      logsBody.textContent = 'No build configurations logged yet.';
      return;
    }

    // Sort deployments by date (newest first)
    const sorted = [...deployments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sorted.forEach(dep => {
      const item = document.createElement('div');
      item.classList.add('session-item');
      
      const timeStr = new Date(dep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(dep.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      item.innerHTML = `
        <div class="session-name">ID: ${dep.projectId}</div>
        <div class="session-meta">${dep.cloudTarget.toUpperCase()} • ${dateStr} at ${timeStr}</div>
      `;

      item.addEventListener('click', () => {
        document.querySelectorAll('#deploy-history-list .session-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        fetchDeploymentLogs(dep);
      });

      historyList.appendChild(item);
    });

    async function fetchDeploymentLogs(dep) {
      activeHeader.textContent = `Rollout ID: ${dep.projectId} (${dep.cloudTarget.toUpperCase()})`;
      activeStatus.textContent = dep.status || 'queued';
      
      // Setup status badges styling
      activeStatus.className = 'badge';
      if (dep.status === 'success') {
        activeStatus.classList.add('badge-active');
        activeStatus.style.background = 'rgba(16, 185, 129, 0.15)';
        activeStatus.style.color = '#10B981';
      } else if (dep.status === 'failed') {
        activeStatus.classList.add('badge-failed');
        activeStatus.style.background = 'rgba(239, 68, 68, 0.15)';
        activeStatus.style.color = '#ef4444';
      } else {
        activeStatus.style.background = 'rgba(255, 119, 0, 0.15)';
        activeStatus.style.color = '#ff7700';
      }

      logsBody.textContent = 'Fetching pipeline logs...';
      try {
        const res = await fetch(`/api/devops/logs/${dep.projectId}`, {
          headers: { 'x-admin-token': activeToken }
        });
        const data = await res.json();
        if (data.success) {
          const logLines = data.data.logs || [];
          logsBody.textContent = logLines.join('\n') || 'Pipeline initialization complete.\nWaiting for cloud providers...';
          logsBody.scrollTop = logsBody.scrollHeight;
        } else {
          logsBody.textContent = 'Error loading build logs: ' + data.error.message;
        }
      } catch (err) {
        logsBody.textContent = 'Error establishing telemetry logs link.';
      }
    }
  }

  // Bind DevOps Action buttons
  const btnDeploy = document.getElementById('btn-deploy-now');
  if (btnDeploy) {
    btnDeploy.addEventListener('click', async () => {
      const projInput = document.getElementById('deploy-project-id');
      const cloudInput = document.getElementById('deploy-cloud-target');
      
      const projectId = projInput.value.trim();
      const cloudTarget = cloudInput.value;

      if (!projectId) {
        alert('Please enter a target Project ID to trigger a rollout.');
        return;
      }

      btnDeploy.textContent = 'Queuing...';
      btnDeploy.disabled = true;

      try {
        const res = await fetch('/api/devops/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': activeToken
          },
          body: JSON.stringify({ projectId, cloudTarget })
        });
        const data = await res.json();
        if (data.success) {
          projInput.value = '';
          validateAndLoad(activeToken); // Refresh view
        } else {
          alert('Rollout error: ' + data.error.message);
        }
      } catch (err) {
        alert('DevOps trigger connection timeout.');
      } finally {
        btnDeploy.textContent = 'Deploy Now';
        btnDeploy.disabled = false;
      }
    });
  }

  // ═══════════════════════════════════════
  // DIAGNOSTICS & TELEMETRY
  // ═══════════════════════════════════════
  function startTelemetryPolling() {
    if (telemetryInterval) clearInterval(telemetryInterval);

    // Initial load
    fetchTelemetry();

    // Poll every 4 seconds
    telemetryInterval = setInterval(fetchTelemetry, 4000);
  }

  async function fetchTelemetry() {
    try {
      const res = await fetch('/api/gateway/telemetry');
      const data = await res.json();

      if (data.success) {
        const tel = data.data;

        // Render nodes and metrics
        telemetryEdgeNodes.textContent = `${tel.edgeNodes} active`;
        telemetryRequestRate.textContent = tel.requestRate;
        telemetryAvgLatency.textContent = tel.avgLatency;
        telemetryErrorRate.textContent = tel.errorRate;
        
        // RAM gauge status
        const ramPctStr = tel.memoryUsage || '0%';
        const ramInt = parseInt(ramPctStr);
        telemetryMemoryText.textContent = ramPctStr;
        telemetryMemoryBar.style.width = ramPctStr;
        
        if (ramInt > 75) {
          telemetryMemoryBar.classList.add('warn');
        } else {
          telemetryMemoryBar.classList.remove('warn');
        }

        // Generate live ping telemetry bar ticks
        generateNetworkTicks();
      }
    } catch (e) {
      // Telemetry fetch failed, suppress logs to prevent console floods
    }
  }

  function generateNetworkTicks() {
    if (!telemetryTicks) return;
    
    // Slide left (remove oldest tick, add new tick)
    if (telemetryTicks.children.length >= 35) {
      telemetryTicks.removeChild(telemetryTicks.firstChild);
    }

    const tick = document.createElement('div');
    tick.classList.add('tick');
    
    // Simulate latency spikes randomly
    const latencyFactor = Math.random();
    let heightPct = 15;
    if (latencyFactor > 0.95) {
      heightPct = 90; // severe latency spike
      tick.classList.add('active-high');
      tick.style.background = 'var(--red)';
    } else if (latencyFactor > 0.8) {
      heightPct = 50; // minor latency spike
      tick.classList.add('active-high');
      tick.style.background = 'var(--orange)';
    } else {
      heightPct = Math.floor(Math.random() * 20) + 15; // healthy ping
      if (Math.random() > 0.4) {
        tick.classList.add('active-high');
      }
    }

    tick.style.height = `${heightPct}%`;
    telemetryTicks.appendChild(tick);
  }
});
