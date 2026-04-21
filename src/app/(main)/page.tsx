"use client";

import { useAppContext } from "@/app/context/AppContext";

import DashboardSection from "./DashboardSection/DashboardSection";
import styles from "./styles/page.module.css";

export default function HomePage() {
  const { selectedMachineId } = useAppContext();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <DashboardSection machineId={selectedMachineId} />
      </main>
    </div>
  );
}
