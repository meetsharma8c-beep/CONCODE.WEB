/**
 * CONCODE AI — Obsidian Deep Pattern Retrieval Engine v23.0
 * File: utils/obsidianPatternEngine.js
 * 
 * FEATURES:
 *  1. Deep Obsidian Vault Note & Code Snippet Extraction
 *  2. Prompt Enhancement with Contextual Obsidian WikiLinks
 *  3. Auto-Saving Generated Engineering Solutions to Obsidian Vault
 *  4. Advanced Multi-Domain Knowledge Mesh Expansion
 */

const fs = require('fs');
const path = require('path');

class ObsidianPatternEngine {
  constructor(vaultPath = process.env.OBSIDIAN_VAULT_PATH) {
    const homedir = require('os').homedir();
    const candidatePath = vaultPath || 
      (fs.existsSync('/Users/ms/Documents/Obsidian Vault') ? '/Users/ms/Documents/Obsidian Vault' : 
      (fs.existsSync(path.join(homedir, 'Documents', 'Obsidian Vault')) ? path.join(homedir, 'Documents', 'Obsidian Vault') : path.join(__dirname, '../data/obsidian_vault')));
    this.vaultPath = candidatePath;
    this.solutionsDir = path.join(this.vaultPath, 'Generated_Solutions');
    this.patternsDir = path.join(this.vaultPath, 'Architectural_Patterns');
    this.recentSaves = new Map();

    this.ensureDirectory(this.solutionsDir);
    this.ensureDirectory(this.patternsDir);
    this.seedArchitecturalPatterns();
  }

  ensureDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (e) {
      console.warn('[ObsidianPatternEngine] Directory creation warning:', e.message);
    }
  }

  /**
   * Seeds master architectural pattern notes in Obsidian Vault
   */
  seedArchitecturalPatterns() {
    const patterns = [
      {
        filename: 'Non_Blocking_Async_IO_Pattern.md',
        title: 'Non-Blocking Asynchronous I/O Pattern',
        wikilink: '[[Non_Blocking_Async_IO_Pattern]]',
        domain: '[[01_Systems_Software_Engineering]]',
        content: `# Non-Blocking Asynchronous I/O Pattern
tags: #pattern/async #node #concurrency #performance

## Core Strategy
Enforce non-blocking asynchronous event-loop execution. Never block the main loop with synchronous file reads or blocking thread latches.

## Implementation Standard
\`\`\`javascript
async function executeNonBlockingAsync(dataStream) {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        const processed = dataStream.map(item => item * 2);
        resolve(processed);
      } catch (err) {
        reject(err);
      }
    });
  });
}
\`\`\`
`
      },
      {
        filename: 'Defensive_Input_Boundary_Check.md',
        title: 'Defensive Input Boundary Check Pattern',
        wikilink: '[[Defensive_Input_Boundary_Check]]',
        domain: '[[07_Cybersecurity_Cryptography]]',
        content: `# Defensive Input Boundary Check Pattern
tags: #pattern/security #owasp #validation

## Core Strategy
Validate all user inputs at system boundary. Reject malformed inputs, enforce strict length caps, and sanitize special characters.

## Implementation Standard
\`\`\`javascript
function sanitizeBoundaryInput(inputStr, maxLength = 5000) {
  if (typeof inputStr !== 'string') return '';
  const trimmed = inputStr.trim().slice(0, maxLength);
  return trimmed.replace(/[<>]/g, '');
}
\`\`\`
`
      },
      {
        filename: 'Single_Responsibility_Component_Pattern.md',
        title: 'Single Responsibility Component Pattern',
        wikilink: '[[Single_Responsibility_Component_Pattern]]',
        domain: '[[01_Systems_Software_Engineering]]',
        content: `# Single Responsibility Component Pattern
tags: #pattern/architecture #modular #clean-code

## Core Strategy
Decompose monolithic systems into highly specialized, single-responsibility modules with explicit contracts.
`
      }
    ];

    for (const pat of patterns) {
      try {
        const filePath = path.join(this.patternsDir, pat.filename);
        if (!fs.existsSync(filePath)) {
          this.ensureDirectory(this.patternsDir);
          fs.writeFileSync(filePath, pat.content, 'utf8');
        }
      } catch (err) {
        console.warn('[ObsidianPatternEngine] Failed to seed pattern:', err.message);
      }
    }
  }

  /**
   * Scans Obsidian Vault for notes matching the user's prompt keywords
   */
  retrieveVaultKnowledge(prompt = '') {
    if (!prompt || typeof prompt !== 'string') return [];

    const matchedNotes = [];
    const query = prompt.toLowerCase();

    try {
      if (fs.existsSync(this.vaultPath)) {
        const files = this.scanDirRecursive(this.vaultPath);
        for (const filePath of files) {
          if (filePath.endsWith('.md')) {
            const baseName = path.basename(filePath, '.md');
            const fileContent = fs.readFileSync(filePath, 'utf8');

            const titleMatch = baseName.toLowerCase().split(/[\_\-\s]+/).some(k => k.length > 3 && query.includes(k));
            const tagMatch = (fileContent.match(/#\w+/g) || []).some(t => query.includes(t.slice(1).toLowerCase()));

            if (titleMatch || tagMatch) {
              matchedNotes.push({
                title: baseName.replace(/_/g, ' '),
                wikilink: `[[${baseName}]]`,
                snippet: fileContent.slice(0, 300).replace(/\n/g, ' '),
                path: filePath
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[ObsidianPatternEngine] Knowledge retrieval warning:', err.message);
    }

    return matchedNotes.slice(0, 4);
  }

  /**
   * Automatically saves newly generated solutions to Obsidian Vault
   */
  saveSolutionToObsidian(prompt, solutionText, domain = 'GENERAL') {
    if (!prompt || !solutionText) return null;

    const saveKey = `${prompt.trim().toLowerCase()}::${solutionText.slice(0, 100)}`;
    const now = Date.now();
    if (this.recentSaves.has(saveKey) && (now - this.recentSaves.get(saveKey).time < 10000)) {
      return this.recentSaves.get(saveKey).wikilink;
    }

    try {
      const sanitizedTitle = prompt
        .slice(0, 40)
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      const fileName = `Solution_${sanitizedTitle}_${Date.now().toString().slice(-4)}.md`;
      const filePath = path.join(this.solutionsDir, fileName);

      const noteContent = `# Solution: ${prompt}
tags: #concode/solution #${domain.toLowerCase().replace(/[^a-z0-9]/g, '')} #meet-sharma

**Created By**: CONCODE AI (Built by Meet Sharma)  
**Date**: ${new Date().toISOString()}  
**Domain**: ${domain}

## Knowledge Graph Connections
* [[00_CONCODE_WEB_MASTER_INDEX]]
* [[01_Systems_Software_Engineering]]
* [[UNIVERSAL_OMNI_DOMAIN_COGNITIVE_GRAPH]]

## Generated Technical Solution
${solutionText}

---
*Auto-Saved to Obsidian Vault Knowledge Graph by CONCODE AI v23.0*
`;

      fs.writeFileSync(filePath, noteContent, 'utf8');
      console.log(`[ObsidianPatternEngine] Saved solution note to Obsidian: ${fileName}`);
      
      const wikilink = `[[Solution_${sanitizedTitle}]]`;
      this.recentSaves.set(saveKey, { time: now, wikilink });
      if (this.recentSaves.size > 50) {
        for (const [k, v] of this.recentSaves.entries()) {
          if (now - v.time > 30000) this.recentSaves.delete(k);
        }
      }
      return wikilink;
    } catch (err) {
      console.warn('[ObsidianPatternEngine] Failed to save solution note:', err.message);
      return null;
    }
  }

  scanDirRecursive(dir) {
    let results = [];
    try {
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        try {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
              results = results.concat(this.scanDirRecursive(fullPath));
            }
          } else {
            results.push(fullPath);
          }
        } catch (err) {}
      });
    } catch (err) {
      console.warn(`[ObsidianPatternEngine] Scan warning for ${dir}:`, err.message);
    }
    return results;
  }
}

module.exports = new ObsidianPatternEngine();
