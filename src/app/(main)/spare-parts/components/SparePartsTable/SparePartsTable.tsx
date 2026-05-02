"use client";

import { useMemo, useEffect, useState } from "react";
import { Machine, SparePart } from "@/app/lib/machineData";
import { useAppContext } from "@/app/context/AppContext";
import SparePartRow from "../SparePartRow/SparePartRow";
import styles from "./SparePartsTable.module.css";

interface Props {
  machine: Machine;
}

type FilterCondition = "All" | "Normal" | "Early Warning" | "Degrading Condition" | "Maintenance Trigger";
type SortKey = "name" | "condition";

export default function SparePartsTable({ machine }: Props) {
  const [filterCondition, setFilterCondition] = useState<FilterCondition>("All");
  const [sortKey, setSortKey]   = useState<SortKey>("name");
  const [sortAsc, setSortAsc]   = useState(true);

  const {
    sparePartsState,
    setSparePartState,
    setSparePartsStateForMachine,
  } = useAppContext();

  // Only critical parts
  const parts = (machine.spareParts ?? []).filter(
    (p) => p.classification === "Critical"
  );

  // Seed context with static defaults when the machine has no state yet
  useEffect(() => {
    const hasAnyEntry = parts.some((p) => sparePartsState[p.id] !== undefined);
    if (!hasAnyEntry) {
      const seed: Record<string, { pDate: string; pfInterval: number }> = {};
      parts.forEach((p) => {
        seed[p.id] = {
          pDate:      p.defaultPDate      ?? "",
          pfInterval: p.defaultPFInterval ?? 30,
        };
      });
      setSparePartsStateForMachine(machine.id, seed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.id]);

  function handlePartChange(
    partId: string,
    field: "pDate" | "pfInterval",
    value: string | number
  ) {
    setSparePartState(partId, field, value);
  }

  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Normal: 0,
      "Early Warning": 0,
      "Degrading Condition": 0,
      "Maintenance Trigger": 0,
    };
    parts.forEach((p) => {
      const state = sparePartsState[p.id];
      if (!state?.pDate) return;
      const { getConditionStatus } = require("@/app/lib/pfCurveUtils");
      const pDate = new Date(state.pDate + "T00:00:00");
      if (isNaN(pDate.getTime())) return;
      const cond = getConditionStatus(pDate, state.pfInterval);
      counts[cond] = (counts[cond] ?? 0) + 1;
    });
    return counts;
  }, [parts, sparePartsState]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  return (
    <div className={styles.wrapper}>
      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum}>{parts.length}</span>
          <span className={styles.summaryLabel}>Critical Parts</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.warn}`}>
          <span className={styles.summaryNum}>{conditionCounts["Early Warning"]}</span>
          <span className={styles.summaryLabel}>Early Warning</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.orange}`}>
          <span className={styles.summaryNum}>{conditionCounts["Degrading Condition"]}</span>
          <span className={styles.summaryLabel}>Degrading</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.bad}`}>
          <span className={styles.summaryNum}>{conditionCounts["Maintenance Trigger"]}</span>
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
              partStates={sparePartsState}
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
  const { getConditionStatus, parseDateString } = require("@/app/lib/pfCurveUtils");

  const enriched = parts.map((p) => {
    const state = partStates[p.id] ?? { pDate: "", pfInterval: 30 };
    let condition = "Normal";
    if (state.pDate) {
      const pDate = parseDateString(state.pDate);
      if (pDate) condition = getConditionStatus(pDate, state.pfInterval);
    }
    return { ...p, condition, state };
  });

  const conditionOrder: Record<string, number> = {
    "Maintenance Trigger": 0,
    "Degrading Condition": 1,
    "Early Warning":       2,
    "Normal":              3,
  };

  const filtered = enriched.filter((p) => {
    if (filterCondition === "All") return true;
    return p.condition === filterCondition;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name")           cmp = a.name.localeCompare(b.name);
    else if (sortKey === "condition") cmp = (conditionOrder[a.condition] ?? 4) - (conditionOrder[b.condition] ?? 4);
    return sortAsc ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <tr>
        <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#7a9e84", fontSize: "0.875rem" }}>
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