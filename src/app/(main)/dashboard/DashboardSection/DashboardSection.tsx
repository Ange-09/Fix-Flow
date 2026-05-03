"use client";

import { useRouter } from "next/navigation";
import {
  getMachineById,
  DEFAULT_MACHINE_ID,
  type Machine,
  type StatusLevel,
} from "@/app/lib/machineData";
import { useAppContext, TIME_FRAME_OPTIONS } from "@/app/context/AppContext";
import type { AHPStrategyId } from "@/app/context/AppContext";
import { getConditionStatus, parseDateString } from "@/app/lib/pfCurveUtils";
import {
  getSparePartsByMachine,
  computeROP,
  getStockStatus,
} from "@/app/lib/sparePartsData";
import styles from "./DashboardSection.module.css";
import { useMemo } from "react";

// ─── ID bridge: machineData id → sparePartsData machineId ────────────────────
const MACHINE_ID_MAP: Record<string, string> = {
  "cnc-plasma": "plasma-cutter",
  "cnc-laser": "laser-cutter",
  "cnc-lathe": "lathe-machine",
  "cnc-milling": "milling-machine",
  "cnc-controller": "cnc-controller",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function DashboardCard({
  title,
  subtitle,
  accent,
  children,
  liveTag,
  periodBadge,
  href,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children?: React.ReactNode;
  liveTag?: boolean;
  periodBadge?: string;
  href?: string;
}) {
  const router = useRouter();

  return (
    <div
      className={`${styles.card} ${href ? styles.cardClickable : ""}`}
      onClick={href ? () => router.push(href) : undefined}
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") router.push(href);
            }
          : undefined
      }
    >
      <div className={styles.cardHeader}>
        {accent && (
          <span
            className={styles.cardAccent}
            style={{ backgroundColor: accent }}
          />
        )}
        <div className={styles.cardHeaderText}>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
        </div>
        <div className={styles.cardHeaderRight}>
          {periodBadge && (
            <span className={styles.periodBadge}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {periodBadge}
            </span>
          )}
          {liveTag && <span className={styles.cardLiveTag}>● Live</span>}
          {href && (
            <span className={styles.cardNavArrow}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          )}
        </div>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string;
  unit?: string;
  status?: StatusLevel;
}) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${status ? styles[status] : ""}`}>
        {value}
        {unit && <span className={styles.statUnit}> {unit}</span>}
      </span>
    </div>
  );
}

function MiniBar({
  value,
  max = 100,
  colorClass,
  color,
}: {
  value: number;
  max?: number;
  colorClass?: string;
  color?: string;
}) {
  const pct = Math.min((value / max) * 100, 100).toFixed(1);
  return (
    <div className={styles.miniBarTrack}>
      <div
        className={`${styles.miniBarFill} ${colorClass ?? ""}`}
        style={{
          width: `${pct}%`,
          ...(color ? { backgroundColor: color } : {}),
        }}
      />
    </div>
  );
}

// ── AHP strategy metadata ────────────────────────────────────────────────────

const STRATEGY_META: Record<
  AHPStrategyId,
  { label: string; icon: string; color: string; description: string }
> = {
  predictive: {
    label: "Predictive Maintenance",
    icon: "📡",
    color: "#185FA5",
    description:
      "Monitor condition indicators and intervene before failure occurs.",
  },
  preventive: {
    label: "Preventive Maintenance",
    icon: "🔧",
    color: "#27500A",
    description:
      "Schedule maintenance at fixed intervals to prevent unexpected breakdowns.",
  },
  reactive: {
    label: "Reactive Maintenance",
    icon: "⚠️",
    color: "#854F0B",
    description:
      "Address failures after they occur; suitable for non-critical assets.",
  },
};

// ── Colour helpers ───────────────────────────────────────────────────────────

function getOEEStatusClass(pct: number): string {
  if (pct >= 85) return styles.good;
  if (pct >= 65) return styles.warn;
  return styles.bad;
}

function fmtPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

function fmtHrs(val: number): string {
  return `${val.toFixed(2)} hrs`;
}

// ── Main component ───────────────────────────────────────────────────────────

interface DashboardSectionProps {
  machineId?: string;
}

export default function DashboardSection({ machineId }: DashboardSectionProps) {
  const resolvedId = machineId ?? DEFAULT_MACHINE_ID;

  const {
    allKpiStates,
    allAhpStates,
    allSparePartsStates,
    allCustomSpareParts,
    customMachines,
  } = useAppContext();

  // ── Resolve machine — static OR custom ───────────────────────────────────
  // getMachineById only searches the static list; custom machines won't be
  // found there, so we also check customMachines from context.
  const staticMachine: Machine | undefined = getMachineById(resolvedId);
  const isCustomMachine =
    !staticMachine && customMachines.some((m) => m.id === resolvedId);

  // spareParts only exists on static Machine records
  const spareParts = staticMachine?.spareParts ?? [];

  const kpiState = allKpiStates[resolvedId];
  const ahpState = allAhpStates[resolvedId];
  const liveSparePartsState = allSparePartsStates[resolvedId] ?? {};

  const kpiOutputs = kpiState?.kpiOutputs ?? {
    oeeScore: null,
    availability: null,
    performance: null,
    quality: null,
    mtbf: null,
    mttr: null,
  };
  const ahpOutputs = ahpState?.ahpOutputs ?? {
    submitted: false,
    scores: { predictive: 0, preventive: 0, reactive: 0 },
    critWeights: {
      Cost: 0,
      "Long Term Reliability": 0,
      Uptime: 0,
      "Utilization of Technology": 0,
    },
    localWeights: {
      Cost: [],
      "Long Term Reliability": [],
      Uptime: [],
      "Utilization of Technology": [],
    },
    consistency: { criteria: { lambdaMax: 0, ci: 0, ri: 0, cr: 0 } },
    recommendedStrategy: null,
  };

  // ── Time frame ────────────────────────────────────────────────────────────
  const timeFrame = kpiState?.timeFrame ?? "monthly";
  const tfOption = TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)!;
  const periodLabel = `${tfOption.label} · ${tfOption.description}`;

  const hasLiveKPI = kpiOutputs.oeeScore !== null;
  const hasAHP = ahpOutputs.submitted;

  const liveOEE = (kpiOutputs.oeeScore ?? 0) * 100;
  const liveAvailability = (kpiOutputs.availability ?? 0) * 100;
  const livePerformance = (kpiOutputs.performance ?? 0) * 100;
  const liveQuality = (kpiOutputs.quality ?? 0) * 100;
  const liveMTBF = kpiOutputs.mtbf ?? 0;
  const liveMTTR = kpiOutputs.mttr ?? 0;

  const mtbfStatus: StatusLevel =
    liveMTBF >= 300 ? "good" : liveMTBF >= 150 ? "warn" : "bad";
  const mttrStatus: StatusLevel =
    liveMTTR <= 4 ? "good" : liveMTTR <= 8 ? "warn" : "bad";

  // ── AHP ───────────────────────────────────────────────────────────────────
  const ALL_STRATEGY_IDS: AHPStrategyId[] = [
    "predictive",
    "preventive",
    "reactive",
  ];

  const rankedStrategies = hasAHP
    ? [...ALL_STRATEGY_IDS].sort(
        (a, b) => (ahpOutputs.scores[b] ?? 0) - (ahpOutputs.scores[a] ?? 0),
      )
    : ALL_STRATEGY_IDS;

  const topStrategyId = rankedStrategies[0];
  const topStrategyMeta = STRATEGY_META[topStrategyId];
  const topScore = ahpOutputs.scores[topStrategyId] ?? 0;
  const maxScore = Math.max(
    ...ALL_STRATEGY_IDS.map((id) => ahpOutputs.scores[id] ?? 0),
    1,
  );

  // ── Spare Parts (critical parts condition) ────────────────────────────────
  // Only static machines have pre-defined spare parts records.
  // Custom machines start with zero parts — users add them on the Spare Parts page.
  const allParts = spareParts;
  const totalParts = allParts.length;
  const criticalParts = allParts.filter((p) => p.classification === "Critical");

  let countNormal = 0;
  let countEarlyWarn = 0;
  let countDegrading = 0;
  let countTrigger = 0;

  criticalParts.forEach((p) => {
    const liveState = liveSparePartsState[p.id];
    const pDateStr = liveState?.pDate ?? p.defaultPDate;
    const interval = liveState?.pfInterval ?? p.defaultPFInterval;

    if (!pDateStr || !interval) {
      countNormal++;
      return;
    }
    const pd = parseDateString(pDateStr);
    if (!pd) {
      countNormal++;
      return;
    }

    const cond = getConditionStatus(pd, interval);
    if (cond === "Maintenance Trigger") countTrigger++;
    else if (cond === "Degrading Condition") countDegrading++;
    else if (cond === "Early Warning") countEarlyWarn++;
    else countNormal++;
  });

  // ── Consumables (ROP-based stock status) ──────────────────────────────────
  const sparesMachineId = MACHINE_ID_MAP[resolvedId] ?? resolvedId;

  const consumableRows = useMemo(() => {
    const staticRows = getSparePartsByMachine(sparesMachineId).map((part) => {
      const saved = liveSparePartsState[part.id] ?? {};
      return {
        ...part,
        d: (saved as any).d ?? part.d,
        L: (saved as any).L ?? part.L,
        SS: (saved as any).SS ?? part.SS,
        currentStock: (saved as any).currentStock ?? part.currentStock,
      };
    });

    const customRows = (allCustomSpareParts[sparesMachineId] ?? []).map(
      (p) => ({
        id: p.id,
        d: p.d,
        L: p.L,
        SS: p.SS,
        currentStock: p.currentStock,
      }),
    );

    return [...staticRows, ...customRows];
  }, [sparesMachineId, liveSparePartsState, allCustomSpareParts]);

  const consumableTotal = consumableRows.length;
  let consumableGood = 0;
  let consumableWarn = 0;
  let consumableBad = 0;

  consumableRows.forEach((r) => {
    const rop = computeROP(r.d, r.L, r.SS);
    const s = getStockStatus(r.currentStock, rop);
    if (s === "good") consumableGood++;
    else if (s === "warn") consumableWarn++;
    else consumableBad++;
  });

  // ── Consumable status bar widths ──────────────────────────────────────────
  const consumableTotalSafe = consumableTotal || 1;
  const consumableGoodPct = (consumableGood / consumableTotalSafe) * 100;
  const consumableWarnPct = (consumableWarn / consumableTotalSafe) * 100;
  const consumableBadPct = (consumableBad / consumableTotalSafe) * 100;

  // ── If machine can't be resolved at all, bail early ───────────────────────
  // This guard only fires if somehow an id that belongs to neither list is
  // passed in — e.g. stale id after a custom machine is removed.
  if (!staticMachine && !isCustomMachine) return null;

  return (
    <section className={styles.dashboardSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Dashboard Overview</h2>
        <div className={styles.sectionHeaderRight}>
          {isCustomMachine && (
            <span className={styles.customMachineTag}>Custom Machine</span>
          )}
          {hasLiveKPI && (
            <span className={styles.liveKpiTag}>KPI inputs active</span>
          )}
          {hasAHP && <span className={styles.ahpTag}>AHP computed</span>}
          <span className={styles.liveTag}>● Live</span>
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Column 1 — Recommended Strategy + Strategy Ranking ── */}
        <div className={styles.col}>
          <DashboardCard
            title="Recommended Strategy"
            subtitle="Based on AHP Assessment"
            accent={hasAHP ? topStrategyMeta.color : "#c9d9cc"}
            href="/criticality"
          >
            {hasAHP ? (
              <div
                className={styles.strategyRecommendBanner}
                style={{
                  borderColor: topStrategyMeta.color,
                  backgroundColor: topStrategyMeta.color + "12",
                }}
              >
                <span className={styles.strategyRecommendIcon}>
                  {topStrategyMeta.icon}
                </span>
                <div className={styles.strategyRecommendText}>
                  <span
                    className={styles.strategyRecommendName}
                    style={{ color: topStrategyMeta.color }}
                  >
                    {topStrategyMeta.label}
                  </span>
                  <span className={styles.strategyRecommendDesc}>
                    {topStrategyMeta.description}
                  </span>
                </div>
                <span
                  className={styles.strategyRecommendScore}
                  style={{ color: topStrategyMeta.color }}
                >
                  {topScore.toFixed(1)}
                  <span className={styles.strategyRecommendScoreUnit}>%</span>
                </span>
              </div>
            ) : (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>🔍</span>
                <p className={styles.ahpEmptyText}>
                  No assessment yet. Complete the AHP assessment on the
                  Criticality page to see a recommendation.
                </p>
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Strategy Ranking"
            subtitle="All maintenance strategies scored"
            accent="#4a6b53"
            href="/criticality"
          >
            {hasAHP ? (
              <div className={styles.strategyRankingList}>
                {rankedStrategies.map((id, index) => {
                  const meta = STRATEGY_META[id];
                  const score = ahpOutputs.scores[id] ?? 0;
                  const isTop = index === 0;
                  return (
                    <div
                      key={id}
                      className={`${styles.strategyRankRow} ${isTop ? styles.strategyRankRowTop : ""}`}
                    >
                      <span
                        className={styles.strategyRankNumber}
                        style={{ color: isTop ? meta.color : undefined }}
                      >
                        {index + 1}
                      </span>
                      <div className={styles.strategyRankInfo}>
                        <div className={styles.strategyRankMeta}>
                          <span className={styles.strategyRankIcon}>
                            {meta.icon}
                          </span>
                          <span
                            className={styles.strategyRankName}
                            style={{ color: isTop ? meta.color : undefined }}
                          >
                            {meta.label}
                          </span>
                          {isTop && (
                            <span
                              className={styles.strategyRankBadge}
                              style={{ backgroundColor: meta.color }}
                            >
                              Top
                            </span>
                          )}
                        </div>
                        <MiniBar
                          value={score}
                          max={maxScore}
                          color={meta.color}
                        />
                      </div>
                      <span
                        className={styles.strategyRankScore}
                        style={{ color: meta.color }}
                      >
                        {score.toFixed(1)}
                        <span className={styles.strategyRankScoreUnit}>%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>📊</span>
                <p className={styles.ahpEmptyText}>
                  Scores will appear here once the AHP assessment is submitted.
                </p>
              </div>
            )}
          </DashboardCard>
        </div>

        {/* ── Column 2 — OEE + MTBF/MTTR ── */}
        <div className={styles.col}>
          <DashboardCard
            title="OEE"
            subtitle="Overall Equipment Effectiveness"
            accent="#10b981"
            periodBadge={hasLiveKPI ? periodLabel : undefined}
            href="/kpi"
          >
            {hasLiveKPI ? (
              <>
                <div className={styles.oeeBigRow}>
                  <span
                    className={`${styles.oeeBigValue} ${getOEEStatusClass(liveOEE)}`}
                  >
                    {fmtPct(liveOEE)}
                  </span>
                  <div className={styles.oeeBenchmarks}>
                    <span
                      className={styles.benchmarkChip}
                      style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
                    >
                      65% Acceptable
                    </span>
                    <span
                      className={styles.benchmarkChip}
                      style={{ backgroundColor: "#d1fae5", color: "#065f46" }}
                    >
                      85% World Class
                    </span>
                  </div>
                </div>
                <div className={styles.oeeMainBar}>
                  <MiniBar
                    value={liveOEE}
                    colorClass={getOEEStatusClass(liveOEE)}
                  />
                </div>
                <div className={styles.oeeSubRows}>
                  <div className={styles.oeeSubRow}>
                    <span className={styles.oeeSubLabel}>Availability</span>
                    <span
                      className={`${styles.oeeSubValue} ${getOEEStatusClass(liveAvailability)}`}
                    >
                      {fmtPct(liveAvailability)}
                    </span>
                  </div>
                  <div className={styles.oeeSubRow}>
                    <span className={styles.oeeSubLabel}>Performance</span>
                    <span
                      className={`${styles.oeeSubValue} ${getOEEStatusClass(livePerformance)}`}
                    >
                      {fmtPct(livePerformance)}
                    </span>
                  </div>
                  <div className={styles.oeeSubRow}>
                    <span className={styles.oeeSubLabel}>Quality</span>
                    <span
                      className={`${styles.oeeSubValue} ${getOEEStatusClass(liveQuality)}`}
                    >
                      {fmtPct(liveQuality)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>📈</span>
                <p className={styles.ahpEmptyText}>
                  No KPI data yet. Enter values on the KPI page to see OEE
                  results.
                </p>
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="MTBF / MTTR"
            subtitle="Reliability Metrics"
            accent="#0d3d1f"
            periodBadge={hasLiveKPI ? periodLabel : undefined}
            href="/kpi"
          >
            {hasLiveKPI ? (
              <>
                <StatRow
                  label="Mean Time Between Failures"
                  value={fmtHrs(liveMTBF)}
                  status={mtbfStatus}
                />
                <StatRow
                  label="Mean Time To Repair"
                  value={fmtHrs(liveMTTR)}
                  status={mttrStatus}
                />
              </>
            ) : (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>🔧</span>
                <p className={styles.ahpEmptyText}>
                  No reliability data yet. Enter values on the KPI page to see
                  MTBF &amp; MTTR results.
                </p>
              </div>
            )}
          </DashboardCard>
        </div>

        {/* ── Column 3 — Critical Spare Parts + Consumables ── */}
        <div className={styles.col}>
          <DashboardCard
            title="Critical Spare Parts"
            subtitle="Parts Condition Summary"
            accent="#7a9e84"
            href="/spare-parts"
          >
            {isCustomMachine && totalParts === 0 ? (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>🔩</span>
                <p className={styles.ahpEmptyText}>
                  No spare parts yet. Add parts for this machine on the Spare
                  Parts page.
                </p>
              </div>
            ) : (
              <>
                <StatRow label="Total Parts" value={String(totalParts)} />
                <StatRow
                  label="Critical Parts"
                  value={String(criticalParts.length)}
                />

                <div className={styles.sparePartsDivider} />

                <div className={styles.sparePartsConditionGrid}>
                  <div className={styles.sparePartsConditionItem}>
                    <div className={styles.sparePartsConditionTop}>
                      <span
                        className={styles.sparePartsConditionDot}
                        style={{ backgroundColor: "#10b981" }}
                      />
                      <span className={styles.sparePartsConditionLabel}>
                        Normal
                      </span>
                    </div>
                    <span
                      className={styles.sparePartsConditionCount}
                      style={{ color: "#10b981" }}
                    >
                      {countNormal}
                    </span>
                  </div>

                  <div className={styles.sparePartsConditionItem}>
                    <div className={styles.sparePartsConditionTop}>
                      <span
                        className={styles.sparePartsConditionDot}
                        style={{ backgroundColor: "#f59e0b" }}
                      />
                      <span className={styles.sparePartsConditionLabel}>
                        Early Warning
                      </span>
                    </div>
                    <span
                      className={styles.sparePartsConditionCount}
                      style={{
                        color: countEarlyWarn > 0 ? "#f59e0b" : "#10b981",
                      }}
                    >
                      {countEarlyWarn}
                    </span>
                  </div>

                  <div className={styles.sparePartsConditionItem}>
                    <div className={styles.sparePartsConditionTop}>
                      <span
                        className={styles.sparePartsConditionDot}
                        style={{ backgroundColor: "#f97316" }}
                      />
                      <span className={styles.sparePartsConditionLabel}>
                        Degrading
                      </span>
                    </div>
                    <span
                      className={styles.sparePartsConditionCount}
                      style={{
                        color: countDegrading > 0 ? "#f97316" : "#10b981",
                      }}
                    >
                      {countDegrading}
                    </span>
                  </div>

                  <div className={styles.sparePartsConditionItem}>
                    <div className={styles.sparePartsConditionTop}>
                      <span
                        className={styles.sparePartsConditionDot}
                        style={{ backgroundColor: "#ef4444" }}
                      />
                      <span className={styles.sparePartsConditionLabel}>
                        Trigger
                      </span>
                    </div>
                    <span
                      className={styles.sparePartsConditionCount}
                      style={{
                        color: countTrigger > 0 ? "#ef4444" : "#10b981",
                      }}
                    >
                      {countTrigger}
                    </span>
                  </div>
                </div>
              </>
            )}
          </DashboardCard>

          {/* ── Consumables card ── */}
          <DashboardCard
            title="Consumables"
            subtitle="Inventory Stock Status"
            accent="#1a5c2a"
            href="/consumables"
          >
            {consumableTotal === 0 ? (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>📦</span>
                <p className={styles.ahpEmptyText}>
                  {isCustomMachine
                    ? "No consumables yet. Add parts for this machine on the Consumables page."
                    : "No consumable parts data available for this machine."}
                </p>
              </div>
            ) : (
              <>
                <div className={styles.consumablesTotalRow}>
                  <span className={styles.consumablesTotalLabel}>
                    Total Parts
                  </span>
                  <span className={styles.consumablesTotalValue}>
                    {consumableTotal}
                  </span>
                </div>

                <div className={styles.consumablesStackedBar}>
                  {consumableGood > 0 && (
                    <div
                      className={styles.consumablesStackedSegment}
                      style={{
                        width: `${consumableGoodPct}%`,
                        backgroundColor: "#10b981",
                      }}
                      title={`Sufficient: ${consumableGood}`}
                    />
                  )}
                  {consumableWarn > 0 && (
                    <div
                      className={styles.consumablesStackedSegment}
                      style={{
                        width: `${consumableWarnPct}%`,
                        backgroundColor: "#f59e0b",
                      }}
                      title={`Near ROP: ${consumableWarn}`}
                    />
                  )}
                  {consumableBad > 0 && (
                    <div
                      className={styles.consumablesStackedSegment}
                      style={{
                        width: `${consumableBadPct}%`,
                        backgroundColor: "#ef4444",
                      }}
                      title={`Reorder: ${consumableBad}`}
                    />
                  )}
                </div>

                <div className={styles.consumablesBreakdown}>
                  <div className={styles.consumablesBreakdownRow}>
                    <div className={styles.consumablesBreakdownLeft}>
                      <span
                        className={styles.consumablesDot}
                        style={{ backgroundColor: "#10b981" }}
                      />
                      <span className={styles.consumablesBreakdownLabel}>
                        Sufficient
                      </span>
                    </div>
                    <div className={styles.consumablesBreakdownRight}>
                      <span
                        className={styles.consumablesBreakdownCount}
                        style={{ color: "#059669" }}
                      >
                        {consumableGood}
                      </span>
                      <span className={styles.consumablesBreakdownPct}>
                        {consumableTotal > 0
                          ? Math.round(consumableGoodPct)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>

                  <div className={styles.consumablesBreakdownRow}>
                    <div className={styles.consumablesBreakdownLeft}>
                      <span
                        className={styles.consumablesDot}
                        style={{ backgroundColor: "#f59e0b" }}
                      />
                      <span className={styles.consumablesBreakdownLabel}>
                        Near ROP
                      </span>
                    </div>
                    <div className={styles.consumablesBreakdownRight}>
                      <span
                        className={styles.consumablesBreakdownCount}
                        style={{
                          color: consumableWarn > 0 ? "#d97706" : "#7a9e84",
                        }}
                      >
                        {consumableWarn}
                      </span>
                      <span className={styles.consumablesBreakdownPct}>
                        {consumableTotal > 0
                          ? Math.round(consumableWarnPct)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>

                  <div className={styles.consumablesBreakdownRow}>
                    <div className={styles.consumablesBreakdownLeft}>
                      <span
                        className={styles.consumablesDot}
                        style={{ backgroundColor: "#ef4444" }}
                      />
                      <span className={styles.consumablesBreakdownLabel}>
                        Reorder Now
                      </span>
                    </div>
                    <div className={styles.consumablesBreakdownRight}>
                      <span
                        className={styles.consumablesBreakdownCount}
                        style={{
                          color: consumableBad > 0 ? "#dc2626" : "#7a9e84",
                        }}
                      >
                        {consumableBad}
                      </span>
                      <span className={styles.consumablesBreakdownPct}>
                        {consumableTotal > 0 ? Math.round(consumableBadPct) : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DashboardCard>
        </div>
      </div>
    </section>
  );
}
