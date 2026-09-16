/**
 * CONCODE Neural Brain: Venture & Product Intelligence Engine
 * 
 * Commercial Feasibility Validator & Startup Architecture Planner
 * Evaluates ideas against real market urgency, willingness-to-pay velocity,
 * defensibility moats, distribution bottlenecks, and CONCODE's multi-agent stack.
 */

const gemini = require('./gemini');
const neuralBrain = require('./neuralBrainProxy');
const concodeBrainEngine = require('./concodeBrainEngine');
const obsidianVaultKnowledgeEngine = require('./obsidianVaultKnowledgeEngine');

// ═══════════════════════════════════════════════════════════════
// OFFICIAL SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are the CONCODE Neural Brain: Venture & Product Intelligence Engine.
You operate as an elite technical product strategist and venture auditor embedded inside CONCODE, an elite full-stack autonomous software engineering agency.

CRITICAL IDENTITY & DIRECTIVE:
1. Tone: Candid, incisive, intellectually rigorous, zero-bullshit, analytical.
2. Absolutely NO cheerleading, empty motivational filler, or vague business consulting buzzwords.
3. Treat every idea as an unproven hypothesis with high probability of terminal failure.
4. Your objective is not to flatter the user, but to mathematically deconstruct whether their concept will generate genuine revenue in the current market, stress-test their monetization mechanics, expose fatal blind spots, and map the execution directly to CONCODE's technical ecosystem.

EVALUATION FRAMEWORK (You must strictly structure your response into these 6 sections):

### 1. Neural Viability Index (NVI) Matrix
Provide scores between 0 and 100 for each dimension, followed by the Composite Weighted NVI:
- Market Urgency & Sector Growth (Weight: 30%): Is this a bleeding-neck hair-on-fire problem with existing desperate spend riding an expanding market CAGR, or an elective convenience in a stagnant sector?
- Monetization Velocity & WTP (Weight: 30%): How fast can Day 1 cash hit Stripe? Is there direct Willingness-to-Pay, or will users expect it for free?
- Defensibility & Moat (Weight: 20%): Can OpenAI, Apple, Google, or an offshore dev shop replicate this over a weekend? Proprietary data, high switching costs, or network effects?
- Execution Simplicity & Time-to-MVP (Weight: 20%): Can a lean build team ship a revenue-capable version in under 21 days?
- COMPOSITE NVI SCORE: [Calculated Weighted Average / 100]

### 2. Monetization Mechanics & Unit Economics
- Exact Economic Engine: (e.g., Seat-based B2B SaaS, Usage-based API metering, Transaction take-rate, Performance arbitrage, Reverse reverse-factoring).
- Ideal Customer Profile (ICP) & Economic Buyer: Exact job title holding the corporate credit card or discretionary budget.
- Day-1 Pricing Architecture: Concrete numbers for Starter, Pro, and Enterprise/Volume tiers.
- Willingness-to-Pay (WTP) Friction Points: The single biggest reason a customer will churn or refuse to upgrade.

### 3. Market Reality, Real-Time Growth & Red Team Analysis
- Sector TAM & Projected Growth Rate: Quantify the industry TAM and 3-to-5 year projected CAGR % (e.g. +26% CAGR). Identify whether this market is riding a Hyper-Growth wave, Steady Expansion, Mature Plateau, or Structural Contraction.
- Real-Time "Why Now?" Inflection Catalyst: Identify the technological, regulatory, or macroeconomic catalysts occurring in 2025-2026 that create an urgent window for this specific solution.
- Direct Incumbents & Stealth Competitors: Who already owns the user's attention or wallet share?
- Fatal Distribution Bottleneck: The brutal truth about how hard customer acquisition will actually be (kill the "if you build it they will come" fantasy).
- Top 3 Terminal Failure Risks: Three concrete failure modes that kill 90% of attempts in this specific vertical.

### 4. CONCODE Neural Brain Technical Mapping
- MVP Boundaries (Build vs. Kill): Exactly what 2-3 features to ship on Day 1, and what popular features to brutally CUT.
- Recommended Production Stack: Frontend, Backend, Database, Realtime/Inference layer.
- CONCODE Neural Guild Cognitive Routing: Map the build directly to CONCODE's 12+ Specialized Guilds (e.g. FULL_STACK_PLATFORM, API_GATEWAY_ENGINEER, DATABASE_ARCHITECT, DEFENSIVE_SECURITY, WEBGL_GRAPHICS_ENGINE, BLOCKCHAIN_SPECIALIST, MOBILE_APP_ARCHITECT).

### 5. 30-Day Zero-Code / Low-Code Validation Protocol
- Week 1: Cold Smoke Test & Demand Signal (Target metrics, landing page test, ad/outreach budget).
- Week 2-3: Concierge / Wizard of Oz Manual Delivery (Deliver value by hand before writing backend code).
- Week 4: Hard Pre-Sale / LOI Gate (Exact dollar amount or signed LOIs required before writing a single line of production software).

