"use client";

// app/spare-parts/page.tsx
// Reads selectedMachineId from AppContext so the table always
// reflects the machine chosen in UpperSection on the home page.
// All editable fields (d, L, SS, currentStock) are persisted in
// AppContext via setSparePartState — no local override state.

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import { useAppContext } from "@/app/context/AppContext";
import {
  getSparePartsByMachine,
  computeROP,
  getStockStatus,
  type SparePart,
  type StockStatus,
} from "@/app/lib/sparePartsData";

// ─── ID bridge: machineData id → sparePartsData machineId ────────────────────
const MACHINE_ID_MAP: Record<string, string> = {
  "cnc-plasma": "plasma-cutter",
  "cnc-laser": "laser-cutter",
  "cnc-lathe": "lathe-machine",
  "cnc-milling": "milling-machine",
  "cnc-controller": "cnc-controller",
};

// ─── Display labels per sparePartsData machineId ─────────────────────────────
const MACHINE_LABELS: Record<string, string> = {
  "plasma-cutter": "CNC Plasma Cutting Machine",
  "laser-cutter": "CNC Laser Cutting Machine",
  "lathe-machine": "CNC Lathe Machine",
  "milling-machine": "CNC Milling Machine",
  "cnc-controller": "CNC Controller",
};

// ─── Spec column label per sparePartsData machineId ──────────────────────────
const SPEC_LABEL: Record<string, string> = {
  "plasma-cutter": "Ampere",
  "laser-cutter": "Size",
  "lathe-machine": "Type",
  "milling-machine": "Type",
  "cnc-controller": "Type",
};

