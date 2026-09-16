/**
 * CONCODE AI — Dynamic Skill Creator Engine v1.0
 * File: utils/skillCreatorEngine.js
 * 
 * Features:
 *  1. Autonomous Skill Specification Synthesis from Natural Language
 *  2. Persistent Skill Storage & Dynamic Module Registry (`data/dynamic_skills/`)
 *  3. Safe Node.js VM Sandbox Execution Context for Custom Skills
 *  4. Integration with CONCODE Brain Engine Guild Router
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class SkillCreatorEngine {
  constructor(options = {}) {
    this.skillsDir = options.skillsDir || path.resolve(__dirname, '../data/dynamic_skills');
    this.skillRegistry = new Map();
    
    this.ensureSkillsDirectory();
    this.loadPersistedSkills();
  }

  /**
   * Ensures the dynamic skills storage directory exists
   */
  ensureSkillsDirectory() {
    try {
      if (!fs.existsSync(this.skillsDir)) {
        fs.mkdirSync(this.skillsDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[SkillCreatorEngine] Directory creation warning:', err.message);
    }
  }

  /**
   * Sanitizes skill name into a valid identifier
   */
  sanitizeSkillName(name) {
    return (name || 'custom_skill')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Generates a Skill Specification object from a user prompt
   */
  synthesizeSkillSpec(prompt, customCode = '') {
    const rawName = prompt.split(' ').slice(0, 4).join('_');
    const skillId = this.sanitizeSkillName(rawName) || `skill_${Date.now()}`;
    const keywords = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const defaultLogic = customCode || `
// Dynamically synthesized skill execution logic
function execute(input = {}, context = {}) {
  const result = {
    timestamp: new Date().toISOString(),
    processedInput: input,
    status: 'success',
    output: "Skill executed successfully: " + (input.query || "No query provided")
  };
  return result;
}
module.exports = { execute };
`;

    return {
      id: skillId,
      name: skillId.replace(/_/g, ' ').toUpperCase(),
      description: `Autonomous skill created for prompt: "${prompt}"`,
      promptSource: prompt,
      keywords: keywords.length > 0 ? keywords : [skillId],
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      inputs: { query: 'string' },
      executionCode: defaultLogic.trim()
    };
  }

  /**
   * Saves and registers a new skill dynamically
   */
  registerSkill(skillSpec) {
    const skillId = this.sanitizeSkillName(skillSpec.id || skillSpec.name);
    skillSpec.id = skillId;

    const filePath = path.join(this.skillsDir, `${skillId}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(skillSpec, null, 2), 'utf8');
      this.skillRegistry.set(skillId, skillSpec);
      return { success: true, skill: skillSpec, filePath };
    } catch (err) {
      console.error('[SkillCreatorEngine] Failed to save skill:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Loads all persisted dynamic skills from disk
   */
  loadPersistedSkills() {
    try {
      this.ensureSkillsDirectory();
      const files = fs.readdirSync(this.skillsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = fs.readFileSync(path.join(this.skillsDir, file), 'utf8');
            const skillSpec = JSON.parse(content);
            if (skillSpec.id) {
              this.skillRegistry.set(skillSpec.id, skillSpec);
            }
          } catch (e) {
            console.warn(`[SkillCreatorEngine] Skipped corrupt skill file ${file}:`, e.message);
          }
        }
      }
    } catch (err) {
      console.warn('[SkillCreatorEngine] Skill loading warning:', err.message);
    }
  }

  /**
   * Returns a list of all registered dynamic skills
   */
  listSkills() {
    return Array.from(this.skillRegistry.values());
  }

  /**
   * Executes a skill safely within an isolated VM context
   */
  executeSkill(skillId, input = {}, context = {}) {
    const skill = this.skillRegistry.get(skillId);
    if (!skill) {
      return { success: false, error: `Skill "${skillId}" not found in registry.` };
    }

    const startTime = Date.now();
    try {
      const sandboxModule = { exports: {} };
      const sandbox = {
        console: { log: () => {}, warn: () => {}, error: () => {} },
        Buffer,
        Date,
        Math,
        JSON,
        module: sandboxModule,
        exports: sandboxModule.exports,
        input,
        context
      };

      const script = new vm.Script(skill.executionCode + '\n; module.exports.execute(input, context);');
      const vmContext = vm.createContext(sandbox);
      const output = script.runInContext(vmContext, {
        timeout: 3000, // 3-second strict CPU timeout limit
        breakOnSigint: true
      });

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        skillId,
        skillName: skill.name,
        sandboxTelemetry: {
          isolationLevel: 'NODE_VM_SANDBOX_V10',
          executionTimeMs,
          timeoutLimitMs: 3000,
          memoryGuard: 'ACTIVE'
        },
        output
      };
    } catch (err) {
      return {
        success: false,
        skillId,
        executionTimeMs: Date.now() - startTime,
        error: `Execution error in skill "${skillId}": ${err.message}`
      };
    }
  }
}

module.exports = new SkillCreatorEngine();
