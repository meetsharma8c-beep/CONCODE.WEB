// Try to initialize Gemini client if key is configured
let ai = null;
try {
  const { GoogleGenAI } = require('@google/genai');
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('gemini: Successfully initialized Google GenAI client.');
  }
} catch (e) {
  console.log('gemini: Gemini API client initialization bypassed or package missing.');
}

const concodeAI = require('./concodeAI');

/**
 * Checks if Ollama is running and lists models.
 */
async function checkOllama() {
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
 * Primary entry point for generating chatbot responses.
 * Multi-Provider Cognitive Router:
 * 1. Tier 1: Cloud Gemini API via @google/genai (if GEMINI_API_KEY set)
 * 2. Tier 2: Local Privacy Ollama LLM (if Ollama running)
 * 3. Tier 3: Standalone CONCODE Native Cognitive Engine v7.0
 */
async function generateReply(message, history = []) {
  const nativeResult = await concodeAI.thinkAndBuild(message, history);
  let replyText = '';
  let modelUsed = 'concode-native-v7';

  // Tier 1: Try Gemini API if client initialized
  if (ai) {
    try {
      console.log('[CONCODE AI BRAIN] Dispatching query to Google Gemini Cloud API...');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text || h.message || '' }]
          })),
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: concodeAI.getDeepReasoningInstructions()
        }
      });

      if (response && response.text) {
        replyText = response.text;
        modelUsed = 'gemini-2.5-flash';
      }
    } catch (geminiError) {
      console.warn('[CONCODE AI BRAIN] Gemini API call failed/bypassed:', geminiError.message);
    }
  }

  // Tier 2: Try Ollama if Tier 1 not active
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

  // Tier 3: Fallback to CONCODE Native v7 Cognitive Engine
  if (!replyText) {
    replyText = nativeResult.output || 'No response generated.';
    modelUsed = 'concode-native-v7';
  }

  return {
    reply: replyText,
    thought: nativeResult.thought || null,
    thoughtSteps: nativeResult.thoughtSteps || [],
    agentBadge: nativeResult.agentBadge || '📐 Architect Agent',
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
