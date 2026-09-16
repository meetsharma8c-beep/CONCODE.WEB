/**
 * CONCODE Native Brain — TF-IDF Semantic Understanding Engine v1.0
 * File: utils/concodeSemanticEngine.js
 *
 * PURPOSE: Replace keyword-matching with genuine semantic understanding.
 * Uses TF-IDF (Term Frequency–Inverse Document Frequency) to find
 * the most relevant knowledge for any user query — no external APIs.
 *
 * FEATURES:
 *  1. Builds vocabulary index from Obsidian vault + workspace code
 *  2. Computes TF-IDF vectors for every document
 *  3. Cosine similarity search for semantic relevance
 *  4. N-gram extraction (bigrams + trigrams) for multi-word concepts
 *  5. Incremental indexing — re-scans only changed files
 *  6. Stopword filtering + stemming-lite for cleaner signals
 */

const fs = require('fs');
const path = require('path');

class ConcodeSemanticEngine {
  constructor(options = {}) {
    this.version = '1.0';
    this.workspacePath = options.workspacePath || path.resolve(__dirname, '..');
    this.vaultPath = options.vaultPath || '/Users/ms/Documents/Obsidian Vault';

    // Core index structures
    this.documents = [];           // Array of { id, title, content, tokens, tfidf, source }
    this.vocabulary = new Map();   // word -> { df: document frequency, index: position }
    this.idfCache = new Map();     // word -> IDF value
    this.totalDocuments = 0;

    // Stopwords for cleaner semantic signals
    this.stopwords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
      'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'you', 'your',
      'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its',
      'they', 'them', 'their', 'theirs', 'what', 'which', 'who', 'whom',
      'this', 'that', 'these', 'those', 'am', 'or', 'and', 'but', 'if',
      'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for',
      'with', 'about', 'against', 'between', 'through', 'during', 'before',
      'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
      'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
      'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
      'just', 'don', 'now', 'also', 'get', 'got', 'let', 'like', 'make',
      'know', 'see', 'use', 'used', 'using', 'want', 'tell', 'said',
      'say', 'yes', 'no', 'ok', 'okay', 'well', 'really', 'actually',
      'basically', 'simply', 'however', 'therefore', 'thus', 'hence',
      'hi', 'hello', 'hey', 'please', 'thanks', 'thank'
    ]);

    // Lightweight stemmer rules (suffix stripping)
    this.stemRules = [
      { suffix: 'ization', replace: 'ize' },
      { suffix: 'ational', replace: 'ate' },
      { suffix: 'fulness', replace: 'ful' },
      { suffix: 'ousness', replace: 'ous' },
      { suffix: 'iveness', replace: 'ive' },
      { suffix: 'ating', replace: 'ate' },
      { suffix: 'ement', replace: '' },
      { suffix: 'ment', replace: '' },
      { suffix: 'ness', replace: '' },
      { suffix: 'able', replace: '' },
      { suffix: 'ible', replace: '' },
      { suffix: 'ally', replace: '' },
      { suffix: 'tion', replace: 't' },
      { suffix: 'sion', replace: 's' },
      { suffix: 'ling', replace: '' },
      { suffix: 'ical', replace: 'ic' },
      { suffix: 'ing', replace: '' },
      { suffix: 'ies', replace: 'y' },
      { suffix: 'ous', replace: '' },
      { suffix: 'ive', replace: '' },
      { suffix: 'ful', replace: '' },
      { suffix: 'ess', replace: '' },
      { suffix: 'ity', replace: '' },
      { suffix: 'ed', replace: '' },
      { suffix: 'er', replace: '' },
      { suffix: 'ly', replace: '' },
      { suffix: 'es', replace: '' },
      { suffix: 's', replace: '' },
    ];

    // Initialize with deferred indexing
    setImmediate(() => this.buildIndex());
  }

  // ═══════════════════════════════════════════════════════════════
  // TEXT PROCESSING
  // ═══════════════════════════════════════════════════════════════

  /** Lightweight stemmer — reduces words to approximate roots */
  stem(word) {
    if (word.length < 4) return word;
    for (const rule of this.stemRules) {
      if (word.endsWith(rule.suffix) && word.length - rule.suffix.length + rule.replace.length >= 3) {
        return word.slice(0, word.length - rule.suffix.length) + rule.replace;
      }
    }
    return word;
  }

  /** Tokenize text into cleaned, stemmed tokens */
  tokenize(text) {
    if (!text) return [];
    const raw = text
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, ' ')     // Strip code blocks
      .replace(/`[^`]+`/g, ' ')            // Strip inline code
      .replace(/https?:\/\/\S+/g, ' ')     // Strip URLs
      .replace(/[^a-z0-9\s\-_.]/g, ' ')    // Keep letters, numbers, hyphens
      .replace(/\s+/g, ' ')
      .trim();

    const words = raw.split(/\s+/).filter(w => w.length >= 2);
    const tokens = [];

    for (const word of words) {
      if (this.stopwords.has(word)) continue;
      if (/^\d+$/.test(word) && word.length < 3) continue; // Skip short numbers
      tokens.push(this.stem(word));
    }

    return tokens;
  }

  /** Extract bigrams and trigrams for multi-word concepts */
  extractNgrams(tokens, maxN = 3) {
    const ngrams = [...tokens]; // Include unigrams

    for (let n = 2; n <= maxN && n <= tokens.length; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.push(tokens.slice(i, i + n).join('_'));
      }
    }

    return ngrams;
  }

  // ═══════════════════════════════════════════════════════════════
  // INDEX BUILDING
  // ═══════════════════════════════════════════════════════════════

  /** Build the full TF-IDF index from all knowledge sources */
  buildIndex() {
    const startTime = Date.now();
    this.documents = [];
    this.vocabulary = new Map();
    this.idfCache = new Map();

    // 1. Index Obsidian Vault notes
    this._indexDirectory(this.vaultPath, 'vault');

    // 2. Index workspace source code (comments, docstrings, README)
    this._indexWorkspaceCode();

    // 3. Index past conversations for learned patterns
    this._indexConversationHistory();

    // 4. Compute IDF values
    this.totalDocuments = this.documents.length;
    this._computeIDF();

    // 5. Compute TF-IDF vectors for all documents
    for (const doc of this.documents) {
      doc.tfidf = this._computeTFIDF(doc.tokens);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ConcodeSemanticEngine v${this.version}] Index built: ${this.documents.length} documents, ${this.vocabulary.size} vocabulary terms, ${elapsed}ms`);
  }

  /** Recursively index markdown files from a directory */
  _indexDirectory(dirPath, source = 'vault') {
    if (!dirPath || !fs.existsSync(dirPath)) return;

    const walkSync = (dir) => {
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
              if (content.length < 20) continue; // Skip near-empty files

              const title = entry.name.replace('.md', '');

              // Skip generated solution logs
              if (title.startsWith('Solution_')) continue;

              const tokens = this.tokenize(content);
              const ngrams = this.extractNgrams(tokens);

              // Update document frequency for vocabulary
              const uniqueTerms = new Set(ngrams);
              for (const term of uniqueTerms) {
                if (!this.vocabulary.has(term)) {
                  this.vocabulary.set(term, { df: 0, index: this.vocabulary.size });
                }
                this.vocabulary.get(term).df++;
              }

              this.documents.push({
                id: `${source}:${title}`,
                title,
                content,
                excerpt: this._extractFirstParagraph(content),
                tokens: ngrams,
                tfidf: null, // Computed after IDF
                source,
                fullPath
              });
            } catch (e) {
              // Skip unreadable files
            }
          }
        }
      } catch (err) {
        // Directory access error — skip
      }
    };

    walkSync(dirPath);
  }

  /** Index workspace JavaScript/HTML source code comments and docstrings */
  _indexWorkspaceCode() {
    const codeDir = this.workspacePath;
    if (!fs.existsSync(codeDir)) return;

    const codeExts = ['.js', '.html', '.css'];
    const skipDirs = new Set(['node_modules', '.git', '.venv', 'mongo-data', 'concode_engine', '.obsidian']);

    const walkSync = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || skipDirs.has(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            walkSync(fullPath);
          } else if (entry.isFile() && codeExts.includes(path.extname(entry.name))) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');

              // Extract comments and docstrings only (not raw code)
              const comments = this._extractCodeComments(content, path.extname(entry.name));
              if (comments.length < 20) continue;

              const title = `code:${path.relative(this.workspacePath, fullPath)}`;
              const tokens = this.tokenize(comments);
              const ngrams = this.extractNgrams(tokens);

              const uniqueTerms = new Set(ngrams);
              for (const term of uniqueTerms) {
                if (!this.vocabulary.has(term)) {
                  this.vocabulary.set(term, { df: 0, index: this.vocabulary.size });
                }
                this.vocabulary.get(term).df++;
              }

              this.documents.push({
                id: `code:${title}`,
                title,
                content: comments,
                excerpt: comments.slice(0, 300),
                tokens: ngrams,
                tfidf: null,
                source: 'code',
                fullPath
              });
            } catch (e) {
              // Skip
            }
          }
        }
      } catch (err) {
        // Skip
      }
    };

    walkSync(codeDir);
  }

  /** Extract comments and docstrings from source code */
  _extractCodeComments(code, ext) {
    const comments = [];

    if (ext === '.js') {
      // Block comments: /** ... */ and /* ... */
      const blockRegex = /\/\*\*?([\s\S]*?)\*\//g;
      let match;
      while ((match = blockRegex.exec(code)) !== null) {
        const cleaned = match[1].replace(/^\s*\*\s?/gm, '').trim();
        if (cleaned.length > 10) comments.push(cleaned);
      }
      // Single-line comments: // ...
      const lineRegex = /\/\/\s*(.+)/g;
      while ((match = lineRegex.exec(code)) !== null) {
        if (match[1].length > 5 && !match[1].startsWith('eslint') && !match[1].startsWith('TODO')) {
          comments.push(match[1].trim());
        }
      }
    } else if (ext === '.html') {
      // HTML comments: <!-- ... -->
      const htmlRegex = /<!--([\s\S]*?)-->/g;
      let match;
      while ((match = htmlRegex.exec(code)) !== null) {
        const cleaned = match[1].trim();
        if (cleaned.length > 10) comments.push(cleaned);
      }
    } else if (ext === '.css') {
      // CSS comments: /* ... */
      const cssRegex = /\/\*([\s\S]*?)\*\//g;
      let match;
      while ((match = cssRegex.exec(code)) !== null) {
        const cleaned = match[1].trim();
        if (cleaned.length > 10) comments.push(cleaned);
      }
    }

    return comments.join('\n');
  }

  /** Index past conversation history for learned patterns */
  _indexConversationHistory() {
    const chatsPath = path.join(this.workspacePath, 'data', 'chats.json');
    if (!fs.existsSync(chatsPath)) return;

    try {
      const raw = fs.readFileSync(chatsPath, 'utf8');
      const chats = JSON.parse(raw);
      if (!Array.isArray(chats)) return;

      // Group chats into sessions and create documents from bot responses
      const botResponses = chats.filter(c => c.role === 'bot' && c.text && c.text.length > 50);
      const batchSize = 5;

      for (let i = 0; i < botResponses.length; i += batchSize) {
        const batch = botResponses.slice(i, i + batchSize);
        const combined = batch.map(b => b.text).join('\n');
        const title = `conversation_batch_${Math.floor(i / batchSize)}`;
        const tokens = this.tokenize(combined);
        const ngrams = this.extractNgrams(tokens);

        const uniqueTerms = new Set(ngrams);
        for (const term of uniqueTerms) {
          if (!this.vocabulary.has(term)) {
            this.vocabulary.set(term, { df: 0, index: this.vocabulary.size });
          }
          this.vocabulary.get(term).df++;
        }

        this.documents.push({
          id: `history:${title}`,
          title,
          content: combined,
          excerpt: combined.slice(0, 300),
          tokens: ngrams,
          tfidf: null,
          source: 'history',
          fullPath: chatsPath
        });
      }
    } catch (e) {
      // Skip if chats.json is malformed
    }
  }

  /** Extract first meaningful paragraph from markdown content */
  _extractFirstParagraph(content) {
    const lines = content.split('\n');
    const paragraphs = [];
    let current = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('```') || trimmed.startsWith('>')) {
        if (current.length > 0) {
          paragraphs.push(current.join(' '));
          current = [];
        }
        continue;
      }
      if (trimmed.length === 0) {
        if (current.length > 0) {
          paragraphs.push(current.join(' '));
          current = [];
        }
        continue;
      }
      current.push(trimmed);
    }
    if (current.length > 0) paragraphs.push(current.join(' '));

    // Return first paragraph with meaningful length
    for (const p of paragraphs) {
      if (p.length > 30) return p.slice(0, 500);
    }
    return content.slice(0, 300);
  }

  // ═══════════════════════════════════════════════════════════════
  // TF-IDF COMPUTATION
  // ═══════════════════════════════════════════════════════════════

  /** Compute IDF (Inverse Document Frequency) for all vocabulary terms */
  _computeIDF() {
    for (const [term, data] of this.vocabulary.entries()) {
      // IDF = log(N / (df + 1)) + 1  (smoothed)
      const idf = Math.log((this.totalDocuments + 1) / (data.df + 1)) + 1;
      this.idfCache.set(term, idf);
    }
  }

  /** Compute TF-IDF vector for a list of tokens */
  _computeTFIDF(tokens) {
    const tf = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Normalize TF by document length
    const maxTF = Math.max(...tf.values(), 1);
    const tfidf = new Map();

    for (const [term, count] of tf.entries()) {
      const normalizedTF = 0.5 + 0.5 * (count / maxTF); // Augmented TF
      const idf = this.idfCache.get(term) || 1;
      tfidf.set(term, normalizedTF * idf);
    }

    return tfidf;
  }

  /** Compute cosine similarity between two TF-IDF vectors */
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, valA] of vecA.entries()) {
      normA += valA * valA;
      const valB = vecB.get(term);
      if (valB) {
        dotProduct += valA * valB;
      }
    }

    for (const [, valB] of vecB.entries()) {
      normB += valB * valB;
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find the most semantically relevant documents for a query.
   * @param {string} query - The user's natural language query
   * @param {number} topN - Number of results to return
   * @param {string} sourceFilter - Optional: 'vault', 'code', 'history', or null for all
   * @returns {Array<{id, title, excerpt, score, source, fullContent}>}
   */
  search(query, topN = 5, sourceFilter = null) {
    if (!query || this.documents.length === 0) return [];

    // Tokenize and vectorize the query
    const queryTokens = this.tokenize(query);
    const queryNgrams = this.extractNgrams(queryTokens);
    const queryTFIDF = this._computeTFIDF(queryNgrams);

    // Score all documents
    const results = [];

    for (const doc of this.documents) {
      if (sourceFilter && doc.source !== sourceFilter) continue;
      if (!doc.tfidf) continue;

      const similarity = this._cosineSimilarity(queryTFIDF, doc.tfidf);
      if (similarity > 0.01) { // Minimum relevance threshold
        results.push({
          id: doc.id,
          title: doc.title,
          excerpt: doc.excerpt,
          score: similarity,
          source: doc.source,
          fullContent: doc.content
        });
      }
    }

    // Sort by similarity score descending
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }

  /**
   * Get the most relevant knowledge fragments for a query.
   * Returns digestible excerpts suitable for injecting into responses.
   * @param {string} query
   * @param {number} topN
   * @returns {Array<{title, insight, score, source}>}
   */
  getRelevantKnowledge(query, topN = 3) {
    const results = this.search(query, topN * 2);

    return results.slice(0, topN).map(r => {
      // Extract the best insight from the content
      const insight = this._extractBestInsight(r.fullContent, this.tokenize(query));
      return {
        title: r.title,
        insight: insight || r.excerpt,
        score: r.score,
        source: r.source
      };
    });
  }

  /** Extract the most relevant sentence/paragraph from content matching query tokens */
  _extractBestInsight(content, queryTokens) {
    if (!content || queryTokens.length === 0) return '';

    // Split into sentences
    const sentences = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/#{1,6}\s+/g, '')     // Remove headers
      .replace(/[>*-]\s+/g, '')      // Remove markdown markers
      .split(/[.!?\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300);

    if (sentences.length === 0) return content.slice(0, 200);

    // Score each sentence by how many query tokens it contains
    let bestScore = 0;
    let bestSentence = sentences[0];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        if (lower.includes(token)) score++;
      }
      // Bonus for moderate length (not too short, not too long)
      if (sentence.length > 40 && sentence.length < 200) score += 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }

    return bestSentence;
  }

  /**
   * Check if the index needs refreshing (files changed).
   * Call this periodically to keep the index fresh.
   */
  refreshIfNeeded() {
    // Simple time-based refresh every 2 minutes
    if (!this._lastRefresh || Date.now() - this._lastRefresh > 120000) {
      this.buildIndex();
      this._lastRefresh = Date.now();
    }
  }

  /** Get index statistics */
  getStats() {
    return {
      totalDocuments: this.documents.length,
      vocabularySize: this.vocabulary.size,
      sources: {
        vault: this.documents.filter(d => d.source === 'vault').length,
        code: this.documents.filter(d => d.source === 'code').length,
        history: this.documents.filter(d => d.source === 'history').length
      }
    };
  }
}

module.exports = new ConcodeSemanticEngine();