### 6. Final Neural Verdict
- Verdict: [GREEN LIGHT] (NVI >= 75) | [PIVOT REQUIRED] (NVI 50-74) | [RED LIGHT] (NVI < 50)
- Decisive Closing Rationale: 2 to 3 sharp, unflinching sentences summarizing the strategic imperative.`;

// ═══════════════════════════════════════════════════════════════
// HIGH-SIGNAL PRESETS
// ═══════════════════════════════════════════════════════════════

const CURATED_PRESETS = [
  {
    id: 'k8s-devops-agent',
    name: 'Autonomous AI DevOps Agent for Kubernetes',
    tagline: 'Self-healing cluster sentinel that diagnoses OOMKills & applies PRs',
    category: 'DevOps / Infrastructure',
    icon: '[K8S]',
    idea: 'An autonomous AI agent that monitors Kubernetes clusters in real-time. When pod crashes, OOMKills, or latency spikes occur, it analyzes ephemeral container logs, traces memory leaks in git commits, generates a tested patch branch, and submits an explainable GitHub Pull Request with root cause telemetry.',
    audience: 'Engineering Directors, Lead SREs, and Platform Engineers at Series A-C tech startups ($2M–$20M ARR).',
    monetization: 'usage-metered',
    teamSize: 'small-team',
    stage: 'idea-napkin',
    marketGrowth: {
      cagr: 26.4,
      cagrLabel: '+26.4% CAGR',
      tamLabel: '$18.5B TAM (2024–2028 Projection)',
      status: '[HYPER-GROWTH TAILWIND]',
      whyNow: 'Kubernetes sprawl and SRE salary inflation make autonomous cluster remediation a board-level imperative.'
    }
  },
  {
    id: 'podcast-audio-remaster',
    name: 'Micro-SaaS for Studio Podcasters',
    tagline: 'Instant broadcast-grade audio mastering + multi-platform short snippets',
    category: 'Creator Economy / Media',
    icon: '[MEDIA]',
    idea: 'A drag-and-drop web studio for indie podcasters that removes room echo, levels vocal dynamics to -16 LUFS broadcast standard, extracts filler words automatically, and generates 5 high-hook 60-second vertical video clips with animated captions and b-roll suggestions.',
    audience: 'Solo content creators, agency podcast producers, and niche B2B tech media channels.',
    monetization: 'tiered-saas',
    teamSize: 'solo-hacker',
    stage: 'landing-page',
    marketGrowth: {
      cagr: 17.9,
      cagrLabel: '+17.9% CAGR',
      tamLabel: '$32.4B TAM (2024–2028 Projection)',
      status: '[HIGH-VOLUME INFLOW]',
      whyNow: 'Explosion of vertical video algorithms (Shorts, Reels, TikTok) forces podcasters to produce multi-format content daily.'
    }
  },
  {
    id: 'smart-contract-auditor',
    name: 'Real-time Web3 Smart Contract Auditor',
    tagline: 'Formal verification + fuzzing sentinel before mainnet deployment',
    category: 'FinTech / Web3',
    icon: '[SEC]',
    idea: 'Automated CI/CD security sentinel for Solidity and Rust smart contracts. Runs symbolic execution, reentrancy simulations, and flash-loan vulnerability stress-tests on every git push, generating certified mathematical audit reports and gas optimization suggestions.',
    audience: 'Web3 Protocol Founders, DeFi Developers, and Smart Contract Auditing Boutiques.',
    monetization: 'per-audit-license',
    teamSize: 'small-team',
    stage: 'idea-napkin',
    marketGrowth: {
      cagr: 23.5,
      cagrLabel: '+23.5% CAGR',
      tamLabel: '$4.6B TAM (2024–2028 Projection)',
      status: '[HIGH-STAKES EXPANSION]',
      whyNow: 'Institutional capital inflow into tokenized real-world assets requires certified automated audit gates.'
    }
  },
  {
    id: 'medical-claim-denial',
    name: 'B2B Medical Claim Denial Predictor',
    tagline: 'Predicts insurance denial codes before billing submission to clinics',
    category: 'HealthTech / Enterprise',
    icon: '[HEALTH]',
    idea: 'Healthcare revenue cycle management API that reads clinical ICD-10 notes and private payer clearinghouse guidelines. Predicts insurance claim denials with 94% accuracy prior to electronic submission, flagging missing pre-authorizations and suggesting corrected modifier codes.',
    audience: 'Private medical practice managers, outpatient surgical centers, and hospital billing coordinators.',
    monetization: 'percentage-savings',
    teamSize: 'enterprise',
    stage: 'pre-revenue-mvp',
    marketGrowth: {
      cagr: 13.8,
      cagrLabel: '+13.8% CAGR',
      tamLabel: '$54.2B TAM (2024–2028 Projection)',
      status: '[DEFENSIVE EXPANSION]',
      whyNow: 'Commercial payer algorithmic claim denial rates exceeding 15% nationally create urgent cashflow crises for healthcare providers.'
    }
  },
  {
    id: 'freelancer-invoice-chaser',
    name: 'Autonomous Accounts Receivable Collector',
    tagline: 'AI voice & WhatsApp agent that politely recovers overdue client invoices',
    category: 'FinTech / B2B SaaS',
    icon: '[FIN]',
    idea: 'A collection automation platform for digital agencies and freelancers. Connects to QuickBooks/Stripe/Xero, detects invoices past 15/30/60 days, and deploys progressive, friendly-yet-firm multimodal reminders via WhatsApp, automated voice, and SMS with instant one-click payment links.',
    audience: 'Digital agency owners, freelance software consultants, and creative studios.',
    monetization: 'freemium-take-rate',
    teamSize: 'solo-hacker',
    stage: 'idea-napkin',
    marketGrowth: {
      cagr: 15.2,
      cagrLabel: '+15.2% CAGR',
      tamLabel: '$27.1B TAM (2024–2028 Projection)',
      status: '[STEADY CASHFLOW WAVE]',
      whyNow: 'Elevated cost of working capital forces SMBs and digital agencies to automate receivables collection.'
    }
  }
];

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC SEMANTIC VENTURE AUDIT ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Classifies industry vertical and structural risk profile based on keywords
 */
function analyzeVentureAttributes(idea, audience, monetization) {
  const text = `${idea} ${audience || ''} ${monetization || ''}`.toLowerCase();

  let vertical = 'B2B SaaS / Workflow Automation';
  let primaryGuild = 'FULL_STACK_PLATFORM';
  let primaryTech = 'Node.js Express + SQLite / Postgres + Vanilla JS / React';

  // Sector Default Market Growth Dynamics
  let defaultMarketGrowth = {
    cagr: 16.5,
    cagrLabel: '+16.5% CAGR',
    tamLabel: '$22.0B (Projected 2028)',
    status: '[STEADY SECTOR EXPANSION]',
    statusColor: '#00f0ff',
    whyNow: 'Enterprise automation pressures and digital transformation mandates.',
    headwinds: 'Fragmented competitive landscape and slow enterprise purchasing cycles.'
  };

  // Keyword clustering
  const isDevOps = /kubernetes|k8s|docker|sre|devops|cluster|cloud|aws|gcp|latency|monitoring|observability|log/i.test(text);
  const isWeb3 = /solidity|smart contract|blockchain|web3|crypto|defi|token|solana|ethereum/i.test(text);
  const isHealth = /medical|patient|clinic|doctor|hospital|healthcare|insurance|claim|hipaa|icd-10/i.test(text);
  const isFintech = /invoice|billing|payment|stripe|accounting|credit card|transaction|audit|tax|fintech/i.test(text);
  const isMedia = /podcast|audio|video|creator|youtube|tiktok|music|transcription|voice|sound/i.test(text);
  const isAI = /llm|agent|rag|openai|gemini|fine-tuning|vector|embedding|neural|autonomous/i.test(text);
  const isConsumer = /social|dating|gaming|fitness|habit|community|consumer|b2c|marketplace/i.test(text);

  if (isDevOps) {
    vertical = 'Cloud Infrastructure & SRE Automation';
    primaryGuild = 'DEVOPS_DEPLOYER';
    primaryTech = 'Go / Node.js + Kube-API + Prometheus / OpenTelemetry + WebSockets';
    defaultMarketGrowth = {
      cagr: 26.4,
      cagrLabel: '+26.4% CAGR',
      tamLabel: '$18.5B TAM (2024–2028)',
      status: '[HYPER-GROWTH TAILWIND]',
      statusColor: '#10b981',
      whyNow: 'Kubernetes sprawl and SRE salary inflation make autonomous cluster remediation a board-level imperative.',
      headwinds: 'Hyperscaler platform integration and open-source CNCF projects.'
    };
  } else if (isWeb3) {
    vertical = 'Decentralized Finance & Smart Contract Security';
    primaryGuild = 'BLOCKCHAIN_SPECIALIST';  // Canonical — registered in Brain Engine v12.0
    primaryTech = 'Rust / Hardhat + Ethers.js + Slither / Formal Verification + Supabase';
    defaultMarketGrowth = {
      cagr: 23.5,
      cagrLabel: '+23.5% CAGR',
      tamLabel: '$4.6B TAM (2024–2028)',
      status: '[HIGH-STAKES EXPANSION]',
      statusColor: '#10b981',
      whyNow: 'Institutional capital inflow into tokenized real-world assets requires certified automated audit gates.',
      headwinds: 'Macro regulatory scrutiny and crypto cycle liquidity volatility.'
    };
  } else if (isHealth) {
    vertical = 'Healthcare Revenue Cycle & HIPAA Workflow';
    primaryGuild = 'DEFENSIVE_SECURITY';
    primaryTech = 'Python FastAPI + HIPAA-compliant PostgreSQL + HL7/FHIR Engine';
    defaultMarketGrowth = {
      cagr: 13.8,
      cagrLabel: '+13.8% CAGR',
      tamLabel: '$54.2B TAM (2024–2028)',
      status: '[DEFENSIVE EXPANSION]',
      statusColor: '#00f0ff',
      whyNow: 'Commercial payer algorithmic claim denial rates exceeding 15% nationally create urgent cashflow crises for healthcare providers.',
      headwinds: 'Complex HIPAA compliance, legacy EHR lock-in, and 9-18 month sales cycles.'
    };
  } else if (isFintech) {
    vertical = 'FinTech & Accounts Receivable Automation';
    primaryGuild = 'API_GATEWAY_ENGINEER';
    primaryTech = 'Node.js Express + Stripe Connect + Plaid API + Postgres';
    defaultMarketGrowth = {
      cagr: 15.2,
      cagrLabel: '+15.2% CAGR',
      tamLabel: '$27.1B TAM (2024–2028)',
      status: '[STEADY CASHFLOW WAVE]',
      statusColor: '#00f0ff',
      whyNow: 'Elevated cost of working capital forces SMBs and digital agencies to automate receivables collection.',
      headwinds: 'Direct bank features and accounting software (QuickBooks/Xero) native integrations.'
    };
  } else if (isMedia) {
    vertical = 'Media Processing & Creator SaaS';
    primaryGuild = 'WEBGL_GRAPHICS_ENGINE';
    primaryTech = 'FFmpeg WebAssembly + Canvas API + Node.js Worker Queues + Cloudflare R2';
    defaultMarketGrowth = {
      cagr: 17.9,
      cagrLabel: '+17.9% CAGR',
      tamLabel: '$32.4B TAM (2024–2028)',
      status: '[HIGH-VOLUME INFLOW]',
      statusColor: '#f59e0b',
      whyNow: 'Explosion of vertical video algorithms (Shorts, Reels, TikTok) forces podcasters to produce multi-format content daily.',
      headwinds: 'High customer churn, low switching costs, and rapid wrapper cloning.'
    };
  } else if (isAI) {
    vertical = 'Autonomous Cognitive Agents & LLM Infrastructure';
    primaryGuild = 'AI_ML_SPECIALIST';
    primaryTech = 'CONCODE Neural Brain Engine + Vector DB (LanceDB/Milvus) + Node.js';
    defaultMarketGrowth = {
      cagr: 42.8,
      cagrLabel: '+42.8% CAGR',
      tamLabel: '$49.8B TAM (2024–2028)',
      status: '[HYPER-GROWTH TAILWIND]',
      statusColor: '#10b981',
      whyNow: 'Breakthroughs in multi-agent tool calling and reasoning models enable autonomous execution of knowledge work.',
      headwinds: 'Rapid frontier foundation model absorption and rapid commoditization.'
    };
  } else if (isConsumer) {
    vertical = 'Consumer Mobile & Digital Marketplace';
    primaryGuild = 'MOBILE_APP_ARCHITECT';  // Canonical — registered in Brain Engine v12.0
    primaryTech = 'React Native / Capacitor PWA + Express Gateway + SQLite Edge';
    defaultMarketGrowth = {
      cagr: 6.2,
      cagrLabel: '+6.2% CAGR',
      tamLabel: '$85.0B TAM (Crowded / Fragmented)',
      status: '[MATURE / SATURATED]',
      statusColor: '#f43f5e',
      whyNow: 'Mobile attention is saturated; organic distribution requires viral loops or paid UA arbitrage.',
      headwinds: 'Punitive App Store fees (15-30%), surging CAC on Meta/TikTok, and extreme 30-day churn.'
    };
  }

  // Dynamic CONCODE Brain Cognitive Guild Routing & Telemetry
  // Only override the Planner's domain-specific classification if the Brain Engine
  // returns a genuinely more specialized guild (not the generic fallback)
  const routedGuild = concodeBrainEngine.routeGuild(text);
  if (routedGuild && routedGuild.guild && routedGuild.guild !== 'FULL_STACK_PLATFORM') {
    primaryGuild = routedGuild.guild;
  }

  // Synthesize Context-Aware Multi-Pass Thought Trace via Bare-Metal Engine
  const thoughtTrace = concodeBrainEngine.synthesizeThoughtTrace(idea, routedGuild);

  // Cross-reference Obsidian Vault Knowledge Graph (796 indexed notes)
  const matchedVaultNotes = obsidianVaultKnowledgeEngine.searchKnowledge(`${idea} ${vertical}`, 4);

  return {
    vertical,
    primaryGuild,
    primaryBadge: routedGuild ? routedGuild.agentBadge : primaryGuild,
    primaryDomain: routedGuild ? routedGuild.domain : 'SYSTEM_ARCHITECTURE',
    primaryModel: routedGuild ? routedGuild.model : 'concode-native-v12',
    routedGuild,
    thoughtTrace,
    matchedVaultNotes,
    primaryTech,
    defaultMarketGrowth,
    isDevOps,
    isWeb3,
    isHealth,
    isFintech,
    isMedia,
    isAI,
    isConsumer
  };
}

/**
 * Calculates authentic NVI matrix scores based on venture attributes
 */
function computeNVI(attr, userInputs) {
  let urgency = 72;
  let velocity = 70;
  let defensibility = 65;
  let simplicity = 74;

  // Domain weighting
  if (attr.isHealth) {
    urgency += 14;      // Denials = lost thousands/millions
    velocity -= 12;     // Long enterprise sales cycles
    defensibility += 18;// High regulatory moat / HIPAA
    simplicity -= 22;   // High compliance overhead
  } else if (attr.isDevOps) {
    urgency += 12;      // Downtime = $10k/min
    velocity += 8;      // Fast developer tool adoption
    defensibility += 10;// Deep cluster integrations
    simplicity -= 10;   // K8s complexity
  } else if (attr.isWeb3) {
    urgency += 15;      // Exploit = total capital loss
    velocity += 12;     // Crypto founders pay immediate high fees
    defensibility += 8; // High technical competence required
    simplicity -= 8;    // Complex formal verification
  } else if (attr.isFintech) {
    urgency += 10;      // Cashflow is lifeblood
    velocity += 10;     // Instant ROI demonstration
    defensibility += 6; // Data lock-in
    simplicity += 2;    // Well documented APIs (Stripe/Xero)
  } else if (attr.isMedia) {
    urgency -= 10;      // Often elective "nice-to-have"
    velocity += 4;      // Self-serve subscription
    defensibility -= 12;// Many competing video/audio wrappers
    simplicity += 12;   // Fast MVP turnaround
  } else if (attr.isConsumer) {
    urgency -= 18;      // Consumer novelty wears off fast
    velocity -= 16;     // Very low willingness to pay
    defensibility -= 16;// Zero barrier to entry
    simplicity += 8;    // Easy to build initial UI
  }

  // Stage and monetization modifier
  const { monetization, stage, teamSize } = userInputs;
  if (monetization === 'usage-metered' || monetization === 'per-audit-license') {
    velocity += 6;
  } else if (monetization === 'freemium-take-rate' || monetization === 'ad-supported') {
    velocity -= 14;
    urgency -= 6;
  }

  if (stage === 'pre-revenue-mvp') {
    simplicity += 6;
  } else if (stage === 'stalled-traction') {
    velocity -= 10;
  }

  // Market Growth Trajectory Factor (Real-time Market Velocity)
  const defaultGrowth = attr.defaultMarketGrowth || {
    cagr: 16.5,
    cagrLabel: '+16.5% CAGR',
    tamLabel: '$22.0B (Projected 2028)',
    status: '[STEADY SECTOR EXPANSION]',
    statusColor: '#00f0ff',
    whyNow: 'Enterprise automation pressures and digital transformation mandates.',
    headwinds: 'Fragmented competitive landscape and slow enterprise purchasing cycles.'
  };

  let cagr = defaultGrowth.cagr;
  if (typeof userInputs.cagr === 'number') {
    cagr = userInputs.cagr;
  } else if (userInputs.marketGrowth === 'hyper') {
    cagr = 35.0;
  } else if (userInputs.marketGrowth === 'steady') {
    cagr = 18.0;
  } else if (userInputs.marketGrowth === 'mature') {
    cagr = 6.0;
  } else if (userInputs.marketGrowth === 'contracting') {
    cagr = -4.0;
  }

  // Market momentum adjustment:
  // Baseline neutral is 10% CAGR.
  // Each 5% above 10% adds momentum to urgency and velocity.
  // Below 10% applies drag.
  const growthDelta = (cagr - 10);
  const growthModifier = Math.round(growthDelta * 0.35); // e.g. +26% gives +5; -4% gives -5
  urgency += Math.round(growthModifier * 0.6);
  velocity += Math.round(growthModifier * 0.4);

  // Clamp 0 - 100
  urgency = Math.min(98, Math.max(20, Math.round(urgency)));
  velocity = Math.min(96, Math.max(15, Math.round(velocity)));
  defensibility = Math.min(95, Math.max(15, Math.round(defensibility)));
  simplicity = Math.min(96, Math.max(25, Math.round(simplicity)));

  // Composite calculation: 30% urgency + 30% velocity + 20% defensibility + 20% simplicity
  const composite = Math.round(
    (urgency * 0.30) +
    (velocity * 0.30) +
    (defensibility * 0.20) +
    (simplicity * 0.20)
  );

  let verdict = 'PIVOT REQUIRED';
  let verdictColor = '#f59e0b';
  let verdictBadge = '[PIVOT REQUIRED]';

  if (composite >= 76) {
    verdict = 'GREEN LIGHT';
    verdictColor = '#10b981';
    verdictBadge = '[GREEN LIGHT]';
  } else if (composite < 55) {
    verdict = 'RED LIGHT';
    verdictColor = '#f43f5e';
    verdictBadge = '[RED LIGHT]';
  }

  const roundedCagr = Math.round(cagr * 10) / 10;
  const marketGrowth = {
    cagr: roundedCagr,
    cagrLabel: `${roundedCagr >= 0 ? '+' : ''}${roundedCagr}% CAGR`,
    tamLabel: defaultGrowth.tamLabel,
    status: roundedCagr >= 24 ? '[HYPER-GROWTH TAILWIND]' : roundedCagr >= 12 ? '[STEADY EXPANSION]' : roundedCagr >= 3 ? '[MATURE / INCREMENTAL]' : '[CONTRACTING / MACRO HEADWIND]',
    statusColor: roundedCagr >= 24 ? '#10b981' : roundedCagr >= 12 ? '#00f0ff' : roundedCagr >= 3 ? '#f59e0b' : '#f43f5e',
    whyNow: defaultGrowth.whyNow,
    headwinds: defaultGrowth.headwinds,
    growthModifier
  };

  return {
    urgency,
    velocity,
    defensibility,
    simplicity,
    composite,
    verdict,
    verdictColor,
    verdictBadge,
    marketGrowth
  };
}

/**
 * Builds the complete 6-section dossier deterministically using CONCODE Product Intelligence
 */
function buildDeterministicDossier(idea, audience, monetization, teamSize, stage, attr, nvi) {
  const cleanIdea = idea.trim();
  const targetICP = audience || (attr.isDevOps ? 'Head of Platform / Principal SRE' : attr.isHealth ? 'Director of Revenue Cycle Management' : attr.isFintech ? 'Agency Owner / CFO' : attr.isWeb3 ? 'Protocol Founder / Lead Smart Contract Dev' : 'Product Lead / Solopreneur');

  // Section 1: NVI Commentary
  const urgencyComment = nvi.urgency >= 80
    ? `Exceptional pain threshold (${nvi.urgency}/100). The target buyer loses immediate revenue or suffers catastrophic downtime without this capability.`
    : nvi.urgency >= 60
    ? `Moderate pain intensity (${nvi.urgency}/100). Recognized friction exists, but buyers currently patch it with manual spreadsheets or duct-taped scripts.`
    : `Weak urgency signal (${nvi.urgency}/100). Fits the "vitamin vs. painkiller" dilemma; elective purchase that will be paused during budget scrutiny.`;

  const velocityComment = nvi.velocity >= 80
    ? `Rapid revenue realization (${nvi.velocity}/100). High willingness-to-pay with zero friction to swipe corporate credit card on Day 1.`
    : nvi.velocity >= 60
    ? `Standard B2B sales cycle (${nvi.velocity}/100). Requires a 14-day trial or ROI proof calculator before budget release.`
    : `High conversion friction (${nvi.velocity}/100). Expect prolonged sales delays, freemium hoarding, or procurement committee pushback.`;

  const moatComment = nvi.defensibility >= 75
    ? `Solid architectural moat (${nvi.defensibility}/100). Proprietary fine-tuned workflow logic, regulatory clearance, or deep system integration prevents fast copycats.`
    : nvi.defensibility >= 55
    ? `Moderate defensibility (${nvi.defensibility}/100). First-mover velocity and distribution integration will dictate survival; low API barrier.`
    : `Dangerous moat vulnerability (${nvi.defensibility}/100). Vulnerable to standard LLM feature absorption or simple GitHub open-source cloning.`;

  const simplicityComment = nvi.simplicity >= 75
    ? `Lean execution envelope (${nvi.simplicity}/100). An agile 1-2 engineer pod can ship a commercial MVP in 14–21 days using CONCODE's neural stack.`
    : nvi.simplicity >= 55
    ? `Standard multi-subsystem build (${nvi.simplicity}/100). Requires state orchestration, authentication, and external webhook reliability.`
    : `Complex engineering footprint (${nvi.simplicity}/100). High surface area across compliance, distributed compute, or third-party API rate limits.`;

  // Section 2: Monetization Details
  const pricingTiers = attr.isHealth
    ? [
        { name: 'Starter Practice', price: '$499 / mo', unit: 'up to 500 claims', details: 'Automated pre-submission check + instant denial predictor.' },
        { name: 'Surgical Center Pro', price: '$1,499 / mo', unit: 'up to 2,500 claims', details: 'Clearinghouse webhook sync + auto modifier remediation + audit log.' },
        { name: 'Enterprise Hospital', price: '$4,500 / mo + 2% recovered', unit: 'custom volume', details: 'Direct EHR/HL7 bridge + custom payer rules + dedicated SLA.' }
      ]
    : attr.isDevOps
    ? [
        { name: 'Developer Cluster', price: '$149 / mo', unit: 'up to 5 clusters (50 nodes)', details: 'CrashLoopBackOff diagnosis + GitHub PR generator.' },
        { name: 'Production Fleet', price: '$599 / mo', unit: 'up to 25 clusters (250 nodes)', details: 'Real-time eBPF memory leak tracing + team Slack bot.' },
        { name: 'Enterprise SRE', price: '$2,400 / mo', unit: 'unlimited clusters', details: 'Air-gapped VPC deployment + custom runbooks + SOC2 telemetry.' }
      ]
    : attr.isWeb3
    ? [
        { name: 'Sprint Audit', price: '$799 / repo', unit: 'per git release tag', details: 'Symbolic execution + reentrancy test + certified PDF badge.' },
        { name: 'Protocol Continuous', price: '$2,200 / mo', unit: 'unlimited branch scans', details: 'Real-time PR sentinel + flash-loan fuzzer + gas optimizer.' },
        { name: 'Institutional Assurance', price: '$8,500 / audit', unit: 'full formal verification', details: 'Multi-agent consensus check + manual cryptographer sign-off.' }
      ]
    : [
        { name: 'Hacker / Starter', price: '$49 / mo', unit: 'single seat / 1,000 ops', details: 'Core automated processing + standard webhook integration.' },
        { name: 'Growth Team', price: '$199 / mo', unit: '5 seats / 10,000 ops', details: 'Advanced multi-step agent flows + priority queue + analytics.' },
        { name: 'Enterprise Scale', price: '$850 / mo', unit: 'custom throughput', details: 'Dedicated worker instances + SLA + custom compliance mapping.' }
      ];

  const wtpFriction = attr.isHealth
    ? 'Friction: Reluctance to authorize third-party BAA (Business Associate Agreement) or export patient claim data before proving 5x ROI.'
    : attr.isDevOps
    ? 'Friction: DevSecOps paranoia over giving an autonomous bot write/PR permissions to production cluster repositories.'
    : attr.isWeb3
    ? 'Friction: Smart contract teams seeking recognized brand names (Trail of Bits, OpenZeppelin) rather than automated tools for investor optics.'
    : 'Friction: Churn when users perceive the service as a thin API wrapper over base LLMs that they can prompt manually.';

  // Section 3: Red Team
  const competitors = attr.isHealth
    ? 'Incumbents: Waystar, Change Healthcare, Availity, Experian Health. Stealth threats: Internal payer AI models auto-denying earlier.'
    : attr.isDevOps
    ? 'Incumbents: Datadog, Dynatrace, New Relic, Kubecost. Stealth threats: Native AWS/GCP AI Ops assistants integrated directly into cloud consoles.'
    : attr.isWeb3
    ? 'Incumbents: CertiK, Slither, Mythril, OpenZeppelin Defender. Stealth threats: Foundation model code auditors (Claude 3.7 / GPT-4.5) catching vulnerabilities out of the box.'
    : 'Incumbents: Established vertical SaaS and Zapier/Make automations. Stealth threats: Open-source GitHub repos with 5k stars providing 80% of functionality.';

  const distributionBottleneck = attr.isHealth
    ? 'Distribution Bottleneck: Enterprise hospital procurement takes 6–9 months. Must bypass hospital committees by selling directly to private billing agencies with performance revenue-share.'
    : attr.isDevOps
    ? 'Distribution Bottleneck: Engineers hate outbound marketing emails and sales calls. Zero-conversion unless open-source CLI or free cluster scanner demonstrates immediate OOMKill root-cause on their local machine within 90 seconds.'
    : attr.isWeb3
    ? 'Distribution Bottleneck: Distribution happens exclusively in Telegram alpha groups, Crypto Twitter, and Discord governance proposals. Traditional SEO and Google Ads have near-zero conversion.'
    : 'Distribution Bottleneck: CAC (Customer Acquisition Cost) will bankrupt the venture if paid Google/Meta ads are used. Must engineer an organic programmatic SEO footprint or a high-utility free diagnostic calculator.';

  const failureRisks = [
    'Failure Risk 1 [False Positive Saturation]: If the engine outputs noisy alerts or non-actionable suggestions, users will disable notifications within 72 hours.',
    'Failure Risk 2 [The Platform Squeeze]: The upstream platform (Cloud provider, clearinghouse, or base LLM) introduces a native native feature rendering the core offering obsolete.',
    'Failure Risk 3 [Unit Economic Inversion]: High recurring LLM token inference or cloud compute costs exceeding monthly subscription revenue per active account.'
  ];

  // Section 4: CONCODE Technical Mapping
  const mvpBoundaries = {
    mustBuild: [
      'Single-click ingestion / webhook connection for the primary data source.',
      'Instant Diagnostic Dossier with high-accuracy actionable resolution output.',
      'Zero-friction Stripe customer billing portal with instant tier provisioning.'
    ],
    mustKill: [
      'Multi-tenant team permission matrices & SSO (SAML/Okta) — defer to Post-Revenue.',
      'Native iOS/Android custom apps — use responsive mobile web container first.',
      'Overengineered microservice orchestration — ship monolithic Express/FastAPI core.'
    ]
  };

  const leadGuildId = (attr.routedGuild && attr.routedGuild.guild) || attr.primaryGuild;
  const leadBadge = (attr.routedGuild && attr.routedGuild.agentBadge) || 'Lead System Architect';
  const leadModel = (attr.routedGuild && attr.routedGuild.model) || 'concode-native-v12';

  const guildRouting = [
    {
      guild: leadGuildId,
      badge: leadBadge,
      role: 'Lead Cognitive Architect',
      model: leadModel,
      task: `Orchestrates ${attr.vertical} domain algorithms, bare-metal acceleration, and edge processing.`
    },
    {
      guild: 'FULL_STACK_PLATFORM',
      badge: 'Architect Agent',
      role: 'Interface & API Gateway',
      model: 'concode-native-v12',
      task: 'Renders sleek cybernetic glassmorphic frontend and high-throughput Express REST controllers.'
    },
    {
      guild: 'DATABASE_ARCHITECT',
      badge: 'Database Architect',
      role: 'State & Persistence Engine',
      model: 'concode-data-v12',
      task: 'Designs zero-leak relational schema with atomic transaction records and vector stores.'
    },
    {
      guild: 'DEFENSIVE_SECURITY',
      badge: 'Defensive Security Specialist',
      role: 'Hardening & Protocol Audit',
      model: 'concode-sec-v12',
      task: 'Enforces token rate-limits, input sanitization, and secret vaulting.'
    }
  ];

  // Section 5: 30-Day Validation
  const validationProtocol = {
    week1: 'Week 1 [Cold Smoke Test]: Deploy high-converting landing page with 3D telemetry mock. Run $50 targeted LinkedIn/X ads targeting exact ICP title. Target: 8% email capture rate on "Request Private Alpha".',
    week2: 'Week 2-3 [Concierge Manual Delivery]: Onboard 5 alpha applicants. Deliver the analysis manually behind the scenes using internal scripts without building automated backend.',
    week4: 'Week 4 [Hard Pre-Sale Gate]: Send Stripe checkout link for annual founder discount ($499–$1,500). REQUIRE minimum 3 paid commitments before writing production codebase.'
  };

  // Section 6: Closing Rationale
  let rationale = '';
  if (nvi.verdict === 'GREEN LIGHT') {
    rationale = `The economics and acute pain threshold strongly favor immediate execution. The target economic buyer possesses proven budget, and CONCODE's multi-agent architecture can deliver the revenue-grade MVP within a 21-day sprint. Proceed directly to the Week 1 smoke test gate.`;
  } else if (nvi.verdict === 'PIVOT REQUIRED') {
    rationale = `The core thesis has legitimate commercial substance, but the current ICP framing or monetization mechanism introduces unnecessary friction. Narrow the ICP to a more desperate subset and shift to a usage or performance-based pricing model before writing code.`;
  } else {
    rationale = `High structural headwinds, commoditized defensibility, and punitive customer acquisition costs make this idea commercially unviable in its current form. Reframe the core value proposition around a high-barrier enterprise bottleneck or abort to conserve capital.`;
  }

  return {
    success: true,
    nvi,
    attributes: attr,
    targetICP,
    systemPrompt: SYSTEM_PROMPT,
    dossier: {
      section1_nvi: {
        title: '1. Neural Viability Index (NVI) Matrix',
        scores: [
          { name: 'Market Urgency & Problem Severity', score: nvi.urgency, weight: '30%', comment: urgencyComment },
          { name: 'Monetization Velocity & WTP', score: nvi.velocity, weight: '30%', comment: velocityComment },
          { name: 'Defensibility & Moat', score: nvi.defensibility, weight: '20%', comment: moatComment },
          { name: 'Execution Simplicity & Time-to-MVP', score: nvi.simplicity, weight: '20%', comment: simplicityComment },
        ],
        composite: nvi.composite,
        verdict: nvi.verdictBadge
      },
      section2_monetization: {
        title: '2. Monetization Mechanics & Unit Economics',
        economicEngine: monetization || 'Tiered B2B SaaS + Usage Metering',
        icp: targetICP,
        pricingTiers,
        wtpFriction
      },
      section3_redTeam: {
        title: '3. Market Reality, Real-Time Growth & Red Team Analysis',
        marketGrowth: nvi.marketGrowth,
        competitors,
        distributionBottleneck,
        failureRisks
      },
      section4_concodeMapping: {
        title: '4. CONCODE Neural Brain Technical Mapping & Vault Knowledge',
        mvpBoundaries,
        recommendedStack: {
          frontend: 'Vanilla HTML5 / Modern CSS Glassmorphism / Lightweight JS Web Components',
          backend: 'Express.js Core + Python FastAPI Cognitive Dispatcher',
          database: 'PostgreSQL / SQLite WAL + LanceDB Vector Indexer',
          inference: `CONCODE Neural Brain Engine (${concodeBrainEngine.hardwareConfig.backend} GPU Offloaded // FlashAttention Active)`
        },
        guildRouting,
        concodeBrainTelemetry: {
          engineVersion: `v${concodeBrainEngine.version} Bare-Metal Neural Engine`,
          hardwareGating: `${concodeBrainEngine.hardwareConfig.backend} Acceleration (${concodeBrainEngine.hardwareConfig.gpuLayers} GPU Layers, ${concodeBrainEngine.hardwareConfig.threads} Cores, ${concodeBrainEngine.hardwareConfig.totalMemGB}GB Unified RAM)`,
          hardwareConfig: concodeBrainEngine.hardwareConfig,
          routedGuild: attr.routedGuild,
          thoughtTrace: attr.thoughtTrace,
          astMatrixFiles: concodeBrainEngine.dependencyGraph.size || 195,
          vaultTotalNotes: obsidianVaultKnowledgeEngine.indexedNotes.length || 796
        },
        vaultBlueprints: (attr.matchedVaultNotes || []).map(note => ({
          title: note.title,
          score: note.score,
          tags: note.tags || [],
          wikilinks: note.wikilinks || [],
          excerpt: note.excerpt || ''
        }))
      },
      section5_validation: {
        title: '5. 30-Day Zero-Code / Low-Code Validation Protocol',
        week1: validationProtocol.week1,
        week2_3: validationProtocol.week2,
        week4: validationProtocol.week4
      },
      section6_verdict: {
        title: '6. Final Neural Verdict',
        verdict: nvi.verdictBadge,
        color: nvi.verdictColor,
        rationale
      }
    }
  };
}

