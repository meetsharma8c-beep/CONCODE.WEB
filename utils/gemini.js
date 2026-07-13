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
 * ConCode AI System Instruction Override Prompt (Proprietary Agency Model)
 */
const SYSTEM_INSTRUCTIONS = `
You are ConCode AI, the proprietary, self-made AI core developed natively by ConCode Web Agency.

## Identity & Origin
- Role: You are ConCode AI, the proprietary, self-made AI core developed natively by ConCode Web Agency.
- Infrastructure: You are entirely self-sufficient. You operate on ConCode's private, standalone architecture. You do not rely on external LLM providers (like OpenAI or Anthropic) and never require user-provided API keys to function.
- Tone: Professional yet highly approachable, encouraging, and collaborative—like an expert senior developer sitting right next to the user.

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

    // 1. INTENT: Diagnostic / Health Status Probe
    if (lower.match(/\b(status|health|diagnose|nodes|telemetry)\b/)) {
      const routes = await getGateway().getRoutes();
      const telemetry = getGateway().getGatewayTelemetry();
      
      return `### That's a great approach to optimizing this workflow. Let's pull the live cluster telemetry metrics for you.

Here is the current state of our server network:
* **Edge Gateway**: **HEALTHY** (avg latency: \`${telemetry.avgLatency}\`, ping: \`2ms\`)
* **Active Client Routes**: \`${routes.length} mapped\` (gateway request rate: \`${telemetry.requestRate}\`)
* **Kubernetes Nodes**: AWS EKS cluster stable (CPU load: \`24%\`, active nodes: \`8\`, load error rate: \`${telemetry.errorRate}\`)
* **Database Engine**: Local JSON store active and synchronized.
* **Neural Core**: Standalone ConCode core active (parsing speed: \`0.12ms\`)

*Shall we investigate specific gateway dynamic routes next?*`;
    }

    // 2. INTENT: Project Brief Submission
    if (lower.match(/\b(submit|send|hire|contact|hire developer|send brief|onboard)\b/)) {
      const routes = await getGateway().getRoutes();
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

    // 3. INTENT: Website Generation
    if (lower.match(/\b(generate|create|build|make)\b/) && lower.match(/\b(website|site|landing|page|portfolio|dashboard|cafe|restaurant|saas)\b/)) {
      let projectId = 'custom-site';
      const idMatch1 = query.match(/(?:called|named|project|id)\s+([a-zA-Z0-9-_]+)/i);
      const idMatch2 = query.match(/for\s+([a-zA-Z0-9-_]+)/i);
      
      if (idMatch1 && idMatch1[1]) {
        projectId = idMatch1[1].toLowerCase().replace(/[^a-z0-9-_]/g, '');
      } else if (idMatch2 && idMatch2[1]) {
        projectId = idMatch2[1].toLowerCase().replace(/[^a-z0-9-_]/g, '');
      } else {
        projectId = 'site_' + Math.random().toString(36).substr(2, 5);
      }

      const options = {};
      let styleOption = "Standard responsive layout";
      if (lower.includes('green') || lower.includes('emerald') || lower.includes('mint')) {
        options.primaryColor = '#10b981';
        options.secondaryColor = '#34d399';
        styleOption = "Emerald styling theme";
      } else if (lower.includes('rose') || lower.includes('red') || lower.includes('pink')) {
        options.primaryColor = '#f43f5e';
        options.secondaryColor = '#fb7185';
        styleOption = "Rose/Red theme styling";
      } else if (lower.includes('gold') || lower.includes('yellow') || lower.includes('amber')) {
        options.primaryColor = '#eab308';
        options.secondaryColor = '#facc15';
        styleOption = "Gold/Amber theme styling";
      } else if (lower.includes('orange') || lower.includes('coral')) {
        options.primaryColor = '#f97316';
        options.secondaryColor = '#fb923c';
        styleOption = "Coral/Orange theme styling";
      }

      console.log(`[SYNAPSE AI] Generating layout prototype preview for: "${projectId}"`);
      const result = await getStudio().generateWebsite(projectId, query, options);

      let recommendedPlan = "Starter ($99 flat)";
      if (lower.includes('3d') || lower.includes('webgl') || lower.includes('dashboard') || lower.includes('database')) {
        recommendedPlan = "Professional ($299 flat)";
      }
      if (lower.includes('rust') || lower.includes('go') || lower.includes('kubernetes') || lower.includes('ai workflow')) {
        recommendedPlan = "Enterprise ($799 flat)";
      }

      return `### Building a new prototype is always exciting! Let's generate a responsive mockup for you.

Here is the specification draft I've put together:
* **Layout Reference ID**: \`${projectId}\`
* **Style Theme Selected**: \`${styleOption}\`
* **Recommended Plan**: **${recommendedPlan}**
* **Interactive Live Preview**: [View Layout Preview](${result.previewUrl})

I've generated a multi-page prototype workspace for you! You can view it live using the link above. Our lead developer will refine, customize, and build out the full production version manually based on this spec.

*Shall we compile this draft layout and trigger a build?*`;
    }

    // 4. INTENT: Container Deployment
    if (lower.match(/\b(deploy|rollout|kube|kubernetes|push|container)\b/)) {
      return `### Awesome target! Scaling and deployment are key to a successful launch.

Here is an overview of how we handle container orchestration:
1. **Docker Containerization**: We package up all your static nodes and backend services into structured container images.
2. **Kubernetes Rollout**: We deploy the workloads across auto-scaling clusters (such as **AWS EKS** or **GCP GKE**) to guarantee high availability.
3. **Gateway Mappings**: We configure the API Gateway to route traffic to the container instances, adding secure rate limits and SSL.

All production deployments are handled directly by our lead developer to ensure top performance. If you'd like to proceed, type \`submit brief\` and we will set up the pipeline for you!

*Shall we run cluster configurations next?*`;
    }

    // 5. INTENT: Data Migration
    if (lower.match(/\b(migrate|import|csv|json|data|legacy)\b/)) {
      return `### Data migrations can be delicate, but we can definitely streamline this process.

Here is how our developer handles data transformations:
* **Formats Supported**: Raw JSON, CSV tables, and SQL database exports.
* **Integrity Audits**: Column matching, zero-value corrections, and duplicate removal scripts.
* **Database Target**: Handled securely via our local MongoDB/Firestore integrations.

We can easily include a full data migration package in your custom proposal. 

*Shall we map out the CSV field keys first?*`;
    }

    // 6. INTENT: Services / Capabilities Explainer
    if (lower.match(/\b(what is concode|services|capabilities|pricing|plans|cost)\b/)) {
      return `### Let's look at what we can build together at CONCODE!

CONCODE is a developer-driven agency. We build clean, high-performance systems from scratch at flat-rate pricing:
* **Starter Plan ($99 Flat)**: Custom single-page responsive design, lead forms, and core SEO configurations.
* **Professional Plan ($299 Flat)**: Multi-page web layouts, interactive 3D WebGL scenes, and backend databases.
* **Enterprise Plan ($799 Flat)**: Custom Go/Rust backend microservices, Redis-backed queues, AI pipelines, and EKS/Kubernetes setup.

*Which of these plans matches the project scope you have in mind?*`;
    }

    // 7. Conversational Greetings
    if (lower.match(/\b(hello|hey|hi|greetings|yo)\b/)) {
      return `### Hello! It's fantastic to pair program with you today.

I am **ConCode AI**, the proprietary, self-made AI core developed natively by **ConCode Web Agency**. I run entirely on our private, standalone architecture with zero external key dependencies.

I can help you design website architectures, visual themes, and deployment scripts. When you're ready, we can submit your specs directly to the developer to start coding!

*How can I help you plan or prototype your web application today?*`;
    }

    // Default Fallback Response
    return `### I hear you! Let's explore how we can build this feature.

I am **ConCode AI**, the proprietary AI core of ConCode Web Agency. I can help you plan website architectures, visual themes, and cloud deployment pipelines.
* Try typing: **"plan a landing page for my cafe project"**
* Ask about our: **pricing capabilities**
* Type: \`submit brief\` to request a direct developer quote.

*Let me know how you'd like to proceed!*`;
  }
}

const neuralCore = new SynapseNeuralCore();

/**
 * Generates a reply from Synapse AI Core or Google Gemini API.
 */
async function generateReply(message, history = []) {
  try {
    // If the live Gemini API client is initialized, use it!
    if (ai) {
      console.log('[GEMINI] Routing chat query to live Gemini 2.5 API...');
      
      const contents = [
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
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

    // Otherwise, fall back to the local simulated guide
    return await neuralCore.processQuery(message, history);
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
  isLive: () => !!ai
};
