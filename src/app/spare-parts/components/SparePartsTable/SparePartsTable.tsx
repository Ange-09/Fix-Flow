"use client";

import { useState, useMemo, useEffect } from "react";
import { Machine, SparePart } from "@/app/lib/machineData";
import SparePartRow from "../SparePartRow/SparePartRow";
import styles from "./SparePartsTable.module.css";

interface Props {
  machine: Machine;
}

type FilterCondition = "All" | "Normal" | "Early Warning" | "Degrading Condition" | "Maintenance Trigger";
type SortKey = "name" | "classification" | "condition";

const buildInitialState = (m: Machine) => {
  const init: Record<string, { pDate: string; pfInterval: number }> = {};
  m.spareParts?.forEach((p) => {
    init[p.id] = {
      pDate: p.defaultPDate ?? "",
      pfInterval: p.defaultPFInterval ?? 30,
    };
  });
  return init;
};

export default function SparePartsTable({ machine }: Props) {
  const [filterCondition, setFilterCondition] = useState<FilterCondition>("All");
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
    value: string | number
  ) {
    setPartStates((prev) => ({
      ...prev,
      [partId]: { ...prev[partId], [field]: value },
    }));
  }

  const parts = machine.spareParts ?? [];

  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Normal: 0,
      "Early Warning": 0,
      "Degrading Condition": 0,
      "Maintenance Trigger": 0,
    };
    parts.forEach((p) => {
      if (p.classification !== "Critical") return;
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
          <span className={styles.summaryLabel}>Total Parts</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum}>
            {parts.filter((p) => p.classification === "Critical").length}
          </span>
          <span className={styles.summaryLabel}>Critical</span>
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
          {(["All", "Normal", "Early Warning", "Degrading Condition", "Maintenance Trigger"] as FilterCondition[]).map(
            (cond) => (
              <button
                key={cond}
                className={`${styles.filterBtn} ${filterCondition === cond ? styles.filterBtnActive : ""}`}
                onClick={() => setFilterCondition(cond)}
              >
                {cond}
              </button>
            )
          )}
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
              <th className={styles.th} onClick={() => handleSort("classification")}>
                <span className={styles.thInner}>
                  Class{" "}
                  <span className={styles.sortIcon}>
                    {sortKey === "classification" ? (sortAsc ? "↑" : "↓") : "↕"}
                  </span>
                </span>
              </th>
              <th className={styles.th}>P Date</th>
              <th className={styles.th}>PF Interval (days)</th>
              <th className={styles.th}>F Date</th>
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
  onPartChange: (id: string, field: "pDate" | "pfInterval", value: string | number) => void;
  filterCondition: FilterCondition;
  sortKey: SortKey;
  sortAsc: boolean;
}) {
  const {
    getConditionStatus,
    parseDateString,
  } = require("@/app/lib/pfCurveUtils");

  const enriched = parts.map((p) => {
    const state = partStates[p.id] ?? { pDate: "", pfInterval: 30 };
    let condition = "Normal";
    if (p.classification === "Critical" && state.pDate) {
      const pDate = parseDateString(state.pDate);
      if (pDate) condition = getConditionStatus(pDate, state.pfInterval);
    }
    return { ...p, condition, state };
  });

  const conditionOrder: Record<string, number> = {
    "Maintenance Trigger": 0,
    "Degrading Condition": 1,
    "Early Warning": 2,
    Normal: 3,
  };

const filtered = enriched.filter((p) => {
  if (filterCondition === "All") return true;
  if (p.classification !== "Critical") return false;
  return p.condition === filterCondition;
});

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "classification")
      cmp = a.classification.localeCompare(b.classification);
    else if (sortKey === "condition")
      cmp = (conditionOrder[a.condition] ?? 4) - (conditionOrder[b.condition] ?? 4);
    return sortAsc ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <tr>
        <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#7a9e84", fontSize: "0.875rem" }}>
          No spare parts match the selected filter.
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