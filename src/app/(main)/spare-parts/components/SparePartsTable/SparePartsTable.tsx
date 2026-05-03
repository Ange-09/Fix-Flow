"use client";

import { useMemo, useEffect, useState, useId } from "react";
import { Machine, SparePart } from "@/app/lib/machineData";
import { useAppContext, CustomSparePart } from "@/app/context/AppContext";
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

// ── Add Part Modal ────────────────────────────────────────────────────────────

interface AddPartModalProps {
  machineId: string;
  onClose: () => void;
}

const EMPTY_FORM = {
  itemName: "",
  partNumber: "",
  spec: "",
  d: "",
  L: "",
  SS: "",
  currentStock: "",
};

function AddPartModal({ machineId, onClose }: AddPartModalProps) {
  const { addCustomSparePart } = useAppContext();
  const uid = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});

  function field(key: keyof typeof EMPTY_FORM) {
    return {
      id: `${uid}-${key}`,
      value: form[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((er) => ({ ...er, [key]: undefined }));
      },
    };
  }

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.itemName.trim()) e.itemName = "Required";
    if (!form.partNumber.trim()) e.partNumber = "Required";
    const numFields: (keyof typeof EMPTY_FORM)[] = [
      "d",
      "L",
      "SS",
      "currentStock",
    ];
    numFields.forEach((k) => {
      const v = parseFloat(form[k]);
      if (isNaN(v) || v < 0) e[k] = "Must be ≥ 0";
    });
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    const part: CustomSparePart = {
      id: `custom-${machineId}-${Date.now()}`,
      machineId,
      itemName: form.itemName.trim(),
      partNumber: form.partNumber.trim(),
      spec: form.spec.trim(),
      d: parseFloat(form.d) || 0,
      L: parseFloat(form.L) || 0,
      SS: parseFloat(form.SS) || 0,
      currentStock: parseFloat(form.currentStock) || 0,
    };

    addCustomSparePart(part);
    onClose();
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.modalTag}>New Entry</span>
            <h2 className={styles.modalTitle}>Add Critical Spare Part</h2>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Part Identification */}
          <div className={styles.fieldSection}>
            <p className={styles.fieldSectionTitle}>Part Identification</p>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`${uid}-itemName`}>
                  Item Name <span className={styles.required}>*</span>
                </label>
                <input
                  className={`${styles.input} ${errors.itemName ? styles.inputError : ""}`}
                  placeholder="e.g. Ball Bearing 6205"
                  {...field("itemName")}
                />
                {errors.itemName && (
                  <span className={styles.errorMsg}>{errors.itemName}</span>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`${uid}-partNumber`}>
                  Part Number <span className={styles.required}>*</span>
                </label>
                <input
                  className={`${styles.input} ${errors.partNumber ? styles.inputError : ""}`}
                  placeholder="e.g. SKF-6205-2RS"
                  {...field("partNumber")}
                />
                {errors.partNumber && (
                  <span className={styles.errorMsg}>{errors.partNumber}</span>
                )}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor={`${uid}-spec`}>
                Specification / Notes
              </label>
              <input
                className={styles.input}
                placeholder="e.g. 25×52×15 mm, ABEC-3 rated"
                {...field("spec")}
              />
            </div>
          </div>

          {/* Inventory & Reorder */}
          <div className={styles.fieldSection}>
            <p className={styles.fieldSectionTitle}>
              Inventory &amp; Reorder Parameters
            </p>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`${uid}-d`}>
                  Demand Rate <em className={styles.unit}>(units / day)</em>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.input} ${errors.d ? styles.inputError : ""}`}
                  placeholder="0"
                  {...field("d")}
                />
                {errors.d && (
                  <span className={styles.errorMsg}>{errors.d}</span>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`${uid}-L`}>
                  Lead Time <em className={styles.unit}>(days)</em>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`${styles.input} ${errors.L ? styles.inputError : ""}`}
                  placeholder="0"
                  {...field("L")}
                />
                {errors.L && (
                  <span className={styles.errorMsg}>{errors.L}</span>
                )}
              </div>
            </div>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`${uid}-SS`}>
                  Safety Stock <em className={styles.unit}>(units)</em>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`${styles.input} ${errors.SS ? styles.inputError : ""}`}
                  placeholder="0"
                  {...field("SS")}
                />
                {errors.SS && (
                  <span className={styles.errorMsg}>{errors.SS}</span>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`${uid}-currentStock`}>
                  Current Stock <em className={styles.unit}>(units)</em>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`${styles.input} ${errors.currentStock ? styles.inputError : ""}`}
                  placeholder="0"
                  {...field("currentStock")}
                />
                {errors.currentStock && (
                  <span className={styles.errorMsg}>{errors.currentStock}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.submitBtn} onClick={handleSubmit}>
            Add Spare Part
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Table Component ──────────────────────────────────────────────────────

export default function SparePartsTable({ machine }: Props) {
  const [filterCondition, setFilterCondition] =
    useState<FilterCondition>("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    sparePartsState,
    setSparePartState,
    setSparePartsStateForMachine,
    allCustomSpareParts,
    removeCustomSparePart,
  } = useAppContext();

  // Only critical static parts
  const staticParts = (machine.spareParts ?? []).filter(
    (p) => p.classification === "Critical",
  );

  // Custom parts for this machine
  const customParts: CustomSparePart[] = allCustomSpareParts[machine.id] ?? [];

  // Seed context with static defaults when the machine has no state yet
  useEffect(() => {
    const hasAnyEntry = staticParts.some(
      (p) => sparePartsState[p.id] !== undefined,
    );
    if (!hasAnyEntry) {
      const seed: Record<string, { pDate: string; pfInterval: number }> = {};
      staticParts.forEach((p) => {
        seed[p.id] = {
          pDate: p.defaultPDate ?? "",
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
    value: string | number,
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
    const allIds = [
      ...staticParts.map((p) => p.id),
      ...customParts.map((p) => p.id),
    ];
    allIds.forEach((id) => {
      const state = sparePartsState[id];
      if (!state?.pDate) return;
      const { getConditionStatus } = require("@/app/lib/pfCurveUtils");
      const pDate = new Date(state.pDate + "T00:00:00");
      if (isNaN(pDate.getTime())) return;
      const cond = getConditionStatus(pDate, state.pfInterval);
      counts[cond] = (counts[cond] ?? 0) + 1;
    });
    return counts;
  }, [staticParts, customParts, sparePartsState]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const totalParts = staticParts.length + customParts.length;

  return (
    <div className={styles.wrapper}>
      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum}>{totalParts}</span>
          <span className={styles.summaryLabel}>Critical Parts</span>
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
          <span className={styles.filterLabel}>Filter:</span>
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

        <button
          className={styles.addPartBtn}
          onClick={() => setShowAddModal(true)}
        >
          <span className={styles.addPartIcon}>+</span>
          Add Spare Part
        </button>
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
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            <TableBody
              staticParts={staticParts}
              customParts={customParts}
              partStates={sparePartsState}
              onPartChange={handlePartChange}
              onRemoveCustom={(partId) =>
                removeCustomSparePart(partId, machine.id)
              }
              filterCondition={filterCondition}
              sortKey={sortKey}
              sortAsc={sortAsc}
            />
          </tbody>
        </table>
      </div>

      {/* Add Part Modal */}
      {showAddModal && (
        <AddPartModal
          machineId={machine.id}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ── Unified row model ─────────────────────────────────────────────────────────

interface UnifiedPart {
  id: string;
  name: string;
  description?: string;
  isCustom: boolean;
  customData?: CustomSparePart;
  staticData?: SparePart;
  condition: string;
  state: { pDate: string; pfInterval: number };
}

function TableBody({
  staticParts,
  customParts,
  partStates,
  onPartChange,
  onRemoveCustom,
  filterCondition,
  sortKey,
  sortAsc,
}: {
  staticParts: SparePart[];
  customParts: CustomSparePart[];
  partStates: Record<string, { pDate: string; pfInterval: number }>;
  onPartChange: (
    id: string,
    field: "pDate" | "pfInterval",
    value: string | number,
  ) => void;
  onRemoveCustom: (partId: string) => void;
  filterCondition: FilterCondition;
  sortKey: SortKey;
  sortAsc: boolean;
}) {
  const {
    getConditionStatus,
    parseDateString,
  } = require("@/app/lib/pfCurveUtils");

  function resolveCondition(
    id: string,
    state: { pDate: string; pfInterval: number },
  ) {
    if (!state.pDate) return "Normal";
    const pDate = parseDateString(state.pDate);
    if (!pDate) return "Normal";
    return getConditionStatus(pDate, state.pfInterval);
  }

  const unified: UnifiedPart[] = [
    ...staticParts.map((p) => {
      const state = partStates[p.id] ?? { pDate: "", pfInterval: 30 };
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        isCustom: false,
        staticData: p,
        condition: resolveCondition(p.id, state),
        state,
      } as UnifiedPart;
    }),
    ...customParts.map((p) => {
      const state = partStates[p.id] ?? { pDate: "", pfInterval: 30 };
      return {
        id: p.id,
        name: p.itemName,
        description: p.spec || p.partNumber,
        isCustom: true,
        customData: p,
        condition: resolveCondition(p.id, state),
        state,
      } as UnifiedPart;
    }),
  ];

  const conditionOrder: Record<string, number> = {
    "Maintenance Trigger": 0,
    "Degrading Condition": 1,
    "Early Warning": 2,
    Normal: 3,
  };

  const filtered = unified.filter((p) => {
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
          colSpan={7}
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
      {sorted.map((p) =>
        p.isCustom && p.customData ? (
          <CustomSparePartRow
            key={p.id}
            part={p.customData}
            partState={p.state}
            onPartChange={onPartChange}
            onRemove={onRemoveCustom}
          />
        ) : p.staticData ? (
          <SparePartRow
            key={p.id}
            part={p.staticData}
            partState={p.state}
            onPartChange={onPartChange}
          />
        ) : null,
      )}
    </>
  );
}

// ── Custom spare part row (inline, no colSpan tricks needed) ──────────────────

import {
  calculateFDate,
  getConditionStatus,
  getElapsedPercentage,
  parseDateString,
  formatDate,
  ConditionStatus,
} from "@/app/lib/pfCurveUtils";
import RecommendationPanel from "../RecommendationPanel/RecommendationPanel";

function CustomSparePartRow({
  part,
  partState,
  onPartChange,
  onRemove,
}: {
  part: CustomSparePart;
  partState: { pDate: string; pfInterval: number };
  onPartChange: (
    id: string,
    field: "pDate" | "pfInterval",
    value: string | number,
  ) => void;
  onRemove: (id: string) => void;
}) {
  const [showRecs, setShowRecs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pDate = parseDateString(partState.pDate);
  const fDate = pDate ? calculateFDate(pDate, partState.pfInterval) : null;
  const condition: ConditionStatus = pDate
    ? getConditionStatus(pDate, partState.pfInterval)
    : "Normal";
  const elapsed = pDate ? getElapsedPercentage(pDate, partState.pfInterval) : 0;

  const conditionMeta: Record<ConditionStatus, { label: string; cls: string }> =
    {
      Normal: { label: "Normal", cls: styles.statusNormal },
      "Early Warning": { label: "Early Warning", cls: styles.statusWarn },
      "Degrading Condition": {
        label: "Degrading",
        cls: styles.statusOrange,
      },
      "Maintenance Trigger": { label: "Trigger!", cls: styles.statusBad },
    };
  const meta = conditionMeta[condition];

  const recsCount =
    condition === "Normal"
      ? 3
      : condition === "Early Warning"
        ? 7
        : condition === "Degrading Condition"
          ? 7
          : 6;

  return (
    <>
      <tr
        className={`${styles.row} ${styles.customRow} ${showRecs ? styles.rowActive : ""}`}
      >
        {/* Name */}
        <td className={styles.td}>
          <div className={styles.partNameRow}>
            <span className={styles.partName}>{part.itemName}</span>
            <span className={styles.customBadge}>Custom</span>
          </div>
          {(part.spec || part.partNumber) && (
            <div className={styles.partDesc}>
              {part.partNumber}
              {part.spec ? ` — ${part.spec}` : ""}
            </div>
          )}
        </td>

        {/* P Date */}
        <td className={styles.td}>
          <input
            type="date"
            className={styles.dateInput}
            value={partState.pDate}
            onChange={(e) => onPartChange(part.id, "pDate", e.target.value)}
          />
        </td>

        {/* PF Interval */}
        <td className={styles.td}>
          <input
            type="number"
            className={styles.numInput}
            value={partState.pfInterval}
            min={1}
            onChange={(e) =>
              onPartChange(
                part.id,
                "pfInterval",
                Math.max(1, parseInt(e.target.value) || 1),
              )
            }
          />
        </td>

        {/* F Date */}
        <td className={styles.td}>
          {fDate ? (
            <span className={styles.fDate}>{formatDate(fDate)}</span>
          ) : (
            <span className={styles.naText}>—</span>
          )}
        </td>

        {/* Condition */}
        <td className={styles.td}>
          {!pDate ? (
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
              <span className={styles.progressPct}>
                {Math.round(elapsed * 100)}%
              </span>
            </div>
          )}
        </td>

        {/* Recommendations */}
        <td className={styles.td}>
          {!pDate ? (
            <span className={styles.naText}>—</span>
          ) : (
            <button
              className={`${styles.recsBtn} ${showRecs ? styles.recsBtnActive : ""}`}
              onClick={() => setShowRecs((v) => !v)}
            >
              {showRecs ? "Hide" : "View"} ({recsCount})
            </button>
          )}
        </td>

        {/* Delete */}
        <td className={styles.td}>
          {confirmDelete ? (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>Remove?</span>
              <button
                className={styles.confirmYes}
                onClick={() => onRemove(part.id)}
              >
                Yes
              </button>
              <button
                className={styles.confirmNo}
                onClick={() => setConfirmDelete(false)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              className={styles.deleteBtn}
              onClick={() => setConfirmDelete(true)}
              title="Remove custom part"
            >
              ✕
            </button>
          )}
        </td>
      </tr>

      {showRecs && pDate && (
        <tr className={styles.recsRow}>
          <td colSpan={7} className={styles.recsTd}>
            <RecommendationPanel condition={condition} />
          </td>
        </tr>
      )}
    </>
  );
}
