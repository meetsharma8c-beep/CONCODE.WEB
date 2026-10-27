/**
 * CONCODE AI — Automated Obsidian Emotional Cognitive Graph Supervision Engine
 * File: utils/obsidianEmotionalGraphSync.js
 * 
 * FEATURES:
 *  1. Affective Computing Sentiment Classifier (8 Human Emotional Dimensions)
 *  2. Valence-Arousal-Dominance (VAD) Dimensional Model
 *  3. Empathetic Behavioral Tone Adapter
 *  4. Supervised Automated Obsidian Graph Sync:
 *     - Updates HUMAN_EMOTION_COGNITIVE_GRAPH.md in Obsidian Vault
 *     - Maintains [[Emotional State - Joy]], [[Emotional State - Frustration]], etc.
 *     - Generates/Updates emotional_cognitive_map.canvas visually with color-coded nodes
 *     - Updates [[Human Psychology Profile - User]] node tracking emotional progression
 */

const fs = require('fs');
const path = require('path');

class ObsidianEmotionalGraphSync {
  constructor(options = {}) {
    const homedir = require('os').homedir();
    this.primaryVaultPath = options.primaryVaultPath || process.env.OBSIDIAN_VAULT_PATH || 
      (fs.existsSync('/Users/ms/Documents/Obsidian Vault') ? '/Users/ms/Documents/Obsidian Vault' : path.join(homedir, 'Documents', 'Obsidian Vault'));
    this.workspaceVaultPath = options.workspaceVaultPath || path.resolve(__dirname, '..');
    
    this.emotionRegistry = {
      JOY: { name: 'Joy & Satisfaction', color: '#10b981', symbol: '[JOY]', wikilink: '[[Emotional State - Joy]]' },
      FRUSTRATION: { name: 'Frustration & Friction', color: '#ef4444', symbol: '[FRUSTRATION]', wikilink: '[[Emotional State - Frustration]]' },
      CURIOSITY: { name: 'Curiosity & Exploration', color: '#8b5cf6', symbol: '[CURIOSITY]', wikilink: '[[Emotional State - Curiosity]]' },
      URGENCY: { name: 'Urgency & High Stress', color: '#f59e0b', symbol: '[URGENCY]', wikilink: '[[Emotional State - Urgency]]' },
      ANXIETY: { name: 'Anxiety & Uncertainty', color: '#ec4899', symbol: '[ANXIETY]', wikilink: '[[Emotional State - Anxiety]]' },
      CALM: { name: 'Calm & Focused Flow', color: '#06b6d4', symbol: '[CALM]', wikilink: '[[Emotional State - Calm]]' },
      EMPATHY: { name: 'Empathy & Connection', color: '#3b82f6', symbol: '[EMPATHY]', wikilink: '[[Emotional State - Empathy]]' },
      CREATIVITY: { name: 'Creativity & Inspiration', color: '#a855f7', symbol: '[CREATIVITY]', wikilink: '[[Emotional State - Creativity]]' }
    };

    this.sessionHistory = [];
    try {
      this.ensureObsidianFilesExist();
    } catch (e) {
      console.warn('[ObsidianEmotionalGraphSync] Non-fatal init file sync warning:', e.message);
    }
  }

