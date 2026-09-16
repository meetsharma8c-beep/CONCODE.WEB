/**
 * CONCODE Native Brain — Cognitive Reasoning Chain v1.0
 * File: utils/concodeReasoningChain.js
 *
 * PURPOSE: Decompose complex questions into sub-problems, apply
 * analogical reasoning, and produce visible chain-of-thought traces.
 * This is what makes the native brain THINK rather than just retrieve.
 *
 * FEATURES:
 *  1. Question Decomposition — breaks multi-part questions into atomic sub-queries
 *  2. Analogical Reasoning — maps unfamiliar concepts to known ones
 *  3. Chain-of-Thought Logging — produces visible reasoning steps
 *  4. Complexity Classification — determines if a query is simple, compound, or complex
 *  5. Follow-up Question Generation — suggests next logical questions
 *  6. Knowledge Gap Detection — identifies when the brain lacks information
 */

class ConcodeReasoningChain {
  constructor() {
    this.version = '1.0';

    // Analogy knowledge base — maps technical concepts to human-relatable metaphors
    this.analogies = new Map([
      // Software Architecture
      ['api', 'Think of an API like a waiter in a restaurant — you give your order (request), the waiter takes it to the kitchen (server), and brings back your food (response). You never need to know how the kitchen works.'],
      ['database', 'A database is like a massive filing cabinet with an incredible index system — instead of searching through every drawer, you can instantly find exactly the file you need.'],
      ['docker', 'Docker is like a shipping container — no matter where it goes (your laptop, the cloud, a server), everything inside stays exactly the same and works the same way.'],
      ['kubernetes', 'If Docker is a shipping container, Kubernetes is the entire port authority — it decides where containers go, replaces damaged ones, and scales up during busy seasons.'],
      ['websocket', 'A WebSocket is like a phone call — once you connect, both sides can talk whenever they want without hanging up and redialing every time.'],
      ['jwt', 'A JWT is like a tamper-proof wristband at a concert — once the bouncer verifies you at the gate, you can move freely inside without showing your ticket again.'],
      ['cache', 'Caching is like keeping your most-used tools on your desk instead of walking to the toolshed every time you need them — it saves enormous time for frequent operations.'],
      ['cors', 'CORS is like a building security badge — your frontend lives in one building and needs permission to enter the backend building across the street.'],
      ['middleware', 'Middleware is like a series of security checkpoints — each one inspects, validates, or transforms the request before it reaches its destination.'],
      ['microservice', 'Microservices are like specialized departments in a company — each handles one function independently, and they communicate through internal memos (APIs).'],
      ['rest', 'REST is like a menu at a restaurant — each dish (resource) has a clear name and you use standard actions (GET to read, POST to create, PUT to update, DELETE to remove).'],
      ['graphql', 'GraphQL is like ordering a la carte — instead of getting a fixed meal (REST endpoint), you specify exactly what items you want on your plate, nothing more, nothing less.'],
      ['orm', 'An ORM is like a translator who converts your language into the database language — you speak JavaScript, the ORM speaks SQL for you.'],

      // AI & ML
      ['neural network', 'A neural network is like a massive team of people passing messages and making small decisions — individually simple, but collectively capable of recognizing patterns humans can\'t see.'],
      ['embedding', 'An embedding converts words or images into numbers that capture their meaning — words that mean similar things get similar numbers, like plotting cities on a map where nearby cities are close together.'],
      ['rag', 'RAG is like an open-book exam — instead of memorizing everything, the AI looks up relevant facts from a knowledge base before answering.'],
      ['transformer', 'A transformer model is like a reader who can look at every word in a sentence simultaneously and understand how they all relate to each other, rather than reading left to right.'],
      ['fine-tuning', 'Fine-tuning is like taking a general athlete and training them specifically for one sport — the base skills transfer, but the specialization makes them excellent at that particular game.'],
      ['vector', 'Vector search is like finding songs that "feel" similar — instead of matching exact titles, it finds songs with similar vibes, tempo, and mood.'],

      // DevOps
      ['ci/cd', 'CI/CD is like an automated assembly line in a factory — every time you add a new part (code), the line automatically tests it, checks for defects, and delivers the finished product.'],
      ['load balancer', 'A load balancer is like a traffic officer at a busy intersection — it directs incoming cars (requests) to the least crowded lanes (servers) so nothing gets jammed.'],
      ['container', 'A container packages your app like a lunchbox — everything you need is inside, self-contained, and ready to go anywhere.'],

      // Security
      ['encryption', 'Encryption is like writing a letter in a secret code that only the intended recipient has the key to decode — even if someone intercepts it, they can\'t read it.'],
      ['hashing', 'Hashing is like a fingerprint for data — it creates a unique, fixed-size signature that identifies the original data but can\'t be reversed back to it.'],
      ['oauth', 'OAuth is like a valet key — it gives limited access to specific functions without handing over the master key to your entire system.'],
    ]);

    // Question decomposition patterns
    this.decompositionPatterns = [
      { pattern: /how (?:do|can|should) (?:i|we|you) (?:build|create|make|implement) (.+) with (.+)/i, type: 'BUILD_WITH', parts: ['implementation of $1', 'integration with $2'] },
      { pattern: /how (?:do|can|should) (?:i|we|you) (?:build|create|make|implement) (.+) (?:that|which) (.+)/i, type: 'BUILD_THAT', parts: ['core implementation of $1', 'requirement: $2'] },
      { pattern: /what (?:is|are) (.+) and (?:how|why) (.+)/i, type: 'DEFINE_AND_HOW', parts: ['definition of $1', '$2'] },
      { pattern: /(?:compare|difference|vs|versus) (?:between )?(.+) (?:and|vs|versus) (.+)/i, type: 'COMPARE', parts: ['understanding $1', 'understanding $2', 'comparison between $1 and $2'] },
      { pattern: /how (?:do|does|can) (.+) (?:work|function|operate)/i, type: 'HOW_WORKS', parts: ['mechanism of $1', 'practical application of $1'] },
      { pattern: /(?:should|when) (?:i|we|you) use (.+) (?:or|instead of|versus) (.+)/i, type: 'WHEN_TO_USE', parts: ['use cases for $1', 'use cases for $2', 'decision criteria'] },
      { pattern: /(?:what|which) (?:is|are) the best (.+) for (.+)/i, type: 'BEST_FOR', parts: ['options for $1', 'requirements of $2', 'matching criteria'] },
    ];
  }

