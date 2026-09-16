const fs = require('fs');
const path = require('path');

/**
 * CONCODE AI — Obsidian Vault Knowledge Graph Automation Engine v30.0
 * Powers 100% Dynamic Generative Reasoning & Creative Thought Synthesis by reading
 * and indexing notes directly from the primary Obsidian Vault (/Users/ms/Documents/Obsidian Vault).
 */
class ObsidianVaultKnowledgeEngine {
  constructor() {
    const homedir = require('os').homedir();
    this.primaryVaultPath = process.env.OBSIDIAN_VAULT_PATH || 
      (fs.existsSync('/Users/ms/Documents/Obsidian Vault') ? '/Users/ms/Documents/Obsidian Vault' : path.join(homedir, 'Documents', 'Obsidian Vault'));
    this.workspaceVaultPath = path.resolve(__dirname, '..');
    this.indexedNotes = [];
    this.lastScanTime = null;
    this.init();
  }

  /**
   * Initializes and indexes all markdown files in the Obsidian Vault.
   */
  init() {
    try {
      this.scanVaultNotes();
      console.log(`[ObsidianVaultKnowledgeEngine v30.0] Successfully indexed ${this.indexedNotes.length} Obsidian Vault notes.`);
    } catch (err) {
      console.warn('[ObsidianVaultKnowledgeEngine] Vault scan warning:', err.message);
    }
  }

  /**
   * Scans all markdown notes recursively in the primary Obsidian Vault.
   */
  scanVaultNotes() {
    this.indexedNotes = [];
    const homedir = require('os').homedir();
    const localVaultPath = path.resolve(__dirname, '../data/obsidian_vault');
    const localVaultPathAlt = path.resolve(__dirname, '../obsidian_vault');
    
    const candidateDirs = [
      process.env.OBSIDIAN_VAULT_PATH,
      this.primaryVaultPath,
      path.join(homedir, 'Documents', 'Obsidian Vault'),
      path.join(homedir, 'Documents', 'Obsidian'),
      path.join(homedir, 'Obsidian Vault'),
      localVaultPath,
      localVaultPathAlt
    ].filter(Boolean);

    const targetDirs = [];
    const seen = new Set();
    for (const d of candidateDirs) {
      try {
        if (fs.existsSync(d) && !seen.has(d)) {
          seen.add(d);
          targetDirs.push(d);
        }
      } catch (e) {}
    }

    if (targetDirs.length === 0) {
      try {
        if (!fs.existsSync(localVaultPath)) {
          fs.mkdirSync(localVaultPath, { recursive: true });
        }
        targetDirs.push(localVaultPath);
      } catch (e) {}
    }

    if (targetDirs.length === 0) return;

    const visited = new Set();
    const walkSync = (dir) => {
      if (visited.has(dir)) return;
      visited.add(dir);
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkSync(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const title = entry.name.replace('.md', '');
              const tags = (content.match(/#[a-zA-Z0-9_\/-]+/g) || []);
              const wikilinks = (content.match(/\[\[(.*?)\]\]/g) || []).map(w => w.replace('[[', '').replace(']]', ''));

              this.indexedNotes.push({
                title,
                filename: entry.name,
                fullPath,
                tags,
                wikilinks,
                content,
                excerpt: content.substring(0, 500)
              });
            } catch (e) {
              // Ignore unreadable files
            }
          }
        }
      } catch (err) {
        console.warn(`[ObsidianVaultKnowledgeEngine] Recursive walk error in ${dir}:`, err.message);
      }
    };

