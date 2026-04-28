"use client";

import { useAppContext } from "@/app/context/AppContext";
import { getMachineById } from "@/app/lib/machineData";
import SparePartsTable from "./components/SparePartsTable/SparePartsTable";
import styles from "./page.module.css";

export default function SparePartsPage() {
  const { selectedMachineId } = useAppContext();
  const machine = getMachineById(selectedMachineId);

  if (!machine) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound}>Machine not found.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <span className={styles.pageTag}>Spare Parts Management</span>
        <h1 className={styles.pageTitle}>Spare Parts &amp; PF Curve Monitoring</h1>
        <p className={styles.pageSubtitle}>
          Track spare part conditions using PF Curve analysis. Critical parts are
          monitored against P-point dates to determine maintenance urgency.
        </p>
      </div>

      <SparePartsTable machine={machine} />
    </div>
  );
}
