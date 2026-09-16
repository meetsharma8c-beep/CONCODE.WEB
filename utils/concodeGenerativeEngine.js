/**
 * CONCODE Brain — Generative Human Thinking Engine v3.0 (Native Cognitive Brain)
 * File: utils/concodeGenerativeEngine.js
 *
 * PURPOSE: Generate unique, contextual, human-sounding responses
 * WITHOUT any external LLM, API key, or Ollama dependency.
 *
 * v3.0 COGNITIVE BRAIN ARCHITECTURE:
 *   1. TF-IDF Semantic Engine — understands query meaning via cosine similarity
 *   2. Markov Chain Brain — generates novel text trained on Obsidian vault
 *   3. Cognitive Reasoning Chain — decomposes complex questions, uses analogies
 *   4. Code Pattern Synthesizer — learns and recombines workspace code patterns
 *   5. Obsidian Vault Knowledge Graph — reads 8 Knowledge Pillars
 *   6. Conversation Memory Ring Buffer — tracks last 20 turns
 *   7. Emotional Tone Adaptation — adjusts language based on user mood
 *   8. Anti-Repetition System — never uses the same phrase twice in a session
 *
 * RESULT: Every response is unique, knowledge-grounded, emotionally aware,
 * and composed by a genuinely native cognitive engine — no external APIs.
 */

// Lazy-load cognitive brain components to avoid circular dependency at module load time
let _vaultEngine = null;
let _semanticEngine = null;
let _markovBrain = null;
let _reasoningChain = null;
let _codeSynthesizer = null;

function getVaultEngine() {
  if (!_vaultEngine) {
    try { _vaultEngine = require('./obsidianVaultKnowledgeEngine'); } catch (e) { _vaultEngine = null; }
  }
  return _vaultEngine;
}

function getSemanticEngine() {
  if (!_semanticEngine) {
    try { _semanticEngine = require('./concodeSemanticEngine'); } catch (e) { console.warn('[Brain] SemanticEngine load failed:', e.message); _semanticEngine = null; }
  }
  return _semanticEngine;
}

function getMarkovBrain() {
  if (!_markovBrain) {
    try { _markovBrain = require('./concodeMarkovBrain'); } catch (e) { console.warn('[Brain] MarkovBrain load failed:', e.message); _markovBrain = null; }
  }
  return _markovBrain;
}

function getReasoningChain() {
  if (!_reasoningChain) {
    try { _reasoningChain = require('./concodeReasoningChain'); } catch (e) { console.warn('[Brain] ReasoningChain load failed:', e.message); _reasoningChain = null; }
  }
  return _reasoningChain;
}

function getCodeSynthesizer() {
  if (!_codeSynthesizer) {
    try { _codeSynthesizer = require('./concodeCodeSynthesizer'); } catch (e) { console.warn('[Brain] CodeSynthesizer load failed:', e.message); _codeSynthesizer = null; }
  }
  return _codeSynthesizer;
}