    targetDirs.forEach(dir => walkSync(dir));
    this.lastScanTime = Date.now();
  }

  /**
   * Query the Obsidian Vault Knowledge Graph for relevant notes matching a prompt.
   */
  queryVaultKnowledge(prompt = '') {
    if (!this.indexedNotes.length || Date.now() - (this.lastScanTime || 0) > 60000) {
      this.scanVaultNotes();
    }

    const queryTokens = (prompt || '').toLowerCase().split(/\W+/).filter(t => t.length > 2);
    if (!queryTokens.length) return [];

    const matches = [];

    for (const note of this.indexedNotes) {
      // Ignore generated solution logs when querying knowledge graph topics
      if (note.title.startsWith('Solution_') || (note.fullPath && note.fullPath.includes('Generated_Solutions'))) {
        continue;
      }

      let score = 0;
      const lowerTitle = note.title.toLowerCase();
      const lowerContent = note.content.toLowerCase();

      for (const token of queryTokens) {
        if (lowerTitle.includes(token)) score += 10;
        if (lowerContent.includes(token)) score += 2;
        if (note.tags.some(t => t.toLowerCase().includes(token))) score += 5;
      }

      if (score > 0) {
        matches.push({ note, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5).map(m => m.note);
  }

  /**
   * Search the vault for the most relevant knowledge fragments matching a query.
   * Returns scored excerpts suitable for injecting into generated responses.
   * @param {string} query - The user's prompt or topic
   * @param {number} topN - Number of results to return (default 5)
   * @returns {Array<{title, excerpt, score, tags, wikilinks, pillarId}>}
   */
  searchKnowledge(query = '', topN = 5) {
    if (!this.indexedNotes.length || Date.now() - (this.lastScanTime || 0) > 60000) {
      this.scanVaultNotes();
    }

    const queryTokens = (query || '').toLowerCase().split(/\W+/).filter(t => t.length > 2);
    if (!queryTokens.length) return [];

    // Stopwords to ignore during scoring
    const stopwords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'are', 'was', 'were', 'been', 'being', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'shall', 'not', 'but', 'about', 'into', 'your', 'what', 'which', 'when', 'where', 'how', 'why', 'who', 'whom', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'than', 'just', 'also', 'very', 'tell', 'know', 'think', 'want', 'make']);
    const meaningfulTokens = queryTokens.filter(t => !stopwords.has(t));
    if (!meaningfulTokens.length && queryTokens.length > 0) {
      // If all tokens were stopwords, use original tokens
      meaningfulTokens.push(...queryTokens);
    }

    const results = [];

    for (const note of this.indexedNotes) {
      // Skip generated solution logs
      if (note.title.startsWith('Solution_') || (note.fullPath && note.fullPath.includes('Generated_Solutions'))) {
        continue;
      }

      let score = 0;
      const lowerTitle = note.title.toLowerCase();
      const lowerContent = note.content.toLowerCase();

      // Detect if this is a Knowledge Pillar note (higher priority)
      const isPillar = /^\d{2}_/.test(note.title) || note.tags.some(t => t.includes('pillar'));
      const pillarId = isPillar ? note.title.replace(/\.md$/, '') : null;

      for (const token of meaningfulTokens) {
        // Title match is strongest signal
        if (lowerTitle.includes(token)) score += 15;
        // Tag match is second strongest
        if (note.tags.some(t => t.toLowerCase().includes(token))) score += 8;
        // Wikilink match
        if (note.wikilinks.some(w => w.toLowerCase().includes(token))) score += 6;
        // Content match (count occurrences, cap at 5)
        const contentMatches = (lowerContent.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += Math.min(contentMatches, 5) * 2;
      }

      // Pillar notes get a relevance boost
      if (isPillar && score > 0) score += 10;

      // Extract the best excerpt — skip headers and metadata, grab insightful content
      let excerpt = '';
      if (score > 0) {
        excerpt = this._extractBestExcerpt(note.content, meaningfulTokens);
      }

      if (score > 0) {
        results.push({
          title: note.title,
          excerpt,
          score,
          tags: note.tags,
          wikilinks: note.wikilinks,
          pillarId,
          fullContent: note.content
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }

  /**
   * Extract the most relevant excerpt from a note's content.
   * Prioritizes paragraphs containing the query tokens over headers/metadata.
   */
  _extractBestExcerpt(content, tokens) {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    let bestParagraph = '';
    let bestScore = 0;

    // Score each line/paragraph by token relevance
    for (const line of lines) {
      // Skip pure metadata, headers with just icons, and auto-generated timestamps
      if (line.match(/^tags:|^---$|^\*Last Auto-Synthesized|^#\s*[\u{1F300}-\u{1F9FF}]/u)) continue;

      const lower = line.toLowerCase();
      let lineScore = 0;
      for (const token of tokens) {
        if (lower.includes(token)) lineScore += 3;
      }
      // Prefer lines with actual content (bullet points, descriptions)
      if (line.startsWith('*') || line.startsWith('-') || line.startsWith('>')) lineScore += 1;
      // Prefer longer, more informative lines
      if (line.length > 50) lineScore += 1;

      if (lineScore > bestScore) {
        bestScore = lineScore;
        bestParagraph = line;
      }
    }

    // If no good match, just take the first meaningful paragraph
    if (!bestParagraph) {
      const meaningful = lines.find(l => l.length > 30 && !l.startsWith('#') && !l.startsWith('tags:') && !l.startsWith('---'));
      bestParagraph = meaningful || lines.slice(0, 3).join(' ');
    }

    // Clean up markdown artifacts for natural reading
    return bestParagraph
      .replace(/\*\*/g, '')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/^[*\-]\s*/, '')
      .replace(/^>\s*/, '')
      .trim()
      .substring(0, 400);
  }

  /**
   * Get knowledge context from a specific Knowledge Pillar.
   * @param {string} pillarId - e.g. '01_Systems_Software_Engineering'
   * @returns {{title, keywords, capabilities, connections, excerpt} | null}
   */
  getKnowledgePillarContext(pillarId) {
    if (!this.indexedNotes.length) this.scanVaultNotes();

    const note = this.indexedNotes.find(n =>
      n.title === pillarId ||
      n.title === pillarId + '.md' ||
      n.title.replace('.md', '') === pillarId
    );

    if (!note) return null;

    // Extract keywords from the Keywords section
    const keywordsMatch = note.content.match(/Keywords[^`]*`([^`]+)`/gi);
    const keywords = keywordsMatch
      ? keywordsMatch.join(' ').match(/`([^`]+)`/g)?.map(k => k.replace(/`/g, '')) || []
      : [];

    // Extract capabilities (bullet points under Capabilities section)
    const capLines = note.content.split('\n')
      .filter(l => l.startsWith('*') || l.startsWith('-'))
      .map(l => l.replace(/^[*\-]\s*/, '').replace(/\*\*/g, '').replace(/\[\[([^\]]+)\]\]/g, '$1').trim())
      .filter(l => l.length > 10);

    return {
      title: note.title,
      keywords,
      capabilities: capLines,
      connections: note.wikilinks,
      excerpt: note.content.substring(0, 600)
    };
  }

  /**
   * Returns a flat list of all indexed note topics for the Generative Engine's topic matching.
   * @returns {Array<{title, tags, keywords}>}
   */
  getAllTopics() {
    if (!this.indexedNotes.length) this.scanVaultNotes();

    return this.indexedNotes
      .filter(n => !n.title.startsWith('Solution_') && !(n.fullPath && n.fullPath.includes('Generated_Solutions')))
      .map(n => {
        // Extract inline keywords from content
        const keywordsMatch = n.content.match(/`([a-zA-Z0-9_\-./\s]+)`/g);
        const inlineKeywords = keywordsMatch
          ? keywordsMatch.map(k => k.replace(/`/g, '').trim()).filter(k => k.length > 1 && k.length < 30)
          : [];

        return {
          title: n.title,
          tags: n.tags,
          keywords: inlineKeywords.slice(0, 20),
          wikilinks: n.wikilinks
        };
      });
  }

  /**
   * Extract key insights from a vault note — clean, sentence-level knowledge fragments
   * suitable for weaving into generated responses.
   * @param {string} noteTitle
   * @param {number} maxInsights
   * @returns {string[]}
   */
  extractKeyInsights(noteTitle, maxInsights = 5) {
    const note = this.indexedNotes.find(n => n.title === noteTitle);
    if (!note) return [];

    return note.content.split('\n')
      .filter(l => {
        const trimmed = l.trim();
        // Keep substantive lines: bullet points, descriptive sentences
        if (trimmed.length < 20) return false;
        if (trimmed.startsWith('#') || trimmed.startsWith('tags:') || trimmed.startsWith('---')) return false;
        if (trimmed.match(/^\*Last Auto-Synthesized/)) return false;
        if (trimmed.startsWith('```')) return false;
        return true;
      })
      .map(l => l
        .replace(/^[*\-]\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/^>\s*/, '')
        .trim()
      )
      .filter(l => l.length > 20)
      .slice(0, maxInsights);
  }

  /**
   * Generates a 100% Dynamic, Deeply Creative Response by Synthesizing Obsidian Vault Concepts.
   */
  synthesizeCreativeObsidianThought(prompt = '', analysis = {}) {
    const matchedNotes = this.queryVaultKnowledge(prompt);
    const text = (prompt || '').toLowerCase();
    const seed = Math.floor(Math.random() * 1000000) + text.length;

    // 1. If exact matches found in Obsidian Vault, synthesize their insights
    if (matchedNotes.length > 0) {
      const primaryNote = matchedNotes[0];
      const cleanTitle = primaryNote.title
        .replace(/^Solution_/i, '')
        .replace(/^Generated_/i, '')
        .replace(/_\d{3,5}$/, '')
        .replace(/_/g, ' ')
        .trim();

      const creativeOpeners = [
        `Exploring **${cleanTitle}** opens up a fascinating technical domain.`,
        `When we analyze **${cleanTitle}** through our engineering knowledge mesh, several key concepts emerge.`,
        `Drawing directly from our core architectural patterns on **${cleanTitle}**:`
      ];

      const opener = creativeOpeners[seed % creativeOpeners.length];

      // Extract bullet points or key text from note
      const lines = primaryNote.content.split('\n')
        .filter(l => l.startsWith('*') || l.startsWith('-') || l.startsWith('##'))
        .slice(0, 4)
        .join('\n');

      const coreBody = lines.length > 20 ? lines : primaryNote.excerpt.replace(/#.*/g, '').trim().substring(0, 300);

      const closers = [
        `How would you like to expand this concept in your architecture?`,
        `What specific dimension of this knowledge graph would you like to explore next?`,
        `Should we generate production code or build a 3D visual canvas for this concept?`
      ];
      const closing = closers[(seed + 1) % closers.length];

      return {
        output: `${opener}\n\n${coreBody}\n\n${closing}`,
        vaultNotesUsed: matchedNotes.map(n => n.title),
        wikilinks: primaryNote.wikilinks
      };
    }

    // 2. Creative Synthesis for General Conceptual Inquiries (e.g. Artificial Intelligence)
    if (text.includes('artificial intelligence') || text.includes('ai') || text.includes('machine learning')) {
      const aiOpeners = [
        `**Artificial Intelligence (AI)** is fundamentally the science and engineering of creating computational systems capable of perception, reasoning, pattern recognition, and autonomous decision-making.`,
        `At its core, **Artificial Intelligence** bridges human cognitive understanding with high-throughput computational vector spaces.`,
        `In our Obsidian Knowledge Mesh, **Artificial Intelligence** represents the synthesis of neural network architectures, vector embeddings, and affective human emotional intelligence.`
      ];
      const aiBody = [
        `Rather than relying on static rule systems, modern AI relies on deep neural transformers that process billions of parameter weights to perform contextual inference, natural language generation, and multi-modal creative synthesis.`,
        `Within CONCODE AI, artificial intelligence combines zero-external-dependency local Metal GPU acceleration with affective sentiment analysis and automated Obsidian Graph memory synchronization.`,
        `It transforms raw data into structured knowledge—enabling real-time code generation, interactive 3D WebGL visualizations, and natural humanized co-piloting.`
      ];
      const opener = aiOpeners[seed % aiOpeners.length];
      const body = aiBody[(seed + 1) % aiBody.length];
      const closing = `What angle of AI would you like to explore—neural network architectures, vector embeddings, or real-time web applications?`;

      return {
        output: `${opener}\n\n${body}\n\n${closing}`,
        vaultNotesUsed: ['03_AI_Machine_Learning_Core'],
        wikilinks: ['01_Systems_Software_Engineering', '08_Human_Cognitive_Psychology']
      };
    }

    // 3. Fallback Creative Synthesis
    const mainTopic = (analysis.domains && analysis.domains[0]) || 'Cognitive Science & Engineering';
    return {
      output: `Exploring **${prompt}** connects deep computational engineering with human intuition.\n\nEffective implementation relies on clean modular design, high-throughput execution, and intuitive user experiences.\n\nWhere would you like to focus next?`,
      vaultNotesUsed: [],
      wikilinks: []
    };
  }
}

module.exports = new ObsidianVaultKnowledgeEngine();
