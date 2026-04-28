"use client";

import { useState, useMemo, useEffect } from "react";
import { Machine, SparePart } from "@/app/lib/machineData";
import SparePartRow from "../SparePartRow/SparePartRow";
import styles from "./SparePartsTable.module.css";

interface Props {
  machine: Machine;
}

type FilterCondition =
  | "All"
  | "Normal"
  | "Early Warning"
  | "Degrading Condition"
  | "Maintenance Trigger";
type SortKey = "name" | "condition";

const buildInitialState = (m: Machine) => {
  const init: Record<string, { pDate: string; pfInterval: number }> = {};
  m.spareParts
    ?.filter((p) => p.classification === "Critical")
    .forEach((p) => {
      init[p.id] = {
        pDate: p.defaultPDate ?? "",
        pfInterval: p.defaultPFInterval ?? 30,
      };
    });
  return init;
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className={styles.infoWrapper}>
      <span className={styles.infoIcon} aria-label="More information">
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="6.5"
            cy="6.5"
            r="6"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <text
            x="6.5"
            y="9.8"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fontFamily="Sora, Segoe UI, sans-serif"
            fill="currentColor"
          >
            i
          </text>
        </svg>
      </span>
      <span className={styles.tooltip} role="tooltip">
        {text}
      </span>
    </span>
  );
}

export default function SparePartsTable({ machine }: Props) {
  const [filterCondition, setFilterCondition] =
    useState<FilterCondition>("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const [partStates, setPartStates] = useState<
    Record<string, { pDate: string; pfInterval: number }>
  >(() => buildInitialState(machine));

  useEffect(() => {
    setPartStates(buildInitialState(machine));
  }, [machine.id]);

  function handlePartChange(
    partId: string,
    field: "pDate" | "pfInterval",
    value: string | number,
  ) {
    setPartStates((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], [field]: value },
    }));
  }

  const parts = (machine.spareParts ?? []).filter(
    (p) => p.classification === "Critical",
  );

  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Normal: 0,
      "Early Warning": 0,
      "Degrading Condition": 0,
      "Maintenance Trigger": 0,
    };
    parts.forEach((p) => {
      const state = partStates[p.id];
      if (!state?.pDate) return;
      const { getConditionStatus } = require("@/app/lib/pfCurveUtils");
      const pDate = new Date(state.pDate + "T00:00:00");
      if (isNaN(pDate.getTime())) return;
      const cond = getConditionStatus(pDate, state.pfInterval);
      counts[cond] = (counts[cond] ?? 0) + 1;
    });
    return counts;
  }, [parts, partStates]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum}>{parts.length}</span>
          <span className={styles.summaryLabel}>Critical Parts</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.good}`}>
          <span className={styles.summaryNum}>{conditionCounts["Normal"]}</span>
          <span className={styles.summaryLabel}>Normal</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.warn}`}>
          <span className={styles.summaryNum}>
            {conditionCounts["Early Warning"]}
          </span>
          <span className={styles.summaryLabel}>Early Warning</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.orange}`}>
          <span className={styles.summaryNum}>
            {conditionCounts["Degrading Condition"]}
          </span>
          <span className={styles.summaryLabel}>Degrading</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.bad}`}>
          <span className={styles.summaryNum}>
            {conditionCounts["Maintenance Trigger"]}
          </span>
          <span className={styles.summaryLabel}>Trigger</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Filter by Condition:</span>
          {(
            [
              "All",
              "Normal",
              "Early Warning",
              "Degrading Condition",
              "Maintenance Trigger",
            ] as FilterCondition[]
          ).map((cond) => (
            <button
              key={cond}
              className={`${styles.filterBtn} ${filterCondition === cond ? styles.filterBtnActive : ""}`}
              onClick={() => setFilterCondition(cond)}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} onClick={() => handleSort("name")}>
                <span className={styles.thInner}>
                  Spare Part{" "}
                  <span className={styles.sortIcon}>
                    {sortKey === "name" ? (sortAsc ? "↑" : "↓") : "↕"}
                  </span>
                </span>
              </th>
              <th className={styles.th}>
                <span className={styles.thInner}>
                  P Date
                  <InfoTooltip text="Potential Failure Date — the point at which a failure can first be detected. Set this to when the part was last inspected or when signs of wear were first noticed." />
                </span>
              </th>
              <th className={styles.th}>
                <span className={styles.thInner}>
                  PF Interval (days)
                  <InfoTooltip text="P-F Interval — the time between the Potential Failure point (P) and Functional Failure point (F). A longer interval gives more time to plan and execute maintenance before the part fails completely." />
                </span>
              </th>
              <th className={styles.th}>
                <span className={styles.thInner}>
                  F Date
                  <InfoTooltip text="Functional Failure Date — the projected date at which the part is expected to reach complete failure. Calculated as P Date + PF Interval. Maintenance must be performed before this date." />
                </span>
              </th>
              <th className={styles.th} onClick={() => handleSort("condition")}>
                <span className={styles.thInner}>
                  Condition{" "}
                  <span className={styles.sortIcon}>
                    {sortKey === "condition" ? (sortAsc ? "↑" : "↓") : "↕"}
                  </span>
                </span>
              </th>
              <th className={styles.th}>Recommendations</th>
            </tr>
          </thead>
          <tbody>
            <TableBody
              parts={parts}
              partStates={partStates}
              onPartChange={handlePartChange}
              filterCondition={filterCondition}
              sortKey={sortKey}
              sortAsc={sortAsc}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableBody({
  parts,
  partStates,
  onPartChange,
  filterCondition,
  sortKey,
  sortAsc,
}: {
  parts: SparePart[];
  partStates: Record<string, { pDate: string; pfInterval: number }>;
  onPartChange: (
    id: string,
    field: "pDate" | "pfInterval",
    value: string | number,
  ) => void;
  filterCondition: FilterCondition;
  sortKey: SortKey;
  sortAsc: boolean;
}) {
  const {
    getConditionStatus,
    parseDateString,
  } = require("@/app/lib/pfCurveUtils");

  const conditionOrder: Record<string, number> = {
    "Maintenance Trigger": 0,
    "Degrading Condition": 1,
    "Early Warning": 2,
    Normal: 3,
  };

  const enriched = parts.map((p) => {
    const state = partStates[p.id] ?? { pDate: "", pfInterval: 30 };
    let condition = "Normal";
    if (state.pDate) {
      const pDate = parseDateString(state.pDate);
      if (pDate) condition = getConditionStatus(pDate, state.pfInterval);
    }
    return { ...p, condition, state };
  });

  const filtered = enriched.filter((p) => {
    if (filterCondition === "All") return true;
    return p.condition === filterCondition;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "condition")
      cmp =
        (conditionOrder[a.condition] ?? 4) - (conditionOrder[b.condition] ?? 4);
    return sortAsc ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <tr>
        <td
          colSpan={6}
          style={{
            textAlign: "center",
            padding: "32px",
            color: "#7a9e84",
            fontSize: "0.875rem",
          }}
        >
          No critical spare parts match the selected filter.
        </td>
      </tr>
    );
  }

  return (
    <>
      {sorted.map((p) => (
        <SparePartRow
          key={p.id}
          part={p}
          partState={partStates[p.id] ?? { pDate: "", pfInterval: 30 }}
          onPartChange={onPartChange}
        />
      ))}
    </>
  );
}
