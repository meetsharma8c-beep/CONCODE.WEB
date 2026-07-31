/**
 * NanoCore by CONCODE - Module 2: NanoPredict
 * AI Quantum Property & Bio-Compatibility Predictor Engine
 */

export class NanoPredictEngine {
  constructor() {
    this.materialDatabase = {
      TiO2: {
        name: 'Titanium Dioxide Nanoparticles',
        molarMass: 79.86,
        bulkBandgapEv: 3.2,
        electronegativityDelta: 1.9,
        dielectricConstant: 86.0,
        effElectronMass: 1.0,
        effHoleMass: 2.0,
        toxicityFactor: 2.5
      },
      Fe3O4: {
        name: 'Magnetite Superparamagnetic Nanoparticles',
        molarMass: 231.53,
        bulkBandgapEv: 0.1,
        electronegativityDelta: 1.6,
        dielectricConstant: 12.0,
        effElectronMass: 0.4,
        effHoleMass: 0.8,
        toxicityFactor: 1.2
      },
      Au: {
        name: 'Gold Nanoplasmonic Spheres',
        molarMass: 196.97,
        bulkBandgapEv: 0.0,
        electronegativityDelta: 0.0,
        dielectricConstant: 1.0,
        effElectronMass: 1.0,
        effHoleMass: 1.0,
        toxicityFactor: 0.5
      },
      ZnO: {
        name: 'Zinc Oxide Nanowires',
        molarMass: 81.38,
        bulkBandgapEv: 3.37,
        electronegativityDelta: 1.8,
        dielectricConstant: 8.5,
        effElectronMass: 0.24,
        effHoleMass: 0.45,
        toxicityFactor: 3.1
      },
      CNT: {
        name: 'Carbon Nanotube (Semiconducting)',
        molarMass: 12.01,
        bulkBandgapEv: 0.8,
        electronegativityDelta: 0.0,
        dielectricConstant: 10.0,
        effElectronMass: 0.06,
        effHoleMass: 0.06,
        toxicityFactor: 1.8
      },
      Ti3C2Tx: {
        name: '2D Titanium Carbide MXene',
        molarMass: 195.6,
        bulkBandgapEv: 0.05,
        electronegativityDelta: 1.2,
        dielectricConstant: 35.0,
        effElectronMass: 0.15,
        effHoleMass: 0.25,
        toxicityFactor: 0.9
      },
      CsPbI3: {
        name: 'Inorganic Perovskite Quantum Dots',
        molarMass: 720.8,
        bulkBandgapEv: 1.73,
        electronegativityDelta: 1.1,
        dielectricConstant: 9.2,
        effElectronMass: 0.15,
        effHoleMass: 0.15,
        toxicityFactor: 4.2
      },
      MOF5: {
        name: 'Metal-Organic Framework MOF-5',
        molarMass: 769.9,
        bulkBandgapEv: 3.8,
        electronegativityDelta: 2.1,
        dielectricConstant: 2.5,
        effElectronMass: 0.8,
        effHoleMass: 1.2,
        toxicityFactor: 0.6
      }
    };

    this.chartInstance = null;
  }

