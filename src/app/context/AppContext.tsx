"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { DEFAULT_MACHINE_ID } from "@/app/lib/machineData";

interface AppContextType {
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMachineId, setSelectedMachineId] = useState(DEFAULT_MACHINE_ID);

  return (
    <AppContext.Provider value={{ selectedMachineId, setSelectedMachineId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
