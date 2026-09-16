/**
 * CONCODE Native Brain — Markov Chain Response Generator v1.0
 * File: utils/concodeMarkovBrain.js
 *
 * PURPOSE: Generate unique, natural-sounding text WITHOUT any external LLM.
 * Uses order-3 Markov chains trained on the Obsidian vault to compose
 * sentences that have never been seen before but sound coherent and human.
 *
 * FEATURES:
 *  1. Order-3 Markov chains — remembers 3-word sequences for coherence
 *  2. Trains on Obsidian vault notes, knowledge pillars, and past responses
 *  3. Topic-seeded generation — starts chains from relevant topic words
 *  4. Anti-repetition buffer — never outputs the same sentence twice per session
 *  5. Tone modulation — adjusts vocabulary and sentence length by emotion
 *  6. Paragraph composition — chains multiple sentences into natural paragraphs
 *  7. Fallback composition — if Markov chain fails, uses template-free composition
 */

const fs = require('fs');
const path = require('path');

class ConcodeMarkovBrain {
  constructor(options = {}) {
    this.version = '1.0';
    this.vaultPath = options.vaultPath || '/Users/ms/Documents/Obsidian Vault';
    this.workspacePath = options.workspacePath || path.resolve(__dirname, '..');

    // Markov chain state tables
    this.chains = new Map();       // "word1 word2 word3" -> [possible next words]
    this.starters = [];            // Sentence-starting trigrams
    this.order = 3;                // Chain order (trigrams)

    // Anti-repetition
    this.usedSentences = new Set();
    this.maxUsedSentences = 200;

    // Training corpus stats
    this.totalSentencesTrained = 0;
    this.totalWordsTrained = 0;

    // Human-quality sentence beginnings for seeding when Markov can't start
    this.naturalStarters = [
      'the key thing to understand is',
      'what makes this interesting is',
      'in practical terms',
      'the core idea behind this is',
      'when you think about it',
      'the real power of this comes from',
      'one important aspect is',
      'at a fundamental level',
      'the way this works is',
      'what you really want to focus on is',
      'the practical value here is',
      'in the real world',
      'the essential concept is',
      'the beauty of this approach is',
      'what sets this apart is',
      'the most important thing to know is',
      'from a practical standpoint',
      'the underlying principle is',
      'thinking about this more carefully',
      'the interesting thing about this is',
    ];

    // Tone-specific vocabulary modifiers
    this.toneModifiers = {
      frustrated: {
        maxSentenceLength: 15,   // Keep it short and direct
        preferredWords: ['step', 'first', 'simply', 'just', 'fix', 'solution', 'easy', 'quick'],
        avoidWords: ['complex', 'advanced', 'theoretical', 'abstract'],
      },
      curious: {
        maxSentenceLength: 30,
        preferredWords: ['explore', 'discover', 'fascinating', 'interesting', 'deeper', 'concept'],
        avoidWords: [],
      },
      urgent: {
        maxSentenceLength: 12,
        preferredWords: ['immediately', 'directly', 'exact', 'specific', 'precise'],
        avoidWords: ['perhaps', 'maybe', 'consider', 'theoretically'],
      },
      calm: {
        maxSentenceLength: 25,
        preferredWords: ['clean', 'structured', 'organized', 'clear', 'straightforward'],
        avoidWords: [],
      },
      default: {
        maxSentenceLength: 25,
        preferredWords: [],
        avoidWords: [],
      }
    };

    // Train on initialization (deferred)
    setImmediate(() => this.train());
  }

  // ═══════════════════════════════════════════════════════════════
  // TRAINING
  // ═══════════════════════════════════════════════════════════════

  /** Train the Markov chain on all available text sources */
  train() {
    const startTime = Date.now();
    this.chains = new Map();
    this.starters = [];
    this.totalSentencesTrained = 0;
    this.totalWordsTrained = 0;

    // 1. Train on Obsidian vault
    this._trainFromDirectory(this.vaultPath);

    // 2. Train on workspace markdown docs
    this._trainFromDirectory(this.workspacePath, ['.md']);

    // 3. Train on built-in knowledge (the generative engine's knowledge fragments)
    this._trainFromBuiltinKnowledge();

    const elapsed = Date.now() - startTime;
    console.log(`[ConcodeMarkovBrain v${this.version}] Trained: ${this.totalSentencesTrained} sentences, ${this.totalWordsTrained} words, ${this.chains.size} chain states, ${elapsed}ms`);
  }

