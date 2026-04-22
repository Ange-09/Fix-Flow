"use client";

import { getMachineById, DEFAULT_MACHINE_ID, type Machine, type StatusLevel } from "@/app/lib/machineData";
import { useAppContext } from "@/app/context/AppContext";
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
}: {
  value: number;
  max?: number;
  colorClass?: string;
}) {
  const pct = Math.min((value / max) * 100, 100).toFixed(1);
  return (
    <div className={styles.miniBarTrack}>
      <div
        className={`${styles.miniBarFill} ${colorClass ?? ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Colour helpers ───────────────────────────────────────────────────────────

function getCriticalityColor(score: number): string {
  if (score >= 9) return "#ef4444";
  if (score >= 7) return "#f97316";
  if (score >= 5) return "#f59e0b";
  return "#10b981";
}

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
  const { criticality, maintenance, oee, reliability, pfCurve, kpi, spareParts } = machine;

  // ── Pull live KPI values from context ──
  const { kpiOutputs } = useAppContext();

  const hasLiveKPI = kpiOutputs.oeeScore !== null;

  // Resolved display values — live context wins, static data is the fallback
  const liveOEE          = kpiOutputs.oeeScore     !== null ? kpiOutputs.oeeScore * 100     : oee.oee;
  const liveAvailability = kpiOutputs.availability !== null ? kpiOutputs.availability * 100 : oee.availability;
  const livePerformance  = kpiOutputs.performance  !== null ? kpiOutputs.performance * 100  : oee.performance;
  const liveQuality      = kpiOutputs.quality      !== null ? kpiOutputs.quality * 100      : oee.quality;
  const liveMTBF         = kpiOutputs.mtbf         !== null ? kpiOutputs.mtbf               : reliability.mtbf;
  const liveMTTR         = kpiOutputs.mttr         !== null ? kpiOutputs.mttr               : reliability.mttr;

  // Criticality visuals
  const critColor     = getCriticalityColor(criticality.score);
  const scoreBarWidth = `${(criticality.score / 10) * 100}%`;

  // MTBF/MTTR statuses (computed from live values)
  const mtbfStatus: StatusLevel = liveMTBF >= 300 ? "good" : liveMTBF >= 150 ? "warn" : "bad";
  const mttrStatus: StatusLevel = liveMTTR <= 4   ? "good" : liveMTTR <= 8   ? "warn" : "bad";

  // Recompute failure rate from live MTBF so it stays consistent
  const liveFailureRate       = liveMTBF > 0 ? 1 / liveMTBF : reliability.failureRate;
  const liveAvailabilityIndex = liveMTBF + liveMTTR > 0
    ? (liveMTBF / (liveMTBF + liveMTTR)) * 100
    : reliability.availabilityIndex;
  const availIndexStatus: StatusLevel =
    liveAvailabilityIndex >= 98 ? "good" : liveAvailabilityIndex >= 95 ? "warn" : "bad";

  return (
    <section className={styles.dashboardSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Dashboard Overview</h2>
        <div className={styles.sectionHeaderRight}>
          {hasLiveKPI && (
            <span className={styles.liveKpiTag}>KPI inputs active</span>
          )}
          <span className={styles.liveTag}>● Live</span>
        </div>
      </div>

      <div className={styles.grid}>

        {/* ── Column 1 — Criticality + Maintenance ──────────────── */}
        <div className={styles.col}>

          <DashboardCard title="Criticality Score" subtitle="AHP Assessment" accent={critColor}>
            <div className={styles.scoreDisplay}>
              <span className={styles.scoreBig} style={{ color: critColor }}>
                {criticality.score.toFixed(1)}
              </span>
              <span className={styles.scoreMax}>/10</span>
            </div>
            <div className={styles.scoreBar}>
              <div
                className={styles.scoreBarFill}
                style={{ width: scoreBarWidth, backgroundColor: critColor }}
              />
            </div>
            <p className={styles.scoreLabel}>
              {criticality.label} — {criticality.recommendation}
            </p>
          </DashboardCard>

          <DashboardCard title="Maintenance Strategy" subtitle="Recommended Action" accent="#1a5c2a">
            <div className={styles.strategyBadge}>{maintenance.strategy}</div>
            <StatRow
              label="Next Inspection"
              value={maintenance.nextInspectionDays === 0 ? "Today" : String(maintenance.nextInspectionDays)}
              unit={maintenance.nextInspectionDays === 0 ? undefined : "days"}
              status={
                maintenance.nextInspectionDays <= 1
                  ? "bad"
                  : maintenance.nextInspectionDays <= 4
                  ? "warn"
                  : undefined
              }
            />
            <StatRow label="Last Serviced" value={String(maintenance.lastServicedDaysAgo)} unit="days ago" />
            <StatRow
              label="Work Orders Open"
              value={String(maintenance.openWorkOrders)}
              status={
                maintenance.openWorkOrders >= 4
                  ? "bad"
                  : maintenance.openWorkOrders >= 2
                  ? "warn"
                  : "good"
              }
            />
          </DashboardCard>

        </div>

        {/* ── Column 2 — OEE + MTBF/MTTR + PF Curve ────────────── */}
        <div className={styles.col}>

          {/* OEE Card */}
          <DashboardCard
            title="OEE"
            subtitle="Overall Equipment Effectiveness"
            accent="#10b981"
            liveTag={hasLiveKPI}
          >
            {/* Big OEE score */}
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

            {/* OEE overall bar */}
            <MiniBar value={liveOEE} colorClass={getOEEStatusClass(liveOEE)} />

            <div className={styles.oeeSubRows}>
              {/* Availability */}
              <div className={styles.oeeSubRow}>
                <div className={styles.oeeSubMeta}>
                  <span className={styles.oeeSubLabel}>Availability</span>
                  <span className={`${styles.oeeSubValue} ${getOEEStatusClass(liveAvailability)}`}>
                    {fmtPct(liveAvailability)}
                  </span>
                </div>
                <MiniBar value={liveAvailability} colorClass={getOEEStatusClass(liveAvailability)} />
              </div>

              {/* Performance */}
              <div className={styles.oeeSubRow}>
                <div className={styles.oeeSubMeta}>
                  <span className={styles.oeeSubLabel}>Performance</span>
                  <span className={`${styles.oeeSubValue} ${getOEEStatusClass(livePerformance)}`}>
                    {fmtPct(livePerformance)}
                  </span>
                </div>
                <MiniBar value={livePerformance} colorClass={getOEEStatusClass(livePerformance)} />
              </div>

              {/* Quality */}
              <div className={styles.oeeSubRow}>
                <div className={styles.oeeSubMeta}>
                  <span className={styles.oeeSubLabel}>Quality</span>
                  <span className={`${styles.oeeSubValue} ${getOEEStatusClass(liveQuality)}`}>
                    {fmtPct(liveQuality)}
                  </span>
                </div>
                <MiniBar value={liveQuality} colorClass={getOEEStatusClass(liveQuality)} />
              </div>
            </div>
          </DashboardCard>

          {/* MTBF / MTTR Card */}
          <DashboardCard
            title="MTBF / MTTR"
            subtitle="Reliability Metrics"
            accent="#0d3d1f"
            liveTag={hasLiveKPI}
          >
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
          </DashboardCard>

        </div>

        {/* ── Column 3 — PF Curve + Spare Parts ──────────────── */}
        <div className={styles.col}>

                   {/* PF Curve Card */}
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