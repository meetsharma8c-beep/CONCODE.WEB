/**
 * NanoCore by CONCODE - Unified Data Contracts & TypeScript Definitions
 * World-Class DeepTech & Nanotechnology Specifications
 */

// Module 1: NanoDesign (3D Nanostructure Visualizer & Materials Engine)
export type NanostructureType = 'cnt' | 'graphene' | 'fullerene' | 'mxene' | 'perovskite' | 'mof' | 'quantum_dot';
export type RenderStyleMode = 'ball_stick' | 'cpk' | 'pi_orbital';

export interface CNTParameters {
  n: number; // Chiral index n
  m: number; // Chiral index m
  lengthNm: number; // Tube length in nanometers
  bondLengthNm: number; // Carbon-carbon bond length (~0.142 nm)
  latticeConstantNm: number; // Lattice constant a = sqrt(3)*a_cc (~0.246 nm)
}

export interface ElectronicState {
  isMetallic: boolean;
  bandgapType: 'Metallic' | 'Semiconducting';
  chiralAngleDeg: number;
  diameterNm: number;
  chiralLengthNm: number;
  atomCount: number;
  excitonBindingEnergyEv?: number;
  fermiVelocityMs?: number;
}

export interface Atom3D {
  id: number;
  x: number;
  y: number;
  z: number;
  element: string; // 'C', 'Ti', 'O', 'Pb', 'Cs', 'I', 'Au', 'Fe', etc.
  radiusNm?: number;
  colorHex?: string;
}

export interface Bond3D {
  atom1Index: number;
  atom2Index: number;
  bondOrder?: number;
}

export interface MoleculeMesh {
  atoms: Atom3D[];
  bonds: Bond3D[];
  type?: NanostructureType;
  metadata?: Record<string, any>;
}

// Module 2: NanoPredict (AI Quantum Property & Bio-Compatibility Predictor)
export interface NanoparticleInput {
  formula: string; // 'TiO2', 'Fe3O4', 'Au', 'ZnO', 'CNT', 'Ti3C2Tx', 'CsPbI3', 'MOF-5'
  diameterNm: number;
  temperatureK: number;
  useGeminiAi?: boolean;
}

export interface MaterialProperties {
  name: string;
  molarMass: number; // g/mol
  bulkBandgapEv: number; // eV
  electronegativityDelta: number;
  dielectricConstant: number;
  effElectronMass: number;
  effHoleMass: number;
  toxicityFactor: number;
  excitonBindingEnergyEv?: number;
}

export interface PredictionOutput {
  formula: string;
  materialName: string;
  surfaceAreaToVolumeRatio: number; // nm^-1 (6/d)
  quantumConfinementShiftEv: number; // Delta E (eV)
  predictedBandgapEv: number; // E_g(d) (eV)
  surfaceReactivityScore: number; // 0 - 100%
  toxicityIndex: number; // 0 - 10 scale
  opticalAbsorbancePeakNm: number; // nm
  aiAnalysisText?: string;
  synthesisProtocol?: string[];
  bioCompatibilityRating?: string;
  chartData: { diameter: number; bandgap: number; reactivity: number; confinement: number }[];
}

// Module 3: NanoSwarm (3D Microrobot Physics & Bio-Microfluidic Simulator)
export interface FluidChannelConfig {
  width: number;
  height: number;
  depth?: number;
  viscosityPaS: number; // Dynamic viscosity (blood plasma ~0.003 Pa·s)
  flowVelocityX: number; // Fluid drift
  isNonNewtonian?: boolean;
}

export interface MagneticCoilState {
  gradientX: number; // -100 to +100 %
  gradientY: number; // -100 to +100 %
  gradientZ?: number; // -100 to +100 %
  fieldStrengthTesla: number; // 0 to 5 T
}

export interface ParticleKinematics {
  id: number;
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  vz?: number;
  radius: number;
  magneticMoment: number;
  color: string;
  stuck: boolean;
  reachedTarget: boolean;
  payloadCarriedMg?: number;
}

export interface TargetZone {
  x: number;
  y: number;
  z?: number;
  radius: number;
}

export interface SwarmSimulationState {
  particleCount: number;
  particles: ParticleKinematics[];
  coils: MagneticCoilState;
  fluid: FluidChannelConfig;
  target: TargetZone;
  particlesReached: number;
  avgVelocity: number;
  totalPayloadDeliveredMg?: number;
  isRunning: boolean;
}
