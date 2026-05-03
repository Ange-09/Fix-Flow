"use client";

import { useState } from "react";
import { machines } from "@/app/lib/machineData";
import { getMachineByIdFromAll } from "@/app/lib/machineData";
import { useAppContext } from "@/app/context/AppContext";
import AddMachineModal from "./components/AddMachineModal";
import styles from "./UpperSection.module.css";

export default function UpperSection() {
  const { selectedMachineId, setSelectedMachineId, customMachines } =
    useAppContext();

  const [modalOpen, setModalOpen] = useState(false);

  // Resolve machine from both static list and custom machines
  const machine = getMachineByIdFromAll(selectedMachineId, customMachines);
  if (!machine) return null;

  const isCustomMachine = "isCustom" in machine && machine.isCustom;

  // Combine static + custom for the dropdown
  const allMachines = [...machines, ...customMachines];

  return (
    <>
      <section className={styles.upperSection}>
        {/* ── Column Left: Image + Dropdown ── */}
        <div className={styles.columnLeft}>
          <div className={styles.imageWrapper}>
            {machine.image ? (
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
                <span className={styles.imagePlaceholderText}>
                  Machine Image
                </span>
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
                {/* Static machines */}
                <optgroup label="Default Machines">
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>

                {/* Custom machines — only shown when at least one exists */}
                {customMachines.length > 0 && (
                  <optgroup label="Custom Machines">
                    {customMachines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>

            {/* Add Machine trigger */}
            <button
              className={styles.addMachineBtn}
              onClick={() => setModalOpen(true)}
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1v10M1 6h10"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              Add Machine
            </button>
          </div>
        </div>

        {/* ── Column Right: Name + Description ── */}
        <div className={styles.columnRight}>
          <div className={styles.machineNameWrapper}>
            <div className={styles.nameBadgeRow}>
              <span className={styles.machineLabel}>Machine</span>
              {isCustomMachine && (
                <span className={styles.customBadge}>Custom</span>
              )}
            </div>
            <h1 className={styles.machineName}>{machine.name}</h1>
          </div>
          <div className={styles.machineDescWrapper}>
            <span className={styles.descLabel}>Overview</span>
            <p className={styles.machineDescription}>{machine.description}</p>
          </div>
        </div>
      </section>

      {/* ── Add Machine Modal ── */}
      <AddMachineModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
