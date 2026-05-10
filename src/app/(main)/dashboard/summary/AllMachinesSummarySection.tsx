"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { machines, getMachineById, type Machine } from "@/app/lib/machineData";
import { useAppContext, TIME_FRAME_OPTIONS } from "@/app/context/AppContext";
import type { AHPStrategyId } from "@/app/context/AppContext";
import { computeLifeMetrics } from "@/app/(main)/spare-parts/components/SparePartRow/SparePartRow";
import {
  getSparePartsByMachine,
  computeROP,
  getStockStatus,
} from "@/app/lib/sparePartsData";
import styles from "./AllMachinesSummarySection.module.css";

// ── ID bridge ────────────────────────────────────────────────────────────────
const MACHINE_ID_MAP: Record<string, string> = {
  "cnc-plasma": "plasma-cutter",
  "cnc-laser": "laser-cutter",
  "cnc-lathe": "lathe-machine",
  "cnc-milling": "milling-machine",
  "cnc-controller": "cnc-controller",
};

// ── Strategy metadata ────────────────────────────────────────────────────────
const STRATEGY_META: Record<
  AHPStrategyId,
  { label: string; icon: string; color: string; short: string }
> = {
  predictive: {
    label: "Predictive",
    icon: "📡",
    color: "#185FA5",
    short: "Predictive",
  },
  preventive: {
    label: "Preventive",
    icon: "🔧",
    color: "#27500A",
    short: "Preventive",
  },
  reactive: {
    label: "Reactive",
    icon: "⚠️",
    color: "#854F0B",
    short: "Reactive",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
function fmtHrs(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(2)} hrs`;
}
function oeeClass(v: number | null): string {
  if (v === null) return "";
  const pct = v * 100;
  if (pct >= 85) return styles.good;
  if (pct >= 65) return styles.warn;
  return styles.bad;
}
function mtbfClass(v: number | null): string {
  if (v === null) return "";
  if (v >= 300) return styles.good;
  if (v >= 150) return styles.warn;
  return styles.bad;
}
function mttrClass(v: number | null): string {
  if (v === null) return "";
  if (v <= 4) return styles.good;
  if (v <= 8) return styles.warn;
  return styles.bad;
}

// ── Life-based condition counting ─────────────────────────────────────────────
function resolveConditionStatus(
  partId: string,
  liveState: Record<
    string,
    { installationDate: string; expectedLife: number; avgDailyUsage: number }
  >,
  defaults: {
    installationDate?: string;
    expectedLife?: number;
    avgDailyUsage?: number;
  },
): "Normal" | "Early Warning" | "Degrading Condition" | "Maintenance Trigger" {
  const state = liveState[partId];
  const installationDate =
    state?.installationDate ?? defaults.installationDate ?? "";
  const expectedLife = state?.expectedLife ?? defaults.expectedLife ?? 8000;
  const avgDailyUsage = state?.avgDailyUsage ?? defaults.avgDailyUsage ?? 8;
  const { status } = computeLifeMetrics(
    installationDate,
    expectedLife,
    avgDailyUsage,
  );
  return status;
}

// ── Per-machine data shape ────────────────────────────────────────────────────
interface MachineRowData {
  id: string;
  name: string;
  isCustom: boolean;

  // Strategy
  hasAHP: boolean;
  strategyId: AHPStrategyId | null;
  strategyScore: number | null;

  // KPI
  hasKPI: boolean;
  oeeScore: number | null;
  mtbf: number | null;
  mttr: number | null;
  periodLabel: string;

  // Critical spare parts
  critNormal: number;
  critEarlyWarn: number;
  critDegrading: number;
  critTrigger: number;
  critTotal: number;

  // Consumables
  consGood: number;
  consWarn: number;
  consBad: number;
  consTotal: number;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AllMachinesSummarySection() {
  const router = useRouter();
  const {
    allKpiStates,
    allAhpStates,
    allSparePartsStates,
    allCustomSpareParts,
    customMachines,
  } = useAppContext();

  // Combine static + custom machines
  const allMachines = useMemo<
    Array<{
      id: string;
      name: string;
      isCustom: boolean;
      spareParts: Machine["spareParts"];
    }>
  >(
    () => [
      ...machines.map((m) => ({
        id: m.id,
        name: m.name,
        isCustom: false,
        spareParts: m.spareParts,
      })),
      ...customMachines.map((m) => ({
        id: m.id,
        name: m.name,
        isCustom: true,
        spareParts: [],
      })),
    ],
    [customMachines],
  );

  const rows = useMemo<MachineRowData[]>(() => {
    return allMachines.map(({ id, name, isCustom, spareParts }) => {
      const kpiState = allKpiStates[id];
      const ahpState = allAhpStates[id];
      const liveSparePartsState = allSparePartsStates[id] ?? {};

      // ── KPI ───────────────────────────────────────────────────────────────
      const hasKPI = !!(
        kpiState?.kpiOutputs.oeeScore !== null &&
        kpiState?.kpiOutputs.oeeScore !== undefined
      );
      const kpiOutputs = kpiState?.kpiOutputs ?? {
        oeeScore: null,
        availability: null,
        performance: null,
        quality: null,
        mtbf: null,
        mttr: null,
      };
      const timeFrame = kpiState?.timeFrame ?? "monthly";
      const tfOption = TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)!;
      const periodLabel = `${tfOption.label}`;

      // ── AHP ───────────────────────────────────────────────────────────────
      const hasAHP = !!ahpState?.ahpOutputs.submitted;
      const ahpOutputs = ahpState?.ahpOutputs;
      let strategyId: AHPStrategyId | null = null;
      let strategyScore: number | null = null;
      if (hasAHP && ahpOutputs) {
        const ALL: AHPStrategyId[] = ["predictive", "preventive", "reactive"];
        strategyId = ALL.reduce((best, cur) =>
          (ahpOutputs.scores[cur] ?? 0) > (ahpOutputs.scores[best] ?? 0)
            ? cur
            : best,
        );
        strategyScore = ahpOutputs.scores[strategyId] ?? null;
      }

      // ── Critical spare parts ──────────────────────────────────────────────
      const criticalParts = spareParts.filter(
        (p) => p.classification === "Critical",
      );
      const customCritical = allCustomSpareParts[id] ?? [];
      const critTotal = criticalParts.length + customCritical.length;

      let critNormal = 0,
        critEarlyWarn = 0,
        critDegrading = 0,
        critTrigger = 0;
      criticalParts.forEach((p) => {
        const s = resolveConditionStatus(p.id, liveSparePartsState, {
          installationDate: p.defaultInstallationDate,
          expectedLife: p.defaultExpectedLife,
          avgDailyUsage: p.defaultAvgDailyUsage,
        });
        if (s === "Maintenance Trigger") critTrigger++;
        else if (s === "Degrading Condition") critDegrading++;
        else if (s === "Early Warning") critEarlyWarn++;
        else critNormal++;
      });
      customCritical.forEach((p) => {
        const s = resolveConditionStatus(p.id, liveSparePartsState, {
          installationDate: p.installationDate,
          expectedLife: p.expectedLife,
          avgDailyUsage: p.avgDailyUsage,
        });
        if (s === "Maintenance Trigger") critTrigger++;
        else if (s === "Degrading Condition") critDegrading++;
        else if (s === "Early Warning") critEarlyWarn++;
        else critNormal++;
      });

      // ── Consumables ───────────────────────────────────────────────────────
      const sparesMachineId = MACHINE_ID_MAP[id] ?? id;
      const staticConsumables = getSparePartsByMachine(sparesMachineId).map(
        (part) => {
          const saved = liveSparePartsState[part.id] ?? {};
          return {
            d: (saved as any).d ?? part.d,
            L: (saved as any).L ?? part.L,
            SS: (saved as any).SS ?? part.SS,
            currentStock: (saved as any).currentStock ?? part.currentStock,
          };
        },
      );
      const customConsumables = (
        allCustomSpareParts[sparesMachineId] ?? []
      ).map((p) => ({
        d: p.d ?? 0,
        L: p.L ?? 0,
        SS: p.SS,
        currentStock: p.currentStock,
      }));
      const allConsumables = [...staticConsumables, ...customConsumables];
      const consTotal = allConsumables.length;
      let consGood = 0,
        consWarn = 0,
        consBad = 0;
      allConsumables.forEach((r) => {
        const rop = computeROP(r.d, r.L, r.SS);
        const s = getStockStatus(r.currentStock, rop);
        if (s === "good") consGood++;
        else if (s === "warn") consWarn++;
        else consBad++;
      });

      return {
        id,
        name,
        isCustom,
        hasAHP,
        strategyId,
        strategyScore,
        hasKPI,
        oeeScore: kpiOutputs.oeeScore,
        mtbf: kpiOutputs.mtbf,
        mttr: kpiOutputs.mttr,
        periodLabel,
        critNormal,
        critEarlyWarn,
        critDegrading,
        critTrigger,
        critTotal,
        consGood,
        consWarn,
        consBad,
        consTotal,
      };
    });
  }, [
    allMachines,
    allKpiStates,
    allAhpStates,
    allSparePartsStates,
    allCustomSpareParts,
  ]);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <span className={styles.sectionTag}>Fleet Overview</span>
          <h2 className={styles.sectionTitle}>All Machines Summary</h2>
          <p className={styles.sectionSubtitle}>
            Consolidated view of maintenance strategy, performance, and parts
            status across all machines.
          </p>
        </div>
        <div className={styles.sectionHeaderRight}>
          <span className={styles.machineCount}>{rows.length} machines</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.thead}>
              <th className={`${styles.th} ${styles.thMachine}`}>Machine</th>
              <th className={`${styles.th} ${styles.thStrategy}`}>
                Recommended Strategy
              </th>
              <th className={`${styles.th} ${styles.thKpi}`}>OEE Score</th>
              <th className={`${styles.th} ${styles.thKpi}`}>MTBF</th>
              <th className={`${styles.th} ${styles.thKpi}`}>MTTR</th>
              <th className={`${styles.th} ${styles.thParts}`}>
                Critical Spare Parts
              </th>
              <th className={`${styles.th} ${styles.thCons}`}>Consumables</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={styles.machineRow}
                onClick={() => router.push("/")}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") router.push("/");
                }}
              >
                {/* Machine name — merged header cell */}
                <td className={`${styles.td} ${styles.tdMachine}`}>
                  <div className={styles.machineCell}>
                    <div className={styles.machineNameRow}>
                      <span className={styles.machineName}>{row.name}</span>
                      {row.isCustom && (
                        <span className={styles.customBadge}>Custom</span>
                      )}
                    </div>
                    <div className={styles.machineIdChip}>{row.id}</div>
                  </div>
                </td>

                {/* Recommended Strategy */}
                <td className={`${styles.td} ${styles.tdStrategy}`}>
                  {row.hasAHP && row.strategyId ? (
                    <div className={styles.strategyCell}>
                      <div
                        className={styles.strategyBadge}
                        style={{
                          borderColor:
                            STRATEGY_META[row.strategyId].color + "50",
                          backgroundColor:
                            STRATEGY_META[row.strategyId].color + "10",
                        }}
                      >
                        <span className={styles.strategyIcon}>
                          {STRATEGY_META[row.strategyId].icon}
                        </span>
                        <span
                          className={styles.strategyLabel}
                          style={{ color: STRATEGY_META[row.strategyId].color }}
                        >
                          {STRATEGY_META[row.strategyId].short}
                        </span>
                      </div>
                      {row.strategyScore !== null && (
                        <span
                          className={styles.strategyScore}
                          style={{ color: STRATEGY_META[row.strategyId].color }}
                        >
                          {row.strategyScore.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={styles.emptyCell}>No assessment</span>
                  )}
                </td>

                {/* OEE */}
                <td className={`${styles.td} ${styles.tdKpi}`}>
                  {row.hasKPI ? (
                    <div className={styles.kpiCell}>
                      <span
                        className={`${styles.kpiValue} ${oeeClass(row.oeeScore)}`}
                      >
                        {fmtPct(row.oeeScore)}
                      </span>
                      <span className={styles.kpiPeriod}>
                        {row.periodLabel}
                      </span>
                    </div>
                  ) : (
                    <span className={styles.emptyCell}>—</span>
                  )}
                </td>

                {/* MTBF */}
                <td className={`${styles.td} ${styles.tdKpi}`}>
                  {row.hasKPI ? (
                    <div className={styles.kpiCell}>
                      <span
                        className={`${styles.kpiValue} ${mtbfClass(row.mtbf)}`}
                      >
                        {fmtHrs(row.mtbf)}
                      </span>
                    </div>
                  ) : (
                    <span className={styles.emptyCell}>—</span>
                  )}
                </td>

                {/* MTTR */}
                <td className={`${styles.td} ${styles.tdKpi}`}>
                  {row.hasKPI ? (
                    <div className={styles.kpiCell}>
                      <span
                        className={`${styles.kpiValue} ${mttrClass(row.mttr)}`}
                      >
                        {fmtHrs(row.mttr)}
                      </span>
                    </div>
                  ) : (
                    <span className={styles.emptyCell}>—</span>
                  )}
                </td>

                {/* Critical Spare Parts */}
                <td className={`${styles.td} ${styles.tdParts}`}>
                  {row.critTotal === 0 ? (
                    <span className={styles.emptyCell}>No parts</span>
                  ) : (
                    <div className={styles.partsCell}>
                      <div className={styles.partsTotalRow}>
                        <span className={styles.partsTotalLabel}>Total</span>
                        <span className={styles.partsTotalValue}>
                          {row.critTotal}
                        </span>
                      </div>
                      <div className={styles.partsStackBar}>
                        {row.critNormal > 0 && (
                          <div
                            className={styles.partsSegment}
                            style={{
                              width: `${(row.critNormal / row.critTotal) * 100}%`,
                              backgroundColor: "#10b981",
                            }}
                            title={`Normal: ${row.critNormal}`}
                          />
                        )}
                        {row.critEarlyWarn > 0 && (
                          <div
                            className={styles.partsSegment}
                            style={{
                              width: `${(row.critEarlyWarn / row.critTotal) * 100}%`,
                              backgroundColor: "#f59e0b",
                            }}
                            title={`Early Warning: ${row.critEarlyWarn}`}
                          />
                        )}
                        {row.critDegrading > 0 && (
                          <div
                            className={styles.partsSegment}
                            style={{
                              width: `${(row.critDegrading / row.critTotal) * 100}%`,
                              backgroundColor: "#f97316",
                            }}
                            title={`Degrading: ${row.critDegrading}`}
                          />
                        )}
                        {row.critTrigger > 0 && (
                          <div
                            className={styles.partsSegment}
                            style={{
                              width: `${(row.critTrigger / row.critTotal) * 100}%`,
                              backgroundColor: "#ef4444",
                            }}
                            title={`Trigger: ${row.critTrigger}`}
                          />
                        )}
                      </div>
                      <div className={styles.partsBreakdown}>
                        <ConditionChip
                          label="OK"
                          count={row.critNormal}
                          color="#10b981"
                        />
                        <ConditionChip
                          label="EW"
                          count={row.critEarlyWarn}
                          color="#f59e0b"
                        />
                        <ConditionChip
                          label="DG"
                          count={row.critDegrading}
                          color="#f97316"
                        />
                        <ConditionChip
                          label="MT"
                          count={row.critTrigger}
                          color="#ef4444"
                        />
                      </div>
                    </div>
                  )}
                </td>

                {/* Consumables */}
                <td className={`${styles.td} ${styles.tdCons}`}>
                  {row.consTotal === 0 ? (
                    <span className={styles.emptyCell}>No data</span>
                  ) : (
                    <div className={styles.partsCell}>
                      <div className={styles.partsTotalRow}>
                        <span className={styles.partsTotalLabel}>Total</span>
                        <span className={styles.partsTotalValue}>
                          {row.consTotal}
                        </span>
                      </div>
                      <div className={styles.partsStackBar}>
                        {row.consGood > 0 && (
                          <div
                            className={styles.partsSegment}
                            style={{
                              width: `${(row.consGood / row.consTotal) * 100}%`,
                              backgroundColor: "#10b981",
                            }}
                            title={`Sufficient: ${row.consGood}`}
                          />
                        )}
                        {row.consWarn > 0 && (
                          <div
                            className={styles.partsSegment}
                            style={{
                              width: `${(row.consWarn / row.consTotal) * 100}%`,
                              backgroundColor: "#f59e0b",
                            }}
                            title={`Near ROP: ${row.consWarn}`}
                          />
                        )}
                        {row.consBad > 0 && (
                          <div
                            className={styles.partsSegment}
                            style={{
                              width: `${(row.consBad / row.consTotal) * 100}%`,
                              backgroundColor: "#ef4444",
                            }}
                            title={`Reorder: ${row.consBad}`}
                          />
                        )}
                      </div>
                      <div className={styles.partsBreakdown}>
                        <ConditionChip
                          label="OK"
                          count={row.consGood}
                          color="#10b981"
                        />
                        <ConditionChip
                          label="NR"
                          count={row.consWarn}
                          color="#f59e0b"
                        />
                        <ConditionChip
                          label="RO"
                          count={row.consBad}
                          color="#ef4444"
                        />
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Legend —</span>
        <div className={styles.legendGroup}>
          <span className={styles.legendGroupLabel}>Critical Parts:</span>
          <LegendItem color="#10b981" label="OK = Normal" />
          <LegendItem color="#f59e0b" label="EW = Early Warning" />
          <LegendItem color="#f97316" label="DG = Degrading" />
          <LegendItem color="#ef4444" label="MT = Maintenance Trigger" />
        </div>
        <div className={styles.legendDivider} />
        <div className={styles.legendGroup}>
          <span className={styles.legendGroupLabel}>Consumables:</span>
          <LegendItem color="#10b981" label="OK = Sufficient" />
          <LegendItem color="#f59e0b" label="NR = Near ROP" />
          <LegendItem color="#ef4444" label="RO = Reorder Now" />
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConditionChip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className={styles.condChip}
      style={{ opacity: count === 0 ? 0.35 : 1 }}
    >
      <span className={styles.condDot} style={{ backgroundColor: color }} />
      <span className={styles.condLabel}>{label}</span>
      <span
        className={styles.condCount}
        style={{ color: count > 0 ? color : "#7a9e84" }}
      >
        {count}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendDot} style={{ backgroundColor: color }} />
      <span className={styles.legendLabel}>{label}</span>
    </div>
  );
}
