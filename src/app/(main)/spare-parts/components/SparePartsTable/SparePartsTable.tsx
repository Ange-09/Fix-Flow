"use client";

import { useMemo, useEffect, useState, useId } from "react";
import { Machine, SparePart } from "@/app/lib/machineData";
import { useAppContext, CustomSparePart } from "@/app/context/AppContext";
import SparePartRow, {
  computeLifeMetrics,
  formatDateDisplay,
  LifeStatus,
} from "../SparePartRow/SparePartRow";
import RecommendationPanel from "../RecommendationPanel/RecommendationPanel";
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
  expectedLife: "",
  installationDate: "",
  avgDailyUsage: "",
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
      "expectedLife",
      "avgDailyUsage",
      "SS",
      "currentStock",
    ];
    numFields.forEach((k) => {
      const v = parseFloat(form[k]);
      if (isNaN(v) || v <= 0) e[k] = "Must be > 0";
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
      expectedLife: parseFloat(form.expectedLife) || 0,
      installationDate: form.installationDate,
      avgDailyUsage: parseFloat(form.avgDailyUsage) || 0,
      SS: parseFloat(form.SS) || 0,
      currentStock: parseFloat(form.currentStock) || 0,
    };

    addCustomSparePart(part);
    onClose();
  }

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

          {/* Life Parameters */}
          <div className={styles.fieldSection}>
            <p className={styles.fieldSectionTitle}>
              Life &amp; Usage Parameters
            </p>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor={`${uid}-expectedLife`}>
                  Expected Life <em className={styles.unit}>(hours)</em>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={`${styles.input} ${errors.expectedLife ? styles.inputError : ""}`}
                  placeholder="e.g. 8000"
                  {...field("expectedLife")}
                />
                {errors.expectedLife && (
                  <span className={styles.errorMsg}>{errors.expectedLife}</span>
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label
                  className={styles.label}
                  htmlFor={`${uid}-avgDailyUsage`}
                >
                  Avg Daily Usage <em className={styles.unit}>(hrs / day)</em>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className={`${styles.input} ${errors.avgDailyUsage ? styles.inputError : ""}`}
                  placeholder="e.g. 8"
                  {...field("avgDailyUsage")}
                />
                {errors.avgDailyUsage && (
                  <span className={styles.errorMsg}>
                    {errors.avgDailyUsage}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.fieldRow2}>
              <div className={styles.fieldGroup}>
                <label
                  className={styles.label}
                  htmlFor={`${uid}-installationDate`}
                >
                  Installation Date
                </label>
                <input
                  type="date"
                  className={styles.input}
                  {...field("installationDate")}
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className={styles.fieldSection}>
            <p className={styles.fieldSectionTitle}>Inventory Parameters</p>
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

  const staticParts = (machine.spareParts ?? []).filter(
    (p) => p.classification === "Critical",
  );

  const customParts: CustomSparePart[] = allCustomSpareParts[machine.id] ?? [];

  // Seed context with static defaults when the machine has no state yet
  useEffect(() => {
    const hasAnyEntry = staticParts.some(
      (p) => sparePartsState[p.id] !== undefined,
    );
    if (!hasAnyEntry) {
      const seed: Record<
        string,
        {
          installationDate: string;
          expectedLife: number;
          avgDailyUsage: number;
        }
      > = {};
      staticParts.forEach((p) => {
        seed[p.id] = {
          installationDate: p.defaultInstallationDate ?? "",
          expectedLife: p.defaultExpectedLife ?? 8000,
          avgDailyUsage: p.defaultAvgDailyUsage ?? 8,
        };
      });
      setSparePartsStateForMachine(machine.id, seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.id]);

  function handlePartChange(
    partId: string,
    field: "installationDate" | "expectedLife" | "avgDailyUsage",
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
      if (!state?.installationDate) return;
      const { status } = computeLifeMetrics(
        state.installationDate,
        state.expectedLife,
        state.avgDailyUsage,
      );
      counts[status] = (counts[status] ?? 0) + 1;
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
              <th className={styles.th}>Expected Life</th>
              <th className={styles.th}>Installation Date</th>
              <th className={styles.th}>Avg Daily Usage</th>
              <th className={styles.th}>Life Used</th>
              <th className={styles.th}>% Life Used</th>
              <th className={styles.th} onClick={() => handleSort("condition")}>
                <span className={styles.thInner}>
                  Status{" "}
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
  condition: LifeStatus;
  state: {
    installationDate: string;
    expectedLife: number;
    avgDailyUsage: number;
  };
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
  partStates: Record<
    string,
    { installationDate: string; expectedLife: number; avgDailyUsage: number }
  >;
  onPartChange: (
    id: string,
    field: "installationDate" | "expectedLife" | "avgDailyUsage",
    value: string | number,
  ) => void;
  onRemoveCustom: (partId: string) => void;
  filterCondition: FilterCondition;
  sortKey: SortKey;
  sortAsc: boolean;
}) {
  const defaultState = {
    installationDate: "",
    expectedLife: 8000,
    avgDailyUsage: 8,
  };

  function resolveStatus(
    id: string,
    state: {
      installationDate: string;
      expectedLife: number;
      avgDailyUsage: number;
    },
  ): LifeStatus {
    const { status } = computeLifeMetrics(
      state.installationDate,
      state.expectedLife,
      state.avgDailyUsage,
    );
    return status;
  }

  const unified: UnifiedPart[] = [
    ...staticParts.map((p) => {
      const state = partStates[p.id] ?? defaultState;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        isCustom: false,
        staticData: p,
        condition: resolveStatus(p.id, state),
        state,
      } as UnifiedPart;
    }),
    ...customParts.map((p) => {
      const state = partStates[p.id] ?? {
        installationDate: p.installationDate ?? "",
        expectedLife: p.expectedLife ?? 8000,
        avgDailyUsage: p.avgDailyUsage ?? 8,
      };
      return {
        id: p.id,
        name: p.itemName,
        description: p.spec || p.partNumber,
        isCustom: true,
        customData: p,
        condition: resolveStatus(p.id, state),
        state,
      } as UnifiedPart;
    }),
  ];

  const conditionOrder: Record<LifeStatus, number> = {
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
      cmp = conditionOrder[a.condition] - conditionOrder[b.condition];
    return sortAsc ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <tr>
        <td
          colSpan={8}
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

// ── Custom spare part row ─────────────────────────────────────────────────────

import styles2 from "../SparePartRow/SparePartRow.module.css";

function CustomSparePartRow({
  part,
  partState,
  onPartChange,
  onRemove,
}: {
  part: CustomSparePart;
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
  onRemove: (id: string) => void;
}) {
  const [showRecs, setShowRecs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { lifeUsedHrs, percentLifeUsed, status, fDateEstimate } =
    computeLifeMetrics(
      partState.installationDate,
      partState.expectedLife,
      partState.avgDailyUsage,
    );

  const hasDate = !!partState.installationDate;
  const clampedPct = Math.min(100, Math.max(0, percentLifeUsed ?? 0));

  const conditionMeta: Record<LifeStatus, { label: string; cls: string }> = {
    Normal: { label: "Normal", cls: styles2.statusNormal },
    "Early Warning": { label: "Early Warning", cls: styles2.statusWarn },
    "Degrading Condition": { label: "Degrading", cls: styles2.statusOrange },
    "Maintenance Trigger": { label: "Trigger!", cls: styles2.statusBad },
  };
  const meta = conditionMeta[status];

  const recsCountMap: Record<LifeStatus, number> = {
    Normal: 3,
    "Early Warning": 7,
    "Degrading Condition": 7,
    "Maintenance Trigger": 6,
  };

  return (
    <>
      <tr
        className={`${styles2.row} ${styles.customRow} ${showRecs ? styles2.rowActive : ""}`}
      >
        {/* Name */}
        <td className={styles2.td}>
          <div className={styles2.partName}>
            {part.itemName}
            <span className={styles.customBadge}>Custom</span>
          </div>
          {(part.spec || part.partNumber) && (
            <div className={styles2.partDesc}>
              {part.partNumber}
              {part.spec ? ` — ${part.spec}` : ""}
            </div>
          )}
        </td>

        {/* Expected Life */}
        <td className={styles2.td}>
          <div className={styles2.inputWrapper}>
            <input
              type="number"
              className={styles2.numInput}
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
            <span className={styles2.inputUnit}>hrs</span>
          </div>
        </td>

        {/* Installation Date */}
        <td className={styles2.td}>
          <input
            type="date"
            className={styles2.dateInput}
            value={partState.installationDate}
            onChange={(e) =>
              onPartChange(part.id, "installationDate", e.target.value)
            }
          />
        </td>

        {/* Avg Daily Usage */}
        <td className={styles2.td}>
          <div className={styles2.inputWrapper}>
            <input
              type="number"
              className={styles2.numInput}
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
            <span className={styles2.inputUnit}>hrs/day</span>
          </div>
        </td>

        {/* Life Used */}
        <td className={styles2.td}>
          {lifeUsedHrs !== null ? (
            <span className={styles2.computedVal}>
              {lifeUsedHrs.toFixed(1)} hrs
            </span>
          ) : (
            <span className={styles2.naText}>—</span>
          )}
        </td>

        {/* % Life Used */}
        <td className={styles2.td}>
          {percentLifeUsed !== null ? (
            <span className={styles2.computedVal}>
              {percentLifeUsed.toFixed(1)}%
            </span>
          ) : (
            <span className={styles2.naText}>—</span>
          )}
          {fDateEstimate && hasDate && (
            <div className={styles2.fDateSmall}>
              F: {formatDateDisplay(fDateEstimate)}
            </div>
          )}
        </td>

        {/* Condition */}
        <td className={styles2.td}>
          {!hasDate ? (
            <span className={styles2.naText}>Set Install Date</span>
          ) : (
            <div className={styles2.conditionCell}>
              <span className={`${styles2.conditionBadge} ${meta.cls}`}>
                {meta.label}
              </span>
              <div className={styles2.progressTrack}>
                <div
                  className={`${styles2.progressFill} ${meta.cls}`}
                  style={{ width: `${Math.round(clampedPct)}%` }}
                />
              </div>
              <span className={styles2.progressPct}>
                {Math.round(clampedPct)}%
              </span>
            </div>
          )}
        </td>

        {/* Recommendations */}
        <td className={styles2.td}>
          {!hasDate ? (
            <span className={styles2.naText}>—</span>
          ) : (
            <button
              className={`${styles2.recsBtn} ${showRecs ? styles2.recsBtnActive : ""}`}
              onClick={() => setShowRecs((v) => !v)}
            >
              {showRecs ? "Hide" : "View"} ({recsCountMap[status]})
            </button>
          )}
        </td>

        {/* Delete */}
        <td className={styles2.td}>
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

      {showRecs && hasDate && (
        <tr className={styles2.recsRow}>
          <td colSpan={9} className={styles2.recsTd}>
            <RecommendationPanel condition={status} />
          </td>
        </tr>
      )}
    </>
  );
}
