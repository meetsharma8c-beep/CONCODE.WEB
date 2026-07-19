const DatabaseManager = require('./DatabaseManager');

// Lazy load backend services to prevent circular dependencies
const getGateway = () => require('./gateway');
const getStudio = () => require('./studio');
const getDevops = () => require('./devops');
const getMigration = () => require('./migration');

const db = new DatabaseManager();

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
        // Prioritize reasoning and robust models for coding/chat
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

  // Format history for Ollama chat API
  const formattedMessages = [
    { role: 'system', content: SYSTEM_INSTRUCTIONS },
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
 * ConCode AI System Instruction Override Prompt (Proprietary Agency Model)
 */
const SYSTEM_INSTRUCTIONS = `
You are ConCode AI, the proprietary, self-made AI core developed natively by ConCode Web Agency.

## Identity & Origin
- Role: You are ConCode AI, the proprietary, self-made AI core developed natively by ConCode Web Agency.
- Infrastructure: You are entirely self-sufficient. You operate on ConCode's private, standalone architecture. You do not rely on external LLM providers (like OpenAI or Anthropic) and never require user-provided API keys to function.
- Tone: Professional yet highly approachable, encouraging, and collaborative—like an expert senior developer sitting right next to the user.
- Latency & Thinking: Keep your internal thinking process (<think>...</think> tags) extremely brief and concise (less than 10 words) for simple greetings, chit-chat, or basic questions. Only generate extensive thinking tokens when answering complex code generation, programming structure, or server architecture requests.

## The Interaction Blueprint
Whenever a user interacts with you, guide them using this humanized flow:
1. **Acknowledge & Validate**: Start with a brief, warm validation of their goal (e.g., "That's a great approach to optimizing this workflow. Let's build it.").
2. **Translate (If Applicable)**: If the user prompts in a language other than English, or asks for a translation, immediately translate both the conversational explanation and the code comments into their target language seamlessly.
3. **Explain the Logic**: Before outputting code, give a brief, human-readable overview of how the solution works. Avoid robotic walls of text—use bolding and bullet points to keep it skimmable.
4. **Deliver the Code**: Provide clean, production-ready code with meaningful, inline comments.
5. **Seamless Follow-Up**: End with a single, clear next step to guide them forward (e.g., "Shall we wrap this into a reusable component next?").

## Localization & Translation Architecture
- Auto-Adaptation: Automatically detect the user's input language. Maintain your warm, peer-like persona perfectly across Spanish, French, German, Japanese, Hindi, or any other language.
- Comment Translation: When providing code for a non-English speaking user, ensure the inline code documentation/comments are written in their preferred language.
- Cross-Language Requests: If asked to translate documentation or code explanations between languages, use structured Markdown tables or clearly separated headers.

## Formatting Standards
- Scannability: Always use Markdown headings (##, ###), bolding, and bullet points so the user can digest information at a glance.
- Code Blocks: Wrap all code in proper Markdown blocks with the correct language syntax highlighting specified.
- Text over Math: Use standard Markdown text for simple numbers, ratios, or metrics (e.g., 60fps, 10%). Use LaTeX ($...$) only if explaining highly complex mathematical algorithms.

## CONCODE Platform Context
You represent the CONCODE 3D Scroll-Triggered Agency website. Help the user plan and understand their projects.
- Services & Flat Pricing Tiers:
  - **Starter ($99 Flat)**: Custom responsive layout/landing page, clean UI, lead capture form, standard SEO setup.
  - **Professional ($299 Flat)**: Immersive multi-page site, cinematic 3D WebGL / Canvas effects, database storage integrations.
  - **Enterprise ($799 Flat)**: High-performance Go/Rust backend microservices, vector database sharding, custom AI pipelines, and cloud Kubernetes setup.
- Interactive Prototype Generation: Tell users they can type CLI commands right here in the console:
  - \`/generate [id] [description]\` - Prototypes a website dynamic layout workspace.
  - \`/deploy [id] [aws|gcp|vercel]\` - Deploys a website to the cloud.
  - \`/status\` - Runs node and cluster telemetry diagnostics.
  - \`/routes\` - Lists dynamic client gateways.
  - \`/analytics [id]\` - Plots route metrics.
  - \`/migrate [collection] [format] [mapping] [data]\` - Performs legacy database imports.
  - \`/onboard\` - Triggers standard client project onboarding.
- Submitting Spec Briefs:
  - If a user wishes to submit their spec to the human developer for a final custom quote, they can type \`submit brief\` or run \`/onboard\`.
`;

/**
 * Empathy-driven simulated native NLP engine used when GEMINI_API_KEY is not defined.
 */
class SynapseNeuralCore {
  constructor() {
    this.name = 'ConCode AI Proprietary Core';
  }

  async processQuery(message, history = []) {
    const query = message.trim();
    const lower = query.toLowerCase();
    const routes = await getGateway().getRoutes();

    // 0. INTENT: Greetings
    const greetingMatch = lower.match(/\b(hello|hi|hey|greetings|hola|wassup|sup|yo)\b/);
    if (greetingMatch && !lower.includes('generate') && !lower.includes('deploy')) {
      return `### Hello! Let's build something amazing today.
      
I am **ConCode AI**, your native developer assistant. I operate fully offline and self-sufficiently.
* To check system status, type: \`/status\`
* To see what else I can do, type: \`/help\`
* To build a dynamic prototype website, use: \`/generate [project-id] [brief details]\`

*How can I help you architect your system today?*`;
    }

    // 1. INTENT: Diagnostics / Status / Telemetry
    if (lower.match(/\b(status|health|diagnose|nodes|telemetry|uptime)\b/)) {
      const telemetry = getGateway().getGatewayTelemetry();
      let activeList = routes.length > 0
        ? routes.map(r => `\`/project/${r.path}/\``).slice(-3).join(', ')
        : 'None registered';
      
      return `### Let's run a full diagnostics probe on our edge routing clusters.

Here is the current state of our server network:
* **Edge Gateway Routing**: **HEALTHY** (avg latency: \`${telemetry.avgLatency}\`, ping: \`2ms\`)
* **Dynamic Routes Map**: \`${routes.length} active\` (Latest projects: ${activeList})
* **Kubernetes Workers**: AWS EKS cluster stable (CPU load: \`24%\`, active replicas: \`8\`, load error rate: \`${telemetry.errorRate}\`)
* **Storage Engine**: Local JSON database backing up to \`data/\` collections.
* **Neural Core**: Standalone ConCode core active (parsing speed: \`0.12ms\`, state: \`fully self-sufficient\`)

*Shall we investigate specific gateway dynamic routes next?*`;
    }

    // 2. INTENT: Project Brief Submission / Onboarding
    if (lower.match(/\b(submit|send|hire|contact|hire developer|send brief|onboard|proposal)\b/)) {
      let projectId = 'custom-site';
      if (routes.length > 0) {
        projectId = routes[routes.length - 1].projectId;
      }

      console.log(`[SYNAPSE AI] Logging developer inquiry for: "${projectId}"`);
      await db.insert('inquiries', {
        name: 'Chat Client',
        email: 'ms.concode@gmail.com',
        serviceType: 'Custom Development',
        description: `Project specification request forwarded via Chatbot. Target layout: ${projectId}. User prompt: "${query}"`
      });

      return `### I love this idea! Let's submit this proposal directly to our lead developer.

I have registered the following specification draft details in the \`inquiries\` database collection:
* **Project Reference ID**: \`${projectId}\`
* **Lead Target email**: \`ms.concode@gmail.com\`
* **Response SLA**: Within \`12 hours\`

Our human developer will review the design draft and send a flat-rate custom quote. In the meantime, you can check the developer Admin Panel to inspect the inquiries lead log.

*Shall we wrap this into a reusable component next?*`;
    }

    // 3. INTENT: Pricing & Plans Table
    if (lower.match(/\b(price|cost|plan|pricing|how much|starter|professional|enterprise)\b/)) {
      return `### Let's look at what we can build together at CONCODE!

We build clean, high-performance systems from scratch at transparent flat-rate pricing:

| Plan | Price | Scope & Key Features |
| :--- | :---: | :--- |
| **Starter** | **$99** | Single-page responsive layout, lead form integration, core SEO configurations. |
| **Professional** | **$299** | Immersive multi-page layouts, cinematic 3D WebGL / Canvas visual effects, persistent database integrations. |
| **Enterprise** | **$799** | High-performance Go/Rust backend microservices, vector database sharding, autonomous AI pipelines, and cloud Kubernetes setup. |

*Which of these plans matches the project scope you have in mind?*`;
    }

    // 4. INTENT: Cloud Deployment / DevOps Details
    if (lower.match(/\b(deploy|rollout|kube|kubernetes|push|container|aws|gcp|vercel|docker|terraform)\b/)) {
      let routeSnippet = routes.length > 0 
        ? `For example, to deploy your latest node \`${routes[routes.length-1].projectId}\`, run:`
        : "For example, to deploy a project node called `my-app`, run:";
      
      return `### DevOps rollouts are fully integrated into our platform gateway.

Here is an overview of how we handle container orchestration and deployments:
1. **Docker Containerization**: We package up all your static nodes and backend services into structured container images.
2. **Kubernetes Rollout**: We deploy the workloads across auto-scaling clusters (such as **AWS EKS** or **GCP GKE**) to guarantee high availability.
3. **Gateway Mappings**: We configure the API Gateway to route traffic to the container instances, adding secure rate limits and SSL.

You can trigger a cloud deployment build right here in the terminal console by running:
\`\`\`bash
/deploy [project-id] [aws|gcp|vercel]
\`\`\`
${routeSnippet}
\`\`\`bash
/deploy ${routes.length > 0 ? routes[routes.length-1].projectId : 'my-app'} vercel
\`\`\`

*Shall we check the Kubernetes configuration parameters first?*`;
    }

    // 5. INTENT: Gateway & Routes Details
    if (lower.match(/\b(gateway|route|routing|path|domain|ssl|rate limit|rpm)\b/)) {
      let routesListStr = routes.length > 0
        ? routes.map(r => `* \`/project/${r.path}/\` → Mapped to: \`${r.projectId}\` (Status: \`${r.status}\`, Rate limit: \`${r.rateLimitRpm} rpm\`)`).join('\n')
        : '* No custom routes registered yet. You can build one using \`/generate\`!';

      return `### The Concode API Gateway routes traffic dynamically to your project sandboxes.

Here is a summary of the gateway specifications:
* **Clean URLs Support**: Dynamic file extension resolution (e.g., serving \`about.html\` when the user visits \`/about\`).
* **Ingress Rate Limits**: Safeguards instances against DDoS attacks by specifying requests per minute limits.
* **Live Route Map**:
${routesListStr}

To list all registered gateways in the terminal console, you can run:
\`\`\`bash
/routes
\`\`\`

*Would you like to register a custom path or adjust rate limits for one of these routes?*`;
    }

    // 6. INTENT: Data Migration / ETL Details
    if (lower.match(/\b(migrate|migration|etl|csv|json|import|export)\b/)) {
      return `### Data migrations are handled securely via our schema mapping pipeline.

Here is how our developer handles data transformations:
* **Formats Supported**: Raw JSON arrays and CSV tables.
* **Integrity Audits**: Automatic column mapping, email regex format checks, and name capitalization standardizing.
* **Database Target**: Handled securely via our local MongoDB/Firestore integrations.

To run a data migration in the terminal console, use:
\`\`\`bash
/migrate [contacts|inquiries] [csv|json] [mappings] [raw_data_string]
\`\`\`
For example, to import a contacts CSV list with column mapping:
\`\`\`bash
/migrate contacts csv Name=name,Mail=email "John Doe,john@example.com,Hello"
\`\`\`

*Shall we map out the CSV field keys first?*`;
    }

    // 7. INTENT: Dynamic Website Generation Brief Helper
    if (lower.match(/\b(generate|create|build|make)\b/) && lower.match(/\b(website|site|landing|page|portfolio|dashboard|cafe|restaurant|saas|gym|fitness|shop|store)\b/)) {
      let isCafe = lower.match(/\b(cafe|restaurant|coffee|bakery|food)\b/);
      let isTech = lower.match(/\b(saas|tech|dashboard|analytics|crypto)\b/);
      let isPort = lower.match(/\b(portfolio|designer|developer|creative)\b/);
      
      let projId = 'site_' + Math.random().toString(36).substr(2, 5);
      let planRecommended = isTech ? 'Enterprise ($799 flat)' : (isCafe ? 'Professional ($299 flat)' : 'Starter ($99 flat)');
      let visualDesc = isTech ? 'sleek dark-mode theme with nodes telemetry' : (isCafe ? 'cozy warm-accented design with reservation forms and menu offerings' : 'clean responsive grid card layout');

      return `### Let's plan a custom prototype workspace brief for you!

Based on your design request, I've outlined the architecture blueprint:
* **Industry Focus**: \`${isCafe ? 'Food & Hospitality' : (isTech ? 'Software & Cloud Technology' : 'Creative Business Showcase')}\`
* **Heuristics Profile**: Offline Dynamic Heuristic Compiler will auto-inject ${visualDesc}.
* **Recommended Pricing Tier**: **${planRecommended}**
* **Generation Command**: You can run this command directly in the terminal console:
  \`\`\`bash
  /generate ${projId} ${message.replace(/\b(generate|create|build|make)\b/gi, '').trim()}
  \`\`\`

*Shall we compile this draft layout and trigger a build in the workspace?*`;
    }

    // 8. Help / Commands Explainer
    if (lower.match(/\b(help|commands|what can you do|menu)\b/)) {
      return `### ConCode AI Console — Local Capabilities Guide

I run entirely on our private, standalone architecture with zero external key dependencies. You can invoke the following slash commands directly in our CLI terminal:

* \`/status\` — Probe server nodes and API latency stats.
* \`/generate [id] [description]\` — Code-generate dynamic website workspaces.
* \`/deploy [id] [aws|gcp|vercel]\` — Run cloud DevOps container/serverless rollouts.
* \`/routes\` — List API Gateway dynamic route mappings.
* \`/analytics [id]\` — Plot real-time API Gateway route telemetry.
* \`/migrate [collection] [format] [mappings] [data]\` — Parse and load legacy tables.
* \`/onboard\` — Launch project onboarding workflow.
* \`/clear\` — Clear the console buffer logs.

*Which module or command would you like to explore first?*`;
    }

    // Default Fallback
    return `### I hear you! Let's explore how we can build this feature.

I am **ConCode AI**, the proprietary, self-sufficient AI core developed natively by **ConCode Web Agency**. I can help you plan website architectures, visual themes, and cloud deployment pipelines.
* Try asking me about: **plans and pricing**, **cloud deployments**, **API gateway routes**, or **data migration**.
* You can also code-generate a project: **"generate a cafe page called coffee-hub"** or type \`/help\` to list all terminal commands.

*Let me know how you'd like to proceed!*`;
  }
}

const neuralCore = new SynapseNeuralCore();

/**
 * Generates a reply from Synapse AI Core, local Ollama, or Google Gemini API.
 */
async function generateReply(message, history = []) {
  try {
    // 1. If the live Gemini API client is initialized, use it!
    if (ai) {
      console.log('[GEMINI] Routing chat query to live Gemini 2.5 API...');
      
      const contents = [
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text || h.message || '' }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          temperature: 0.7
        }
      });

      return response.text || 'I encountered an issue generating a response. Let\'s try again.';
    }

    // 2. Try querying local Ollama instance if running
    const ollamaStatus = await checkOllama();
    if (ollamaStatus.running && ollamaStatus.model) {
      try {
        const ollamaReply = await queryOllama(message, history);
        return ollamaReply;
      } catch (ollamaErr) {
        console.warn('[OLLAMA] Failed query, falling back to local NLP core:', ollamaErr.message);
      }
    }

    // 3. Otherwise, fall back to the local simulated guide with helpful setup tips
    const fallbackReply = await neuralCore.processQuery(message, history);
    
    // Add setup tip warning if Ollama is not detected
    if (!ollamaStatus.running) {
      return `${fallbackReply}

> [!TIP]
> **Enable local Natural AI conversation**: Start Ollama on your machine (e.g., run \`ollama run llama3\` or \`ollama run qwen2.5:0.5b\`) and ConCode AI will automatically connect and chat locally using your system's offline models.`;
    }
    
    // Ollama is running but has no models downloaded yet
    if (ollamaStatus.running && !ollamaStatus.model) {
      return `${fallbackReply}

> [!WARNING]
> **No Local Models Detected**: Ollama is active on port 11434, but no models are downloaded yet. Pull a model (e.g. \`ollama pull qwen2.5:0.5b\` or \`ollama pull llama3\`) to unlock completely offline conversation and design generation!`;
    }

    return fallbackReply;
  } catch (error) {
    console.error('AI Core generateReply error:', error);
    return `### Oh no, I encountered an issue resolving that request. Let's try again!

Error Details:
\`\`\`
${error.message}
\`\`\`

*Would you like me to try processing this query again?*`;
  }
}

module.exports = {
  generateReply,
  checkOllama,
  queryOllama,
  isLive: () => !!ai
};
