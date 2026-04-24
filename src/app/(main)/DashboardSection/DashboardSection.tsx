"use client";

import { getMachineById, DEFAULT_MACHINE_ID, type Machine, type StatusLevel } from "@/app/lib/machineData";
import { useAppContext } from "@/app/context/AppContext";
import type { AHPStrategyId } from "@/app/context/AppContext";
import styles from "./DashboardSection.module.css";

// ── Sub-components ───────────────────────────────────────────────────────────

function DashboardCard({
  title,
  subtitle,
  accent,
  children,
  liveTag,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children?: React.ReactNode;
  liveTag?: boolean;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        {accent && (
          <span className={styles.cardAccent} style={{ backgroundColor: accent }} />
        )}
        <div className={styles.cardHeaderText}>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
        </div>
        {liveTag && <span className={styles.cardLiveTag}>● Live</span>}
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
        style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }}
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
    label:       "Predictive Maintenance",
    icon:        "📡",
    color:       "#185FA5",
    description: "Monitor condition indicators and intervene before failure occurs.",
  },
  preventive: {
    label:       "Preventive Maintenance",
    icon:        "🔧",
    color:       "#27500A",
    description: "Schedule maintenance at fixed intervals to prevent unexpected breakdowns.",
  },
  reactive: {
    label:       "Reactive Maintenance",
    icon:        "⚠️",
    color:       "#854F0B",
    description: "Address failures after they occur; suitable for non-critical assets.",
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
  const machine: Machine = getMachineById(machineId ?? DEFAULT_MACHINE_ID)!;
  const { maintenance, oee, reliability, pfCurve, spareParts } = machine;

  // ── Pull live values from context ──────────────────────────────────────────
  const { kpiOutputs, ahpOutputs } = useAppContext();

  const hasLiveKPI = kpiOutputs.oeeScore !== null;
  const hasAHP     = ahpOutputs.submitted;

  // Resolved display values — live context wins, static data is the fallback
const liveOEE          = (kpiOutputs.oeeScore     ?? 0) * 100;
const liveAvailability = (kpiOutputs.availability ?? 0) * 100;
const livePerformance  = (kpiOutputs.performance  ?? 0) * 100;
const liveQuality      = (kpiOutputs.quality      ?? 0) * 100;
const liveMTBF         = kpiOutputs.mtbf ?? 0;
const liveMTTR         = kpiOutputs.mttr ?? 0;
  // MTBF/MTTR statuses
  const mtbfStatus: StatusLevel = liveMTBF >= 300 ? "good" : liveMTBF >= 150 ? "warn" : "bad";
  const mttrStatus: StatusLevel = liveMTTR <= 4   ? "good" : liveMTTR <= 8   ? "warn" : "bad";

  // ── AHP — ranked strategies ────────────────────────────────────────────────
  const ALL_STRATEGY_IDS: AHPStrategyId[] = ["predictive", "preventive", "reactive"];

  const rankedStrategies = hasAHP
    ? [...ALL_STRATEGY_IDS].sort(
        (a, b) => (ahpOutputs.scores[b] ?? 0) - (ahpOutputs.scores[a] ?? 0)
      )
    : ALL_STRATEGY_IDS;

  const topStrategyId   = rankedStrategies[0];
  const topStrategyMeta = STRATEGY_META[topStrategyId];
  const topScore        = ahpOutputs.scores[topStrategyId] ?? 0;

  // Highest score drives the bar scale so bars are relative to the top score
  const maxScore = Math.max(...ALL_STRATEGY_IDS.map((id) => ahpOutputs.scores[id] ?? 0), 1);

  return (
    <section className={styles.dashboardSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Dashboard Overview</h2>
        <div className={styles.sectionHeaderRight}>
          {hasLiveKPI && (
            <span className={styles.liveKpiTag}>KPI inputs active</span>
          )}
          {hasAHP && (
            <span className={styles.ahpTag}>AHP computed</span>
          )}
          <span className={styles.liveTag}>● Live</span>
        </div>
      </div>

      <div className={styles.grid}>

        {/* ── Column 1 — Recommended Strategy + Strategy Ranking ── */}
        <div className={styles.col}>

          {/* Card 1 — Recommended Maintenance Strategy */}
          <DashboardCard
            title="Recommended Strategy"
            subtitle="Based on AHP Assessment"
            accent={hasAHP ? topStrategyMeta.color : "#c9d9cc"}
          >
            {hasAHP ? (
              <>
                <div
                  className={styles.strategyRecommendBanner}
                  style={{
                    borderColor:     topStrategyMeta.color,
                    backgroundColor: topStrategyMeta.color + "12",
                  }}
                >
                  <span className={styles.strategyRecommendIcon}>{topStrategyMeta.icon}</span>
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
              </>
            ) : (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>🔍</span>
                <p className={styles.ahpEmptyText}>
                  No assessment yet. Complete the AHP assessment on the Criticality page to see a recommendation.
                </p>
              </div>
            )}
          </DashboardCard>

          {/* Card 2 — Strategy Ranking */}
          <DashboardCard
            title="Strategy Ranking"
            subtitle="All maintenance strategies scored"
            accent="#4a6b53"
          >
            {hasAHP ? (
              <div className={styles.strategyRankingList}>
                {rankedStrategies.map((id, index) => {
                  const meta  = STRATEGY_META[id];
                  const score = ahpOutputs.scores[id] ?? 0;
                  const isTop = index === 0;
                  return (
                    <div
                      key={id}
                      className={`${styles.strategyRankRow} ${isTop ? styles.strategyRankRowTop : ""}`}
                    >
                      {/* Rank number */}
                      <span
                        className={styles.strategyRankNumber}
                        style={{ color: isTop ? meta.color : undefined }}
                      >
                        {index + 1}
                      </span>

                      {/* Info + bar */}
                      <div className={styles.strategyRankInfo}>
                        <div className={styles.strategyRankMeta}>
                          <span className={styles.strategyRankIcon}>{meta.icon}</span>
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
                        <MiniBar value={score} max={maxScore} color={meta.color} />
                      </div>

                      {/* Score */}
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

        {/* ── Column 2 — OEE + MTBF/MTTR ───────────────────────── */}
        <div className={styles.col}>

{/* OEE Card */}
<DashboardCard
  title="OEE"
  subtitle="Overall Equipment Effectiveness"
  accent="#10b981"
>
  {hasLiveKPI ? (
    <>
      <div className={styles.oeeBigRow}>
        <span className={`${styles.oeeBigValue} ${getOEEStatusClass(liveOEE)}`}>
          {fmtPct(liveOEE)}
        </span>
        <div className={styles.oeeBenchmarks}>
          <span className={styles.benchmarkChip} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
            65% Acceptable
          </span>
          <span className={styles.benchmarkChip} style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>
            85% World Class
          </span>
        </div>
      </div>

      <div className={styles.oeeMainBar}>
        <MiniBar value={liveOEE} colorClass={getOEEStatusClass(liveOEE)} />
      </div>

      <div className={styles.oeeSubRows}>
        <div className={styles.oeeSubRow}>
          <span className={styles.oeeSubLabel}>Availability</span>
          <span className={`${styles.oeeSubValue} ${getOEEStatusClass(liveAvailability)}`}>
            {fmtPct(liveAvailability)}
          </span>
        </div>
        <div className={styles.oeeSubRow}>
          <span className={styles.oeeSubLabel}>Performance</span>
          <span className={`${styles.oeeSubValue} ${getOEEStatusClass(livePerformance)}`}>
            {fmtPct(livePerformance)}
          </span>
        </div>
        <div className={styles.oeeSubRow}>
          <span className={styles.oeeSubLabel}>Quality</span>
          <span className={`${styles.oeeSubValue} ${getOEEStatusClass(liveQuality)}`}>
            {fmtPct(liveQuality)}
          </span>
        </div>
      </div>
    </>
  ) : (
    <div className={styles.ahpEmptyState}>
      <span className={styles.ahpEmptyIcon}>📈</span>
      <p className={styles.ahpEmptyText}>
        No KPI data yet. Enter values on the KPI page to see OEE results.
      </p>
    </div>
  )}
</DashboardCard>
{/* MTBF / MTTR Card */}
<DashboardCard
  title="MTBF / MTTR"
  subtitle="Reliability Metrics"
  accent="#0d3d1f"
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
        No reliability data yet. Enter values on the KPI page to see MTBF & MTTR results.
      </p>
    </div>
  )}
</DashboardCard>
        </div>

        {/* ── Column 3 — PF Curve + Spare Parts ──────────────── */}
        <div className={styles.col}>

          <DashboardCard title="PF Curve Status" subtitle="Potential-Functional Failure" accent="#f59e0b">
            <StatRow label="P-F Interval" value={String(pfCurve.pfIntervalDays)} unit="days" />
            <StatRow
              label="Time to Functional Failure"
              value={String(pfCurve.timeToFailureDays)}
              unit="days"
              status={
                pfCurve.timeToFailureDays <= 5
                  ? "bad"
                  : pfCurve.timeToFailureDays <= 10
                  ? "warn"
                  : "good"
              }
            />
            <StatRow label="Detection Method" value={pfCurve.detectionMethod} />
            <StatRow
              label="Alert Threshold"
              value={pfCurve.alertThresholdReached ? "Reached" : "Not Reached"}
              status={pfCurve.alertThresholdReached ? "warn" : "good"}
            />
          </DashboardCard>

          <DashboardCard title="Spare Parts" subtitle="Inventory Status" accent="#7a9e84">
            <StatRow label="Total Parts Tracked" value={String(spareParts.totalTracked)} />
            <StatRow
              label="Below Reorder Level"
              value={String(spareParts.belowReorderLevel)}
              status={
                spareParts.belowReorderLevel === 0
                  ? "good"
                  : spareParts.belowReorderLevel <= 4
                  ? "warn"
                  : "bad"
              }
            />
            <StatRow
              label="Critical Parts Out"
              value={String(spareParts.criticalPartsOut)}
              status={spareParts.criticalPartsOut === 0 ? "good" : "bad"}
            />
            <StatRow
              label="Last Replenishment"
              value={String(spareParts.lastReplenishmentDaysAgo)}
              unit="days ago"
            />
          </DashboardCard>

        </div>
      </div>
    </section>
  );
}