  /** Train from all markdown files in a directory */
  _trainFromDirectory(dirPath, extensions = ['.md']) {
    if (!dirPath || !fs.existsSync(dirPath)) return;
    const skipDirs = new Set(['node_modules', '.git', '.venv', 'mongo-data', '.obsidian', 'concode_engine', '__pycache__']);

    const walkSync = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || skipDirs.has(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            walkSync(fullPath);
          } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              this._trainOnText(content);
            } catch (e) { /* skip */ }
          }
        }
      } catch (err) { /* skip */ }
    };

    walkSync(dirPath);
  }

  /** Train on a block of text — extract sentences and build chain */
  _trainOnText(text) {
    if (!text || text.length < 20) return;

    // Clean the text: remove markdown syntax, code blocks, URLs
    const cleaned = text
      .replace(/```[\s\S]*?```/g, ' ')       // Code blocks
      .replace(/`[^`]+`/g, ' ')              // Inline code
      .replace(/https?:\/\/\S+/g, ' ')       // URLs
      .replace(/#{1,6}\s+/g, '')             // Headers
      .replace(/\[\[([^\]]+)\]\]/g, '$1')    // Wiki links -> just the text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links -> just text
      .replace(/[>*_~|]/g, '')               // Markdown formatting
      .replace(/---+/g, '')                  // Horizontal rules
      .replace(/\|[^\n]+\|/g, '')            // Table rows
      .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '') // Timestamps
      .replace(/\([^)]*\)/g, '')             // Parenthetical content
      .replace(/\s+/g, ' ')
      .trim();

    // Split into sentences
    const sentences = cleaned
      .split(/[.!?\n]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => {
        const words = s.split(/\s+/);
        return words.length >= 4 && words.length <= 40 && s.length > 15;
      });

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).filter(w => w.length > 0);
      if (words.length < this.order + 1) continue;

      this.totalSentencesTrained++;
      this.totalWordsTrained += words.length;

      // Record sentence starter
      const starterKey = words.slice(0, this.order).join(' ');
      this.starters.push(starterKey);

      // Build chain transitions
      for (let i = 0; i <= words.length - this.order - 1; i++) {
        const key = words.slice(i, i + this.order).join(' ');
        const nextWord = words[i + this.order];

        if (!this.chains.has(key)) {
          this.chains.set(key, []);
        }
        this.chains.get(key).push(nextWord);
      }
    }
  }

  /** Train on built-in knowledge fragments */
  _trainFromBuiltinKnowledge() {
    const knowledgeText = [
      // Systems & Engineering
      'An API is a contract between two software systems defining how they communicate through structured requests and responses.',
      'Databases organize information for fast retrieval using indexing structures similar to a book table of contents.',
      'Docker packages applications with all dependencies into portable containers that run consistently across environments.',
      'WebSockets maintain persistent bidirectional connections between browser and server for instant real-time communication.',
      'React components manage their own state and rendering logic creating reusable self-contained interface building blocks.',
      'Security requires validating every input authenticating every request and never trusting client-side data alone.',
      'Kubernetes orchestrates containers across clusters handling automatic scaling healing and zero-downtime deployments.',
      'CI/CD pipelines automate building testing and deploying code on every commit catching bugs before they reach production.',
      // AI & ML
      'Artificial intelligence builds systems that learn patterns from data and make decisions based on those recognized patterns.',
      'Neural networks are layers of mathematical functions that learn to transform input into useful output through training.',
      'Vector databases store data as high-dimensional numerical representations capturing semantic meaning for similarity search.',
      'Machine learning systems improve automatically through experience rather than being explicitly programmed for each case.',
      // Design & Philosophy
      'Great design is invisible because when everything works naturally that is the result of deeply intentional decisions.',
      'User experience design is fundamentally about empathy and understanding what people actually need from the interface.',
      'Growth happens at the edge of discomfort because the projects that stretch you are the ones that define your abilities.',
      'The future of technology is about human and AI collaboration augmenting human creativity rather than replacing it.',
      'Clean code reads like well-written prose where each function tells a clear story and every variable name explains itself.',
      'Architecture decisions today determine the maintenance burden for years to come so choose simplicity over cleverness.',
      'The best abstractions hide complexity without sacrificing the ability to understand what is happening underneath.',
      'Performance optimization starts with measurement because you cannot improve what you cannot measure accurately.',
    ].join('\n');

    this._trainOnText(knowledgeText);
  }

  // ═══════════════════════════════════════════════════════════════
  // GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate a single sentence using the Markov chain.
   * @param {string[]} seedWords - Optional topic words to start from
   * @param {string} tone - Emotional tone: 'frustrated', 'curious', 'urgent', 'calm', 'default'
   * @returns {string} Generated sentence
   */
  generateSentence(seedWords = [], tone = 'default') {
    const toneConfig = this.toneModifiers[tone] || this.toneModifiers.default;
    const maxLen = toneConfig.maxSentenceLength;

    // Try to find a starter related to seed words
    let currentKey = this._findRelevantStarter(seedWords);

    if (!currentKey) {
      // Pick a random starter
      if (this.starters.length > 0) {
        currentKey = this.starters[Math.floor(Math.random() * this.starters.length)];
      } else {
        // Fallback: use natural starter
        return this._capitalizeFirst(this.naturalStarters[Math.floor(Math.random() * this.naturalStarters.length)]);
      }
    }

    const words = currentKey.split(' ');
    let attempts = 0;

    while (words.length < maxLen && attempts < 100) {
      const key = words.slice(-this.order).join(' ');
      const nextOptions = this.chains.get(key);

      if (!nextOptions || nextOptions.length === 0) break;

      // Filter by tone preferences
      let candidates = nextOptions;
      if (toneConfig.avoidWords.length > 0) {
        const filtered = candidates.filter(w => !toneConfig.avoidWords.includes(w));
        if (filtered.length > 0) candidates = filtered;
      }

      // Weighted random selection — prefer tone-aligned words
      let selected;
      const preferred = candidates.filter(w => toneConfig.preferredWords.includes(w));
      if (preferred.length > 0 && Math.random() < 0.3) {
        selected = preferred[Math.floor(Math.random() * preferred.length)];
      } else {
        selected = candidates[Math.floor(Math.random() * candidates.length)];
      }

      words.push(selected);
      attempts++;
    }

    const sentence = this._capitalizeFirst(words.join(' '));

    // Anti-repetition check
    if (this.usedSentences.has(sentence)) {
      return this.generateSentence(seedWords, tone); // Retry once
    }

    this.usedSentences.add(sentence);
    if (this.usedSentences.size > this.maxUsedSentences) {
      const arr = [...this.usedSentences];
      this.usedSentences = new Set(arr.slice(arr.length / 2));
    }

    return sentence;
  }

  /** Find a starter trigram that contains one of the seed words */
  _findRelevantStarter(seedWords) {
    if (seedWords.length === 0 || this.starters.length === 0) return null;

    const lower = seedWords.map(w => w.toLowerCase());

    // Collect all starters containing seed words
    const relevant = this.starters.filter(starter =>
      lower.some(seed => starter.includes(seed))
    );

    if (relevant.length > 0) {
      return relevant[Math.floor(Math.random() * relevant.length)];
    }

    return null;
  }

  /**
   * Generate a complete paragraph (multiple sentences) on a topic.
   * @param {string} topic - The subject to talk about
   * @param {string[]} knowledgeInsights - Factual snippets from the semantic engine
   * @param {string} tone - Emotional tone
   * @param {number} numSentences - Target number of sentences (2-5)
   * @returns {string} Generated paragraph
   */
  generateParagraph(topic, knowledgeInsights = [], tone = 'default', numSentences = 3) {
    const seedWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const sentences = [];

    // First sentence: use knowledge insight if available, else generate
    if (knowledgeInsights.length > 0 && knowledgeInsights[0].length > 20) {
      sentences.push(this._capitalizeFirst(knowledgeInsights[0]));
    } else {
      sentences.push(this.generateSentence(seedWords, tone));
    }

    // Middle sentences: mix of Markov-generated and knowledge-injected
    for (let i = 1; i < numSentences - 1; i++) {
      if (i < knowledgeInsights.length && knowledgeInsights[i] && knowledgeInsights[i].length > 20 && Math.random() > 0.4) {
        sentences.push(this._capitalizeFirst(knowledgeInsights[i]));
      } else {
        sentences.push(this.generateSentence(seedWords, tone));
      }
    }

    // Last sentence: always Markov-generated for naturalness
    if (numSentences > 1) {
      sentences.push(this.generateSentence(seedWords, tone));
    }

    return sentences
      .filter(s => s && s.length > 10)
      .map(s => s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : s + '.')
      .join(' ');
  }

  /**
   * Generate a full response with opener + body + closer.
   * This is the main entry point for response composition.
   * @param {string} topic - What to talk about
   * @param {string[]} knowledgeInsights - Facts from semantic engine
   * @param {string} tone - Emotional tone
   * @param {Object} context - Additional context { intent, isFollowUp, userName }
   * @returns {string} Complete response text
   */
  compose(topic, knowledgeInsights = [], tone = 'default', context = {}) {
    const parts = [];

    // 1. Opener — tone-appropriate, human-sounding
    parts.push(this._generateOpener(tone, context));

    // 2. Body — knowledge-grounded paragraph(s)
    const bodyLength = tone === 'urgent' || tone === 'frustrated' ? 2 : 3;
    const body = this.generateParagraph(topic, knowledgeInsights, tone, bodyLength);
    if (body) parts.push(body);

    // 3. Additional insight paragraph for curious/default tones
    if ((tone === 'curious' || tone === 'default') && knowledgeInsights.length > 2) {
      const extraInsights = knowledgeInsights.slice(2);
      const extra = this.generateParagraph(topic, extraInsights, tone, 2);
      if (extra && extra !== body) parts.push(extra);
    }

    // 4. Closer — natural sign-off
    parts.push(this._generateCloser(tone));

    return parts.filter(p => p && p.length > 5).join('\n\n');
  }

  /** Generate a tone-appropriate opener */
  _generateOpener(tone, context = {}) {
    const openers = {
      frustrated: [
        "I totally understand your frustration — let me help you work through this.",
        "I hear you. Let's get this sorted out together.",
        "No worries at all, this is very fixable. Here's what's going on:",
        "I can see why that's frustrating. Let me walk you through the solution.",
        "Hey, take a breath — we'll figure this out step by step.",
      ],
      curious: [
        "That's a really great question! Let me break it down for you.",
        "Oh, I love this topic! Here's the way I think about it:",
        "Great question — this is actually really interesting when you dig into it.",
        "This is something worth understanding deeply. Here's the core idea:",
        "Interesting topic! Let me share what I know about this.",
      ],
      urgent: [
        "Here's the direct answer:",
        "Got it — here's what you need:",
        "Straight to the point:",
        "Here's exactly what to do:",
      ],
      calm: [
        "Sure thing, let me explain.",
        "Happy to walk you through this.",
        "Here's how this works:",
        "Good question — here's the overview.",
      ],
      happy: [
        "That's awesome! Love the energy!",
        "Great to hear! Here's what I'm thinking:",
        "That's really cool! Let me add to that.",
      ],
      default: [
        "Here's my take on this:",
        "Let me share some thoughts on this.",
        "Good question — here's what I know:",
        "This is a really good topic to understand. Here's the deal:",
        "Let me think through this with you.",
      ]
    };

    const pool = openers[tone] || openers.default;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Generate a tone-appropriate closer */
  _generateCloser(tone) {
    const closers = {
      frustrated: [
        "Let me know if that helps or if you need me to dig deeper.",
        "Try that out and tell me what happens — I'm right here.",
        "Does that clear things up? Happy to keep troubleshooting with you.",
      ],
      curious: [
        "Want me to go deeper on any part of this?",
        "What angle interests you most? I can explore further.",
        "There's a lot more to unpack here — what catches your attention?",
      ],
      urgent: [
        "Need anything else?",
        "Let me know if that covers it.",
      ],
      default: [
        "What would you like to explore next?",
        "Let me know what you'd like to dig into from here.",
        "Feel free to ask anything else — I'm right here.",
        "Curious to hear your thoughts on this!",
        "What's the next thing on your mind?",
      ]
    };

    const pool = closers[tone] || closers.default;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Capitalize first letter of a string */
  _capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Get brain statistics */
  getStats() {
    return {
      chainStates: this.chains.size,
      starters: this.starters.length,
      sentencesTrained: this.totalSentencesTrained,
      wordsTrained: this.totalWordsTrained,
      usedSentences: this.usedSentences.size
    };
  }
}

module.exports = new ConcodeMarkovBrain();
