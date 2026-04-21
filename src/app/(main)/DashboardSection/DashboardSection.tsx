import { getMachineById, DEFAULT_MACHINE_ID, type Machine, type StatusLevel } from "@/app/lib/machineData";
import styles from "./DashboardSection.module.css";

// ── Sub-components ───────────────────────────────────────────────────────────

function DashboardCard({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        {accent && (
          <span className={styles.cardAccent} style={{ backgroundColor: accent }} />
        )}
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
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

// ── Criticality colour helper ────────────────────────────────────────────────
function getCriticalityColor(score: number): string {
  if (score >= 9) return "#ef4444";
  if (score >= 7) return "#f97316";
  if (score >= 5) return "#f59e0b";
  return "#10b981";
}

function getOEEColor(value: number): string {
  if (value >= 85) return "#10b981";
  if (value >= 60) return "#f59e0b";
  return "#ef4444";
}

// ── Main component ───────────────────────────────────────────────────────────

interface DashboardSectionProps {
  /** Pass the selected machine id from the parent (or context later). 
   *  Falls back to DEFAULT_MACHINE_ID when not provided. */
  machineId?: string;
}

export default function DashboardSection({ machineId }: DashboardSectionProps) {
  const machine: Machine = getMachineById(machineId ?? DEFAULT_MACHINE_ID)!;

  const { criticality, maintenance, oee, reliability, pfCurve, kpi, spareParts } = machine;

  const critColor = getCriticalityColor(criticality.score);
  const scoreBarWidth = `${(criticality.score / 10) * 100}%`;

  return (
    <section className={styles.dashboardSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Dashboard Overview</h2>
        <span className={styles.liveTag}>● Live</span>
      </div>

      <div className={styles.grid}>

        {/* ── Column 1 — 2 rows ─────────────────────────────── */}
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

          <DashboardCard title="Maintenance Strategy" subtitle="Recommended Action" accent="#0A6EFF">
            <div className={styles.strategyBadge}>{maintenance.strategy}</div>
            <StatRow
              label="Next Inspection"
              value={maintenance.nextInspectionDays === 0 ? "Today" : String(maintenance.nextInspectionDays)}
              unit={maintenance.nextInspectionDays === 0 ? undefined : "days"}
              status={maintenance.nextInspectionDays <= 1 ? "bad" : maintenance.nextInspectionDays <= 4 ? "warn" : undefined}
            />
            <StatRow label="Last Serviced" value={String(maintenance.lastServicedDaysAgo)} unit="days ago" />
            <StatRow
              label="Work Orders Open"
              value={String(maintenance.openWorkOrders)}
              status={maintenance.openWorkOrders >= 4 ? "bad" : maintenance.openWorkOrders >= 2 ? "warn" : "good"}
            />
          </DashboardCard>

        </div>

        {/* ── Column 2 — 3 rows ─────────────────────────────── */}
        <div className={styles.col}>

          <DashboardCard title="OEE" subtitle="Overall Equipment Effectiveness" accent="#10b981">
            <div className={styles.gaugeRow}>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeName}>Availability</span>
                <span className={styles.gaugeValue} style={{ color: getOEEColor(oee.availability) }}>
                  {oee.availability}%
                </span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeName}>Performance</span>
                <span className={styles.gaugeValue} style={{ color: getOEEColor(oee.performance) }}>
                  {oee.performance}%
                </span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeName}>Quality</span>
                <span className={styles.gaugeValue} style={{ color: getOEEColor(oee.quality) }}>
                  {oee.quality}%
                </span>
              </div>
            </div>
            <div className={styles.oeeFinal}>
              <span className={styles.oeeFinalLabel}>OEE</span>
              <span className={styles.oeeFinalValue} style={{ color: getOEEColor(oee.oee) }}>
                {oee.oee.toFixed(1)}%
              </span>
            </div>
          </DashboardCard>

          <DashboardCard title="MTBF / MTTR" subtitle="Reliability Metrics" accent="#6366f1">
            <StatRow
              label="Mean Time Between Failures"
              value={String(reliability.mtbf)}
              unit="hrs"
              status={reliability.mtbf >= 300 ? "good" : reliability.mtbf >= 150 ? "warn" : "bad"}
            />
            <StatRow
              label="Mean Time To Repair"
              value={String(reliability.mttr)}
              unit="hrs"
              status={reliability.mttr <= 4 ? "good" : reliability.mttr <= 8 ? "warn" : "bad"}
            />
            <StatRow label="Failure Rate (λ)" value={reliability.failureRate.toFixed(5)} unit="/hr" />
            <StatRow
              label="Availability Index"
              value={`${reliability.availabilityIndex}%`}
              status={reliability.availabilityIndex >= 98 ? "good" : reliability.availabilityIndex >= 95 ? "warn" : "bad"}
            />
          </DashboardCard>

          <DashboardCard title="PF Curve Status" subtitle="Potential-Functional Failure" accent="#f59e0b">
            <StatRow label="P-F Interval" value={String(pfCurve.pfIntervalDays)} unit="days" />
            <StatRow
              label="Time to Functional Failure"
              value={String(pfCurve.timeToFailureDays)}
              unit="days"
              status={pfCurve.timeToFailureDays <= 5 ? "bad" : pfCurve.timeToFailureDays <= 10 ? "warn" : "good"}
            />
            <StatRow label="Detection Method" value={pfCurve.detectionMethod} />
            <StatRow
              label="Alert Threshold"
              value={pfCurve.alertThresholdReached ? "Reached" : "Not Reached"}
              status={pfCurve.alertThresholdReached ? "warn" : "good"}
            />
          </DashboardCard>

        </div>

        {/* ── Column 3 — 2 rows ─────────────────────────────── */}
        <div className={styles.col}>

          <DashboardCard title="KPI Summary" subtitle="Key Performance Indicators" accent="#8b5cf6">
            <StatRow
              label="Planned Maintenance %"
              value={`${kpi.plannedMaintenancePct}%`}
              status={kpi.plannedMaintenancePct >= 85 ? "good" : kpi.plannedMaintenancePct >= 70 ? "warn" : "bad"}
            />
            <StatRow
              label="Unplanned Downtime"
              value={String(kpi.unplannedDowntimeHrsPerMonth)}
              unit="hrs/mo"
              status={kpi.unplannedDowntimeHrsPerMonth <= 3 ? "good" : kpi.unplannedDowntimeHrsPerMonth <= 6 ? "warn" : "bad"}
            />
            <StatRow
              label="Maintenance Cost"
              value={`₱${kpi.maintenanceCostPerMonth.toLocaleString()}`}
              unit="/mo"
            />
            <StatRow
              label="Schedule Compliance"
              value={`${kpi.scheduleCompliancePct}%`}
              status={kpi.scheduleCompliancePct >= 90 ? "good" : kpi.scheduleCompliancePct >= 75 ? "warn" : "bad"}
            />
          </DashboardCard>

          <DashboardCard title="Spare Parts" subtitle="Inventory Status" accent="#0ea5e9">
            <StatRow label="Total Parts Tracked" value={String(spareParts.totalTracked)} />
            <StatRow
              label="Below Reorder Level"
              value={String(spareParts.belowReorderLevel)}
              status={spareParts.belowReorderLevel === 0 ? "good" : spareParts.belowReorderLevel <= 4 ? "warn" : "bad"}
            />
            <StatRow
              label="Critical Parts Out"
              value={String(spareParts.criticalPartsOut)}
              status={spareParts.criticalPartsOut === 0 ? "good" : "bad"}
            />
            <StatRow label="Last Replenishment" value={String(spareParts.lastReplenishmentDaysAgo)} unit="days ago" />
          </DashboardCard>

        </div>
      </div>
    </section>
  );
}
