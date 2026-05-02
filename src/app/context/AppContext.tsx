"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
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
  oeeScore: number | null;
  availability: number | null;
  performance: number | null;
  quality: number | null;
  mtbf: number | null;
  mttr: number | null;
}

// ── Time frame ───────────────────────────────────────────────────────────────

export type TimeFrame =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annually";

export const TIME_FRAME_OPTIONS: {
  value: TimeFrame;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "daily",
    label: "Daily",
    shortLabel: "Day",
    description: "Last 24 hours",
  },
  {
    value: "weekly",
    label: "Weekly",
    shortLabel: "Week",
    description: "Last 7 days",
  },
  {
    value: "monthly",
    label: "Monthly",
    shortLabel: "Month",
    description: "Last 30 days",
  },
  {
    value: "quarterly",
    label: "Quarterly",
    shortLabel: "Quarter",
    description: "Last 90 days",
  },
  {
    value: "annually",
    label: "Annually",
    shortLabel: "Year",
    description: "Last 365 days",
  },
];

// ── AHP input shapes ─────────────────────────────────────────────────────────

export type AHPFactor =
  | "Cost"
  | "Long Term Reliability"
  | "Uptime"
  | "Utilization of Technology";

export interface AHPInputs {
  critComparisons: Record<string, number>;
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
  submitted: boolean;
  scores: Record<AHPStrategyId, number>;
  critWeights: Record<AHPFactor, number>;
  localWeights: Record<AHPFactor, number[]>;
  consistency: { criteria: ConsistencyResult } & Record<
    string,
    ConsistencyResult
  >;
  recommendedStrategy: AHPStrategyId | null;
}

// ── Spare parts state ─────────────────────────────────────────────────────────

export interface SparePartState {
  pDate: string;
  pfInterval: number;
  // Consumables page editable fields (optional — fall back to base data if absent)
  d?: number;
  L?: number;
  SS?: number;
  currentStock?: number;
}

// partId → SparePartState
export type MachineSparePartsState = Record<string, SparePartState>;

// ── Per-machine state bundles ─────────────────────────────────────────────────

export interface MachineKPIState {
  oeeInputs: OEEInputs;
  mtbfInputs: MTBFInputs;
  mttrInputs: MTTRInputs;
  kpiOutputs: KPIOutputs;
  timeFrame: TimeFrame; // ← added
}

export interface MachineAHPState {
  ahpInputs: AHPInputs;
  ahpOutputs: AHPOutputs;
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
  oeeScore: null,
  availability: null,
  performance: null,
  quality: null,
  mtbf: null,
  mttr: null,
};

const DEFAULT_AHP_INPUTS: AHPInputs = {
  critComparisons: {},
  altComparisons: {
    Cost: {},
    "Long Term Reliability": {},
    Uptime: {},
    "Utilization of Technology": {},
  },
};

const DEFAULT_CONSISTENCY: ConsistencyResult = {
  lambdaMax: 0,
  ci: 0,
  ri: 0,
  cr: 0,
};

const DEFAULT_AHP_OUTPUTS: AHPOutputs = {
  submitted: false,
  scores: { predictive: 0, preventive: 0, reactive: 0 },
  critWeights: {
    Cost: 0,
    "Long Term Reliability": 0,
    Uptime: 0,
    "Utilization of Technology": 0,
  },
  localWeights: {
    Cost: [],
    "Long Term Reliability": [],
    Uptime: [],
    "Utilization of Technology": [],
  },
  consistency: { criteria: DEFAULT_CONSISTENCY },
  recommendedStrategy: null,
};

function defaultMachineKPI(): MachineKPIState {
  return {
    oeeInputs: { ...DEFAULT_OEE_INPUTS },
    mtbfInputs: { ...DEFAULT_MTBF_INPUTS },
    mttrInputs: { ...DEFAULT_MTTR_INPUTS },
    kpiOutputs: { ...DEFAULT_KPI_OUTPUTS },
    timeFrame: "monthly", // ← default period
  };
}

