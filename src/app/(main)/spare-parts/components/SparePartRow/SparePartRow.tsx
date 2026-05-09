"use client";

import { useState } from "react";
import { SparePart } from "@/app/lib/machineData";
import RecommendationPanel from "../RecommendationPanel/RecommendationPanel";
import styles from "./SparePartRow.module.css";

export type LifeStatus =
  | "Normal"
  | "Early Warning"
  | "Degrading Condition"
  | "Maintenance Trigger";

export function computeLifeMetrics(
  installationDate: string,
  expectedLife: number,
  avgDailyUsage: number,
): {
  lifeUsedHrs: number | null;
  percentLifeUsed: number | null;
  status: LifeStatus;
  fDateEstimate: Date | null;
} {
  if (!installationDate || expectedLife <= 0 || avgDailyUsage <= 0) {
    return {
      lifeUsedHrs: null,
      percentLifeUsed: null,
      status: "Normal",
      fDateEstimate: null,
    };
  }

  const install = new Date(installationDate + "T00:00:00");
  if (isNaN(install.getTime())) {
    return {
      lifeUsedHrs: null,
      percentLifeUsed: null,
      status: "Normal",
      fDateEstimate: null,
    };
  }

  const today = new Date();
  const daysSinceInstall =
    (today.getTime() - install.getTime()) / (1000 * 60 * 60 * 24);
  const lifeUsedHrs = daysSinceInstall * avgDailyUsage;
  const percentLifeUsed = (lifeUsedHrs / expectedLife) * 100;

  let status: LifeStatus = "Normal";
  if (percentLifeUsed >= 100) status = "Maintenance Trigger";
  else if (percentLifeUsed >= 90) status = "Degrading Condition";
  else if (percentLifeUsed >= 70) status = "Early Warning";

  // Estimate failure date: when lifeUsedHrs reaches expectedLife
  const remainingHrs = Math.max(0, expectedLife - lifeUsedHrs);
  const remainingDays = remainingHrs / avgDailyUsage;
  const fDateEstimate = new Date(
    today.getTime() + remainingDays * 24 * 60 * 60 * 1000,
  );

  return {
    lifeUsedHrs,
    percentLifeUsed,
    status,
    fDateEstimate,
  };
}

export function formatDateDisplay(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  part: SparePart;
  partState: {
    installationDate: string;
    expectedLife: number;
    avgDailyUsage: number;
  };
  onPartChange: (
    id: string,
    field: "installationDate" | "expectedLife" | "avgDailyUsage",
    value: string | number,
  ) => void;
}

const conditionMeta: Record<LifeStatus, { label: string; cls: string }> = {
  Normal: { label: "Normal", cls: styles.statusNormal },
  "Early Warning": { label: "Early Warning", cls: styles.statusWarn },
  "Degrading Condition": { label: "Degrading", cls: styles.statusOrange },
  "Maintenance Trigger": { label: "Trigger!", cls: styles.statusBad },
};

const recsCountMap: Record<LifeStatus, number> = {
  Normal: 3,
  "Early Warning": 7,
  "Degrading Condition": 7,
  "Maintenance Trigger": 6,
};

export default function SparePartRow({ part, partState, onPartChange }: Props) {
  const [showRecs, setShowRecs] = useState(false);

  const { lifeUsedHrs, percentLifeUsed, status, fDateEstimate } =
    computeLifeMetrics(
      partState.installationDate,
      partState.expectedLife,
      partState.avgDailyUsage,
    );

  const hasDate = !!partState.installationDate;
  const meta = conditionMeta[status];
  const clampedPct = Math.min(100, Math.max(0, percentLifeUsed ?? 0));

  return (
    <>
      <tr className={`${styles.row} ${showRecs ? styles.rowActive : ""}`}>
        {/* Name */}
        <td className={styles.td}>
          <div className={styles.partName}>{part.name}</div>
          {part.description && (
            <div className={styles.partDesc}>{part.description}</div>
          )}
        </td>

        {/* Expected Life */}
        <td className={styles.td}>
          <div className={styles.inputWrapper}>
            <input
              type="number"
              className={styles.numInput}
              value={partState.expectedLife}
              min={1}
              onChange={(e) =>
                onPartChange(
                  part.id,
                  "expectedLife",
                  Math.max(1, parseFloat(e.target.value) || 1),
                )
              }
            />
            <span className={styles.inputUnit}>hrs</span>
          </div>
        </td>

        {/* Installation Date */}
        <td className={styles.td}>
          <input
            type="date"
            className={styles.dateInput}
            value={partState.installationDate}
            onChange={(e) =>
              onPartChange(part.id, "installationDate", e.target.value)
            }
          />
        </td>

        {/* Avg Daily Usage */}
        <td className={styles.td}>
          <div className={styles.inputWrapper}>
            <input
              type="number"
              className={styles.numInput}
              value={partState.avgDailyUsage}
              min={0.1}
              step={0.1}
              onChange={(e) =>
                onPartChange(
                  part.id,
                  "avgDailyUsage",
                  Math.max(0.1, parseFloat(e.target.value) || 0.1),
                )
              }
            />
            <span className={styles.inputUnit}>hrs/day</span>
          </div>
        </td>

        {/* Life Used */}
        <td className={styles.td}>
          {lifeUsedHrs !== null ? (
            <span className={styles.computedVal}>
              {lifeUsedHrs.toFixed(1)} hrs
            </span>
          ) : (
            <span className={styles.naText}>—</span>
          )}
        </td>

        {/* % Life Used + Est. Failure Date */}
        <td className={styles.td}>
          {percentLifeUsed !== null ? (
            <span className={styles.computedVal}>
              {percentLifeUsed.toFixed(1)}%
            </span>
          ) : (
            <span className={styles.naText}>—</span>
          )}
          {fDateEstimate && hasDate && (
            <div className={styles.fDateSmall}>
              F: {formatDateDisplay(fDateEstimate)}
            </div>
          )}
        </td>

        {/* Condition */}
        <td className={styles.td}>
          {!hasDate ? (
            <span className={styles.naText}>Set Install Date</span>
          ) : (
            <div className={styles.conditionCell}>
              <span className={`${styles.conditionBadge} ${meta.cls}`}>
                {meta.label}
              </span>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${meta.cls}`}
                  style={{ width: `${Math.round(clampedPct)}%` }}
                />
              </div>
              <span className={styles.progressPct}>
                {Math.round(clampedPct)}%
              </span>
            </div>
          )}
        </td>

        {/* Recommendations */}
        <td className={styles.td}>
          {!hasDate ? (
            <span className={styles.naText}>—</span>
          ) : (
            <button
              className={`${styles.recsBtn} ${showRecs ? styles.recsBtnActive : ""}`}
              onClick={() => setShowRecs((v) => !v)}
            >
              {showRecs ? "Hide" : "View"} ({recsCountMap[status]})
            </button>
          )}
        </td>
      </tr>

      {showRecs && hasDate && (
        <tr className={styles.recsRow}>
          <td colSpan={8} className={styles.recsTd}>
            <RecommendationPanel condition={status} />
          </td>
        </tr>
      )}
    </>
  );
}