  /**
   * Run quantum confinement & physical prediction calculations, optionally requesting Gemini AI analysis
   */
  async predict(formula = 'TiO2', diameterNm = 10, temperatureK = 300, useGeminiAi = false) {
    const mat = this.materialDatabase[formula] || this.materialDatabase['TiO2'];

    // 1. Surface-Area-to-Volume Ratio: SA/V = 6 / d (for spherical nanostructures)
    const savRatio = Number((6 / diameterNm).toFixed(3)); // nm^-1

    // 2. Quantum Confinement shift using Brus equation model:
    const radiusNm = diameterNm / 2;
    const reducedMass = (mat.effElectronMass * mat.effHoleMass) / (mat.effElectronMass + mat.effHoleMass);
    
    const h2Term = 0.376 / (reducedMass * Math.pow(radiusNm, 2));
    const coulombTerm = 0.14 / (mat.dielectricConstant * radiusNm);
    
    const quantumShiftEv = Math.max(0, Number((h2Term - coulombTerm).toFixed(3)));
    const predictedBandgap = mat.bulkBandgapEv === 0 ? 0.0 : Number((mat.bulkBandgapEv + quantumShiftEv).toFixed(3));

    // 3. Surface Reactivity Score (0 - 100%)
    const reactivityRaw = (savRatio * 10) + (mat.electronegativityDelta * 15) + ((temperatureK - 273) * 0.05);
    const surfaceReactivityScore = Math.min(100, Math.max(5, Number(reactivityRaw.toFixed(1))));

    // 4. Toxicity Index (0 - 10 scale)
    const toxicityRaw = mat.toxicityFactor * (1 + savRatio * 0.3) * (temperatureK / 300);
    const toxicityIndex = Math.min(10, Math.max(0.1, Number(toxicityRaw.toFixed(2))));

    // 5. Optical Peak Wavelength λ = 1240 / Eg (nm)
    const opticalPeakNm = predictedBandgap > 0 ? Number((1240 / predictedBandgap).toFixed(1)) : 0;

    // Generate property spectrum curve across diameters 1nm - 100nm
    const chartData = [];
    for (let d = 1; d <= 50; d += 2) {
      const r = d / 2;
      const h2 = 0.376 / (reducedMass * Math.pow(r, 2));
      const cou = 0.14 / (mat.dielectricConstant * r);
      const shift = Math.max(0, h2 - cou);
      const bg = mat.bulkBandgapEv === 0 ? 0 : mat.bulkBandgapEv + shift;
      chartData.push({
        diameter: d,
        bandgap: Number(bg.toFixed(2)),
        reactivity: Number(Math.min(100, (6 / d) * 12 + mat.electronegativityDelta * 10).toFixed(1)),
        confinement: Number(shift.toFixed(2))
      });
    }

    let aiAnalysisText = null;

    if (useGeminiAi) {
      try {
        const response = await fetch('/api/deeptech/predict-nanomaterial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formula, diameterNm, temperatureK })
        });
        const resData = await response.json();
        if (resData.success && resData.data?.aiAnalysisText) {
          aiAnalysisText = resData.data.aiAnalysisText;
        }
      } catch (err) {
        console.warn('Gemini AI deep prediction fallback to local engine:', err);
      }
    }

    if (!aiAnalysisText) {
      aiAnalysisText = `Quantum confinement for ${mat.name} (${formula}) at ${diameterNm} nm shows a bandgap shift of +${quantumShiftEv} eV over bulk state (${mat.bulkBandgapEv} eV). Surface area to volume ratio of ${savRatio} nm⁻¹ yields high electronic reactivity (${surfaceReactivityScore}%). Estimated optical absorption peak is centered at ${opticalPeakNm} nm.`;
    }

    return {
      formula,
      materialName: mat.name,
      surfaceAreaToVolumeRatio: savRatio,
      quantumConfinementShiftEv: quantumShiftEv,
      predictedBandgapEv: predictedBandgap,
      surfaceReactivityScore,
      toxicityIndex,
      opticalAbsorbancePeakNm: opticalPeakNm,
      aiAnalysisText,
      chartData
    };
  }

  /**
   * Render Chart.js property curves
   */
  renderChart(canvasElement, chartData) {
    if (!canvasElement || typeof Chart === 'undefined') return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const labels = chartData.map(d => `${d.diameter}nm`);
    const bandgaps = chartData.map(d => d.bandgap);
    const reactivities = chartData.map(d => d.reactivity);

    const ctx = canvasElement.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Predicted Bandgap (eV)',
            data: bandgaps,
            borderColor: '#00f0ff',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Surface Reactivity (%)',
            data: reactivities,
            borderColor: '#00ff9d',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'JetBrains Mono' } } }
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: {
            type: 'linear',
            position: 'left',
            ticks: { color: '#00f0ff' },
            grid: { color: 'rgba(0,240,255,0.1)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            ticks: { color: '#00ff9d' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }
}
