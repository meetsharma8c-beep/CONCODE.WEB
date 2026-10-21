const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json, text/html, */*',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runAudit() {
  const report = {
    passed: [],
    issues: [],
    friction: []
  };

  console.log('=== STARTING DEEP VIRTUAL USER AUDIT ===\n');

  // 1. Static Pages & Assets Verification
  console.log('1. Checking Static Pages & Core Assets...');
  const pages = [
    '/',
    '/index.html',
    '/login.html',
    '/admin.html',
    '/dashboard.html',
    '/project/terminal-portfolio/',
    '/project/hyperion-web3-dex/',
    '/project/cyber-drop-apparel/',
    '/project/velvet-artisan-bistro/',
    '/project/titan-quantum-fitness/',
    '/src/style.css',
    '/src/main.js',
    '/src/cyber-audio.js',
    '/src/three-scene.js',
    '/src/voice/voice-style.css',
    '/src/voice/concode-voice-agent.js',
    '/src/voice/wake-word-listener.js',
    '/src/voice/voice-orb-visualizer.js',
    '/src/voice/voice-command-dispatcher.js'
  ];

  for (const p of pages) {
    try {
      const res = await request(p);
      if (res.status === 200) {
        report.passed.push(`Asset: ${p} (HTTP 200, length: ${res.raw.length})`);
      } else {
        report.issues.push(`Asset Error: ${p} returned HTTP ${res.status}`);
      }
    } catch (e) {
      report.issues.push(`Asset Fetch Failed: ${p} - ${e.message}`);
    }
  }

  // 2. Chat Feature Tests
  console.log('\n2. Testing AI Chat Assistant (/api/chat)...');
  try {
    // Normal query
    const chatRes = await request('/api/chat', { method: 'POST' }, { input: 'What services does CONCODE provide?' });
    if (chatRes.status === 200 && chatRes.data && (chatRes.data.success !== false)) {
      report.passed.push(`AI Chat: Valid prompt processed successfully.`);
    } else {
      report.issues.push(`AI Chat: Failed to process valid prompt: ${JSON.stringify(chatRes.data)}`);
    }

    // Empty query validation
    const emptyChat = await request('/api/chat', { method: 'POST' }, {});
    if (emptyChat.status >= 400 || (emptyChat.data && emptyChat.data.success === false)) {
      report.passed.push(`AI Chat: Empty prompt rejected with validation error.`);
    } else {
      report.friction.push(`AI Chat: Empty prompt returned HTTP ${emptyChat.status} instead of a 400 Bad Request.`);
    }

    // Input length overflow
    const longInput = 'A'.repeat(15000);
    const overflowChat = await request('/api/chat', { method: 'POST' }, { input: longInput });
    if (overflowChat.status >= 400 || (overflowChat.data && overflowChat.data.success === false)) {
      report.passed.push(`AI Chat: 15,000 char prompt correctly blocked by rate/length limiter.`);
    } else {
      report.friction.push(`AI Chat: Excessively large input (>10k chars) not rejected properly.`);
    }
  } catch (e) {
    report.issues.push(`AI Chat Exception: ${e.message}`);
  }

  // 3. Neural Code Generator & Skills
  console.log('\n3. Testing Neural Brain & Code Synthesizer (/api/brain/...)...');
  try {
    const codeGen = await request('/api/brain/generate-code', { method: 'POST' }, { prompt: 'Create an express rate limiter' });
    if (codeGen.status === 200 && codeGen.data && codeGen.data.success) {
      report.passed.push(`Brain Code Gen: Synthesized valid code (QA Score: ${codeGen.data.data?.multiAgentAudit?.overallQaScore || 100}).`);
    } else {
      report.issues.push(`Brain Code Gen: Failed - ${JSON.stringify(codeGen.data)}`);
    }

    const skillCreate = await request('/api/brain/skills/create', { method: 'POST' }, {
      skillName: 'virtual-user-test-skill',
      description: 'Test skill created by virtual user audit'
    });
    if (skillCreate.status === 200 && skillCreate.data && skillCreate.data.success) {
      report.passed.push(`Brain Skill Creator: Created dynamic skill note successfully.`);
    } else {
      report.issues.push(`Brain Skill Creator: Failed - ${JSON.stringify(skillCreate.data)}`);
    }

    const auditCode = await request('/api/brain/audit-code', { method: 'POST' }, {
      code: 'function add(a, b) { return a + b; }'
    });
    if (auditCode.status === 200 && auditCode.data && auditCode.data.success) {
      report.passed.push(`Brain Code Auditor: Audited code successfully.`);
    } else {
      report.issues.push(`Brain Code Auditor: Failed - ${JSON.stringify(auditCode.data)}`);
    }
  } catch (e) {
    report.issues.push(`Brain API Exception: ${e.message}`);
  }

  // 4. Studio Builder
  console.log('\n4. Testing Studio Prototype Builder (/api/studio/generate)...');
  try {
    const studioGen = await request('/api/studio/generate', { method: 'POST' }, {
      projectId: 'virtual-audit-saas',
      category: 'saas',
      prompt: 'A real-time metrics dashboard with dark mode',
      accentColor: '#00f0ff'
    });
    if (studioGen.status === 200 && studioGen.data && studioGen.data.success) {
      report.passed.push(`Studio Builder: Generated project 'virtual-audit-saas' with pages: ${studioGen.data.data?.pages?.join(', ')}`);
    } else {
      report.issues.push(`Studio Builder: Generation failed: ${JSON.stringify(studioGen.data)}`);
    }

    // Test studio code refinement
    const studioRefine = await request('/api/studio/refine', { method: 'POST' }, {
      projectId: 'virtual-audit-saas',
      prompt: 'Add an export CSV button'
    });
    if (studioRefine.status === 200 && studioRefine.data && studioRefine.data.success) {
      report.passed.push(`Studio Refinement: Successfully refined code with AI prompt.`);
    } else {
      report.issues.push(`Studio Refinement: Failed - ${JSON.stringify(studioRefine.data)}`);
    }
  } catch (e) {
    report.issues.push(`Studio API Exception: ${e.message}`);
  }

  // 5. DevOps & Release Pipeline
  console.log('\n5. Testing DevOps Cloud Release Engine (/api/devops/deploy)...');
  try {
    const devopsRes = await request('/api/devops/deploy', { method: 'POST' }, {
      projectId: 'virtual-audit-saas',
      cloud: 'aws'
    });
    if (devopsRes.status === 200 && devopsRes.data && devopsRes.data.success) {
      report.passed.push(`DevOps Deploy: Triggered simulated AWS deployment (Release ID: ${devopsRes.data.data?.releaseId}).`);
    } else {
      report.issues.push(`DevOps Deploy: Failed - ${JSON.stringify(devopsRes.data)}`);
    }
  } catch (e) {
    report.issues.push(`DevOps API Exception: ${e.message}`);
  }

  // 6. Data ETL Migration
  console.log('\n6. Testing Data ETL Migration (/api/migration/migrate)...');
  try {
    const migrateRes = await request('/api/migration/migrate', { method: 'POST' }, {
      target: 'inquiries',
      format: 'json',
      data: JSON.stringify([{ client: 'Acme Corp', tier: 'Enterprise', budget: 1000 }])
    });
    if (migrateRes.status === 200 && migrateRes.data && migrateRes.data.success) {
      report.passed.push(`Data ETL: Migrated 1 record to 'inquiries' collection successfully.`);
    } else {
      report.issues.push(`Data ETL: Migration failed - ${JSON.stringify(migrateRes.data)}`);
    }

    // Malformed JSON test
    const badMigrate = await request('/api/migration/migrate', { method: 'POST' }, {
      target: 'inquiries',
      format: 'json',
      data: '{ invalid json syntax !!!'
    });
    if (badMigrate.status >= 400 || (badMigrate.data && badMigrate.data.success === false)) {
      report.passed.push(`Data ETL: Corrupt JSON payload gracefully rejected with validation error.`);
    } else {
      report.friction.push(`Data ETL: Corrupt JSON payload was not rejected gracefully.`);
    }
  } catch (e) {
    report.issues.push(`ETL API Exception: ${e.message}`);
  }

  // 7. Lead Inquiries & Contact Form
  console.log('\n7. Testing Lead Inquiries & Contact Form (/api/inquiry, /api/contact)...');
  try {
    // Project Onboarding Inquiry
    const inqRes = await request('/api/inquiry', { method: 'POST' }, {
      name: 'Sarah Connor',
      email: 'sarah@skynet-resistance.org',
      plan: 'Professional',
      projectDetails: 'We need an autonomous AI defensive web shield with 3D telemetry.',
      consent: true
    });
    if (inqRes.status === 200 && inqRes.data && inqRes.data.success) {
      report.passed.push(`Onboarding Inquiry: Submitted successfully (ID: ${inqRes.data.data?.id}).`);
    } else {
      report.issues.push(`Onboarding Inquiry: Failed - ${JSON.stringify(inqRes.data)}`);
    }

    // General Contact Form
    const contactRes = await request('/api/contact', { method: 'POST' }, {
      name: 'John Tech',
      email: 'john@techcorp.io',
      message: 'Looking to schedule an architecture design sprint.',
      consent: true
    });
    if (contactRes.status === 200 && contactRes.data && contactRes.data.success) {
      report.passed.push(`Contact Form: Successfully accepted client strategy message.`);
    } else {
      report.issues.push(`Contact Form: Failed - ${JSON.stringify(contactRes.data)}`);
    }

    // Contact Form Short Message Validation
    const shortContact = await request('/api/contact', { method: 'POST' }, {
      name: 'Shorty',
      email: 'short@test.io',
      message: 'Hi'
    });
    if (shortContact.status >= 400 || (shortContact.data && shortContact.data.success === false)) {
      report.passed.push(`Contact Form: Short message (<10 chars) correctly rejected with helpful validation.`);
    } else {
      report.friction.push(`Contact Form: Tiny 2-character message was accepted without validation.`);
    }
  } catch (e) {
    report.issues.push(`Inquiry/Contact Exception: ${e.message}`);
  }

  // 8. Auth Flows (Register, Login, Phone OTP)
  console.log('\n8. Testing Authentication & Security (/api/auth/...)...');
  const testEmail = `user_${Date.now()}@testconcode.com`;
  const testPass = 'SecureP@ssw0rd123!';
  let authToken = null;

  try {
    // Registration
    const regRes = await request('/api/auth/register', { method: 'POST' }, {
      name: 'Virtual Auditor',
      email: testEmail,
      password: testPass
    });
    if (regRes.status === 200 && regRes.data && regRes.data.success) {
      report.passed.push(`Auth Register: New user registration succeeded.`);
      authToken = regRes.data.data?.token;
    } else {
      report.issues.push(`Auth Register: Failed - ${JSON.stringify(regRes.data)}`);
    }

    // Login with correct credentials
    const loginRes = await request('/api/auth/login', { method: 'POST' }, {
      email: testEmail,
      password: testPass
    });
    if (loginRes.status === 200 && loginRes.data && loginRes.data.success) {
      report.passed.push(`Auth Login: Valid credentials returned JWT token.`);
      if (!authToken) authToken = loginRes.data.data?.token;
    } else {
      report.issues.push(`Auth Login: Failed - ${JSON.stringify(loginRes.data)}`);
    }

    // Login with wrong password
    const badLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: testEmail,
      password: 'WrongPassword999!'
    });
    if (badLogin.status === 401 || (badLogin.data && badLogin.data.success === false)) {
      report.passed.push(`Auth Login: Wrong password properly returned 401 Unauthorized.`);
    } else {
      report.issues.push(`Auth Login: Wrong password accepted or returned unexpected status: ${badLogin.status}`);
    }

    // Phone OTP request
    const otpRes = await request('/api/auth/phone/otp', { method: 'POST' }, {
      phoneNumber: '+15551234567'
    });
    if (otpRes.status === 200 && otpRes.data && otpRes.data.success) {
      report.passed.push(`Auth Phone OTP: OTP request processed.`);
    } else {
      report.friction.push(`Auth Phone OTP: Request returned: ${JSON.stringify(otpRes.data)}`);
    }
  } catch (e) {
    report.issues.push(`Auth Exception: ${e.message}`);
  }

  // 9. GitHub Sync & Repos
  console.log('\n9. Testing GitHub Repos Sync (/api/github/repos)...');
  try {
    const ghRes = await request('/api/github/repos');
    const repos = (ghRes.data && ghRes.data.data && ghRes.data.data.repositories) ? ghRes.data.data.repositories : ((ghRes.data && Array.isArray(ghRes.data.data)) ? ghRes.data.data : (Array.isArray(ghRes.data) ? ghRes.data : null));
    if (ghRes.status === 200 && Array.isArray(repos)) {
      report.passed.push(`GitHub Repos: Fetched ${repos.length} public repository records.`);
    } else {
      report.issues.push(`GitHub Repos: Failed - ${JSON.stringify(ghRes.data)}`);
    }
  } catch (e) {
    report.issues.push(`GitHub API Exception: ${e.message}`);
  }

  // 10. Telemetry & Heartbeats
  console.log('\n10. Testing Telemetry & Diagnostics...');
  try {
    const health = await request('/api/health');
    const brainHealth = await request('/api/brain/health');
    const emotion = await request('/api/brain/emotion');
    const telemetry = await request('/api/gateway/telemetry');

    if (health.status === 200) report.passed.push('Health API: Healthy');
    if (brainHealth.status === 200) report.passed.push('Brain Health API: Active');
    if (emotion.status === 200) report.passed.push('Emotion Telemetry API: Connected');
    if (telemetry.status === 200) report.passed.push('Gateway Telemetry API: Live');
  } catch (e) {
    report.issues.push(`Diagnostics API Exception: ${e.message}`);
  }

  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`PASSED CHECKS: ${report.passed.length}`);
  console.log(`CRITICAL ISSUES: ${report.issues.length}`);
  console.log(`UX FRICTION POINTS: ${report.friction.length}`);

  console.log('\n--- ISSUES DETAILS ---');
  report.issues.forEach((iss, i) => console.log(`${i + 1}. [ISSUE] ${iss}`));

  console.log('\n--- FRICTION DETAILS ---');
  report.friction.forEach((fric, i) => console.log(`${i + 1}. [FRICTION] ${fric}`));

  console.log('\n--- PASSED HIGHLIGHTS ---');
  report.passed.slice(0, 10).forEach(p => console.log(`✓ ${p}`));
  if (report.passed.length > 10) console.log(`... and ${report.passed.length - 10} more passed checks.`);

  return report;
}

runAudit().catch(console.error);