  // ═══════════════════════════════════════════════════════════════
  // QUESTION DECOMPOSITION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Decompose a complex question into atomic sub-queries.
   * @param {string} question - The user's question
   * @returns {{ type: string, subQueries: string[], complexity: string, originalQuestion: string }}
   */
  decompose(question) {
    const lower = (question || '').toLowerCase().trim();
    const wordCount = lower.split(/\s+/).length;

    // Classify complexity
    let complexity = 'simple';
    if (wordCount > 15 || lower.includes(' and ') || lower.includes(' with ') || lower.includes(' that ')) {
      complexity = 'compound';
    }
    if ((lower.match(/ and /g) || []).length >= 2 || wordCount > 25) {
      complexity = 'complex';
    }

    // Try pattern-based decomposition
    for (const dp of this.decompositionPatterns) {
      const match = lower.match(dp.pattern);
      if (match) {
        const subQueries = dp.parts.map(part => {
          let resolved = part;
          for (let i = 1; i < match.length; i++) {
            resolved = resolved.replace(`$${i}`, match[i].trim());
          }
          return resolved;
        });

        return {
          type: dp.type,
          subQueries,
          complexity,
          originalQuestion: question
        };
      }
    }

    // Keyword-based decomposition for compound questions
    if (complexity !== 'simple') {
      const subQueries = this._extractSubTopics(lower);
      if (subQueries.length > 1) {
        return {
          type: 'KEYWORD_DECOMPOSITION',
          subQueries,
          complexity,
          originalQuestion: question
        };
      }
    }

    // Simple question — no decomposition needed
    return {
      type: 'SIMPLE',
      subQueries: [question],
      complexity: 'simple',
      originalQuestion: question
    };
  }

