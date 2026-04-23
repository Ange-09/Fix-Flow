"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { DEFAULT_MACHINE_ID } from "@/app/lib/machineData";

// ── KPI input shapes ─────────────────────────────────────────────────────────

export interface OEEInputs {
  runTime: string;
  plannedProductionTime: string;
  idealCycleTime: string;
  totalCount: string;
  goodCount: string;
}

export interface MTBFInputs {
  totalOperatingTime: string;
  numberOfFailures: string;
}

export interface MTTRInputs {
  totalRepairTime: string;
  numberOfRepairs: string;
}

// ── KPI output shape ─────────────────────────────────────────────────────────

export interface KPIOutputs {
  oeeScore:     number | null; // 0–1 decimal
  availability: number | null; // 0–1 decimal
  performance:  number | null; // 0–1 decimal
  quality:      number | null; // 0–1 decimal
  mtbf:         number | null; // hours
  mttr:         number | null; // hours
}

// ── AHP input shapes ─────────────────────────────────────────────────────────

export type AHPFactor =
  | "Cost"
  | "Long Term Reliability"
  | "Uptime"
  | "Utilization of Technology";

export interface AHPInputs {
  /** Criteria pairwise comparisons — key format: "FactorA|FactorB" */
  critComparisons: Record<string, number>;
  /** Per-criterion strategy comparisons — key format: "StrategyA|StrategyB" */
  altComparisons: Record<AHPFactor, Record<string, number>>;
}

// ── AHP output shape ─────────────────────────────────────────────────────────

export interface ConsistencyResult {
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
}

export type AHPStrategyId = "predictive" | "preventive" | "reactive";

export interface AHPOutputs {
  /** Whether the AHP has been submitted / computed at least once */
  submitted: boolean;
  /** Final global scores per strategy, 0–100 */
  scores: Record<AHPStrategyId, number>;
  /** Criteria weights, 0–1 */
  critWeights: Record<AHPFactor, number>;
  /** Local strategy weights per criterion — index matches STRATEGIES order */
  localWeights: Record<AHPFactor, number[]>;
  /** Consistency results keyed by "criteria" or factor name */
  consistency: { criteria: ConsistencyResult } & Record<string, ConsistencyResult>;
  /** The recommended strategy id (highest score), or null if not yet computed */
  recommendedStrategy: AHPStrategyId | null;
}

// ── Context shape ────────────────────────────────────────────────────────────

interface AppContextType {
  // Machine selection
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;

  // KPI inputs (persisted across navigation)
  oeeInputs:    OEEInputs;
  setOeeInputs: (inputs: OEEInputs) => void;
  mtbfInputs:   MTBFInputs;
  setMtbfInputs: (inputs: MTBFInputs) => void;
  mttrInputs:   MTTRInputs;
  setMttrInputs: (inputs: MTTRInputs) => void;

  // KPI computed outputs (read by DashboardSection)
  kpiOutputs:    KPIOutputs;
  setKpiOutputs: (outputs: KPIOutputs) => void;

  // AHP inputs (persisted across navigation)
  ahpInputs:    AHPInputs;
  setAhpInputs: (inputs: AHPInputs) => void;

  // AHP computed outputs (read by DashboardSection)
  ahpOutputs:    AHPOutputs;
  setAhpOutputs: (outputs: AHPOutputs) => void;
}

// ── Default values ───────────────────────────────────────────────────────────

const DEFAULT_OEE_INPUTS: OEEInputs = {
  runTime: "",
  plannedProductionTime: "",
  idealCycleTime: "",
  totalCount: "",
  goodCount: "",
};

const DEFAULT_MTBF_INPUTS: MTBFInputs = {
  totalOperatingTime: "",
  numberOfFailures: "",
};

const DEFAULT_MTTR_INPUTS: MTTRInputs = {
  totalRepairTime: "",
  numberOfRepairs: "",
};

const DEFAULT_KPI_OUTPUTS: KPIOutputs = {
  oeeScore:     null,
  availability: null,
  performance:  null,
  quality:      null,
  mtbf:         null,
  mttr:         null,
};

// AHP factor pairs and strategy pairs share the same key structure used in the page.
// We keep defaults empty here; the page initialises them with initCritComparisons /
// initAltComparisons on first render and writes them back via setAhpInputs.
const DEFAULT_AHP_INPUTS: AHPInputs = {
  critComparisons: {},
  altComparisons: {
    "Cost":                       {},
    "Long Term Reliability":      {},
    "Uptime":                     {},
    "Utilization of Technology":  {},
  },
};

const DEFAULT_CONSISTENCY: ConsistencyResult = { lambdaMax: 0, ci: 0, ri: 0, cr: 0 };

const DEFAULT_AHP_OUTPUTS: AHPOutputs = {
  submitted:           false,
  scores:              { predictive: 0, preventive: 0, reactive: 0 },
  critWeights:         {
    "Cost":                       0,
    "Long Term Reliability":      0,
    "Uptime":                     0,
    "Utilization of Technology":  0,
  },
  localWeights:        {
    "Cost":                       [],
    "Long Term Reliability":      [],
    "Uptime":                     [],
    "Utilization of Technology":  [],
  },
  consistency:         { criteria: DEFAULT_CONSISTENCY },
  recommendedStrategy: null,
};

// ── Provider ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMachineId, setSelectedMachineId] = useState(DEFAULT_MACHINE_ID);

  const [oeeInputs,  setOeeInputs]  = useState<OEEInputs>(DEFAULT_OEE_INPUTS);
  const [mtbfInputs, setMtbfInputs] = useState<MTBFInputs>(DEFAULT_MTBF_INPUTS);
  const [mttrInputs, setMttrInputs] = useState<MTTRInputs>(DEFAULT_MTTR_INPUTS);
  const [kpiOutputs, setKpiOutputs] = useState<KPIOutputs>(DEFAULT_KPI_OUTPUTS);

  const [ahpInputs,  setAhpInputs]  = useState<AHPInputs>(DEFAULT_AHP_INPUTS);
  const [ahpOutputs, setAhpOutputs] = useState<AHPOutputs>(DEFAULT_AHP_OUTPUTS);

  return (
    <AppContext.Provider
      value={{
        selectedMachineId,
        setSelectedMachineId,
        oeeInputs,
        setOeeInputs,
        mtbfInputs,
        setMtbfInputs,
        mttrInputs,
        setMttrInputs,
        kpiOutputs,
        setKpiOutputs,
        ahpInputs,
        setAhpInputs,
        ahpOutputs,
        setAhpOutputs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppProvider");
  return context;
}