"use client";

import { useState } from "react";
import { SparePart } from "@/app/lib/machineData";
import {
  calculateFDate,
  getConditionStatus,
  getElapsedPercentage,
  parseDateString,
  formatDate,
  ConditionStatus,
} from "@/app/lib/pfCurveUtils";
import RecommendationPanel from "../RecommendationPanel/RecommendationPanel";
import styles from "./SparePartRow.module.css";

interface Props {
  part: SparePart;
  partState: { pDate: string; pfInterval: number };
  onPartChange: (id: string, field: "pDate" | "pfInterval", value: string | number) => void;
}

export default function SparePartRow({ part, partState, onPartChange }: Props) {
  const [showRecs, setShowRecs] = useState(false);
  const isConsumable = part.classification === "Consumable";

  const pDate = parseDateString(partState.pDate);
  const fDate = pDate ? calculateFDate(pDate, partState.pfInterval) : null;
  const condition: ConditionStatus =
    pDate && !isConsumable
      ? getConditionStatus(pDate, partState.pfInterval)
      : "Normal";
  const elapsed = pDate && !isConsumable ? getElapsedPercentage(pDate, partState.pfInterval) : 0;

  const conditionMeta: Record<ConditionStatus, { label: string; cls: string }> = {
    Normal: { label: "Normal", cls: styles.statusNormal },
    "Early Warning": { label: "Early Warning", cls: styles.statusWarn },
    "Degrading Condition": { label: "Degrading", cls: styles.statusOrange },
    "Maintenance Trigger": { label: "Trigger!", cls: styles.statusBad },
  };
  const meta = conditionMeta[condition];

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

        {/* Classification */}
        <td className={styles.td}>
          <span
            className={`${styles.classBadge} ${isConsumable ? styles.classBadgeConsumable : styles.classBadgeCritical}`}
          >
            {part.classification}
          </span>
        </td>

        {/* P Date */}
        <td className={styles.td}>
          {isConsumable ? (
            <span className={styles.naText}>N/A</span>
          ) : (
            <input
              type="date"
              className={styles.dateInput}
              value={partState.pDate}
              onChange={(e) => onPartChange(part.id, "pDate", e.target.value)}
            />
          )}
        </td>

        {/* PF Interval */}
        <td className={styles.td}>
          {isConsumable ? (
            <span className={styles.naText}>N/A</span>
          ) : (
            <input
              type="number"
              className={styles.numInput}
              value={partState.pfInterval}
              min={1}
              onChange={(e) =>
                onPartChange(
                  part.id,
                  "pfInterval",
                  Math.max(1, parseInt(e.target.value) || 1)
                )
              }
            />
          )}
        </td>

        {/* F Date */}
        <td className={styles.td}>
          {isConsumable ? (
            <span className={styles.naText}>N/A</span>
          ) : fDate ? (
            <span className={styles.fDate}>{formatDate(fDate)}</span>
          ) : (
            <span className={styles.naText}>—</span>
          )}
        </td>

        {/* Condition */}
        <td className={styles.td}>
          {isConsumable ? (
            <span className={styles.naText}>Not Applicable</span>
          ) : !pDate ? (
            <span className={styles.naText}>Set P Date</span>
          ) : (
            <div className={styles.conditionCell}>
              <span className={`${styles.conditionBadge} ${meta.cls}`}>
                {meta.label}
              </span>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${meta.cls}`}
                  style={{ width: `${Math.round(elapsed * 100)}%` }}
                />
              </div>
              <span className={styles.progressPct}>{Math.round(elapsed * 100)}%</span>
            </div>
          )}
        </td>

        {/* Recommendations */}
        <td className={styles.td}>
          {isConsumable ? (
            <span className={styles.naText}>N/A</span>
          ) : !pDate ? (
            <span className={styles.naText}>—</span>
          ) : (
            <button
              className={`${styles.recsBtn} ${showRecs ? styles.recsBtnActive : ""}`}
              onClick={() => setShowRecs((v) => !v)}
            >
              {showRecs ? "Hide" : "View"} ({condition === "Normal" ? 3 : condition === "Early Warning" ? 7 : condition === "Degrading Condition" ? 7 : 6})
            </button>
          )}
        </td>
      </tr>

      {/* Recommendations panel row */}
      {showRecs && !isConsumable && pDate && (
        <tr className={styles.recsRow}>
          <td colSpan={7} className={styles.recsTd}>
            <RecommendationPanel condition={condition} />
          </td>
        </tr>
      )}
    </>
  );
}