  /** Extract sub-topics from a compound question using conjunctions */
  _extractSubTopics(text) {
    const parts = text
      .split(/\b(?:and|also|plus|additionally|then|after that|as well as)\b/)
      .map(p => p.trim())
      .filter(p => p.length > 5);

    if (parts.length > 1) return parts;

    // Try splitting on commas
    const commaParts = text
      .split(/,/)
      .map(p => p.trim())
      .filter(p => p.length > 8);

    if (commaParts.length > 1) return commaParts;

    return [text];
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALOGICAL REASONING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find relevant analogies for concepts in the query.
   * @param {string} query - The user's question
   * @returns {Array<{concept: string, analogy: string}>}
   */
  findAnalogies(query) {
    const lower = (query || '').toLowerCase();
    const matches = [];

    for (const [concept, analogy] of this.analogies.entries()) {
      if (lower.includes(concept)) {
        matches.push({ concept, analogy });
      }
    }

    // Also check for partial matches (e.g., "caching" matches "cache")
    if (matches.length === 0) {
      for (const [concept, analogy] of this.analogies.entries()) {
        const stem = concept.replace(/ing$|s$|ed$/, '');
        if (lower.includes(stem) && stem.length > 3) {
          matches.push({ concept, analogy });
        }
      }
    }

    return matches;
  }

  // ═══════════════════════════════════════════════════════════════
  // CHAIN-OF-THOUGHT REASONING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute a full reasoning chain for a query.
   * Returns structured reasoning steps + the synthesized understanding.
   * 
   * @param {string} query - The user's question
   * @param {Array} knowledgeResults - Results from semantic engine search
   * @param {Object} emotionData - Current emotional state data
   * @returns {{ steps: Array, synthesis: string, analogies: Array, followUps: string[], hasKnowledgeGap: boolean }}
   */
  reason(query, knowledgeResults = [], emotionData = {}) {
    const startTime = Date.now();
    const steps = [];

    // Step 1: Parse and understand the question
    const decomposition = this.decompose(query);
    steps.push({
      step: 1,
      name: 'Question Understanding',
      detail: `Classified as ${decomposition.complexity} query (${decomposition.type}). ${decomposition.subQueries.length > 1 ? `Decomposed into ${decomposition.subQueries.length} sub-questions.` : 'Single-focus query.'}`,
      durationMs: Date.now() - startTime
    });

    // Step 2: Knowledge retrieval assessment
    const step2Start = Date.now();
    const hasKnowledge = knowledgeResults.length > 0 && knowledgeResults[0] && knowledgeResults[0].score > 0.05;
    const topKnowledgeSource = hasKnowledge ? knowledgeResults[0].source : 'none';
    const knowledgeCoverage = hasKnowledge
      ? `Found ${knowledgeResults.length} relevant knowledge fragment(s) from ${topKnowledgeSource}`
      : 'No directly matching knowledge found — will use analogical reasoning and generative composition';

    steps.push({
      step: 2,
      name: 'Knowledge Retrieval',
      detail: knowledgeCoverage,
      durationMs: Date.now() - step2Start
    });

    // Step 3: Analogical reasoning
    const step3Start = Date.now();
    const analogies = this.findAnalogies(query);
    if (analogies.length > 0) {
      steps.push({
        step: 3,
        name: 'Analogical Reasoning',
        detail: `Found ${analogies.length} relatable analogy/analogies for: ${analogies.map(a => a.concept).join(', ')}`,
        durationMs: Date.now() - step3Start
      });
    } else {
      steps.push({
        step: 3,
        name: 'Analogical Reasoning',
        detail: 'No stored analogies matched — will compose explanation from knowledge fragments',
        durationMs: Date.now() - step3Start
      });
    }

    // Step 4: Emotional context integration
    const step4Start = Date.now();
    const emotionName = emotionData.name || 'Neutral';
    const strategy = emotionData.empatheticStrategy || 'Provide clear, friendly response';
    steps.push({
      step: 4,
      name: 'Emotional Context',
      detail: `User state: ${emotionName}. Strategy: ${strategy}`,
      durationMs: Date.now() - step4Start
    });

    // Step 5: Response synthesis planning
    const step5Start = Date.now();
    let synthesisStrategy;
    if (hasKnowledge && analogies.length > 0) {
      synthesisStrategy = 'Combining factual knowledge with relatable analogies for deep understanding';
    } else if (hasKnowledge) {
      synthesisStrategy = 'Building response from retrieved knowledge with contextual insights';
    } else if (analogies.length > 0) {
      synthesisStrategy = 'Using analogical reasoning to explain concept through familiar metaphors';
    } else {
      synthesisStrategy = 'Composing generative response from learned language patterns';
    }

    steps.push({
      step: 5,
      name: 'Response Synthesis',
      detail: synthesisStrategy,
      durationMs: Date.now() - step5Start
    });

    // Generate follow-up questions
    const followUps = this._generateFollowUps(query, decomposition);

    // Detect knowledge gaps
    const hasKnowledgeGap = !hasKnowledge && analogies.length === 0;

    return {
      steps,
      decomposition,
      analogies,
      followUps,
      hasKnowledgeGap,
      synthesisStrategy,
      totalReasoningMs: Date.now() - startTime
    };
  }

  /** Generate logical follow-up questions based on the current query */
  _generateFollowUps(query, decomposition) {
    const lower = (query || '').toLowerCase();
    const followUps = [];

    // Topic-specific follow-ups
    if (lower.includes('api') || lower.includes('backend')) {
      followUps.push('How do I add authentication to this API?');
      followUps.push('What about rate limiting and security?');
    }
    if (lower.includes('database') || lower.includes('mongo') || lower.includes('sql')) {
      followUps.push('How should I design the schema for scalability?');
      followUps.push('What indexing strategy should I use?');
    }
    if (lower.includes('docker') || lower.includes('deploy')) {
      followUps.push('How do I set up CI/CD for automatic deployment?');
      followUps.push('What about monitoring and logging in production?');
    }
    if (lower.includes('auth') || lower.includes('security')) {
      followUps.push('How do I handle password reset flows?');
      followUps.push('What are the OWASP top 10 I should guard against?');
    }
    if (lower.includes('websocket') || lower.includes('real-time')) {
      followUps.push('How do I handle reconnection and dropped connections?');
      followUps.push('What about scaling WebSockets across multiple servers?');
    }
    if (lower.includes('react') || lower.includes('frontend') || lower.includes('ui')) {
      followUps.push('How do I optimize rendering performance?');
      followUps.push('What state management pattern should I use?');
    }

    // Generic follow-ups if none matched
    if (followUps.length === 0) {
      followUps.push('Can you show me a code example for this?');
      followUps.push('What are the common pitfalls to avoid?');
      followUps.push('How does this scale under high load?');
    }

    return followUps.slice(0, 4);
  }

  /**
   * Format reasoning steps into a human-readable thought trace string.
   * @param {Array} steps - The reasoning steps from reason()
   * @returns {string} Formatted trace
   */
  formatThoughtTrace(steps) {
    return steps.map(s => `[Step ${s.step}] ${s.name}: ${s.detail} (${s.durationMs}ms)`).join('\n');
  }
}

module.exports = new ConcodeReasoningChain();
