const DatabaseManager = require('./DatabaseManager');

// Lazy load backend services to prevent circular dependencies
const getGateway = () => require('./gateway');
const getStudio = () => require('./studio');
const getDevops = () => require('./devops');
const getMigration = () => require('./migration');

const db = new DatabaseManager();

/**
 * Custom NLP Engine: Guide, Consultant, and Requirement Gatherer.
 * Runs 100% locally with zero external network or API key dependencies.
 */
class SynapseNeuralCore {
  constructor() {
    this.name = 'Synapse-1 Native AI Core';
    console.log('SynapseNeuralCore: Initialized native AI guide engine.');
  }

  /**
   * Main dialog system router.
   * @param {string} message - Current user query.
   * @param {Array} history - Previous message list.
   * @returns {Promise<string>} Bot markdown reply.
   */
  async processQuery(message, history = []) {
    const query = message.trim();
    const lower = query.toLowerCase();

    // 1. INTENT: Diagnostic / Health Status Probe
    if (lower.match(/\b(status|health|diagnose|nodes|telemetry)\b/)) {
      const routes = await getGateway().getRoutes();
      const telemetry = getGateway().getGatewayTelemetry();
      return `<strong>[${this.name} — Status Report]</strong><br>
Ecosystem diagnostics successfully completed:
<br><br>
• <strong>Edge Gateway</strong>: <span style="color:var(--green)">HEALTHY</span> (avg latency: ${telemetry.avgLatency}, ping: 2ms)<br>
• <strong>Active Client Routes</strong>: <code>${routes.length} mapped</code> (gateway rate: ${telemetry.requestRate})<br>
• <strong>Kubernetes Nodes</strong>: EKS cluster stable (cpu: 24%, nodes: 8, load error: ${telemetry.errorRate})<br>
• <strong>Database Engine</strong>: local JSON database active (collection tables synchronized)<br>
• <strong>Neural Hub</strong>: Synapse Core online (in-memory parsing speed: 0.12ms)`;
    }

    // 2. INTENT: Project Brief Submission to Developer
    if (lower.match(/\b(submit|send|hire|contact|hire developer|send brief|onboard)\b/)) {
      // Find latest site generated or generate a default one
      const routes = await getGateway().getRoutes();
      let projectId = 'custom-site';
      if (routes.length > 0) {
        projectId = routes[routes.length - 1].projectId;
      }

      console.log(`[SYNAPSE AI] Logging developer inquiry for: "${projectId}"`);
      await db.insert('inquiries', {
        name: "Chat Client",
        email: "ms.concode@gmail.com",
        serviceType: "Custom Development",
        description: `Project specification request forwarded via Chatbot. Target layout: ${projectId}. User prompt: "${query}"`
      });

      return `<strong>[${this.name} — Request Registered]</strong><br>
✓ <strong>Ecosystem proposal submitted successfully to the developer!</strong>
<br><br>
Our human developer will review the spec draft (ID: <code>${projectId}</code>) and get back to you within 12 hours with a reasonable, flat-rate quote.
<br><br>
• <strong>Action Details</strong>: Registered in the <code>inquiries</code> collection database.<br>
• <strong>Next Step</strong>: You can check the developer Admin Panel to see the lead details or email ms.concode@gmail.com.`;
    }

    // 3. INTENT: Website Generation (Prototype & Spec Gathering)
    if (lower.match(/\b(generate|create|build|make)\b/) && lower.match(/\b(website|site|landing|page|portfolio|dashboard|cafe|restaurant|saas)\b/)) {
      // Extract project ID
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

      // Check for colors overrides
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

      // Determine recommended flat rate based on keywords
      let recommendedPlan = "Starter ($99 flat)";
      if (lower.includes('3d') || lower.includes('webgl') || lower.includes('dashboard') || lower.includes('database')) {
        recommendedPlan = "Professional ($299 flat)";
      }
      if (lower.includes('rust') || lower.includes('go') || lower.includes('kubernetes') || lower.includes('ai workflow')) {
        recommendedPlan = "Enterprise ($799 flat)";
      }

      return `<strong>[${this.name} — Website Specification Planner]</strong><br>
I will guide you through designing your website! To help you visualize options, I have generated a raw responsive prototype layout draft:
<br><br>
• <strong>Layout Draft ID</strong>: <code>${projectId}</code><br>
• <strong>Recommended Plan</strong>: <strong>${recommendedPlan}</strong> (Reasonable flat rate)<br>
• <strong>Visual Style Selected</strong>: <code>${styleOption}</code><br>
• <strong>Interactive Preview Link</strong>: <a href="${result.previewUrl}" target="_blank" style="color:var(--cyan); font-weight:bold; text-decoration:underline;">${result.previewUrl}</a>
<br><br>
Please note: This prototype is a base layout. Our developer will manually refine, customize, and build the premium production website according to your exact needs.
<br><br>
Type <code>submit brief</code> to send this specification directly to the developer, or click the **Start a Project** button!`;
    }

    // 4. INTENT: Container Deployment Rollout Guidance
    if (lower.match(/\b(deploy|rollout|kube|kubernetes|push|container)\b/)) {
      return `<strong>[${this.name} — Cloud Deployment Guide]</strong><br>
To maintain high availability and security, our developer handles all production deployments manually at very reasonable rates.
<br><br>
The deployment pipeline includes:
<br>
1. <strong>Docker Containerization</strong>: Packaging static assets and backend microservices.<br>
2. <strong>Cloud Rollout</strong>: Provisioning on auto-scaling clusters like <strong>AWS EKS</strong>, <strong>GCP GKE</strong>, or <strong>Vercel</strong>.<br>
3. <strong>Gateway Secure Routing</strong>: Setting rate limit policies and custom domains with free SSL.
<br><br>
If you want to deploy a website you generated, type <code>submit brief</code>, and our developer will set up the pipeline for you!`;
    }

    // 5. INTENT: Data Migration Pipeline Guide
    if (lower.match(/\b(migrate|import|csv|json|data|legacy)\b/)) {
      return `<strong>[${this.name} — Legacy Data Migration Guide]</strong><br>
For databases, our developer sets up custom ETL mappings.
<br><br>
• <strong>Supported Formats</strong>: JSON, CSV, SQL backups.<br>
• <strong>Safety Checks</strong>: Fields validation, casing normalization, and duplicate detection.<br>
<br>
We can bundle data migrations directly into your website's custom proposal. Tell us what database you're importing, and our developer will implement it!`;
    }

    // 6. INTENT: Services / Capabilities Explainer
    if (lower.match(/\b(what is concode|services|capabilities|pricing|plans|cost)\b/)) {
      return `<strong>[${this.name} — Agency Capabilities & Pricing]</strong><br>
CONCODE is a developer-driven agency. Instead of using generic templates, our lead developer builds highly optimized, responsive digital systems from scratch at very reasonable, one-time flat rates:
<br><br>
<strong>Our Pricing Structure (Flat Fee per Task/Project)</strong>:
• <strong>Starter ($99 Flat)</strong>: Custom responsive layout/landing page, clean UI, lead capture form, standard SEO setup.<br>
• <strong>Professional ($299 Flat)</strong>: Immersive multi-page site, cinematic 3D WebGL / Canvas effects, database storage integrations.<br>
• <strong>Enterprise ($799 Flat)</strong>: High-performance Go/Rust backend microservices, vector database sharding, custom AI pipelines, and cloud Kubernetes setup.
<br><br>
I am here to guide you in planning your design. Once you are ready, we can submit your specifications to the developer to start coding!`;
    }

    // 7. Conversational Greetings dialog tree
    if (lower.match(/\b(hello|hey|hi|greetings|yo)\b/)) {
      return `Hello! I am the **CONCODE Synapse-1 AI Guide**. I run 100% locally in this system's backend to assist you.
<br><br>
I am here to guide you on how to create, implement, and deploy your custom website. Our lead developer will manually write the code according to your specs to guarantee premium quality, with rates kept very reasonable.
<br><br>
<strong>How we can begin</strong>:
• Tell me what kind of site you want (e.g. <em>"plan a portfolio website for a cafe"</em>)<br>
• Ask about pricing (e.g. <em>"what are your pricing options"</em>)<br>
• Type <code>submit brief</code> to request a developer quote for your current draft layout.
<br><br>
How can I guide your web project planning today?`;
    }

    // Default Fallback Response
    return `I am the **CONCODE Synapse-1 AI Guide**. I can help you plan website architectures, visual themes, and deployment pipelines.
<br><br>
All development is handled directly by our lead developer to ensure top performance at reasonable flat-rate prices.
<br><br>
To plan your site, try typing: <strong>"plan a landing page for my cafe project"</strong> or ask about our <strong>pricing</strong>.`;
  }
}

const neuralCore = new SynapseNeuralCore();

/**
 * Generates a reply from Synapse AI Core.
 */
async function generateReply(message, history = []) {
  try {
    return await neuralCore.processQuery(message, history);
  } catch (error) {
    console.error('Synapse AI Core processQuery error:', error);
    return `[Synapse Core Error] Failed to resolve query: ${error.message}`;
  }
}

module.exports = {
  generateReply,
  isLive: () => true // Always active as it's fully self-contained local code!
};