function defaultMachineAHP(): MachineAHPState {
  return {
    ahpInputs: {
      critComparisons: {},
      altComparisons: {
        Cost: {},
        "Long Term Reliability": {},
        Uptime: {},
        "Utilization of Technology": {},
      },
    },
    ahpOutputs: {
      ...DEFAULT_AHP_OUTPUTS,
      scores: { predictive: 0, preventive: 0, reactive: 0 },
      critWeights: {
        Cost: 0,
        "Long Term Reliability": 0,
        Uptime: 0,
        "Utilization of Technology": 0,
      },
      localWeights: {
        Cost: [],
        "Long Term Reliability": [],
        Uptime: [],
        "Utilization of Technology": [],
      },
      consistency: { criteria: { ...DEFAULT_CONSISTENCY } },
    },
  };
}

// ── Context shape ────────────────────────────────────────────────────────────

interface AppContextType {
  // Machine selection
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;

  // KPI — scoped to selected machine
  oeeInputs: OEEInputs;
  setOeeInputs: (inputs: OEEInputs) => void;
  mtbfInputs: MTBFInputs;
  setMtbfInputs: (inputs: MTBFInputs) => void;
  mttrInputs: MTTRInputs;
  setMttrInputs: (inputs: MTTRInputs) => void;
  kpiOutputs: KPIOutputs;
  setKpiOutputs: (outputs: KPIOutputs) => void;

  // Time frame — scoped to selected machine
  timeFrame: TimeFrame;
  setTimeFrame: (tf: TimeFrame) => void;

  // AHP — scoped to selected machine
  ahpInputs: AHPInputs;
  setAhpInputs: (inputs: AHPInputs) => void;
  ahpOutputs: AHPOutputs;
  setAhpOutputs: (outputs: AHPOutputs) => void;

  // Spare parts — scoped to selected machine
  sparePartsState: MachineSparePartsState;
  setSparePartState: (
    partId: string,
    field: "pDate" | "pfInterval" | "d" | "L" | "SS" | "currentStock",
    value: string | number,
  ) => void;
  setSparePartsStateForMachine: (
    machineId: string,
    state: MachineSparePartsState,
  ) => void;

  // Raw per-machine maps (read by DashboardSection to show any machine's data)
  allKpiStates: Record<string, MachineKPIState>;
  allAhpStates: Record<string, MachineAHPState>;
  allSparePartsStates: Record<string, MachineSparePartsState>;
}