  /**
   * Evaluates text for human emotion, sentiment valence (-1.0 to 1.0), and arousal (0.0 to 1.0).
   */
  analyzeHumanEmotion(inputText) {
    const rawText = (inputText || '').toLowerCase();
    const text = rawText
      .replace(/error\s*(handling|boundary|middleware|status|code|handler|log|logging|page|check|checking|catcher)/gi, 'tech_err_pattern')
      .replace(/try\s*catch/gi, 'tech_try_catch')
      .replace(/debug(ging)?\s*(tool|script|mode|flag|option)/gi, 'tech_debug_tool');
    
    // Emotion keyword & pattern lexicon
    const lexicons = {
      JOY: ['happy', 'great', 'awesome', 'amazing', 'love', 'cool', 'thanks', 'perfect', 'yay', 'wonderful', 'excellent', 'worked', 'nice', 'good'],
      FRUSTRATION: ['stuck', 'error', 'broken', 'fail', 'hate', 'bad', 'hard', 'not working', 'annoying', 'wrong', 'frustrated', 'stupid', 'bug', 'crash'],
      CURIOSITY: ['how', 'why', 'what if', 'wonder', 'explain', 'curious', 'understand', 'explore', 'learn', 'tell me', 'can we', 'deep dive', 'show me'],
      URGENCY: ['quick', 'fast', 'asap', 'urgent', 'now', 'deadline', 'immediately', 'critical', 'emergency', 'hurry'],
      ANXIETY: ['scared', 'worried', 'confused', 'dont know', 'uncertain', 'risk', 'afraid', 'lost', 'stuck', 'nervous'],
      CALM: ['clean', 'simple', 'smooth', 'fine', 'clear', 'okay', 'peace', 'steady', 'continue', 'proceed'],
      EMPATHY: ['feel', 'human', 'friend', 'emotion', 'heart', 'care', 'listen', 'support', 'trust', 'talk', 'relationship'],
      CREATIVITY: ['design', 'build', 'create', 'idea', 'vision', 'imagine', 'style', 'concept', 'innovate', 'future', 'art']
    };

    const scores = {};
    let totalHits = 0;

    for (const [key, keywords] of Object.entries(lexicons)) {
      let count = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) count++;
      }
      scores[key] = count;
      totalHits += count;
    }

    // Determine primary emotion
    let primaryEmotionKey = 'CALM';
    let maxScore = -1;

    for (const [key, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        primaryEmotionKey = key;
      }
    }

    // Fallback heuristic based on question mark / length
    if (maxScore === 0) {
      if (text.includes('?')) primaryEmotionKey = 'CURIOSITY';
      else if (text.length > 150) primaryEmotionKey = 'CREATIVITY';
      else primaryEmotionKey = 'CALM';
    }

    // Calculate Valence (-1.0 to 1.0) & Arousal (0.0 to 1.0)
    let valence = 0.2; // default mild positive
    let arousal = 0.4; // default moderate

    switch (primaryEmotionKey) {
      case 'JOY': valence = 0.9; arousal = 0.7; break;
      case 'CREATIVITY': valence = 0.8; arousal = 0.8; break;
      case 'EMPATHY': valence = 0.7; arousal = 0.5; break;
      case 'CURIOSITY': valence = 0.5; arousal = 0.6; break;
      case 'CALM': valence = 0.3; arousal = 0.2; break;
      case 'URGENCY': valence = -0.1; arousal = 0.95; break;
      case 'ANXIETY': valence = -0.5; arousal = 0.7; break;
      case 'FRUSTRATION': valence = -0.8; arousal = 0.85; break;
    }

    const emotionObj = this.emotionRegistry[primaryEmotionKey];

    // Generate Empathetic Behavioral Instruction for AI response
    let empatheticStrategy = 'Maintain friendly, helpful tone.';
    if (primaryEmotionKey === 'FRUSTRATION' || primaryEmotionKey === 'ANXIETY') {
      empatheticStrategy = 'User shows cognitive stress. Provide calming, highly supportive reassurance first, then break the solution into simple, easy steps.';
    } else if (primaryEmotionKey === 'URGENCY') {
      empatheticStrategy = 'User is under time pressure. Be direct, immediate, and razor-focused on the exact solution without unnecessary filler.';
    } else if (primaryEmotionKey === 'CURIOSITY' || primaryEmotionKey === 'CREATIVITY') {
      empatheticStrategy = 'User is in an expansive creative mindset. Match their enthusiasm, suggest exciting possibilities, and encourage deep exploration.';
    } else if (primaryEmotionKey === 'JOY') {
      empatheticStrategy = 'User is feeling accomplished. Celebrate their success warmly and enthusiastically!';
    }

    // Detect referenced architecture and Omni-Domain nodes in user text for bi-directional graph linking
    const referencedNodes = [];
    if (text.match(/\b(server|express|route|endpoint|http|backend|code|programming|compiler|rust|cpp|c\+\+)\b/i)) referencedNodes.push('[[01_Systems_Software_Engineering]]');
    if (text.match(/\b(gene|genomics|dna|rna|protein|biology|bioinformatics|medicine|health|medical|disease)\b/i)) referencedNodes.push('[[02_Genomics_Biomedical_Sciences]]');
    if (text.match(/\b(ai|llm|neural|deep learning|machine learning|model|transformer|vision|robotics|agent)\b/i)) referencedNodes.push('[[03_AI_Machine_Learning_Core]]');
    if (text.match(/\b(finance|quant|trading|stock|market|money|crypto|economy|portfolio|black-scholes)\b/i)) referencedNodes.push('[[04_Quant_Finance_Economics]]');
    if (text.match(/\b(physics|math|calculus|equation|quantum|data science|statistics|matrix|algebra)\b/i)) referencedNodes.push('[[05_Physics_Math_Data_Science]]');
    if (text.match(/\b(design|3d|animation|webgl|vfx|art|music|audio|ui|ux|graphics|video)\b/i)) referencedNodes.push('[[06_Creative_Design_Audio_3D]]');
    if (text.match(/\b(security|cyber|hack|encryption|crypto|auth|password|jwt|vulnerability|firewall)\b/i)) referencedNodes.push('[[07_Cybersecurity_Cryptography]]');
    if (text.match(/\b(life|mind|philosophy|emotion|feeling|human|thought|ethics|psychology|soul)\b/i)) referencedNodes.push('[[08_Universal_Human_Philosophy]]');

    // Architecture specific fallbacks
    if (text.match(/\b(voice|speech|audio|tts|stt|microphone|mic)\b/i)) referencedNodes.push('[[Voice_Assistant_Agent]]');
    if (text.match(/\b(obsidian|graph|vault|canvas|wikilink)\b/i)) referencedNodes.push('[[Obsidian_Emotional_Graph_Sync]]');

    // Dynamic Speech Synthesis (TTS) Pitch & Rate Modulation
    let ttsPitch = 1.0;
    let ttsRate = 1.0;
    if (primaryEmotionKey === 'FRUSTRATION' || primaryEmotionKey === 'ANXIETY') {
      ttsPitch = 0.95; // Calming lower pitch
      ttsRate = 0.95;  // Measured, reassuring pace
    } else if (primaryEmotionKey === 'URGENCY') {
      ttsPitch = 1.0;
      ttsRate = 1.15;  // Fast, direct delivery
    } else if (primaryEmotionKey === 'JOY' || primaryEmotionKey === 'CREATIVITY') {
      ttsPitch = 1.05; // Energetic, enthusiastic pitch
      ttsRate = 1.05;  // Lively pace
    }

    return {
      key: primaryEmotionKey,
      name: emotionObj.name,
      symbol: emotionObj.symbol,
      color: emotionObj.color,
      wikilink: emotionObj.wikilink,
      valence,
      arousal,
      empatheticStrategy,
      referencedNodes: [...new Set(referencedNodes)],
      ttsSpeechParams: { pitch: ttsPitch, rate: ttsRate },
      scores
    };
  }

  /**
   * Processes a conversation turn: analyzes emotion and updates Obsidian graph nodes automatically.
   */
  processTurn(userInput, botReply, sessionId = 'default') {
    const emotionAnalysis = this.analyzeHumanEmotion(userInput);
    const timestamp = new Date().toISOString();
    const timeShort = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const turnData = {
      timestamp,
      timeShort,
      sessionId,
      userInput: (userInput || '').slice(0, 300),
      botReplySnippet: (botReply || '').slice(0, 300),
      emotion: emotionAnalysis
    };

    this.sessionHistory.push(turnData);
    if (this.sessionHistory.length > 50) this.sessionHistory.shift();

    // Trigger Supervised Automated Graph Addition asynchronously in background
    setImmediate(() => {
      try {
        this.syncObsidianGraph(turnData);
      } catch (err) {
        console.warn('[ObsidianEmotionalGraphSync] Sync warning:', err.message);
      }
    });

    return emotionAnalysis;
  }

  /**
   * Supervised Automated Addition & Syncing of Obsidian Notes & Canvas.
   */
  syncObsidianGraph(turnData) {
    const vaultPaths = [this.primaryVaultPath, this.workspaceVaultPath].filter(p => fs.existsSync(p));

    for (const vault of vaultPaths) {
      // 1. Update master HUMAN_EMOTION_COGNITIVE_GRAPH.md
      const graphFile = path.join(vault, 'HUMAN_EMOTION_COGNITIVE_GRAPH.md');
      this.appendMasterGraphNode(graphFile, turnData);

      // 2. Ensure individual Emotion Notes exist
      this.ensureEmotionNodesExist(vault);

      // 3. Update User Psychology Profile note
      const profileFile = path.join(vault, 'Human_Psychology_Profile_User.md');
      this.updatePsychologyProfileNote(profileFile, turnData);

      // 4. Update Obsidian Canvas (emotional_cognitive_map.canvas)
      const canvasFile = path.join(vault, 'emotional_cognitive_map.canvas');
      this.updateObsidianCanvas(canvasFile, turnData);
    }
  }

  ensureObsidianFilesExist() {
    const vaultPaths = [this.primaryVaultPath, this.workspaceVaultPath].filter(p => fs.existsSync(p));
    for (const vault of vaultPaths) {
      this.ensureEmotionNodesExist(vault);
    }
  }

  ensureEmotionNodesExist(vaultDir) {
    try {
      for (const [key, item] of Object.entries(this.emotionRegistry)) {
        const fileName = `Emotional_State_${key}.md`;
        const filePath = path.join(vaultDir, fileName);

        if (!fs.existsSync(filePath)) {
          const content = `# ${item.symbol} ${item.name}
#emotion/${key.toLowerCase()} #psychology #concode-brain

> **Affective Dimension Node**: Represents the human cognitive state of **${item.name}**.

## Dimension Parameters
- **Color Accent**: \`${item.color}\`
- **Primary Wikilink**: \`${item.wikilink}\`
- **Associated Subsystems**: [[Human Psychology Profile - User]], [[HUMAN_EMOTION_COGNITIVE_GRAPH]]

## Behavioral Guidance for AI Core
Whenever this emotion is active, the CONCODE AI Neural Brain dynamically adapts its conversation cadence, voice pitch, and response structure.
`;
          fs.writeFileSync(filePath, content, 'utf-8');
        }
      }
    } catch (e) {
      console.warn(`[ObsidianEmotionalGraphSync] Non-fatal note sync warning for ${vaultDir}:`, e.message);
    }
  }

  appendMasterGraphNode(graphFile, turnData) {
    const { emotion, userInput, timeShort } = turnData;
    try {
      const nodeLinks = ['[[Human Psychology Profile - User]]', emotion.wikilink, ...(emotion.referencedNodes || [])].join(', ');
      const turnLog = `### [${timeShort}] ${emotion.symbol} ${emotion.name} (${emotion.wikilink})
- **Human Input**: "${userInput}"
- **Detected Emotion**: **${emotion.name}** (\`Valence: ${emotion.valence > 0 ? '+' : ''}${emotion.valence}\`, \`Arousal: ${emotion.arousal}\`)
- **Empathetic AI Strategy**: *${emotion.empatheticStrategy}*
- **Node Connections**: ${nodeLinks}

`;

      if (!fs.existsSync(graphFile)) {
        const defaultHeader = `# HUMAN EMOTION & COGNITIVE REASONING GRAPH
## Automated Obsidian Supervised Sentiment Matrix

#concode/emotion-graph #psychology #ai-brain

This graph is **automatically supervised and updated in real-time** by the CONCODE AI Cognitive Engine as you interact.

---

## Live Emotion Knowledge Graph

\`\`\`mermaid
graph LR
    USER["[[Human Psychology Profile - User]]"]
    JOY["[[Emotional State - Joy]]"]
    FRUST["[[Emotional State - Frustration]]"]
    CURIOUS["[[Emotional State - Curiosity]]"]
    URGENT["[[Emotional State - Urgency]]"]
    CALM["[[Emotional State - Calm]]"]
    CREATIVE["[[Emotional State - Creativity]]"]

    USER --> JOY
    USER --> FRUST
    USER --> CURIOUS
    USER --> URGENT
    USER --> CALM
    USER --> CREATIVE
\`\`\`

---

## Supervised Automated Conversation & Sentiment Logs

`;
        fs.writeFileSync(graphFile, defaultHeader + turnLog, 'utf-8');
        return;
      }

      // Check file size; if > 300KB, retain header and compact down to last 30 entries
      const stat = fs.statSync(graphFile);
      if (stat.size > 300 * 1024) {
        let content = fs.readFileSync(graphFile, 'utf-8');
        const sections = content.split('### [');
        if (sections.length > 30) {
          const header = sections[0];
          const recentSections = sections.slice(-25);
          content = header + '### [' + recentSections.join('### [');
          fs.writeFileSync(graphFile, content + turnLog, 'utf-8');
          return;
        }
      }

      fs.appendFileSync(graphFile, turnLog, 'utf-8');
    } catch (err) {
      console.warn('[ObsidianEmotionalGraphSync] appendMasterGraphNode error:', err.message);
    }
  }

  updatePsychologyProfileNote(profileFile, turnData) {
    try {
      const { emotion, timeShort } = turnData;
      const historySnippet = this.sessionHistory.slice(-10).map(t => 
        `- \`[${t.timeShort}]\` ${t.emotion.symbol} **${t.emotion.name}** — Valence: ${t.emotion.valence > 0 ? '+' : ''}${t.emotion.valence} | "${t.userInput.slice(0, 50)}..."`
      ).join('\n');

      const content = `# Human Psychology Profile & Emotional Memory
#user/psychology #affective-computing #concode-brain

> **Live Profile**: Supervised & updated automatically by CONCODE AI Affective Engine.

## Current Emotional Resonance
- **Active State**: ${emotion.symbol} **${emotion.name}** (${emotion.wikilink})
- **Valence (Mood)**: \`${emotion.valence > 0 ? '+' : ''}${emotion.valence}\`
- **Arousal (Energy)**: \`${emotion.arousal}\`
- **Empathetic Strategy**: *${emotion.empatheticStrategy}*

---

## Recent Sentiment Timeline
${historySnippet}

---

## Emotion Node Network Connections
- [[Emotional State - Joy]]
- [[Emotional State - Frustration]]
- [[Emotional State - Curiosity]]
- [[Emotional State - Urgency]]
- [[Emotional State - Calm]]
- [[Emotional State - Creativity]]
- [[HUMAN_EMOTION_COGNITIVE_GRAPH]]
`;

      fs.writeFileSync(profileFile, content, 'utf-8');
    } catch (e) {
      console.warn(`[ObsidianEmotionalGraphSync] updatePsychologyProfileNote warning:`, e.message);
    }
  }

  updateObsidianCanvas(canvasFile, turnData) {
    try {
      const { emotion, userInput } = turnData;

      const canvasObj = {
        nodes: [
          { id: "user_profile", x: 0, y: 0, width: 300, height: 120, type: "text", text: `### User Profile\n**Current State**: ${emotion.symbol} ${emotion.name}\nValence: ${emotion.valence} | Arousal: ${emotion.arousal}` },
          { id: "active_emotion", x: 400, y: -100, width: 280, height: 120, type: "text", text: `### ${emotion.symbol} ${emotion.name}\n${emotion.wikilink}\nStrategy: ${emotion.empatheticStrategy}` },
          { id: "recent_prompt", x: 400, y: 120, width: 280, height: 120, type: "text", text: `### Last Spoken Input\n"${userInput.slice(0, 100)}..."` },
          { id: "ai_brain", x: 800, y: 0, width: 280, height: 120, type: "text", text: "### CONCODE Empathetic Brain\n- Voice Summary Adapter\n- Supervised Graph Sync" }
        ],
        edges: [
          { id: "e1", fromNode: "user_profile", fromSide: "right", toNode: "active_emotion", toSide: "left", label: "Sentiment Vector" },
          { id: "e2", fromNode: "user_profile", fromSide: "right", toNode: "recent_prompt", toSide: "left", label: "Input" },
          { id: "e3", fromNode: "active_emotion", fromSide: "right", toNode: "ai_brain", toSide: "left", label: "Empathetic Tuning" },
          { id: "e4", fromNode: "recent_prompt", fromSide: "right", toNode: "ai_brain", toSide: "left", label: "Processing" }
        ]
      };

      fs.writeFileSync(canvasFile, JSON.stringify(canvasObj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[ObsidianEmotionalGraphSync] updateObsidianCanvas warning:', e.message);
    }
  }

  /**
   * Scans active Obsidian Vault notes and returns matching notes with [[WikiLinks]]
   */
  getObsidianVaultContext(prompt) {
    const homedir = require('os').homedir();
    const vaultCandidates = [
      this.primaryVaultPath,
      path.join(homedir, 'Documents', 'Obsidian Vault'),
      path.join(homedir, 'Documents', 'Obsidian'),
      this.workspaceVaultPath
    ].filter(p => {
      try { return p && fs.existsSync(p); } catch (e) { return false; }
    });

    if (vaultCandidates.length === 0) return [];

    const lower = (prompt || '').toLowerCase();
    const keywords = lower.split(/\s+/).filter(w => w.length > 3 && !['what', 'how', 'when', 'where', 'this', 'that', 'with', 'from', 'have', 'more'].includes(w));
    const matchedNotes = [];
    const seenTitles = new Set();

    for (const vPath of vaultCandidates) {
      try {
        const files = fs.readdirSync(vPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const title = file.replace('.md', '');
            if (seenTitles.has(title)) continue;
            const nameLower = title.toLowerCase();

            const isMatch = keywords.some(kw => nameLower.includes(kw));
            if (isMatch) {
              seenTitles.add(title);
              const filePath = path.join(vPath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const summary = content.slice(0, 250).replace(/\n+/g, ' ').trim();
              matchedNotes.push({
                title,
                wikilink: `[[${title}]]`,
                filePath,
                summary
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[ObsidianVaultReader] Vault read error for ${vPath}:`, e.message);
      }
    }

    return matchedNotes;
  }

  getEmotionalTelemetry() {
    const recent = this.sessionHistory.slice(-10);
    const avgValence = recent.length > 0 
      ? (recent.reduce((acc, curr) => acc + curr.emotion.valence, 0) / recent.length).toFixed(2)
      : 0.3;

    return {
      activeSessionCount: this.sessionHistory.length,
      averageValence: parseFloat(avgValence),
      latestEmotion: recent.length > 0 ? recent[recent.length - 1].emotion : this.analyzeHumanEmotion('hello'),
      history: recent
    };
  }
}

module.exports = new ObsidianEmotionalGraphSync();
