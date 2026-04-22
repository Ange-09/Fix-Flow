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

// ── Provider ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMachineId, setSelectedMachineId] = useState(DEFAULT_MACHINE_ID);

  const [oeeInputs,  setOeeInputs]  = useState<OEEInputs>(DEFAULT_OEE_INPUTS);
  const [mtbfInputs, setMtbfInputs] = useState<MTBFInputs>(DEFAULT_MTBF_INPUTS);
  const [mttrInputs, setMttrInputs] = useState<MTTRInputs>(DEFAULT_MTTR_INPUTS);
  const [kpiOutputs, setKpiOutputs] = useState<KPIOutputs>(DEFAULT_KPI_OUTPUTS);

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