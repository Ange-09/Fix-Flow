"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import { useAppContext, type CustomSparePart } from "@/app/context/AppContext";
import { machines } from "@/app/lib/machineData";
import {
  getSparePartsByMachine,
  computeROP,
  getStockStatus,
  type StockStatus,
} from "@/app/lib/sparePartsData";

// ── ID bridge ─────────────────────────────────────────────────────────────────
const MACHINE_ID_MAP: Record<string, string> = {
  "cnc-plasma": "plasma-cutter",
  "cnc-laser": "laser-cutter",
  "cnc-lathe": "lathe-machine",
  "cnc-milling": "milling-machine",
  "cnc-controller": "cnc-controller",
};

const SPEC_LABEL: Record<string, string> = {
  "plasma-cutter": "Ampere",
  "laser-cutter": "Size",
  "lathe-machine": "Type",
  "milling-machine": "Type",
  "cnc-controller": "Type",
};

// ── Blank form state ──────────────────────────────────────────────────────────
interface PartForm {
  itemName: string;
  partNumber: string;
  spec: string;
  d: string;
  L: string;
  SS: string;
  currentStock: string;
}

const BLANK_FORM: PartForm = {
  itemName: "",
  partNumber: "",
  spec: "",
  d: "",
  L: "",
  SS: "",
  currentStock: "",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SparePartsPage() {
  const {
    selectedMachineId,
    sparePartsState,
    setSparePartState,
    allCustomSpareParts,
    addCustomSparePart,
    updateCustomSparePart,
    removeCustomSparePart,
  } = useAppContext();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PartForm>(BLANK_FORM);
  const [errors, setErrors] = useState<Partial<PartForm>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset search whenever machine changes
  useEffect(() => {
    setSearch("");
  }, [selectedMachineId]);

  // Focus first field when modal opens
  useEffect(() => {
    if (modalOpen) setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [modalOpen]);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen]);

  // ── Derived IDs / labels ─────────────────────────────────────────────────
  const sparesMachineId =
    MACHINE_ID_MAP[selectedMachineId] ?? selectedMachineId;
  const machineName =
    machines.find((m) => m.id === selectedMachineId)?.name ?? selectedMachineId;
  const specLabel = SPEC_LABEL[sparesMachineId] ?? "Spec";

  // ── Merged static rows ───────────────────────────────────────────────────
  const staticRows = useMemo(() => {
    return getSparePartsByMachine(sparesMachineId).map((part) => {
      const saved = sparePartsState[part.id] ?? {};
      return {
        ...part,
        d: saved.d ?? part.d,
        L: saved.L ?? part.L,
        SS: saved.SS ?? part.SS,
        currentStock: saved.currentStock ?? part.currentStock,
        isCustom: false as const,
      };
    });
  }, [sparesMachineId, sparePartsState]);

  // ── Custom rows for this machine ─────────────────────────────────────────
  const customRows = useMemo(() => {
    return (allCustomSpareParts[sparesMachineId] ?? []).map((p) => ({
      ...p,
      isCustom: true as const,
    }));
  }, [sparesMachineId, allCustomSpareParts]);

  // ── Combined + filtered ──────────────────────────────────────────────────
  const allRows = useMemo(
    () => [...staticRows, ...customRows],
    [staticRows, customRows],
  );
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        r.partNumber.toLowerCase().includes(q) ||
        r.spec.toLowerCase().includes(q),
    );
  }, [allRows, search]);

  // ── Summary ──────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let good = 0,
      warn = 0,
      bad = 0;
    allRows.forEach((r) => {
      const s = getStockStatus(r.currentStock, computeROP(r.d, r.L, r.SS));
      if (s === "good") good++;
      else if (s === "warn") warn++;
      else bad++;
    });
    return { good, warn, bad, total: allRows.length };
  }, [allRows]);

  // ── Edit handlers ─────────────────────────────────────────────────────────
  function handleEditStatic(
    id: string,
    field: "d" | "L" | "SS" | "currentStock",
    raw: string,
  ) {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    setSparePartState(id, field, val);
  }

  function handleEditCustom(
    id: string,
    field: keyof Omit<CustomSparePart, "id" | "machineId">,
    raw: string,
  ) {
    const numFields = ["d", "L", "SS", "currentStock"] as const;
    if ((numFields as readonly string[]).includes(field)) {
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) return;
      updateCustomSparePart(id, field, val);
    } else {
      updateCustomSparePart(id, field, raw);
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function closeModal() {
    setModalOpen(false);
    setForm(BLANK_FORM);
    setErrors({});
  }

  function validateForm(): boolean {
    const e: Partial<PartForm> = {};
    if (!form.itemName.trim()) e.itemName = "Item name is required.";
    if (!form.partNumber.trim()) e.partNumber = "Part number is required.";
    if (!form.spec.trim()) e.spec = `${specLabel} is required.`;
    const d = parseFloat(form.d);
    const L = parseFloat(form.L);
    const S = parseFloat(form.SS);
    const cs = parseFloat(form.currentStock);
    if (isNaN(d) || d < 0) e.d = "Must be ≥ 0.";
    if (isNaN(L) || L < 0) e.L = "Must be ≥ 0.";
    if (isNaN(S) || S < 0) e.SS = "Must be ≥ 0.";
    if (isNaN(cs) || cs < 0) e.currentStock = "Must be ≥ 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validateForm()) return;
    const newPart: CustomSparePart = {
      id: `custom-${sparesMachineId}-${Date.now()}`,
      machineId: sparesMachineId,
      itemName: form.itemName.trim(),
      partNumber: form.partNumber.trim(),
      spec: form.spec.trim(),
      d: parseFloat(form.d),
      L: parseFloat(form.L),
      SS: parseFloat(form.SS),
      currentStock: parseFloat(form.currentStock),
    };
    addCustomSparePart(newPart);
    closeModal();
  }

  function setField(field: keyof PartForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
              Showing: {machineName}
            </span>
          </p>
        </div>
        <button className={styles.addButton} onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 16 16" fill="none" className={styles.addButtonIcon}>
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Add Part
        </button>
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
              <th className={styles.thActions} />
            </tr>
          </thead>
          <tbody>
            {allRows.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyRow}>
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
                    No spare parts data for this machine.{" "}
                    <button
                      className={styles.emptyAddLink}
                      onClick={() => setModalOpen(true)}
                    >
                      Add the first part →
                    </button>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyRow}>
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
                    <td className={styles.tdAccent}>
                      <div
                        className={`${styles.accentBar} ${styles[`accent_${status}`]}`}
                      />
                    </td>

                    <td className={styles.tdItem}>
                      <span className={styles.itemName}>{part.itemName}</span>
                      {part.isCustom && (
                        <span className={styles.customBadge}>Custom</span>
                      )}
                    </td>

                    <td className={styles.tdPart}>
                      <span className={styles.partBadge}>
                        {part.partNumber}
                      </span>
                    </td>

                    <td className={styles.tdSpec}>{part.spec}</td>

                    {/* d */}
                    <td className={styles.tdNum}>
                      <input
                        className={styles.cellInput}
                        type="number"
                        min={0}
                        step={1}
                        value={part.d}
                        onChange={(e) =>
                          part.isCustom
                            ? handleEditCustom(part.id, "d", e.target.value)
                            : handleEditStatic(part.id, "d", e.target.value)
                        }
                      />
                    </td>

                    {/* L */}
                    <td className={styles.tdNum}>
                      <input
                        className={styles.cellInput}
                        type="number"
                        min={0}
                        step={1}
                        value={part.L}
                        onChange={(e) =>
                          part.isCustom
                            ? handleEditCustom(part.id, "L", e.target.value)
                            : handleEditStatic(part.id, "L", e.target.value)
                        }
                      />
                    </td>

                    {/* SS */}
                    <td className={styles.tdNum}>
                      <input
                        className={styles.cellInput}
                        type="number"
                        min={0}
                        step={1}
                        value={part.SS}
                        onChange={(e) =>
                          part.isCustom
                            ? handleEditCustom(part.id, "SS", e.target.value)
                            : handleEditStatic(part.id, "SS", e.target.value)
                        }
                      />
                    </td>

                    {/* ROP (computed) */}
                    <td className={styles.tdRop}>
                      <span className={styles.ropBadge}>{rop}</span>
                    </td>

                    {/* Current Stock */}
                    <td className={styles.tdStock}>
                      <input
                        className={`${styles.cellInput} ${styles.stockInput} ${styles[`stockInput_${status}`]}`}
                        type="number"
                        min={0}
                        step={1}
                        value={part.currentStock}
                        onChange={(e) =>
                          part.isCustom
                            ? handleEditCustom(
                                part.id,
                                "currentStock",
                                e.target.value,
                              )
                            : handleEditStatic(
                                part.id,
                                "currentStock",
                                e.target.value,
                              )
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

                    {/* Delete — only for custom parts */}
                    <td className={styles.tdActions}>
                      {part.isCustom && (
                        <button
                          className={styles.deleteButton}
                          title="Remove custom part"
                          onClick={() =>
                            removeCustomSparePart(part.id, sparesMachineId)
                          }
                        >
                          <svg viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3 4h10M6 4V3h4v1M5 4l.5 8h5l.5-8"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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

      {/* ════════════════════════════════════════════════════════════════
          ADD PART MODAL
      ════════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalTag}>New Entry</span>
                <h2 className={styles.modalTitle} id="modal-title">
                  Add Consumable Part
                </h2>
                <p className={styles.modalSubtitle}>
                  Part will be added to <strong>{machineName}</strong>
                </p>
              </div>
              <button
                className={styles.modalClose}
                onClick={closeModal}
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              {/* Row 1: Item Name + Part Number */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="f-itemName">
                    Item Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    id="f-itemName"
                    className={`${styles.formInput} ${errors.itemName ? styles.inputError : ""}`}
                    placeholder="e.g. Cutting Tip"
                    value={form.itemName}
                    onChange={(e) => setField("itemName", e.target.value)}
                  />
                  {errors.itemName && (
                    <span className={styles.errorMsg}>{errors.itemName}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="f-partNumber">
                    Part Number <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="f-partNumber"
                    className={`${styles.formInput} ${errors.partNumber ? styles.inputError : ""}`}
                    placeholder="e.g. 35-1053"
                    value={form.partNumber}
                    onChange={(e) => setField("partNumber", e.target.value)}
                  />
                  {errors.partNumber && (
                    <span className={styles.errorMsg}>{errors.partNumber}</span>
                  )}
                </div>
              </div>

              {/* Row 2: Spec */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="f-spec">
                    {specLabel} <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="f-spec"
                    className={`${styles.formInput} ${errors.spec ? styles.inputError : ""}`}
                    placeholder={
                      specLabel === "Ampere"
                        ? "e.g. 100A"
                        : specLabel === "Size"
                          ? "e.g. D27.9 x 4.1mm"
                          : "e.g. Carbide Insert"
                    }
                    value={form.spec}
                    onChange={(e) => setField("spec", e.target.value)}
                  />
                  {errors.spec && (
                    <span className={styles.errorMsg}>{errors.spec}</span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className={styles.formDivider}>
                <span>Reorder Point Inputs</span>
              </div>

              {/* Row 3: d  L  SS */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="f-d">
                    d — Daily Demand <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="f-d"
                    className={`${styles.formInput} ${errors.d ? styles.inputError : ""}`}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={form.d}
                    onChange={(e) => setField("d", e.target.value)}
                  />
                  {errors.d && (
                    <span className={styles.errorMsg}>{errors.d}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="f-L">
                    L — Lead Time (days){" "}
                    <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="f-L"
                    className={`${styles.formInput} ${errors.L ? styles.inputError : ""}`}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={form.L}
                    onChange={(e) => setField("L", e.target.value)}
                  />
                  {errors.L && (
                    <span className={styles.errorMsg}>{errors.L}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="f-SS">
                    SS — Safety Stock <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="f-SS"
                    className={`${styles.formInput} ${errors.SS ? styles.inputError : ""}`}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={form.SS}
                    onChange={(e) => setField("SS", e.target.value)}
                  />
                  {errors.SS && (
                    <span className={styles.errorMsg}>{errors.SS}</span>
                  )}
                </div>
              </div>

              {/* ROP preview */}
              {form.d && form.L && form.SS && (
                <div className={styles.ropPreview}>
                  <span className={styles.ropPreviewLabel}>Computed ROP</span>
                  <span className={styles.ropPreviewValue}>
                    {(() => {
                      const d = parseFloat(form.d),
                        L = parseFloat(form.L),
                        S = parseFloat(form.SS);
                      return !isNaN(d) && !isNaN(L) && !isNaN(S)
                        ? computeROP(d, L, S)
                        : "—";
                    })()}
                  </span>
                  <span className={styles.ropPreviewFormula}>= d × L + SS</span>
                </div>
              )}

              {/* Row 4: Current Stock */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="f-stock">
                    Current Stock <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="f-stock"
                    className={`${styles.formInput} ${errors.currentStock ? styles.inputError : ""}`}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={form.currentStock}
                    onChange={(e) => setField("currentStock", e.target.value)}
                  />
                  {errors.currentStock && (
                    <span className={styles.errorMsg}>
                      {errors.currentStock}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={closeModal}>
                Cancel
              </button>
              <button className={styles.submitButton} onClick={handleSubmit}>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className={styles.submitIcon}
                >
                  <path
                    d="M8 3v10M3 8h10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Add Part
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
