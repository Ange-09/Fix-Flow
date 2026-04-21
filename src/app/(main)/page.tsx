"use client";

import { useState } from "react";
import { DEFAULT_MACHINE_ID } from "@/app/lib/machineData";

import UpperSection from "./UpperSection/UpperSection";
import DashboardSection from "./DashboardSection/DashboardSection";
import styles from "./styles/page.module.css";

export default function HomePage() {
  const [selectedMachineId, setSelectedMachineId] = useState(DEFAULT_MACHINE_ID);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <UpperSection
          selectedMachineId={selectedMachineId}
          onMachineChange={setSelectedMachineId}
        />
        <DashboardSection machineId={selectedMachineId} />
      </main>
    </div>
  );
}