// ── Provider ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMachineId, setSelectedMachineId] =
    useState(DEFAULT_MACHINE_ID);

  // Per-machine KPI state (now includes timeFrame)
  const [allKpiStates, setAllKpiStates] = useState<
    Record<string, MachineKPIState>
  >({});

  // Per-machine AHP state
  const [allAhpStates, setAllAhpStates] = useState<
    Record<string, MachineAHPState>
  >({});

  // Per-machine spare parts state
  const [allSparePartsStates, setAllSparePartsStates] = useState<
    Record<string, MachineSparePartsState>
  >({});

  // ── Helpers to get current machine's slice (falling back to defaults) ──────

  const currentKPI = allKpiStates[selectedMachineId] ?? defaultMachineKPI();
  const currentAHP = allAhpStates[selectedMachineId] ?? defaultMachineAHP();
  const currentSpareParts = allSparePartsStates[selectedMachineId] ?? {};

  // ── KPI setters ──────────────────────────────────────────────────────────

  const setOeeInputs = useCallback(
    (inputs: OEEInputs) => {
      setAllKpiStates((prev) => ({
        ...prev,
        [selectedMachineId]: {
          ...(prev[selectedMachineId] ?? defaultMachineKPI()),
          oeeInputs: inputs,
        },
      }));
    },
    [selectedMachineId],
  );

  const setMtbfInputs = useCallback(
    (inputs: MTBFInputs) => {
      setAllKpiStates((prev) => ({
        ...prev,
        [selectedMachineId]: {
          ...(prev[selectedMachineId] ?? defaultMachineKPI()),
          mtbfInputs: inputs,
        },
      }));
    },
    [selectedMachineId],
  );

  const setMttrInputs = useCallback(
    (inputs: MTTRInputs) => {
      setAllKpiStates((prev) => ({
        ...prev,
        [selectedMachineId]: {
          ...(prev[selectedMachineId] ?? defaultMachineKPI()),
          mttrInputs: inputs,
        },
      }));
    },
    [selectedMachineId],
  );

  const setKpiOutputs = useCallback(
    (outputs: KPIOutputs) => {
      setAllKpiStates((prev) => ({
        ...prev,
        [selectedMachineId]: {
          ...(prev[selectedMachineId] ?? defaultMachineKPI()),
          kpiOutputs: outputs,
        },
      }));
    },
    [selectedMachineId],
  );

  // ── Time frame setter ─────────────────────────────────────────────────────

  const setTimeFrame = useCallback(
    (tf: TimeFrame) => {
      setAllKpiStates((prev) => ({
        ...prev,
        [selectedMachineId]: {
          ...(prev[selectedMachineId] ?? defaultMachineKPI()),
          timeFrame: tf,
        },
      }));
    },
    [selectedMachineId],
  );

  // ── AHP setters ──────────────────────────────────────────────────────────

  const setAhpInputs = useCallback(
    (inputs: AHPInputs) => {
      setAllAhpStates((prev) => ({
        ...prev,
        [selectedMachineId]: {
          ...(prev[selectedMachineId] ?? defaultMachineAHP()),
          ahpInputs: inputs,
        },
      }));
    },
    [selectedMachineId],
  );

  const setAhpOutputs = useCallback(
    (outputs: AHPOutputs) => {
      setAllAhpStates((prev) => ({
        ...prev,
        [selectedMachineId]: {
          ...(prev[selectedMachineId] ?? defaultMachineAHP()),
          ahpOutputs: outputs,
        },
      }));
    },
    [selectedMachineId],
  );

  // ── Spare parts setters ───────────────────────────────────────────────────

  const setSparePartState = useCallback(
    (
      partId: string,
      field: "d" | "L" | "SS" | "currentStock" | "pDate" | "pfInterval",
      value: string | number,
    ) => {
      setAllSparePartsStates((prev) => {
        const machineSlice = prev[selectedMachineId] ?? {};
        const partSlice = machineSlice[partId] ?? { pDate: "", pfInterval: 30 };
        return {
          ...prev,
          [selectedMachineId]: {
            ...machineSlice,
            [partId]: { ...partSlice, [field]: value },
          },
        };
      });
    },
    [selectedMachineId],
  );

  const setSparePartsStateForMachine = useCallback(
    (machineId: string, state: MachineSparePartsState) => {
      setAllSparePartsStates((prev) => ({
        ...prev,
        [machineId]: state,
      }));
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        selectedMachineId,
        setSelectedMachineId,

        // KPI — current machine
        oeeInputs: currentKPI.oeeInputs,
        setOeeInputs,
        mtbfInputs: currentKPI.mtbfInputs,
        setMtbfInputs,
        mttrInputs: currentKPI.mttrInputs,
        setMttrInputs,
        kpiOutputs: currentKPI.kpiOutputs,
        setKpiOutputs,

        // Time frame — current machine
        timeFrame: currentKPI.timeFrame,
        setTimeFrame,

        // AHP — current machine
        ahpInputs: currentAHP.ahpInputs,
        setAhpInputs,
        ahpOutputs: currentAHP.ahpOutputs,
        setAhpOutputs,

        // Spare parts — current machine
        sparePartsState: currentSpareParts,
        setSparePartState,
        setSparePartsStateForMachine,

        // Raw maps for cross-machine reads (e.g. dashboard)
        allKpiStates,
        allAhpStates,
        allSparePartsStates,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within an AppProvider");
  return context;
}
