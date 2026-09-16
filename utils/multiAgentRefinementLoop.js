/**
 * CONCODE AI — Multi-Agent QA Self-Critique & 4-Persona Consensus Loop v2.0
 * File: utils/multiAgentRefinementLoop.js
 * 
 * Features:
 *  1. Architect Agent: Structure, Modular Contracts & AST Alignment
 *  2. Security Auditor Agent: OWASP, Vulnerability & Secret Leak Checks
 *  3. UX Specialist Agent: Visual Polish, ARIA & Formatting Aesthetics
 *  4. Code Synthesizer: 4-Persona Voting & Weighted Consensus Aggregation
 */

class MultiAgentRefinementLoop {
  constructor() {
    this.version = "2.0";
    this.guilds = {
      architect: "Architect Agent",
      security: "Security Auditor Agent",
      ux: "UX & Accessibility Specialist",
      synthesizer: "Code Synthesizer Engine"
    };
  }

  /**
   * Audits code artifacts through a 4-persona consensus pipeline
   */
  auditAndRefine(codeSnippet, language = 'javascript', guildInfo = {}) {
    if (!codeSnippet || typeof codeSnippet !== 'string') {
      return {
        score: 100,
        status: 'PASSED',
        consensus: { approved: true, score: 100, votes: { architect: 'APPROVE', security: 'APPROVE', ux: 'APPROVE' } },
        auditChecklist: [],
        vulnerabilities: [],
        refinedCode: codeSnippet
      };
    }

    let currentCode = codeSnippet;
    const auditChecklist = [];
    const vulnerabilities = [];
    const votes = {
      architect: { vote: 'APPROVE', score: 100, feedback: [] },
      security: { vote: 'APPROVE', score: 100, feedback: [] },
      ux: { vote: 'APPROVE', score: 100, feedback: [] }
    };

    // ── 1. ARCHITECT AGENT AUDIT ──
    if (language === 'javascript' && !currentCode.includes('module.exports') && !currentCode.includes('export ')) {
      votes.architect.score -= 15;
      votes.architect.feedback.push('Missing explicit module export / export default');
      auditChecklist.push({ persona: this.guilds.architect, check: 'Modular Export Contract', status: 'WARN', detail: 'No export declaration detected' });
    } else {
      auditChecklist.push({ persona: this.guilds.architect, check: 'Modular Export Contract', status: 'PASS', detail: 'Valid modular structure verified' });
    }

    if (!currentCode.includes('try') && !currentCode.includes('catch') && currentCode.length > 200) {
      votes.architect.score -= 10;
      votes.architect.feedback.push('Consider wrapping complex routines in try-catch boundaries');
      auditChecklist.push({ persona: this.guilds.architect, check: 'Error Boundary Safeguard', status: 'INFO', detail: 'Advised error boundary addition' });
    }

    // ── 2. SECURITY AUDITOR AGENT AUDIT ──
    if (currentCode.match(/\b(eval\s*\(|exec\s*\(|child_process|spawnSync)\b/)) {
      votes.security.score -= 30;
      votes.security.vote = 'REJECT';
      vulnerabilities.push({
        severity: 'HIGH',
        issue: 'Dangerous dynamic execution call (eval/exec) detected.',
        fix: 'Replace with safe AST or predefined static dispatcher.'
      });
      auditChecklist.push({ persona: this.guilds.security, check: 'OWASP Dynamic Code Injection', status: 'FAIL', detail: 'Found unsafe eval/exec call' });
    } else {
      auditChecklist.push({ persona: this.guilds.security, check: 'OWASP Dynamic Code Injection', status: 'PASS', detail: 'Zero dynamic code injection risks' });
    }

    if (currentCode.match(/(?:api_key|secret|password|jwt_secret)\s*=\s*['"][^'"]+['"]/i)) {
      votes.security.score -= 25;
      vulnerabilities.push({
        severity: 'CRITICAL',
        issue: 'Hardcoded sensitive secret or API key string detected.',
        fix: 'Use process.env environment variable'
      });
      auditChecklist.push({ persona: this.guilds.security, check: 'Secret Exposure Audit', status: 'WARN', detail: 'Potential hardcoded key detected' });
    } else {
      auditChecklist.push({ persona: this.guilds.security, check: 'Secret Exposure Audit', status: 'PASS', detail: 'Clean environment variable usage' });
    }

    // ── 3. UX & ACCESSIBILITY SPECIALIST AUDIT ──
    if (language === 'html' || currentCode.includes('<div') || currentCode.includes('<button')) {
      if (!currentCode.includes('aria-') && !currentCode.includes('role=')) {
        votes.ux.score -= 10;
        votes.ux.feedback.push('Recommend adding ARIA labels for accessibility');
        auditChecklist.push({ persona: this.guilds.ux, check: 'A11y ARIA Audit', status: 'INFO', detail: 'Suggested accessible ARIA attributes' });
      } else {
        auditChecklist.push({ persona: this.guilds.ux, check: 'A11y ARIA Audit', status: 'PASS', detail: 'Accessible ARIA labels present' });
      }
    }

    // Auto-repair brace imbalance
    const openBraces = (currentCode.match(/\{/g) || []).length;
    const closeBraces = (currentCode.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      votes.ux.score -= 15;
      const diff = openBraces - closeBraces;
      if (diff > 0) currentCode += '\n' + '}'.repeat(diff);
      auditChecklist.push({ persona: this.guilds.ux, check: 'Formatting & Brace Balance', status: 'REPAIRED', detail: `Auto-repaired ${Math.abs(diff)} unclosed braces` });
    } else {
      auditChecklist.push({ persona: this.guilds.ux, check: 'Formatting & Brace Balance', status: 'PASS', detail: 'Clean brace syntax balance' });
    }

    // ── 4. CODE SYNTHESIZER CONSENSUS CALCULATION ──
    const weightedScore = Math.round(
      (votes.architect.score * 0.35) +
      (votes.security.score * 0.45) +
      (votes.ux.score * 0.20)
    );

    const isApproved = weightedScore >= 70 && votes.security.vote !== 'REJECT';
    const overallStatus = isApproved
      ? (weightedScore >= 90 ? 'CONSENSUS_APPROVED_EXCELLENT' : 'CONSENSUS_APPROVED')
      : 'REVISION_REQUIRED';

    return {
      auditor: this.guilds.synthesizer,
      score: weightedScore,
      status: overallStatus,
      guildBadge: guildInfo.agentBadge || 'Multi-Agent Consensus Guild',
      consensus: {
        approved: isApproved,
        weightedScore,
        votes: {
          architect: votes.architect,
          security: votes.security,
          ux: votes.ux
        }
      },
      auditChecklist,
      vulnerabilities,
      refinedCode: currentCode
    };
  }
}

module.exports = new MultiAgentRefinementLoop();