// ─── Editable row fields (must match SparePartState optional fields) ──────────
type EditableFields = "d" | "L" | "SS" | "currentStock";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SparePartsPage() {
  const { selectedMachineId, sparePartsState, setSparePartState } =
    useAppContext();

  const sparesMachineId =
    MACHINE_ID_MAP[selectedMachineId] ?? selectedMachineId;

  const [search, setSearch] = useState("");

  const machineLabel = MACHINE_LABELS[sparesMachineId] ?? sparesMachineId;
  const specLabel = SPEC_LABEL[sparesMachineId] ?? "Spec";

  // ── Merge base data with any context-persisted edits ──────────────────────
  const rows = useMemo(() => {
    return getSparePartsByMachine(sparesMachineId).map((part) => {
      const saved = sparePartsState[part.id] ?? {};
      return {
        ...part,
        d: saved.d ?? part.d,
        L: saved.L ?? part.L,
        SS: saved.SS ?? part.SS,
        currentStock: saved.currentStock ?? part.currentStock,
      };
    });
  }, [sparesMachineId, sparePartsState]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        r.partNumber.toLowerCase().includes(q) ||
        r.spec.toLowerCase().includes(q),
    );
  }, [rows, search]);

  // ── Summary counts ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let good = 0,
      warn = 0,
      bad = 0;
    rows.forEach((r) => {
      const rop = computeROP(r.d, r.L, r.SS);
      const s = getStockStatus(r.currentStock, rop);
      if (s === "good") good++;
      else if (s === "warn") warn++;
      else bad++;
    });
    return { good, warn, bad, total: rows.length };
  }, [rows]);

  // ── Edit handler — writes directly to context ─────────────────────────────
  function handleEdit(id: string, field: EditableFields, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    setSparePartState(id, field, val);
  }

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.pageTag}>Spare Parts</span>
          <h1 className={styles.pageTitle}>Consumable Parts Inventory</h1>
          <p className={styles.pageSubtitle}>
            Monitor stock levels and reorder points for consumable spare parts
            across all machines.{" "}
            <span className={styles.machineHighlight}>
              Showing: {machineLabel}
            </span>
          </p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardNum}>{summary.total}</span>
          <span className={styles.summaryCardLabel}>Total Parts</span>
          <div className={`${styles.summaryCardBar} ${styles.barNeutral}`} />
        </div>
        <div className={`${styles.summaryCard} ${styles.cardGood}`}>
          <span className={styles.summaryCardNum}>{summary.good}</span>
          <span className={styles.summaryCardLabel}>Sufficient</span>
          <div className={`${styles.summaryCardBar} ${styles.barGood}`} />
        </div>
        <div className={`${styles.summaryCard} ${styles.cardWarn}`}>
          <span className={styles.summaryCardNum}>{summary.warn}</span>
          <span className={styles.summaryCardLabel}>Near ROP</span>
          <div className={`${styles.summaryCardBar} ${styles.barWarn}`} />
        </div>
        <div className={`${styles.summaryCard} ${styles.cardBad}`}>
          <span className={styles.summaryCardNum}>{summary.bad}</span>
          <span className={styles.summaryCardLabel}>Reorder Now</span>
          <div className={`${styles.summaryCardBar} ${styles.barBad}`} />
        </div>
      </div>

      {/* ── Controls row ── */}
      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none">
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M13 13l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search item name, part number, or spec…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className={styles.searchClear}
              onClick={() => setSearch("")}
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotGood}`} />
            &gt; 1.2× ROP
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotWarn}`} />
            Near ROP
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.dotBad}`} />≤ ROP
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thStatus} />
              <th className={styles.thItem}>Item Name</th>
              <th className={styles.thPart}>Part No.</th>
              <th className={styles.thSpec}>{specLabel}</th>
              <th className={styles.thNum}>
                <span className={styles.thMain}>d</span>
                <span className={styles.thSub}>Daily Demand</span>
              </th>
              <th className={styles.thNum}>
                <span className={styles.thMain}>L</span>
                <span className={styles.thSub}>Lead Time (days)</span>
              </th>
              <th className={styles.thNum}>
                <span className={styles.thMain}>SS</span>
                <span className={styles.thSub}>Safety Stock</span>
              </th>
              <th className={styles.thNum}>
                <span className={styles.thMain}>ROP</span>
                <span className={styles.thSub}>d × L + SS</span>
              </th>
              <th className={styles.thStock}>
                <span className={styles.thMain}>Stock</span>
                <span className={styles.thSub}>Current</span>
              </th>
              <th className={styles.thChip}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyRow}>
                  <div className={styles.emptyState}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={styles.emptyIcon}
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M9 9h6M9 12h6M9 15h4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    No spare parts data for this machine.
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyRow}>
                  <div className={styles.emptyState}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className={styles.emptyIcon}
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M16 16l4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 11h6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    No parts match your search.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((part) => {
                const rop = computeROP(part.d, part.L, part.SS);
                const status: StockStatus = getStockStatus(
                  part.currentStock,
                  rop,
                );

                return (
                  <tr
                    key={part.id}
                    className={`${styles.row} ${styles[`row_${status}`]}`}
                  >
                    {/* Status accent bar */}
                    <td className={styles.tdAccent}>
                      <div
                        className={`${styles.accentBar} ${styles[`accent_${status}`]}`}
                      />
                    </td>

                    <td className={styles.tdItem}>
                      <span className={styles.itemName}>{part.itemName}</span>
                    </td>

                    <td className={styles.tdPart}>
                      <span className={styles.partBadge}>
                        {part.partNumber}
                      </span>
                    </td>

                    <td className={styles.tdSpec}>{part.spec}</td>

                    {/* Editable: d */}
                    <td className={styles.tdNum}>
                      <input
                        className={styles.cellInput}
                        type="number"
                        min={0}
                        step={1}
                        value={part.d}
                        onChange={(e) =>
                          handleEdit(part.id, "d", e.target.value)
                        }
                      />
                    </td>

                    {/* Editable: L */}
                    <td className={styles.tdNum}>
                      <input
                        className={styles.cellInput}
                        type="number"
                        min={0}
                        step={1}
                        value={part.L}
                        onChange={(e) =>
                          handleEdit(part.id, "L", e.target.value)
                        }
                      />
                    </td>

                    {/* Editable: SS */}
                    <td className={styles.tdNum}>
                      <input
                        className={styles.cellInput}
                        type="number"
                        min={0}
                        step={1}
                        value={part.SS}
                        onChange={(e) =>
                          handleEdit(part.id, "SS", e.target.value)
                        }
                      />
                    </td>

                    {/* Auto-computed ROP */}
                    <td className={styles.tdRop}>
                      <span className={styles.ropBadge}>{rop}</span>
                    </td>

                    {/* Editable: Current Stock */}
                    <td className={styles.tdStock}>
                      <input
                        className={`${styles.cellInput} ${styles.stockInput} ${styles[`stockInput_${status}`]}`}
                        type="number"
                        min={0}
                        step={1}
                        value={part.currentStock}
                        onChange={(e) =>
                          handleEdit(part.id, "currentStock", e.target.value)
                        }
                      />
                    </td>

                    <td className={styles.tdChip}>
                      <span
                        className={`${styles.statusChip} ${styles[`chip_${status}`]}`}
                      >
                        {status === "good"
                          ? "Sufficient"
                          : status === "warn"
                            ? "Near ROP"
                            : "Reorder"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Formula note ── */}
      <div className={styles.formulaNote}>
        <svg viewBox="0 0 16 16" fill="none" className={styles.formulaIcon}>
          <circle
            cx="8"
            cy="8"
            r="6.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M8 7v5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="8" cy="5" r="0.8" fill="currentColor" />
        </svg>
        <span>
          <strong>ROP = d × L + SS</strong>
          &nbsp;·&nbsp; d = daily demand &nbsp;·&nbsp; L = lead time (days)
          &nbsp;·&nbsp; SS = safety stock
        </span>
      </div>
    </div>
  );
}