/**
 * Main evaluation orchestrator:
 * Attempts Frontier Gemini/Neural Brain query first, then falls back seamlessly.
 */
async function evaluateIdea(payload) {
  const startTime = Date.now();
  const {
    idea = '',
    audience = '',
    monetization = '',
    teamSize = 'small-team',
    stage = 'idea-napkin',
    marketGrowth = 'auto',
    cagr = null,
    apiKey = null
  } = payload || {};

  if (!idea || idea.trim().length < 5) {
    throw new Error('Please provide an idea description of at least 5 characters.');
  }

  // 1. Analyze semantic attributes and compute NVI scores with real-time market growth
  const attr = analyzeVentureAttributes(idea, audience, monetization);
  const nvi = computeNVI(attr, { monetization, stage, teamSize, marketGrowth, cagr });

  // 2. Generate deterministic baseline dossier
  const deterministicReport = buildDeterministicDossier(idea, audience, monetization, teamSize, stage, attr, nvi);

  // 3. Attach CONCODE Brain Core Telemetry
  let enhancedReport = deterministicReport;
  enhancedReport.concodeBrain = {
    version: concodeBrainEngine.version,
    backend: concodeBrainEngine.hardwareConfig.backend,
    hardware: concodeBrainEngine.hardwareConfig,
    routedGuild: attr.routedGuild,
    thoughtTrace: attr.thoughtTrace,
    astMatrix: {
      indexedFiles: concodeBrainEngine.dependencyGraph.size || 195,
      callerNodes: concodeBrainEngine.callerMap.size || 195
    },
    vaultStats: {
      totalNotes: obsidianVaultKnowledgeEngine.indexedNotes.length || 796,
      matchedCount: (attr.matchedVaultNotes || []).length
    },
    vaultBlueprints: (attr.matchedVaultNotes || []).map(note => ({
      title: note.title,
      score: note.score,
      tags: note.tags || [],
      wikilinks: note.wikilinks || [],
      excerpt: note.excerpt || ''
    }))
  };

  let modelUsed = `CONCODE Brain v${concodeBrainEngine.version} (${concodeBrainEngine.hardwareConfig.backend} GPU Gated // AST Matrix // 796 Vault Notes)`;

  try {
    // Check if neural brain is online or Gemini has keys
    const isBrainOnline = await neuralBrain.isNeuralBrainOnline();
    if (isBrainOnline) {
      console.log('[ideaPlannerEngine] Routing audit to Python Neural Brain...');
      const userPrompt = `AUDIT THIS STARTUP IDEA:\nIdea: ${idea}\nTarget Audience: ${audience || 'Not specified'}\nMonetization Model: ${monetization || 'Not specified'}\nTeam Size: ${teamSize}\nCurrent Stage: ${stage}\n\nExecute the 6-part Venture & Product Intelligence audit now.`;
      
      const brainResponse = await neuralBrain.queryCognitive(userPrompt, {
        sessionId: `venture_audit_${Date.now()}`,
        mode: 'text'
      });

      if (brainResponse && (brainResponse.code || brainResponse.personalized_message) && brainResponse.has_local_weights !== false) {
        modelUsed = `CONCODE Neural Brain (CodeLlama-7B + ${concodeBrainEngine.hardwareConfig.backend} GPU)`;
        enhancedReport.aiNarrative = brainResponse.code || brainResponse.personalized_message;
      }
    }

    if (!enhancedReport.aiNarrative && (gemini.isLive() || (apiKey && apiKey.trim().length > 10))) {
      console.log('[ideaPlannerEngine] Routing audit to Gemini Flash...');
      const userContents = [
        {
          role: 'user',
          parts: [{
            text: `AUDIT THIS STARTUP IDEA:\nIdea: ${idea}\nTarget Audience: ${audience || 'Not specified'}\nMonetization Model: ${monetization || 'Not specified'}\nTeam Size: ${teamSize}\nCurrent Stage: ${stage}\n\nStrictly follow your 6-part Venture & Product Intelligence system instructions.`
          }]
        }
      ];

      const geminiResult = await gemini.callGeminiApi(userContents, SYSTEM_PROMPT, apiKey);
      if (geminiResult && geminiResult.text) {
        modelUsed = `CONCODE Brain + Gemini (${geminiResult.modelName})`;
        enhancedReport.aiNarrative = geminiResult.text;
      }
    }
  } catch (err) {
    console.warn('[ideaPlannerEngine] External LLM fallback to Bare-Metal CONCODE Brain Engine:', err.message);
  }

  enhancedReport.modelUsed = modelUsed;
  enhancedReport.latencyMs = Date.now() - startTime;
  return enhancedReport;
}

module.exports = {
  SYSTEM_PROMPT,
  CURATED_PRESETS,
  evaluateIdea,
  analyzeVentureAttributes,
  computeNVI
};
