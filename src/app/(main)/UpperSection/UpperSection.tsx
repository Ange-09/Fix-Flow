import Image from "next/image";
import { useState } from "react";
import styles from "./UpperSection.module.css";

const machines = [
  { id: "cnc-mill", label: "CNC Milling Machine" },
  { id: "hydraulic-press", label: "Hydraulic Press" },
  { id: "conveyor-belt", label: "Conveyor Belt System" },
  { id: "air-compressor", label: "Air Compressor Unit" },
  { id: "lathe", label: "CNC Lathe Machine" },
];

const machineData: Record<
  string,
  { name: string; description: string; image: string }
> = {
  "cnc-mill": {
    name: "CNC Milling Machine",
    description:
      "A high-precision computer-controlled milling machine used for cutting and shaping metal and composite materials. Operates at variable spindle speeds and supports 3-axis simultaneous machining. Critical to primary production output and subject to routine predictive maintenance scheduling.",
  },
  "hydraulic-press": {
    name: "Hydraulic Press",
    description:
      "Industrial hydraulic press rated at 200-ton capacity, used for stamping, forming, and forging operations. Equipped with pressure sensors and stroke counters for performance tracking. Maintenance strategy focuses on seal integrity and hydraulic fluid condition.",
  },
  "conveyor-belt": {
    name: "Conveyor Belt System",
    description:
      "Automated material handling conveyor spanning the main production floor. Drives continuous flow of workpieces between stations. Key performance indicators include belt tension, motor load, and throughput rate. Monitored for wear and misalignment.",
  },
  "air-compressor": {
    name: "Air Compressor Unit",
    description:
      "Rotary screw air compressor providing compressed air to pneumatic tools and automation systems throughout the facility. Monitored via pressure differential, temperature, and vibration sensors. Scheduled for filter and oil changes on a time-based maintenance cycle.",
  },
  lathe: {
    name: "CNC Lathe Machine",
    description:
      "Precision CNC lathe used for turning, facing, and threading operations on cylindrical workpieces. Features automatic tool changer and real-time spindle load monitoring. Maintenance is condition-based, triggered by vibration thresholds and tool wear indicators.",
  },
};

export default function UpperSection() {
  const [selectedMachine, setSelectedMachine] = useState("cnc-mill");
  const machine = machineData[selectedMachine];

  return (
    <section className={styles.upperSection}>
      <div className={styles.columnLeft}>
        <div className={styles.imageWrapper}>
          {/* Placeholder image — replace src with actual machine image */}
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
              <circle cx="32" cy="36" r="8" stroke="#94a3b8" strokeWidth="2" fill="none" />
              <circle cx="32" cy="36" r="3" fill="#94a3b8" />
              <path d="M16 52h32" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className={styles.imagePlaceholderText}>Machine Image</span>
          </div>
        </div>

        <div className={styles.dropdownWrapper}>
          <label className={styles.dropdownLabel} htmlFor="machine-select">
            Select Machine
          </label>
          <div className={styles.selectWrapper}>
            <select
              id="machine-select"
              className={styles.dropdown}
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className={styles.selectArrow}>▾</span>
          </div>
        </div>
      </div>

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