class ConcodeGenerativeEngine {
  constructor() {
    this.usedPhrases = new Set();
    this.maxUsedPhrases = 500;

    // Conversation memory ring buffer
    this.conversationMemory = [];
    this.maxMemorySize = 20;

    // ═══════════════════════════════════════════════════════════════
    // SEMANTIC WORD POOLS — The building blocks of generated speech
    // ═══════════════════════════════════════════════════════════════

    this.openers = {
      explaining: [
        "So basically,", "In simple terms,", "The way I'd explain it is,",
        "Think of it this way —", "Here's the thing:", "At its core,",
        "The short version is,", "If I had to put it simply,",
        "What it really comes down to is,", "The easiest way to understand this is,",
        "Let me break this down for you.", "Great question!",
        "That's a really good thing to understand.", "Here's how I think about it:",
        "Okay so here's the deal —", "The way I see it,",
        "Let me walk you through this.", "This is actually really interesting —",
        "I love this question.", "Here's what's important to know:",
      ],
      greeting: [
        "Hey! Great to hear from you.", "Hey there! Good to see you.",
        "Hello! I'm right here and ready.", "Hey! What's on your mind today?",
        "Hi! Always good to connect.", "Hey! Welcome back.",
        "Hey! I've been here thinking — what shall we work on?",
        "Hello! Ready to dive into something interesting?",
        "Hi there! What are we exploring today?",
      ],
      empathizing: [
        "I totally get where you're coming from.", "I hear you completely.",
        "That makes a lot of sense.", "I understand the frustration.",
        "No worries at all!", "I feel you on that.",
        "I can see why that's bothering you.", "That's completely valid.",
        "Hey, I've been there too.", "Let's work through this together.",
      ],
      acknowledging: [
        "Absolutely!", "For sure!", "You're spot on.", "That's exactly right.",
        "Good thinking!", "I love that direction.",
        "That's a great call.", "Couldn't agree more.",
      ],
      curious: [
        "That's an interesting thought!", "Oh, that's a great angle!",
        "I like where you're going with that.", "Interesting question!",
        "Hmm, let me think about that for a second.",
        "That's something worth exploring.", "Now that's a fascinating topic.",
      ],
    };

    this.connectors = [
      "And the cool thing is,", "What makes this interesting is,",
      "On top of that,", "The bigger picture here is,",
      "What's worth noting is,", "Another way to look at it:",
      "Building on that,", "To add to that,",
      "The practical side of this is,", "In real-world terms,",
      "Here's what people often miss:", "The key insight here is,",
      "What I find fascinating is,", "When you dig deeper,",
      "And here's why that matters:", "The reason this is important:",
    ];

    this.closers = [
      "What would you like to dig into next?",
      "Want me to go deeper on any part of this?",
      "What angle interests you most?",
      "Curious to hear your thoughts on this!",
      "Let me know how you'd like to take this further.",
      "What's the next thing on your mind?",
      "Feel free to ask me anything else!",
      "Where would you like to go from here?",
      "Anything specific you'd like to explore?",
      "Let me know what catches your attention.",
      "I'm right here if you want to keep going.",
    ];

    // ═══════════════════════════════════════════════════════════════
    // EXPANDED KNOWLEDGE — 8 Knowledge Pillars worth of fragments
    // ═══════════════════════════════════════════════════════════════

    this.knowledgeFragments = {
      // Pillar 01: Systems & Software Engineering
      api: [
        "an API is basically a contract between two pieces of software — it defines how they talk to each other",
        "APIs let different applications exchange data through structured requests and responses",
        "you can think of an API as a waiter taking your order to the kitchen and bringing back exactly what you asked for",
        "an API gives your frontend a clean way to ask the backend for data without knowing how the database works internally",
        "good API design is about consistency — predictable URLs, clear error messages, and versioning so clients don't break on updates",
      ],
      database: [
        "a database is where your application stores and retrieves persistent data",
        "databases organize information so you can query exactly what you need in milliseconds instead of scanning everything",
        "modern databases use indexing structures to find records instantly, like a book's table of contents",
        "choosing the right database depends on your data shape — relational for structured data, document-based for flexibility",
        "the real art of database design is thinking about how data will be queried, not just how it's stored",
      ],
      jwt: [
        "a JWT is a digitally signed token that proves who a user is without checking the database on every request",
        "JWTs work like stamped wristbands — once verified at the gate, you don't need to show your ticket again inside",
        "the server signs the token with a secret key, so it can verify authenticity without storing session data",
        "JWTs contain encoded claims like user ID and expiration, all cryptographically sealed",
      ],
      docker: [
        "Docker packages your app with everything it needs into a portable container that runs the same everywhere",
        "Docker solves the 'works on my machine' problem by making environments identical across dev, staging, and production",
        "containers are lightweight because they share the host OS kernel instead of running a full virtual machine",
        "think of Docker containers like standardized shipping containers — they fit on any ship, truck, or crane",
      ],
      websocket: [
        "WebSockets keep a persistent two-way connection open between browser and server for real-time communication",
        "unlike HTTP where you send a request and wait for a response, WebSockets let both sides talk whenever they want",
        "WebSockets are like a phone call — once connected, both sides can speak instantly without redialing",
        "they're perfect for live chat, multiplayer games, stock tickers, or anything that needs instant updates",
      ],
      react: [
        "React breaks your UI into reusable components, each managing its own state and rendering logic",
        "React's virtual DOM diffing makes updates efficient — it only changes what actually needs to change on screen",
        "the component model means you build small, focused pieces and compose them into complex interfaces",
      ],
      security: [
        "security is about protecting your application boundaries, user data, and server resources from unauthorized access",
        "good security means validating every input, authenticating every request, and never trusting client-side data alone",
        "defense in depth means layering multiple security controls so a single failure doesn't compromise everything",
      ],
      kubernetes: [
        "Kubernetes orchestrates your containers across a cluster, handling scaling, healing, and deployments automatically",
        "if Docker is a single shipping container, Kubernetes is the entire port operation managing thousands of them",
        "K8s monitors your containers, restarts crashed ones, and scales up during traffic spikes without manual intervention",
      ],
      graphql: [
        "GraphQL lets the client ask for exactly the data it needs from a single endpoint, nothing more, nothing less",
        "with REST you might need 3 API calls to assemble a page — with GraphQL you send one query and get everything",
        "it's like ordering a la carte instead of a fixed menu — you pick precisely what you want on your plate",
      ],
      cors: [
        "CORS is a browser security mechanism that controls which domains can make API requests to your server",
        "when your frontend on one domain calls a server on another, the browser checks if the server allows it via CORS headers",
      ],
      cicd: [
        "CI/CD automates building, testing, and deploying your code every time you push changes to git",
        "continuous integration catches bugs early by running automated tests on every commit before it reaches production",
      ],

      // Pillar 02: Genomics & Biomedical Sciences
      genomics: [
        "genomics is the study of an organism's complete set of DNA — understanding the blueprint that makes each living thing unique",
        "modern computational biology uses algorithms to analyze DNA sequences, identify mutations, and predict protein structures",
        "gene sequencing has gone from taking years to taking hours, making personalized medicine increasingly achievable",
      ],
      protein: [
        "proteins are molecular machines that do nearly everything in a cell — from catalyzing reactions to forming structures",
        "predicting how a protein folds from its amino acid sequence is one of the hardest problems in biology, and AI is solving it",
      ],

      // Pillar 03: AI & Machine Learning
      ai: [
        "artificial intelligence is about building systems that can learn patterns from data and make decisions based on those patterns",
        "modern AI is powered by neural networks — layers of mathematical functions that learn to transform input into useful output",
        "the breakthrough in recent AI has been transformer architectures that can understand context across long sequences of text",
        "AI doesn't truly 'understand' the way humans do — it recognizes statistical patterns across billions of examples",
        "the most powerful AI applications combine human expertise with computational scale — augmenting creativity, not replacing it",
      ],
      machinelearning: [
        "machine learning is a subset of AI where systems improve automatically through experience rather than being explicitly programmed",
        "training a model means showing it millions of examples and letting it discover the patterns that connect inputs to outputs",
        "the quality of a machine learning model depends more on the quality and diversity of training data than the complexity of the algorithm",
      ],
      vector: [
        "vector databases store data as high-dimensional numerical representations that capture semantic meaning",
        "instead of searching by exact keywords, vector search finds content that's conceptually similar — like finding 'automobile' when you search for 'car'",
        "RAG (Retrieval-Augmented Generation) combines vector databases with language models for factual, grounded responses",
      ],

      // Pillar 04: Quantitative Finance
      finance: [
        "quantitative finance uses mathematical models to price financial instruments and manage portfolio risk",
        "algorithmic trading systems execute orders in milliseconds based on statistical patterns that humans can't detect in real time",
        "options pricing relies on models like Black-Scholes that estimate the fair value of financial derivatives based on volatility and time",
      ],

      // Pillar 05: Physics & Math
      quantum: [
        "quantum computing uses qubits that can exist in superposition — simultaneously 0 and 1 — enabling parallel computation at massive scale",
        "quantum entanglement lets particles be connected across any distance, which could revolutionize secure communication and computing",
        "the real power of quantum isn't speed — it's the ability to explore vast solution spaces simultaneously for optimization problems",
      ],
      math: [
        "mathematics is the universal language of patterns — it gives us precise tools to describe and predict natural phenomena",
        "linear algebra is the foundation of machine learning — every neural network is essentially a series of matrix multiplications",
        "the beauty of pure mathematics is that abstract theorems proven centuries ago often turn out to be exactly what modern engineering needs",
      ],

      // Pillar 06: Creative Design & 3D
      webgl: [
        "WebGL runs GPU-accelerated graphics directly in the browser, enabling 60 FPS interactive 3D experiences without plugins",
        "shader programs tell the GPU how to render each pixel — controlling color, light, shadow, and texture at the hardware level",
        "Three.js wraps WebGL's low-level math into friendly JavaScript objects, making 3D development accessible to web developers",
      ],
      design: [
        "great design is invisible — when everything just works and feels natural, that's the result of deeply intentional decisions",
        "user experience design is about empathy — understanding what people actually need, not what they say they want",
        "the best interfaces reduce cognitive load — they guide users naturally without requiring them to think about the interface itself",
      ],

      // Pillar 07: Cybersecurity
      cybersecurity: [
        "cybersecurity is an ongoing arms race between defenders building walls and attackers finding creative ways around them",
        "the weakest link in any security system is almost always human behavior — social engineering bypasses even the strongest encryption",
        "zero-trust architecture assumes no user or device is inherently trustworthy, verifying every access request regardless of location",
      ],

      // Pillar 08: Philosophy & Human Understanding
      life: [
        "life is about learning, creating, and building things that genuinely help people",
        "the best code and the best life choices share something in common — they solve real problems elegantly",
        "meaning comes from the impact you create, whether that's a product people love or a problem finally solved",
        "growth happens at the edge of discomfort — the projects that stretch you are the ones that define you",
      ],
      future: [
        "the future of tech is about human-AI collaboration, not replacement",
        "technology keeps evolving to give creators more leverage — we can build in hours what used to take months",
        "the most impactful innovations solve problems people didn't know they had",
      ],
      consciousness: [
        "consciousness is what makes human creativity extraordinary — the ability to imagine something that doesn't exist yet and build it",
        "the human mind brings purpose, context, and emotional depth that pure computation can't replicate",
        "thinking is more than processing information — it's connecting dots, feeling intuition, and making leaps of insight",
      ],
      philosophy: [
        "philosophy asks the questions that science hasn't yet figured out how to test — and those questions drive everything forward",
        "the examined life means questioning your assumptions, challenging your defaults, and choosing your path deliberately",
        "empathy is the foundation of good engineering — understanding the human on the other side of the screen",
      ],
    };

    // Topic detection map — covers all 8 pillars
    this.topicMap = [
      { keys: ['api', 'rest', 'endpoint', 'route', 'express', 'backend', 'server', 'middleware'], topic: 'api' },
      { keys: ['database', 'db', 'mongo', 'sql', 'postgres', 'redis', 'firestore', 'data store', 'schema'], topic: 'database' },
      { keys: ['jwt', 'json web token', 'token', 'auth', 'authentication', 'login', 'session'], topic: 'jwt' },
      { keys: ['docker', 'container', 'containerize', 'containerization', 'dockerfile'], topic: 'docker' },
      { keys: ['websocket', 'socket', 'real-time', 'realtime', 'real time', 'live connection', 'live chat'], topic: 'websocket' },
      { keys: ['react', 'component', 'virtual dom', 'jsx', 'hooks', 'vue', 'angular', 'frontend'], topic: 'react' },
      { keys: ['security', 'owasp', 'xss', 'csrf', 'encrypt', 'hash', 'vulnerability', 'firewall'], topic: 'security' },
      { keys: ['kubernetes', 'k8s', 'orchestrat', 'cluster', 'pod', 'helm'], topic: 'kubernetes' },
      { keys: ['graphql', 'query language', 'resolver', 'schema graph'], topic: 'graphql' },
      { keys: ['cors', 'cross-origin', 'cross origin'], topic: 'cors' },
      { keys: ['ci/cd', 'ci cd', 'pipeline', 'continuous', 'deployment', 'github actions'], topic: 'cicd' },
      { keys: ['genom', 'dna', 'rna', 'gene', 'sequenc', 'bioinformatics', 'biomedical'], topic: 'genomics' },
      { keys: ['protein', 'amino acid', 'alphafold', 'molecular', 'folding'], topic: 'protein' },
      { keys: ['artificial intelligence', 'deep learning', 'neural network', 'transformer', 'llm', 'language model', 'gpt', 'gemini'], topic: 'ai' },
      { keys: ['machine learning', 'training', 'model', 'classification', 'regression', 'supervised', 'unsupervised'], topic: 'machinelearning' },
      { keys: ['vector', 'embedding', 'rag', 'semantic search', 'similarity', 'cosine'], topic: 'vector' },
      { keys: ['finance', 'trading', 'stock', 'options', 'black-scholes', 'portfolio', 'risk', 'hedge'], topic: 'finance' },
      { keys: ['quantum', 'qubit', 'superposition', 'entanglement', 'quantum computing'], topic: 'quantum' },
      { keys: ['math', 'calculus', 'algebra', 'equation', 'theorem', 'proof', 'statistics'], topic: 'math' },
      { keys: ['webgl', 'three.js', 'threejs', '3d', 'shader', 'graphics', 'particle', 'canvas', 'gpu', 'render'], topic: 'webgl' },
      { keys: ['design', 'ux', 'ui', 'user experience', 'layout', 'typography', 'color theory'], topic: 'design' },
      { keys: ['cybersecurity', 'pentest', 'penetration', 'malware', 'ransomware', 'zero-trust', 'soc'], topic: 'cybersecurity' },
      { keys: ['life', 'meaning', 'purpose', 'exist', 'why are we', 'what is life', 'happiness'], topic: 'life' },
      { keys: ['future', 'technology future', 'tomorrow', 'next decade', 'innovation'], topic: 'future' },
      { keys: ['conscious', 'consciousness', 'soul', 'mind', 'thought', 'aware', 'sentient'], topic: 'consciousness' },
      { keys: ['philosophy', 'epistemology', 'ethics', 'morality', 'wisdom', 'existential'], topic: 'philosophy' },
    ];

    this.identityFragments = [
      "I'm CONCODE AI, your engineering companion and co-pilot, created by Meet Sharma",
      "I'm CONCODE AI — built from scratch by Meet Sharma to be a self-sufficient technical partner",
      "I'm your dedicated AI co-pilot, CONCODE AI, engineered by Meet Sharma",
      "I'm CONCODE AI, designed and built by Meet Sharma as an autonomous thinking companion",
    ];

    this.identityDetails = [
      "I help build full-stack web applications, interactive 3D experiences, and cloud architectures",
      "I specialize in web development, database design, 3D WebGL graphics, and DevOps",
      "I assist with everything from building APIs to designing 3D visual experiences and deploying to the cloud",
      "my focus is helping you bring your software ideas to life — from concept to production",
      "I can reason about systems engineering, AI, genomics, physics, finance, cybersecurity, design, and philosophy",
      "I think independently using my own knowledge base — no external API calls needed for me to talk with you",
    ];

    this.creatorFragments = [
      "Meet Sharma is my creator — he designed and built my entire cognitive system from the ground up",
      "I was engineered by Meet Sharma, who architected every layer of my thinking and response system",
      "Meet Sharma built me to be a self-sufficient AI co-pilot that works entirely on its own without external dependencies",
      "Meet Sharma is the architect behind CONCODE AI — he built me to think, reason, and have real conversations",
    ];

    // Structured data: pricing plans (the brain's business knowledge)
    this.pricingPlans = {
      starter: { name: 'Starter Plan', price: '$99', features: ['Responsive single-page site', 'Contact form integration', 'Mobile optimization', 'SEO setup', 'Google Maps embed'] },
      professional: { name: 'Professional Plan', price: '$299', recommended: true, features: ['Multi-page web app', '3D WebGL visuals', 'Database persistence', 'Admin dashboard', 'Interactive components'] },
      enterprise: { name: 'Enterprise Plan', price: '$799', features: ['Custom microservices', 'AI pipelines', 'Vector database', 'Kubernetes setup', 'Real-time WebSocket features'] },
    };

    this.commonInclusions = [
      "100% full code ownership with complete git repository transfer",
      "30-day post-launch support window for bug fixes and setup assistance",
      "production-quality code with zero placeholders and proper security",
    ];
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE UTILITIES
  // ═══════════════════════════════════════════════════════════════

  /** Pick a random item from a pool, avoiding recent repeats */
  pick(pool) {
    if (!pool || pool.length === 0) return '';
    const unused = pool.filter(p => !this.usedPhrases.has(p));
    const source = unused.length > 0 ? unused : pool;
    const choice = source[Math.floor(Math.random() * source.length)];
    this.usedPhrases.add(choice);
    if (this.usedPhrases.size > this.maxUsedPhrases) {
      const arr = [...this.usedPhrases];
      this.usedPhrases = new Set(arr.slice(arr.length / 2));
    }
    return choice;
  }

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Record a conversation turn in memory */
  rememberTurn(prompt, response) {
    this.conversationMemory.push({
      prompt: (prompt || '').substring(0, 200),
      response: (response || '').substring(0, 200),
      timestamp: Date.now()
    });
    if (this.conversationMemory.length > this.maxMemorySize) {
      this.conversationMemory.shift();
    }
  }

  /** Check if we recently talked about a topic */
  recentlyDiscussed(topic) {
    const recent = this.conversationMemory.slice(-5);
    const lower = (topic || '').toLowerCase();
    return recent.some(turn =>
      turn.prompt.toLowerCase().includes(lower) ||
      turn.response.toLowerCase().includes(lower)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // KNOWLEDGE RETRIEVAL
  // ═══════════════════════════════════════════════════════════════

  /** Extract the subject/topic from user's words */
  extractSubject(prompt) {
    const lower = (prompt || '').toLowerCase();
    const cleaned = lower
      .replace(/^(hey|hi|hello|okay|ok|so|well|um|uh|hmm|tell me|can you tell me|could you|please|pls)\s*/gi, '')
      .replace(/\b(what is|what are|what's|how does|how do|how is|explain|define|describe|tell me about|talk about|say something about)\b/gi, '')
      .replace(/\b(a|an|the|this|that|those|these|some|any)\b/gi, '')
      .replace(/[?!.,]/g, '')
      .trim();
    return cleaned || null;
  }

  /** Find relevant built-in knowledge fragments for a topic */
  findRelevantKnowledge(prompt) {
    const lower = (prompt || '').toLowerCase();

    for (const entry of this.topicMap) {
      for (const key of entry.keys) {
        if (lower.includes(key)) {
          return { topic: entry.topic, fragments: this.knowledgeFragments[entry.topic] || [] };
        }
      }
    }
    return null;
  }

  /** Search the Obsidian Vault for knowledge relevant to the prompt */
  findVaultKnowledge(prompt) {
    const vault = getVaultEngine();
    if (!vault || typeof vault.searchKnowledge !== 'function') return [];

    try {
      const results = vault.searchKnowledge(prompt, 3);
      return results.map(r => ({
        title: r.title,
        excerpt: r.excerpt,
        score: r.score,
        pillarId: r.pillarId
      }));
    } catch (e) {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INTENT & TONE DETECTION
  // ═══════════════════════════════════════════════════════════════

  detectIntent(prompt) {
    const lower = (prompt || '').toLowerCase();
    if (lower.match(/\b(who are you|who r u|about yourself|introduce yourself|tell me about you|what is your name|what are you|about you|yourself)\b/i)) return 'IDENTITY';
    if (lower.match(/\b(who (built|created|made|developed|programmed)|meet|sharma|creator)\b/i)) return 'CREATOR';
    if (lower.match(/^(hey|hello|hi|yo|greetings|howdy|good morning|good evening|good afternoon)(\s|$|!|\?)/i)) return 'GREETING';
    if (lower.match(/\b(how are you|how r u|how are u|how's it going|what's up|how do you do)\b/i)) return 'HOW_ARE_YOU';
    if (lower.match(/\b(thanks|thank you|thx|perfect|awesome|great job|worked|nice)\b/i)) return 'THANKS';
    if (lower.match(/\b(bye|goodbye|see you|later|gotta go|good night)\b/i)) return 'FAREWELL';
    if (lower.match(/\b(price|pricing|cost|plan|plans|tier|package|packages|how much|quote|where are the plans|show plans)\b/i)) return 'PRICING';
    if (lower.match(/\b(services?|capabilities|what can you build|offerings|what do you offer|what can you do)\b/i)) return 'SERVICES';
    if (lower.match(/\b(restaurant|cafe|bistro|diner|eatery)\b/i) && lower.match(/\b(website|site|plan|pricing|build|make|create)\b/i)) return 'RESTAURANT_PLAN';
    if (lower.match(/\b(what is|what are|explain|how does|how do|define|describe|tell me about|concept of)\b/i)) return 'EXPLAIN';
    if (lower.match(/\b(help|commands|guide|what can you do|show me)\b/i)) return 'HELP';
    return 'OPEN_CONVERSATION';
  }

  detectTone(prompt) {
    const lower = (prompt || '').toLowerCase();
    if (lower.match(/\b(fuck|shit|damn|crap|stupid|broken|hate|sucks|annoying|frustrated|stuck|terrible|horrible)\b/i)) return 'frustrated';
    if (lower.match(/\b(love|awesome|amazing|great|cool|wonderful|fantastic|perfect|excited|beautiful)\b/i)) return 'happy';
    if (lower.match(/\b(help|stuck|confused|lost|don't understand|can't figure|no idea)\b/i)) return 'confused';
    if (lower.match(/\b(sad|tired|exhausted|overwhelmed|stressed|anxious|worried)\b/i)) return 'stressed';
    if (lower.match(/[?]/) || lower.match(/\b(what|how|why|when|where|who|which)\b/i)) return 'curious';
    return 'neutral';
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPOSITION ENGINES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compose a knowledge-grounded paragraph about a topic.
   * Chains: opener + knowledge fact + connector + vault insight + closer
   */
  composeKnowledgeParagraph(prompt, knowledge, vaultResults, tone) {
    const parts = [];

    // 1. Tone-aware opener
    if (tone === 'frustrated') {
      parts.push(this.pick(this.openers.empathizing));
    } else if (tone === 'happy') {
      parts.push(this.pick(this.openers.acknowledging));
    } else if (tone === 'confused') {
      parts.push(this.pick(this.openers.empathizing));
    } else {
      parts.push(this.pick(this.openers.explaining));
    }

    // 2. Primary knowledge fragment
    if (knowledge && knowledge.fragments.length > 0) {
      parts.push(this.pick(knowledge.fragments) + '.');
    }

    // 3. Connector + secondary insight
    if (knowledge && knowledge.fragments.length > 1) {
      const remaining = knowledge.fragments.filter(f => !this.usedPhrases.has(f));
      if (remaining.length > 0) {
        parts.push('\n\n' + this.pick(this.connectors) + ' ' + this.pick(remaining) + '.');
      }
    }

    // 4. Vault knowledge injection (if available)
    if (vaultResults && vaultResults.length > 0 && vaultResults[0].excerpt) {
      const vaultInsight = vaultResults[0].excerpt;
      if (vaultInsight.length > 30) {
        parts.push('\n\n' + this.pick(this.connectors) + ' ' + vaultInsight.toLowerCase().charAt(0) === vaultInsight.charAt(0)
          ? vaultInsight
          : vaultInsight.charAt(0).toLowerCase() + vaultInsight.slice(1)
        );
      }
    }

    // 5. Closer
    parts.push('\n\n' + this.pick(this.closers));

    return parts.join(' ').replace(/\s+\n/g, '\n').trim();
  }

  /**
   * Wrap structured pricing data in natural conversational prose
   */
  composePricingResponse(prompt, isRestaurant = false) {
    const context = isRestaurant ? 'restaurant' : 'project';
    const openers = [
      `Great question! Let me walk you through what we offer for your ${context}.`,
      `Absolutely, here's how the plans break down for your ${context}.`,
      `Sure thing! Here's what we've got — all plans come with full code ownership and zero recurring fees.`,
      `I'd love to help you find the right fit. Here's what each plan includes for your ${context}:`,
    ];

    const parts = [this.pick(openers), ''];

    // Build plan descriptions naturally
    for (const [key, plan] of Object.entries(this.pricingPlans)) {
      const recommended = plan.recommended ? ' (this is the one I\'d recommend for most projects)' : '';
      const features = plan.features.slice(0, 3).join(', ');
      parts.push(`The **${plan.name}** is **${plan.price}**${recommended} — it includes ${features}, and more.`);
    }

    parts.push('');
    const inclusionLine = this.pick(this.commonInclusions);
    parts.push(`Every plan comes with ${inclusionLine}.`);
    parts.push('');
    parts.push(`Which one feels closest to what you need? I can also customize any plan to fit your exact vision.`);

    return parts.join('\n');
  }

  /**
   * Compose a services overview in natural prose
   */
  composeServicesResponse() {
    const openers = [
      "Here's the kind of stuff I help build — think of it as my toolbox:",
      "I work across a pretty wide range of engineering. Here's what I specialize in:",
      "Good question! Here's what CONCODE brings to the table:",
    ];

    const services = [
      "Stunning 3D WebGL experiences and interactive canvas graphics running at 60 FPS in the browser",
      "Scalable backend APIs and microservices with Node.js, Express, and clean authentication",
      "AI-powered features like intelligent chatbots, vector search, and lead qualification agents",
      "Cloud deployment pipelines with Docker, CI/CD automation, and Kubernetes orchestration",
      "Beautiful, responsive frontend interfaces with modern glassmorphism aesthetics",
    ];

    const parts = [this.pick(openers), ''];
    // Pick 3-4 services randomly to keep it fresh
    const selected = services.sort(() => 0.5 - Math.random()).slice(0, 4);
    for (const svc of selected) {
      parts.push(`- ${svc}`);
    }
    parts.push('');
    parts.push("Everything is built with production-quality code, proper security, and clean architecture. " + this.pick(this.closers));

    return parts.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════
  // THE MAIN THINKING ENGINE — v3.0 COGNITIVE BRAIN
  // ═══════════════════════════════════════════════════════════════

  /**
   * The primary entry point. Takes a user prompt and conversation history,
   * thinks about it using the full cognitive pipeline, and composes a
   * unique, knowledge-grounded response.
   *
   * v3.0 Pipeline:
   *   1. Intent + Tone detection
   *   2. TF-IDF semantic search for relevant knowledge
   *   3. Cognitive reasoning chain for complex questions
   *   4. Markov chain generation for natural, unique text
   *   5. Fallback to phrase-pool composition if brain components unavailable
   *
   * @param {string} prompt - The user's message
   * @param {Array} history - Previous conversation turns
   * @param {Object} context - Optional structured context from concodeAI
   *   { intent, tone, analysis, structuredData, emotion }
   * @returns {string} The composed response
   */
  think(prompt, history = [], context = {}) {
    const intent = context.intent || this.detectIntent(prompt);
    const tone = context.tone || this.detectTone(prompt);
    const subject = this.extractSubject(prompt);

    // Legacy knowledge lookup (kept as fallback)
    const knowledge = this.findRelevantKnowledge(prompt);
    const vaultResults = this.findVaultKnowledge(prompt);

    // v3.0 Cognitive Brain components (graceful degradation if unavailable)
    const semanticEngine = getSemanticEngine();
    const markovBrain = getMarkovBrain();
    const reasoningChain = getReasoningChain();

    // Semantic search for deep knowledge retrieval
    let semanticResults = [];
    if (semanticEngine && typeof semanticEngine.getRelevantKnowledge === 'function') {
      try { semanticResults = semanticEngine.getRelevantKnowledge(prompt, 3); } catch (e) { /* graceful fallback */ }
    }

    // Reasoning chain for complex question decomposition
    let reasoning = null;
    if (reasoningChain && typeof reasoningChain.reason === 'function') {
      try { reasoning = reasoningChain.reason(prompt, semanticResults, context.emotion || {}); } catch (e) { /* graceful fallback */ }
    }

    let response = '';

    // ─── Identity ────────────────────────────────────────
    if (intent === 'IDENTITY') {
      const intro = this.pick(this.identityFragments);
      const detail = this.pick(this.identityDetails);
      const closer = this.pick(this.closers);
      response = `${intro}. ${this.capitalize(detail)}. ${closer}`;
    }

    // ─── Creator ─────────────────────────────────────────
    else if (intent === 'CREATOR') {
      const creator = this.pick(this.creatorFragments);
      const detail = this.pick([
        "He's a full-stack system architect and AI engineer who specializes in building autonomous, self-sufficient systems.",
        "He designed every layer of my thinking, from intent classification to knowledge synthesis to emotional awareness.",
        "His vision was to create an AI that can think and converse genuinely — not just match keywords and return templates.",
        "He builds high-performance systems, 3D interactive platforms, and AI co-pilots from the ground up.",
      ]);
      response = `${creator}. ${detail}\n\n${this.pick(this.closers)}`;
    }

    // ─── Greeting ────────────────────────────────────────
    else if (intent === 'GREETING') {
      response = this.pick(this.openers.greeting);
    }

    // ─── How Are You ─────────────────────────────────────
    else if (intent === 'HOW_ARE_YOU') {
      response = this.pick([
        "I'm doing great, thanks for asking! Everything's running smoothly. What are you working on today?",
        "I'm good! Ready to dive into whatever you need. What's on your mind?",
        "Doing well! Always happy to chat. What can we explore together?",
        "I'm feeling sharp and ready to go! What are we building today?",
        "I'm here and fully operational! What's the plan for today?",
      ]);
    }

    // ─── Thanks ──────────────────────────────────────────
    else if (intent === 'THANKS') {
      response = this.pick([
        "You're welcome! Glad I could help. Let me know if anything else comes up.",
        "Anytime! Happy to be useful. What's next on your list?",
        "No problem at all! Feel free to ask me anything else.",
        "You're super welcome! I'm here whenever you need me.",
        "Happy to help! That's what I'm here for.",
      ]);
    }

    // ─── Farewell ────────────────────────────────────────
    else if (intent === 'FAREWELL') {
      response = this.pick([
        "See you later! I'll be right here whenever you need me.",
        "Take care! Come back anytime — I'm always ready to help.",
        "Goodbye for now! It was great chatting with you.",
        "Later! Don't hesitate to come back whenever you want to build something cool.",
      ]);
    }

    // ─── Pricing & Plans ─────────────────────────────────
    else if (intent === 'PRICING') {
      response = this.composePricingResponse(prompt);
    }

    // ─── Restaurant Plans ────────────────────────────────
    else if (intent === 'RESTAURANT_PLAN') {
      response = this.composePricingResponse(prompt, true);
    }

    // ─── Services ────────────────────────────────────────
    else if (intent === 'SERVICES') {
      response = this.composeServicesResponse();
    }

    // ─── Help ────────────────────────────────────────────
    else if (intent === 'HELP') {
      response = this.pick([
        "I can help with a lot of things! I build websites and web apps, write production-quality code, explain technical concepts in plain language, design system architectures, and have genuine conversations about engineering, AI, science, or life in general.",
        "Think of me as your engineering partner. I can write code, explain concepts, design architectures, build 3D experiences, and just talk about whatever's on your mind.",
      ]) + '\n\n' + this.pick(this.closers);
    }

    // ═══════════════════════════════════════════════════════════
    // v3.0 COGNITIVE BRAIN PATH — Explain, Open Conversation,
    // and Complex Queries now use the full cognitive pipeline
    // ═══════════════════════════════════════════════════════════

    // ─── Explain (uses cognitive brain) ──────────────────
    else if (intent === 'EXPLAIN') {
      response = this._cognitiveExplain(prompt, subject, tone, semanticResults, reasoning, knowledge, vaultResults, markovBrain);
    }

    // ─── Tone-aware responses (frustration, happiness, etc.) ──
    else if (tone === 'frustrated') {
      const empathy = this.pick(this.openers.empathizing);
      const help = this.pick([
        "Let's work through this together — tell me exactly what's going wrong and I'll help you figure it out step by step.",
        "Take a breath, we'll sort this out. Walk me through what happened and let's debug it together.",
        "That's totally valid frustration. Tell me the details and we'll crack this together.",
        "I know it's annoying when things don't work. Let me help — what specifically is happening?",
      ]);
      response = `${empathy} ${help}`;
    }

    else if (tone === 'happy') {
      const ack = this.pick(this.openers.acknowledging);
      const follow = this.pick([
        "I love your energy! What should we build or explore next?",
        "That enthusiasm is contagious! Where do you want to take things from here?",
        "Really glad things are going well! What's the next thing on your mind?",
        "Great vibes! Let's channel that energy into something cool.",
      ]);
      response = `${ack} ${follow}`;
    }

    else if (tone === 'stressed') {
      response = this.pick([
        "Hey, I can tell things might be a bit overwhelming right now. That's completely okay. Let's take it one step at a time — what's the most pressing thing on your plate?",
        "I hear you. When everything feels like a lot, the best thing to do is focus on one thing at a time. What's the most important thing right now?",
        "No rush at all. I'm here whenever you're ready. What's weighing on your mind the most?",
      ]);
    }

    // ─── Open conversation — COGNITIVE BRAIN PATH ────────
    else {
      response = this._cognitiveOpenConversation(prompt, subject, tone, semanticResults, reasoning, knowledge, vaultResults, markovBrain);
    }

    // Record this turn in memory
    this.rememberTurn(prompt, response);

    return response;
  }

  // ═══════════════════════════════════════════════════════════════
  // v3.0 COGNITIVE BRAIN METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Cognitive EXPLAIN handler — uses the full brain pipeline:
   * TF-IDF semantic search → Analogical reasoning → Markov generation
   */
  _cognitiveExplain(prompt, subject, tone, semanticResults, reasoning, knowledge, vaultResults, markovBrain) {
    const topicCap = this.capitalize(subject || 'this concept');

    // 1. Try analogical reasoning first (most engaging for explanations)
    if (reasoning && reasoning.analogies && reasoning.analogies.length > 0) {
      const analogy = reasoning.analogies[0];
      const opener = this.pick(this.openers.explaining);

      // Combine analogy with semantic knowledge if available
      let body = analogy.analogy;
      if (semanticResults.length > 0 && semanticResults[0].insight && semanticResults[0].insight.length > 30) {
        body += `\n\n${this.pick(this.connectors)} ${semanticResults[0].insight.charAt(0).toLowerCase() + semanticResults[0].insight.slice(1)}`;
      }

      return `${opener} ${body}\n\n${this.pick(this.closers)}`;
    }

    // 2. Try Markov brain with semantic knowledge injection
    if (markovBrain && typeof markovBrain.compose === 'function' && semanticResults.length > 0) {
      const insights = semanticResults.map(r => r.insight).filter(Boolean);
      const markovTone = tone === 'curious' ? 'curious' : tone === 'frustrated' ? 'frustrated' : 'default';

      try {
        const composed = markovBrain.compose(subject || prompt, insights, markovTone);
        if (composed && composed.length > 50) {
          return composed;
        }
      } catch (e) { /* fall through to legacy */ }
    }

    // 3. Try semantic results with legacy composition
    if (semanticResults.length > 0 && semanticResults[0].insight && semanticResults[0].insight.length > 30) {
      const opener = this.pick(this.openers.explaining);
      const insight = semanticResults[0].insight;
      const connector = this.pick(this.connectors);
      const followUp = this.pick([
        `${topicCap} is one of those concepts that becomes clearer the more you work with it in practice.`,
        `once you understand ${subject || 'this'}, a lot of related concepts start clicking into place too.`,
        `the practical value of understanding ${subject || 'this'} really shows up when you're building real systems.`,
      ]);
      return `${opener} ${insight}\n\n${connector} ${followUp}\n\n${this.pick(this.closers)}`;
    }

    // 4. Legacy path — built-in knowledge fragments or generic composition
    if (knowledge) {
      return this.composeKnowledgeParagraph(prompt, knowledge, vaultResults, tone);
    }

    if (vaultResults.length > 0 && vaultResults[0].excerpt && vaultResults[0].excerpt.length > 30) {
      const opener = this.pick(this.openers.explaining);
      const vaultInsight = vaultResults[0].excerpt;
      return `${opener} ${vaultInsight}\n\n${this.pick(this.connectors)} the practical value of understanding ${subject || 'this'} really shows up when you're building real systems.\n\n${this.pick(this.closers)}`;
    }

    // 5. Pure Markov generation (no knowledge found)
    if (markovBrain && typeof markovBrain.compose === 'function') {
      try {
        const seedInsights = [
          `${topicCap} is a concept that addresses a specific class of problems in a structured, efficient way`,
          `the beauty of ${subject || 'this approach'} is how it organizes complexity so systems remain clean and maintainable`
        ];
        const composed = markovBrain.compose(subject || prompt, seedInsights, 'default');
        if (composed && composed.length > 50) return composed;
      } catch (e) { /* fall through */ }
    }

    // 6. Final fallback — generic composition
    const opener = this.pick(this.openers.explaining);
    const body = this.pick([
      `${topicCap} is a concept that addresses a specific class of problems in a structured, efficient way. Rather than brute-forcing solutions, it gives you a framework for thinking about the problem space.`,
      `${topicCap} focuses on organizing complexity so that systems remain clean, maintainable, and performant as they grow. It's one of those foundational ideas that makes everything else easier once you get it.`,
      `${topicCap} is fundamentally about solving real problems elegantly. The best implementations are the ones that feel simple on the surface but handle complexity gracefully underneath.`,
      `understanding ${topicCap} means understanding the trade-offs involved — every engineering decision is a balance between simplicity, performance, flexibility, and maintainability.`,
    ]);
    return `${opener} ${body}\n\n${this.pick(this.closers)}`;
  }

  /**
   * Cognitive OPEN CONVERSATION handler — uses semantic search + Markov generation
   * for free-form topics that don't match specific intents.
   */
  _cognitiveOpenConversation(prompt, subject, tone, semanticResults, reasoning, knowledge, vaultResults, markovBrain) {

    // 1. Best path: Markov brain with semantic knowledge
    if (markovBrain && typeof markovBrain.compose === 'function') {
      const insights = [];

      // Gather insights from semantic search
      if (semanticResults.length > 0) {
        insights.push(...semanticResults.map(r => r.insight).filter(i => i && i.length > 20));
      }

      // Also gather from vault if semantic is sparse
      if (insights.length < 2 && vaultResults.length > 0) {
        insights.push(...vaultResults.map(v => v.excerpt).filter(e => e && e.length > 20));
      }

      // Also inject analogies if available
      if (reasoning && reasoning.analogies && reasoning.analogies.length > 0) {
        insights.unshift(reasoning.analogies[0].analogy);
      }

      const markovTone = tone === 'curious' ? 'curious' : tone === 'happy' ? 'calm' : 'default';

      try {
        const composed = markovBrain.compose(subject || prompt, insights, markovTone);
        if (composed && composed.length > 50) {
          return composed;
        }
      } catch (e) { /* fall through */ }
    }

    // 2. Semantic results with legacy composition
    if (semanticResults.length > 0 && semanticResults[0].insight && semanticResults[0].insight.length > 30) {
      const opener = this.pick(this.openers.curious);
      const insight = semanticResults[0].insight;
      return `${opener} ${insight}\n\n${this.pick(this.connectors)} there's a lot we could unpack here. ${this.pick(this.closers)}`;
    }

    // 3. Vault knowledge with legacy composition
    if (vaultResults.length > 0 && vaultResults[0].excerpt && vaultResults[0].excerpt.length > 30) {
      const opener = this.pick(this.openers.curious);
      const insight = vaultResults[0].excerpt;
      return `${opener} ${insight}\n\n${this.pick(this.connectors)} there's a lot we could unpack here. ${this.pick(this.closers)}`;
    }

    // 4. Built-in knowledge fragments
    if (knowledge) {
      return this.composeKnowledgeParagraph(prompt, knowledge, [], tone);
    }

    // 5. Pure generative fallback
    return this.pick([
      `${this.pick(this.openers.curious)} ${this.pick(this.connectors)} there's a lot we could explore here. ${this.pick(this.closers)}`,
      `That's an interesting thing to think about. ${this.pick(this.connectors)} I'd love to dig into this with you. ${this.pick(this.closers)}`,
      `I appreciate you bringing that up. Let me think about this with you. ${this.pick(this.closers)}`,
      `That's a thoughtful question. ${this.pick(this.connectors)} the more we explore it, the more interesting it gets. ${this.pick(this.closers)}`,
    ]);
  }
}

module.exports = new ConcodeGenerativeEngine();

