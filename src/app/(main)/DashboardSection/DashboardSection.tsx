"use client";

import { getMachineById, DEFAULT_MACHINE_ID, type Machine, type StatusLevel } from "@/app/lib/machineData";
import { useAppContext, TIME_FRAME_OPTIONS } from "@/app/context/AppContext";
import type { AHPStrategyId } from "@/app/context/AppContext";
import { getConditionStatus, parseDateString } from "@/app/lib/pfCurveUtils";
import styles from "./DashboardSection.module.css";

// ── Sub-components ───────────────────────────────────────────────────────────

function DashboardCard({
  title,
  subtitle,
  accent,
  children,
  liveTag,
  periodBadge,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children?: React.ReactNode;
  liveTag?: boolean;
  periodBadge?: string;
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
        <div className={styles.cardHeaderRight}>
          {periodBadge && (
            <span className={styles.periodBadge}>
              {/* Clock icon */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {periodBadge}
            </span>
          )}
          {liveTag && <span className={styles.cardLiveTag}>● Live</span>}
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

// ── PF Curve condition metadata ──────────────────────────────────────────────

const PF_CONDITION_META: Record<string, { label: string; color: string }> = {
  "Normal":              { label: "Normal",              color: "#10b981" },
  "Early Warning":       { label: "Early Warning",       color: "#f59e0b" },
  "Degrading Condition": { label: "Degrading Condition", color: "#f97316" },
  "Maintenance Trigger": { label: "Maintenance Trigger", color: "#ef4444" },
};

// ── Main component ───────────────────────────────────────────────────────────

interface DashboardSectionProps {
  machineId?: string;
}

export default function DashboardSection({ machineId }: DashboardSectionProps) {
  const resolvedId = machineId ?? DEFAULT_MACHINE_ID;
  const machine: Machine = getMachineById(resolvedId)!;
  const { pfCurve, spareParts } = machine;

  const { allKpiStates, allAhpStates, allSparePartsStates } = useAppContext();

  const kpiState = allKpiStates[resolvedId];
  const ahpState = allAhpStates[resolvedId];
  const liveSparePartsState = allSparePartsStates[resolvedId] ?? {};

  const kpiOutputs = kpiState?.kpiOutputs ?? {
    oeeScore: null, availability: null, performance: null,
    quality: null, mtbf: null, mttr: null,
  };
  const ahpOutputs = ahpState?.ahpOutputs ?? {
    submitted: false,
    scores: { predictive: 0, preventive: 0, reactive: 0 },
    critWeights: { "Cost": 0, "Long Term Reliability": 0, "Uptime": 0, "Utilization of Technology": 0 },
    localWeights: { "Cost": [], "Long Term Reliability": [], "Uptime": [], "Utilization of Technology": [] },
    consistency: { criteria: { lambdaMax: 0, ci: 0, ri: 0, cr: 0 } },
    recommendedStrategy: null,
  };

  // ── Time frame ────────────────────────────────────────────────────────────
  // Read the reporting period the user selected on the KPI page for this machine.
  const timeFrame   = kpiState?.timeFrame ?? "monthly";
  const tfOption    = TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)!;
  // Short label shown on KPI cards, e.g. "Monthly · Last 30 days"
  const periodLabel = `${tfOption.label} · ${tfOption.description}`;

  const hasLiveKPI = kpiOutputs.oeeScore !== null;
  const hasAHP     = ahpOutputs.submitted;

  const liveOEE          = (kpiOutputs.oeeScore     ?? 0) * 100;
  const liveAvailability = (kpiOutputs.availability ?? 0) * 100;
  const livePerformance  = (kpiOutputs.performance  ?? 0) * 100;
  const liveQuality      = (kpiOutputs.quality      ?? 0) * 100;
  const liveMTBF         = kpiOutputs.mtbf ?? 0;
  const liveMTTR         = kpiOutputs.mttr ?? 0;

  const mtbfStatus: StatusLevel = liveMTBF >= 300 ? "good" : liveMTBF >= 150 ? "warn" : "bad";
  const mttrStatus: StatusLevel = liveMTTR <= 4   ? "good" : liveMTTR <= 8   ? "warn" : "bad";

  // ── AHP ──────────────────────────────────────────────────────────────────
  const ALL_STRATEGY_IDS: AHPStrategyId[] = ["predictive", "preventive", "reactive"];

  const rankedStrategies = hasAHP
    ? [...ALL_STRATEGY_IDS].sort(
        (a, b) => (ahpOutputs.scores[b] ?? 0) - (ahpOutputs.scores[a] ?? 0)
      )
    : ALL_STRATEGY_IDS;

  const topStrategyId   = rankedStrategies[0];
  const topStrategyMeta = STRATEGY_META[topStrategyId];
  const topScore        = ahpOutputs.scores[topStrategyId] ?? 0;
  const maxScore        = Math.max(...ALL_STRATEGY_IDS.map((id) => ahpOutputs.scores[id] ?? 0), 1);

  // ── PF Curve ──────────────────────────────────────────────────────────────
  const pfInterval  = pfCurve.pfInterval;
  const pDate       = parseDateString(pfCurve.pPointDate);
  const fDate       = parseDateString(pfCurve.fPointDate);
  const today       = new Date();

  const daysToFailure = fDate
    ? Math.max(0, Math.round((fDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const daysElapsed = pDate
    ? Math.max(0, Math.round((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const elapsedPct = pDate && pfInterval > 0
    ? Math.min(1, daysElapsed / pfInterval)
    : 0;

  const pfCondition = pDate ? getConditionStatus(pDate, pfInterval) : "Normal";
  const pfMeta      = PF_CONDITION_META[pfCondition] ?? PF_CONDITION_META["Normal"];

  const daysToFailureStatus: StatusLevel =
    daysToFailure === null ? "good" :
    daysToFailure <= 7     ? "bad"  :
    daysToFailure <= 14    ? "warn" : "good";

  // ── Spare Parts ───────────────────────────────────────────────────────────
  const allParts      = spareParts ?? [];
  const totalParts    = allParts.length;
  const criticalParts = allParts.filter((p) => p.classification === "Critical");

  let countNormal    = 0;
  let countEarlyWarn = 0;
  let countDegrading = 0;
  let countTrigger   = 0;

  criticalParts.forEach((p) => {
    const liveState = liveSparePartsState[p.id];
    const pDateStr  = liveState?.pDate      ?? p.defaultPDate;
    const interval  = liveState?.pfInterval ?? p.defaultPFInterval;

    if (!pDateStr || !interval) { countNormal++; return; }
    const pd = parseDateString(pDateStr);
    if (!pd) { countNormal++; return; }

    const cond = getConditionStatus(pd, interval);
    if      (cond === "Maintenance Trigger") countTrigger++;
    else if (cond === "Degrading Condition") countDegrading++;
    else if (cond === "Early Warning")       countEarlyWarn++;
    else                                     countNormal++;
  });

  return (
    <section className={styles.dashboardSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Dashboard Overview</h2>
        <div className={styles.sectionHeaderRight}>
          {hasLiveKPI && <span className={styles.liveKpiTag}>KPI inputs active</span>}
          {hasAHP     && <span className={styles.ahpTag}>AHP computed</span>}
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
          >
            {hasAHP ? (
              <div
                className={styles.strategyRecommendBanner}
                style={{
                  borderColor:     topStrategyMeta.color,
                  backgroundColor: topStrategyMeta.color + "12",
                }}
              >
                <span className={styles.strategyRecommendIcon}>{topStrategyMeta.icon}</span>
                <div className={styles.strategyRecommendText}>
                  <span className={styles.strategyRecommendName} style={{ color: topStrategyMeta.color }}>
                    {topStrategyMeta.label}
                  </span>
                  <span className={styles.strategyRecommendDesc}>
                    {topStrategyMeta.description}
                  </span>
                </div>
                <span className={styles.strategyRecommendScore} style={{ color: topStrategyMeta.color }}>
                  {topScore.toFixed(1)}
                  <span className={styles.strategyRecommendScoreUnit}>%</span>
                </span>
              </div>
            ) : (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>🔍</span>
                <p className={styles.ahpEmptyText}>
                  No assessment yet. Complete the AHP assessment on the Criticality page to see a recommendation.
                </p>
              </div>
            )}
          </DashboardCard>

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
                      <span className={styles.strategyRankNumber} style={{ color: isTop ? meta.color : undefined }}>
                        {index + 1}
                      </span>
                      <div className={styles.strategyRankInfo}>
                        <div className={styles.strategyRankMeta}>
                          <span className={styles.strategyRankIcon}>{meta.icon}</span>
                          <span className={styles.strategyRankName} style={{ color: isTop ? meta.color : undefined }}>
                            {meta.label}
                          </span>
                          {isTop && (
                            <span className={styles.strategyRankBadge} style={{ backgroundColor: meta.color }}>
                              Top
                            </span>
                          )}
                        </div>
                        <MiniBar value={score} max={maxScore} color={meta.color} />
                      </div>
                      <span className={styles.strategyRankScore} style={{ color: meta.color }}>
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

          <DashboardCard
            title="OEE"
            subtitle="Overall Equipment Effectiveness"
            accent="#10b981"
            periodBadge={hasLiveKPI ? periodLabel : undefined}
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

          <DashboardCard
            title="MTBF / MTTR"
            subtitle="Reliability Metrics"
            accent="#0d3d1f"
            periodBadge={hasLiveKPI ? periodLabel : undefined}
          >
            {hasLiveKPI ? (
              <>
                <StatRow label="Mean Time Between Failures" value={fmtHrs(liveMTBF)} status={mtbfStatus} />
                <StatRow label="Mean Time To Repair"        value={fmtHrs(liveMTTR)} status={mttrStatus} />
              </>
            ) : (
              <div className={styles.ahpEmptyState}>
                <span className={styles.ahpEmptyIcon}>🔧</span>
                <p className={styles.ahpEmptyText}>
                  No reliability data yet. Enter values on the KPI page to see MTBF &amp; MTTR results.
                </p>
              </div>
            )}
          </DashboardCard>

        </div>

        {/* ── Column 3 — PF Curve + Spare Parts ──────────────── */}
        <div className={styles.col}>

          <DashboardCard title="PF Curve Status" subtitle="Potential-Functional Failure" accent="#f59e0b">

            <div className={styles.pfConditionRow}>
              <span
                className={styles.pfConditionBadge}
                style={{
                  backgroundColor: pfMeta.color + "20",
                  color:           pfMeta.color,
                  borderColor:     pfMeta.color + "50",
                }}
              >
                {pfMeta.label}
              </span>
              <span className={styles.pfElapsedPct}>
                {Math.round(elapsedPct * 100)}% elapsed
              </span>
            </div>

            <div className={styles.pfProgressWrapper}>
              <div className={styles.pfProgressTrack}>
                <div
                  className={styles.pfProgressFill}
                  style={{ width: `${Math.round(elapsedPct * 100)}%`, backgroundColor: pfMeta.color }}
                />
                <div className={styles.pfMarker} style={{ left: "60%" }} title="Early Warning (60%)" />
                <div className={styles.pfMarker} style={{ left: "70%" }} title="Degrading (70%)"     />
                <div className={styles.pfMarker} style={{ left: "80%" }} title="Trigger (80%)"       />
              </div>
              <div className={styles.pfMarkerLabels}>
                <span style={{ left: "60%" }}>60%</span>
                <span style={{ left: "70%" }}>70%</span>
                <span style={{ left: "80%" }}>80%</span>
              </div>
            </div>

            <StatRow label="PF Interval"    value={String(pfInterval)} unit="days" />
            <StatRow label="P Point Date"   value={pfCurve.pPointDate} />
            <StatRow label="F Point Date"   value={pfCurve.fPointDate} />
            <StatRow
              label="Days to Failure"
              value={daysToFailure !== null ? String(daysToFailure) : "—"}
              unit={daysToFailure !== null ? "days" : undefined}
              status={daysToFailureStatus}
            />
          </DashboardCard>

          <DashboardCard title="Critical Spare Parts" subtitle="Parts Condition Summary" accent="#7a9e84">

            <StatRow label="Total Parts"    value={String(totalParts)} />
            <StatRow label="Critical Parts" value={String(criticalParts.length)} />

            <div className={styles.sparePartsDivider} />

            <div className={styles.sparePartsConditionGrid}>

              <div className={styles.sparePartsConditionItem}>
                <div className={styles.sparePartsConditionTop}>
                  <span className={styles.sparePartsConditionDot} style={{ backgroundColor: "#10b981" }} />
                  <span className={styles.sparePartsConditionLabel}>Normal</span>
                </div>
                <span className={styles.sparePartsConditionCount} style={{ color: "#10b981" }}>
                  {countNormal}
                </span>
              </div>

              <div className={styles.sparePartsConditionItem}>
                <div className={styles.sparePartsConditionTop}>
                  <span className={styles.sparePartsConditionDot} style={{ backgroundColor: "#f59e0b" }} />
                  <span className={styles.sparePartsConditionLabel}>Early Warning</span>
                </div>
                <span
                  className={styles.sparePartsConditionCount}
                  style={{ color: countEarlyWarn > 0 ? "#f59e0b" : "#10b981" }}
                >
                  {countEarlyWarn}
                </span>
              </div>

              <div className={styles.sparePartsConditionItem}>
                <div className={styles.sparePartsConditionTop}>
                  <span className={styles.sparePartsConditionDot} style={{ backgroundColor: "#f97316" }} />
                  <span className={styles.sparePartsConditionLabel}>Degrading</span>
                </div>
                <span
                  className={styles.sparePartsConditionCount}
                  style={{ color: countDegrading > 0 ? "#f97316" : "#10b981" }}
                >
                  {countDegrading}
                </span>
              </div>

              <div className={styles.sparePartsConditionItem}>
                <div className={styles.sparePartsConditionTop}>
                  <span className={styles.sparePartsConditionDot} style={{ backgroundColor: "#ef4444" }} />
                  <span className={styles.sparePartsConditionLabel}>Trigger</span>
                </div>
                <span
                  className={styles.sparePartsConditionCount}
                  style={{ color: countTrigger > 0 ? "#ef4444" : "#10b981" }}
                >
                  {countTrigger}
                </span>
              </div>

            </div>
          </DashboardCard>

        </div>
      </div>
    </section>
  );
}