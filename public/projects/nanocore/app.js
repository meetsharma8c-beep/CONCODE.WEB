/**
 * NanoCore by CONCODE - Main Application Controller
 * Orchestrates Module 1 (NanoDesign), Module 2 (NanoPredict), and Module 3 (NanoSwarm)
 * World-Class DeepTech Execution Engine
 */

import { NanoDesignEngine } from './modules/nanoDesign.js';
import { NanoPredictEngine } from './modules/nanoPredict.js';
import { NanoSwarmEngine } from './modules/nanoSwarm.js';

class NanoCoreApp {
  constructor() {
    this.activeModule = 'design'; // 'design' | 'predict' | 'swarm'
    this.designEngine = null;
    this.predictEngine = null;
    this.swarmEngine = null;

    this.init();
  }

  init() {
    const start = () => {
      this.setupNavigation();
      this.setupEnterprisePresets();
      this.initModule1();
      this.initModule2();
      this.initModule3();
      this.updateActiveModuleUI();
      if (window.lucide) window.lucide.createIcons();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }



  setupNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetModule = btn.getAttribute('data-module');
        if (targetModule) {
          this.switchModule(targetModule);
        }
      });
    });
  }

  setupEnterprisePresets() {
    const medtechBtn = document.getElementById('btn-preset-medtech');
    const semiBtn = document.getElementById('btn-preset-semi');
    const cleantechBtn = document.getElementById('btn-preset-cleantech');

    if (medtechBtn) {
      medtechBtn.addEventListener('click', () => {
        this.switchModule('swarm');
        if (this.swarmEngine) {
          this.swarmEngine.setParticleCount(150);
          this.swarmEngine.setMagneticControls(45, 30, 3.5);
          this.swarmEngine.setFluidViscosity(0.003);
          this.swarmEngine.start();
        }
      });
    }

    if (semiBtn) {
      semiBtn.addEventListener('click', () => {
        this.switchModule('design');
        const typeSelect = document.getElementById('select-nano-type');
        if (typeSelect) typeSelect.value = 'cnt';
        this.updateNanoDesign();
      });
    }

    if (cleantechBtn) {
      cleantechBtn.addEventListener('click', () => {
        this.switchModule('design');
        const typeSelect = document.getElementById('select-nano-type');
        if (typeSelect) typeSelect.value = 'mof';
        this.updateNanoDesign();
      });
    }
  }

  switchModule(moduleName) {
    this.activeModule = moduleName;
    this.updateActiveModuleUI();

    if (moduleName === 'swarm' && this.swarmEngine) {
      this.swarmEngine.start();
    } else if (this.swarmEngine) {
      this.swarmEngine.stop();
    }

    if (moduleName === 'predict' && this.predictEngine) {
      this.runPrediction(false);
    }
  }

  updateActiveModuleUI() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-module') === this.activeModule) {
        btn.classList.add('active', 'border-cyan-500', 'text-cyan-400', 'bg-slate-800/80');
        btn.classList.remove('border-transparent', 'text-slate-400');
      } else {
        btn.classList.remove('active', 'border-cyan-500', 'text-cyan-400', 'bg-slate-800/80');
        btn.classList.add('border-transparent', 'text-slate-400');
      }
    });

    document.querySelectorAll('.module-panel').forEach(panel => {
      if (panel.id === `module-${this.activeModule}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  /* ------------------------------------------------------------------------
   * MODULE 1: NANODESIGN INITIALIZATION & EVENT LISTENERS
   * ------------------------------------------------------------------------ */
  initModule1() {
    const container = document.getElementById('nano-design-viewport');
    if (!container) return;

    this.designEngine = new NanoDesignEngine(container);

    this.updateNanoDesign();

    const nInput = document.getElementById('input-chiral-n');
    const mInput = document.getElementById('input-chiral-m');
    const lengthInput = document.getElementById('input-cnt-length');
    const typeSelect = document.getElementById('select-nano-type');
    const styleSelect = document.getElementById('select-render-style');
    const fileImportInput = document.getElementById('input-file-import');
    const wireframeBtn = document.getElementById('btn-toggle-wireframe');
    const exportBtn = document.getElementById('btn-export-xyz');

    const triggerUpdate = () => this.updateNanoDesign();

    if (nInput) nInput.addEventListener('input', triggerUpdate);
    if (mInput) mInput.addEventListener('input', triggerUpdate);
    if (lengthInput) lengthInput.addEventListener('input', triggerUpdate);
    if (typeSelect) typeSelect.addEventListener('change', triggerUpdate);

    if (styleSelect) {
      styleSelect.addEventListener('change', (e) => {
        if (this.designEngine) {
          this.designEngine.setRenderStyleMode(e.target.value);
        }
      });
    }

    if (fileImportInput) {
      fileImportInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          const ext = file.name.split('.').pop().toLowerCase();
          const metrics = this.designEngine.importFileContent(content, ext);
          const outEl = document.getElementById('nano-measure-output');
          if (outEl) outEl.textContent = `Imported ${file.name} (${this.designEngine.currentData.atoms.length} atoms)`;
        };
        reader.readAsText(file);
      });
    }

    if (wireframeBtn) {
      wireframeBtn.addEventListener('click', () => {
        const isWire = this.designEngine.toggleWireframe();
        wireframeBtn.classList.toggle('bg-cyan-500/20', isWire);
        wireframeBtn.classList.toggle('text-cyan-400', isWire);
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.designEngine.exportXYZ();
      });
    }
  }

  updateNanoDesign() {
    if (!this.designEngine) return;

    const n = parseInt(document.getElementById('input-chiral-n')?.value || '10', 10);
    const m = parseInt(document.getElementById('input-chiral-m')?.value || '10', 10);
    const lengthNm = parseFloat(document.getElementById('input-cnt-length')?.value || '3.0');
    const type = document.getElementById('select-nano-type')?.value || 'cnt';

    document.getElementById('val-chiral-n').textContent = n;
    document.getElementById('val-chiral-m').textContent = m;
    document.getElementById('val-cnt-length').textContent = `${lengthNm.toFixed(1)} nm`;

    const metrics = this.designEngine.generateNanostructure({ type, n, m, lengthNm });

    document.getElementById('metric-diameter').textContent = `${metrics.diameterNm.toFixed(3)} nm`;
    document.getElementById('metric-chiral-angle').textContent = `${metrics.chiralAngleDeg.toFixed(1)}°`;
    document.getElementById('metric-chiral-vector').textContent = `${metrics.chiralLengthNm.toFixed(3)} nm`;
    document.getElementById('metric-bandgap-state').textContent = metrics.bandgapType;
    document.getElementById('metric-bandgap-state').className = metrics.isMetallic
      ? 'text-cyan-400 font-bold font-mono'
      : 'text-emerald-400 font-bold font-mono';
    document.getElementById('metric-est-bandgap').textContent = metrics.isMetallic ? '0.0 eV' : `${metrics.estimatedBandgapEv} eV`;
  }

  /* ------------------------------------------------------------------------
   * MODULE 2: NANOPREDICT INITIALIZATION & EVENT LISTENERS
   * ------------------------------------------------------------------------ */
  initModule2() {
    this.predictEngine = new NanoPredictEngine();

    const formulaSelect = document.getElementById('select-material-formula');
    const diameterSlider = document.getElementById('slider-particle-diameter');
    const tempSlider = document.getElementById('slider-temperature');
    const aiBtn = document.getElementById('btn-run-gemini-ai');

    const triggerPredict = () => this.runPrediction(false);

    if (formulaSelect) formulaSelect.addEventListener('change', triggerPredict);
    if (diameterSlider) diameterSlider.addEventListener('input', triggerPredict);
    if (tempSlider) tempSlider.addEventListener('input', triggerPredict);

    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        this.runPrediction(true);
      });
    }
  }

  async runPrediction(useGeminiAi = false) {
    if (!this.predictEngine) return;

    const formula = document.getElementById('select-material-formula')?.value || 'TiO2';
    const diameterNm = parseFloat(document.getElementById('slider-particle-diameter')?.value || '10');
    const tempK = parseFloat(document.getElementById('slider-temperature')?.value || '300');

    document.getElementById('val-particle-diameter').textContent = `${diameterNm} nm`;
    document.getElementById('val-temperature').textContent = `${tempK} K`;

    const aiTextEl = document.getElementById('predict-ai-text');
    if (useGeminiAi && aiTextEl) {
      aiTextEl.textContent = 'Querying Google Gemini AI for quantum material insights...';
    }

    const res = await this.predictEngine.predict(formula, diameterNm, tempK, useGeminiAi);

    document.getElementById('predict-mat-name').textContent = res.materialName;
    document.getElementById('predict-sav-ratio').textContent = `${res.surfaceAreaToVolumeRatio} nm⁻¹`;
    document.getElementById('predict-quantum-shift').textContent = `+${res.quantumConfinementShiftEv} eV`;
    document.getElementById('predict-bandgap').textContent = res.predictedBandgapEv === 0 ? '0.0 eV (Metallic)' : `${res.predictedBandgapEv} eV`;
    document.getElementById('predict-reactivity').textContent = `${res.surfaceReactivityScore}%`;
    document.getElementById('predict-toxicity').textContent = `${res.toxicityIndex} / 10`;

    if (aiTextEl && res.aiAnalysisText) {
      aiTextEl.textContent = res.aiAnalysisText;
    }

    const canvas = document.getElementById('predict-chart-canvas');
    if (canvas) {
      this.predictEngine.renderChart(canvas, res.chartData);
    }
  }

  /* ------------------------------------------------------------------------
   * MODULE 3: NANOSWARM INITIALIZATION & EVENT LISTENERS
   * ------------------------------------------------------------------------ */
  initModule3() {
    const canvas = document.getElementById('nano-swarm-canvas');
    if (!canvas) return;

    this.swarmEngine = new NanoSwarmEngine(canvas);

    const gradXSlider = document.getElementById('slider-grad-x');
    const gradYSlider = document.getElementById('slider-grad-y');
    const teslaSlider = document.getElementById('slider-field-tesla');
    const swarmCountSlider = document.getElementById('slider-swarm-count');
    const viscositySlider = document.getElementById('slider-viscosity');
    const toggleBtn = document.getElementById('btn-toggle-swarm');
    const resetBtn = document.getElementById('btn-reset-swarm');

    const updateControls = () => {
      const gx = parseFloat(gradXSlider?.value || '0');
      const gy = parseFloat(gradYSlider?.value || '0');
      const tesla = parseFloat(teslaSlider?.value || '2.5');
      const visc = parseFloat(viscositySlider?.value || '0.003');

      document.getElementById('val-grad-x').textContent = `${gx > 0 ? '+' : ''}${gx}%`;
      document.getElementById('val-grad-y').textContent = `${gy > 0 ? '+' : ''}${gy}%`;
      document.getElementById('val-[#00F0FF] val-field-tesla').textContent = `${tesla.toFixed(1)} T`;
      document.getElementById('val-viscosity').textContent = `${visc.toFixed(3)} Pa·s`;

      this.swarmEngine.setMagneticControls(gx, gy, tesla);
      this.swarmEngine.setFluidViscosity(visc);
    };

    if (gradXSlider) gradXSlider.addEventListener('input', updateControls);
    if (gradYSlider) gradYSlider.addEventListener('input', updateControls);
    if (teslaSlider) teslaSlider.addEventListener('input', updateControls);
    if (viscositySlider) viscositySlider.addEventListener('input', updateControls);

    if (swarmCountSlider) {
      swarmCountSlider.addEventListener('input', (e) => {
        const count = parseInt(e.target.value, 10);
        document.getElementById('val-swarm-count').textContent = `${count} Robots`;
        this.swarmEngine.setParticleCount(count);
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (this.swarmEngine.isRunning) {
          this.swarmEngine.stop();
          toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Start Physics';
        } else {
          this.swarmEngine.start();
          toggleBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i> Pause Physics';
        }
        if (window.lucide) window.lucide.createIcons();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.swarmEngine.resetSwarm();
      });
    }

    setInterval(() => {
      if (this.activeModule === 'swarm' && this.swarmEngine) {
        document.getElementById('swarm-metric-reached').textContent = `${this.swarmEngine.metrics.reachedCount} / ${this.swarmEngine.particleCount}`;
        document.getElementById('swarm-metric-velocity').textContent = `${this.swarmEngine.metrics.avgVelocity} px/s`;
        document.getElementById('swarm-metric-force').textContent = `${this.swarmEngine.metrics.magneticForceMagnitude} N`;
        document.getElementById('swarm-metric-payload').textContent = `${this.swarmEngine.metrics.totalPayloadDeliveredMg} mg`;
      }
    }, 200);
  }
}

// Instantiate App
window.nanoCoreApp = new NanoCoreApp();
