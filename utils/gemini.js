const concodeAI = require('./concodeAI');
const obsidianSync = require('./obsidianEmotionalGraphSync');
const obsidianPatternEngine = require('./obsidianPatternEngine');

// ═══════════════════════════════════════════════════════════════
// EXTERNAL LLM PROVIDERS — OPTIONAL (behind USE_EXTERNAL_LLM env flag)
// ═══════════════════════════════════════════════════════════════

const USE_EXTERNAL_LLM = process.env.USE_EXTERNAL_LLM === 'true' || !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);

let ai = null;
if (USE_EXTERNAL_LLM) {
  try {
    const { GoogleGenAI } = require('@google/genai');
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
      console.log('[CONCODE Brain] External LLM mode: Gemini API initialized.');
    }
  } catch (e) {
    console.log('[CONCODE Brain] Gemini API client not available:', e.message);
  }
} else {
  console.log('[CONCODE Brain] ★ Native Cognitive Brain v3.0 — Running 100% self-sufficient. No external LLMs.');
}

// Lazy-load code synthesizer for code generation
let _codeSynth = null;
function getCodeSynthesizer() {
  if (!_codeSynth) {
    try { _codeSynth = require('./concodeCodeSynthesizer'); } catch (e) { _codeSynth = null; }
  }
  return _codeSynth;
}

// Lazy-load reasoning chain for thought traces
let _reasonChain = null;
function getReasoningChain() {
  if (!_reasonChain) {
    try { _reasonChain = require('./concodeReasoningChain'); } catch (e) { _reasonChain = null; }
  }
  return _reasonChain;
}

/**
 * Checks if Ollama is running and lists models.
 */
async function checkOllama() {
  if (!USE_EXTERNAL_LLM) return { running: false, model: null, models: [] };

  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (res.ok) {
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        const modelNames = data.models.map(m => m.name);
        const priorityKeywords = ['deepseek', 'qwen', 'llama3.1', 'llama3.2', 'llama3', 'gemma2', 'phi4', 'phi3'];
        let selectedModel = modelNames[0];

        for (const keyword of priorityKeywords) {
          const matched = modelNames.find(name => name.toLowerCase().includes(keyword));
          if (matched) {
            selectedModel = matched;
            break;
          }
        }
        return { running: true, model: selectedModel, models: modelNames };
      }
      return { running: true, model: null, models: [] };
    }
  } catch (e) {
    // Port 11434 not responsive
  }
  return { running: false, model: null, models: [] };
}

/**
 * Queries Ollama local chat API.
 */
