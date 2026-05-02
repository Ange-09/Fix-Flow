"use client";

import { machines, getMachineById } from "@/app/lib/machineData";
import { useAppContext } from "@/app/context/AppContext";
import styles from "./UpperSection.module.css";

export default function UpperSection() {
  const { selectedMachineId, setSelectedMachineId } = useAppContext();
  const machine = getMachineById(selectedMachineId)!;
  if (!machine) return null;

  return (
    <section className={styles.upperSection}>
      {/* ── Column Left: Image + Dropdown ── */}
      <div className={styles.columnLeft}>
        <div className={styles.imageWrapper}>
          {machine.image ? (
            /* Replace with Next.js <Image> when real images are available:
               <Image src={machine.image} alt={machine.name} fill style={{ objectFit: "cover" }} /> */
            <img
              src={machine.image}
              alt={machine.name}
              className={styles.machineImg}
            />
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="8"
                  y="20"
                  width="48"
                  height="32"
                  rx="4"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M20 20V14a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v6"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <circle
                  cx="32"
                  cy="36"
                  r="8"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  fill="none"
                />
                <circle cx="32" cy="36" r="3" fill="#94a3b8" />
                <path
                  d="M16 52h32"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className={styles.imagePlaceholderText}>Machine Image</span>
            </div>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <label className={styles.dropdownLabel} htmlFor="machine-select">
            Select Machine
          </label>
          <div className={styles.selectWrapper}>
            <select
              id="machine-select"
              className={styles.dropdown}
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className={styles.selectArrow}>▾</span>
          </div>
        </div>
      </div>

      {/* ── Column Right: Name + Description ── */}
      <div className={styles.columnRight}>
        <div className={styles.machineNameWrapper}>
          <span className={styles.machineLabel}>Machine</span>
          <h1 className={styles.machineName}>{machine.name}</h1>
        </div>
        <div className={styles.machineDescWrapper}>
          <span className={styles.descLabel}>Overview</span>
          <p className={styles.machineDescription}>{machine.description}</p>
        </div>
      </div>
    </section>
  );
}
