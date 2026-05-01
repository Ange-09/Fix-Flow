"use client";

// app/spare-parts/page.tsx
// Reads selectedMachineId from AppContext so the table always
// reflects the machine chosen in UpperSection on the home page.
//
// ID mapping: machineData.ts uses "cnc-plasma" / "cnc-laser" / etc.
//             sparePartsData.ts uses "plasma-cutter" / "laser-cutter" / etc.
// The MACHINE_ID_MAP below bridges the two without modifying either file.

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

// ─── ID bridge: machineData id → sparePartsData machineId ─────────────────────
const MACHINE_ID_MAP: Record<string, string> = {
  "cnc-plasma": "plasma-cutter",
  "cnc-laser": "laser-cutter",
  "cnc-lathe": "lathe-machine",
  "cnc-milling": "milling-machine",
  // cnc-controller has no spare parts entry — falls back to empty array
  "cnc-controller": "cnc-controller",
};

// ─── Display labels per sparePartsData machineId ──────────────────────────────
const MACHINE_LABELS: Record<string, string> = {
  "plasma-cutter": "CNC Plasma Cutting Machine",
  "laser-cutter": "CNC Laser Cutting Machine",
  "lathe-machine": "CNC Lathe Machine",
  "milling-machine": "CNC Milling Machine",
  "cnc-controller": "CNC Controller",
};

// ─── Spec column label per sparePartsData machineId ───────────────────────────
const SPEC_LABEL: Record<string, string> = {
  "plasma-cutter": "Ampere",
  "laser-cutter": "Size",
  "lathe-machine": "Type",
  "milling-machine": "Type",
  "cnc-controller": "Type",
};

// ─── Editable row fields ──────────────────────────────────────────────────────
type EditableFields = {
  d: number;
  L: number;
  SS: number;
  currentStock: number;
};
type Overrides = Record<string, Partial<EditableFields>>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SparePartsPage() {
  // Global machine selection from context
  const { selectedMachineId } = useAppContext();

  // Map the global ID to the sparePartsData namespace
  const sparesMachineId =
    MACHINE_ID_MAP[selectedMachineId] ?? selectedMachineId;

  const [overrides, setOverrides] = useState<Overrides>({});
  const [search, setSearch] = useState("");

  // Clear search when machine changes
  const machineLabel = MACHINE_LABELS[sparesMachineId] ?? sparesMachineId;
  const specLabel = SPEC_LABEL[sparesMachineId] ?? "Spec";

  // Merge base data with any user edits
  const rows = useMemo(() => {
    return getSparePartsByMachine(sparesMachineId).map((part) => ({
      ...part,
      ...(overrides[part.id] ?? {}),
    }));
  }, [sparesMachineId, overrides]);

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

  // Summary counts
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

  function handleEdit(id: string, field: keyof EditableFields, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [field]: val },
    }));
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
            across all machines. Showing: <strong>{machineLabel}</strong>
          </p>
        </div>
      </div>

      {/* ── Search row ── */}
      <div className={styles.controls}>
        <input
          className={styles.searchInput}
          placeholder="Search item, part number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Summary pills ── */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryPill}>
          <span className={styles.summaryNum}>{summary.total}</span>
          <span className={styles.summaryLabel}>Total Parts</span>
        </div>
        <div className={`${styles.summaryPill} ${styles.pillGood}`}>
          <span className={styles.summaryNum}>{summary.good}</span>
          <span className={styles.summaryLabel}>Sufficient</span>
        </div>
        <div className={`${styles.summaryPill} ${styles.pillWarn}`}>
          <span className={styles.summaryNum}>{summary.warn}</span>
          <span className={styles.summaryLabel}>Near ROP</span>
        </div>
        <div className={`${styles.summaryPill} ${styles.pillBad}`}>
          <span className={styles.summaryNum}>{summary.bad}</span>
          <span className={styles.summaryLabel}>Reorder Now</span>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotGood}`} />
          Stock &gt; 1.2× ROP — Sufficient
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotWarn}`} />
          ROP &lt; Stock ≤ 1.2× ROP — Near Reorder Point
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotBad}`} />
          Stock ≤ ROP — Reorder Required
        </span>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thItem}>Item Name</th>
              <th className={styles.thPart}>Part Number</th>
              <th className={styles.thSpec}>{specLabel}</th>
              <th className={styles.thNum}>
                d<span className={styles.thHint}>Daily Demand</span>
              </th>
              <th className={styles.thNum}>
                L<span className={styles.thHint}>Lead Time (days)</span>
              </th>
              <th className={styles.thNum}>
                SS<span className={styles.thHint}>Safety Stock</span>
              </th>
              <th className={styles.thNum}>
                ROP<span className={styles.thHint}>= d × L + SS</span>
              </th>
              <th className={styles.thStock}>Current Stock</th>
              <th className={styles.thStatus}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyRow}>
                  No spare parts data for this machine.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyRow}>
                  No parts match your search.
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
                    <td className={styles.tdItem}>{part.itemName}</td>
                    <td className={styles.tdPart}>{part.partNumber}</td>
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

                    <td className={styles.tdStatus}>
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

      <p className={styles.formulaNote}>
        ROP formula: <strong>ROP = d × L + SS</strong> &nbsp;·&nbsp; d = daily
        demand &nbsp;·&nbsp; L = lead time (days) &nbsp;·&nbsp; SS = safety
        stock
      </p>
    </div>
  );
}