async function queryOllama(message, history = []) {
  const status = await checkOllama();
  if (!status.running || !status.model) {
    throw new Error('Ollama not running or no models installed.');
  }

  const formattedMessages = [
    { role: 'system', content: concodeAI.getDeepReasoningInstructions() },
    ...history.map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text || h.message || ''
    })),
    { role: 'user', content: message }
  ];

  console.log(`[OLLAMA] Routing chat query to local Ollama model "${status.model}"...`);

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: status.model,
      messages: formattedMessages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama chat API returned status ${response.status}`);
  }

  const result = await response.json();
  return result.message.content;
}

/**
 * Helper to call Gemini models with fallback sequence
 */
async function callGeminiApi(contents, systemInstruction, customApiKey = null) {
  let client = ai;
  if (!client && customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 10) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      client = new GoogleGenAI({ apiKey: customApiKey.trim() });
    } catch (e) {
      console.warn('[CONCODE AI BRAIN] Failed to initialize temporary Gemini client with custom key:', e.message);
    }
  }
  if (!client) return null;

  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ].filter(Boolean);

  for (const modelName of candidateModels) {
    try {
      console.log(`[CONCODE AI BRAIN] Attempting Gemini API call with model: ${modelName}...`);
      const response = await client.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction
        }
      });
      if (response && response.text) {
        return { text: response.text, modelName };
      }
    } catch (err) {
      console.warn(`[CONCODE AI BRAIN] Model ${modelName} failed: ${err.message}. Retrying fallback model...`);
    }
  }
  return null;
}

/**
 * Primary entry point for generating chatbot responses.
 *
 * v3.0 NATIVE BRAIN ARCHITECTURE:
 *  ★ PRIMARY: External Generative LLM (Gemini / Ollama) when configured
 *  ★ FALLBACK: CONCODE Native Cognitive Brain (TF-IDF + Markov + Reasoning Chain)
 */
async function generateReply(message, history = []) {
  // Always run native brain to compute workspace context, thought trace, and fallback output
  const nativeResult = await concodeAI.thinkAndBuild(message, history);
  let replyText = '';
  let modelUsed = 'concode-native-brain-v3';

  const lowerMsg = (message || '').toLowerCase();

  // 1. Check if this is an explicit code synthesis request
  const isCodeRequest = lowerMsg.match(/\b(write code|code snippet|give me code|show code|function code|script|api route|express snippet|component|create a|build a|implement a)\b/i)
    && !lowerMsg.match(/\b(plan|plans|pricing|cost|how much|package|packages|quote|restaurant|who|what is|explain)\b/i);

  if (isCodeRequest) {
    const codeSynth = getCodeSynthesizer();
    if (codeSynth && typeof codeSynth.generateCode === 'function') {
      try {
        const codeResult = codeSynth.generateCode(message);
        if (codeResult && codeResult.code) {
          replyText = `Here's a production-ready implementation of **${codeResult.label}**, crafted from patterns learned from your workspace:\n\n\`\`\`${codeResult.lang}\n${codeResult.code}\`\`\`\n\n### [NOTES] Implementation Overview:\n* **Pattern Source**: ${(codeResult.learnedFrom || []).join(', ') || 'workspace conventions'}\n* **Style Match**: Follows your project's ${codeSynth.patterns?.importStyles === 'esm' ? 'ES Module' : 'CommonJS'} import style and ${codeSynth.patterns?.namingConventions?.functions || 'camelCase'} naming.\n\nWant me to add tests, error handling, or database integration to this?`;
          modelUsed = 'concode-native-brain-v3 (code-synthesizer)';
        }
      } catch (e) {
        console.warn('[CONCODE Brain] Code synthesizer error:', e.message);
      }
    }
  }

  // 2. If External LLM is active and not a workspace synthesizer-specific request, prioritize Gemini / Ollama
  if (!replyText && USE_EXTERNAL_LLM) {
    const emotion = obsidianSync.analyzeHumanEmotion(message);
    const matchedVaultNotes = obsidianSync.getObsidianVaultContext(message);
    const vaultContextStr = matchedVaultNotes.length > 0
      ? '\n\nRelevant Obsidian Knowledge Vault Context:\n' + matchedVaultNotes.map(n => `- ${n.wikilink}: ${n.summary}`).join('\n')
      : '';

    const enrichedSystemInstruction = `${concodeAI.getDeepReasoningInstructions()}\n\n[Active Human Affective State: ${emotion.name} (${emotion.symbol}), Valence: ${emotion.valence}, Strategy: ${emotion.empatheticStrategy}]${vaultContextStr}`;

    // Tier 1: Try Gemini API
    if (ai) {
      try {
        const contents = [
          ...history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text || h.message || '' }]
          })),
          { role: 'user', parts: [{ text: message }] }
        ];

        const geminiResult = await callGeminiApi(contents, enrichedSystemInstruction);
        if (geminiResult && geminiResult.text) {
          replyText = geminiResult.text;
          modelUsed = geminiResult.modelName;
        }
      } catch (geminiError) {
        console.warn('[CONCODE AI BRAIN] Gemini API call error:', geminiError.message);
      }
    }

    // Tier 2: Try Ollama
    if (!replyText) {
      try {
        const ollamaStatus = await checkOllama();
        if (ollamaStatus.running && ollamaStatus.model) {
          console.log(`[CONCODE AI BRAIN] Dispatching query to local Ollama (${ollamaStatus.model})...`);
          replyText = await queryOllama(message, history);
          modelUsed = `ollama/${ollamaStatus.model}`;
        }
      } catch (ollamaErr) {
        console.warn('[CONCODE AI BRAIN] Ollama call bypassed:', ollamaErr.message);
      }
    }
  }

  // 3. Fallback: Native Brain Result if External LLM is unavailable or failed
  if (!replyText && nativeResult && nativeResult.output) {
    replyText = nativeResult.output;
    modelUsed = 'concode-native-brain-v3';
  }

  // Generate reasoning thought trace
  let thought = nativeResult.thought || null;
  const reasonChain = getReasoningChain();
  if (reasonChain && typeof reasonChain.reason === 'function') {
    try {
      const reasoning = reasonChain.reason(message, [], {});
      if (reasoning && reasoning.steps) {
        thought = `[CONCODE Native Brain v3.0 — Cognitive Reasoning Trace]\n${reasonChain.formatThoughtTrace(reasoning.steps)}`;
      }
    } catch (e) { /* ignore */ }
  }

  // Final safety net — should never reach here with the native brain
  if (!replyText) {
    replyText = nativeResult.output || 'I\'m thinking about that — could you rephrase or give me more context?';
    modelUsed = 'concode-native-brain-v3';
  }

  // Auto-Save Solution to Obsidian Vault
  if (replyText && obsidianPatternEngine && typeof obsidianPatternEngine.saveSolutionToObsidian === 'function') {
    obsidianPatternEngine.saveSolutionToObsidian(message, replyText, nativeResult.primaryPillar || 'GENERAL');
  }

  return {
    reply: replyText,
    thought: thought,
    thoughtSteps: nativeResult.thoughtSteps || [],
    agentBadge: nativeResult.agentBadge || 'CONCODE Native Brain v3.0',
    domain: nativeResult.primaryPillar || 'FULL_STACK_PLATFORM',
    modelUsed,
    smartReplies: nativeResult.smartReplies || []
  };
}

module.exports = {
  generateReply,
  checkOllama,
  queryOllama,
  isLive: () => !!ai
};
