import styles from "./DashboardSection.module.css";

// ── Placeholder card sub-component ──────────────────────────────────────────
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
          <span
            className={styles.cardAccent}
            style={{ backgroundColor: accent }}
          />
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

// ── Placeholder stat row ─────────────────────────────────────────────────────
function StatRow({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string;
  unit?: string;
  status?: "good" | "warn" | "bad";
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

// ── Main component ───────────────────────────────────────────────────────────
export default function DashboardSection() {
  return (
    <section className={styles.dashboardSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Dashboard Overview</h2>
        <span className={styles.liveTag}>● Live</span>
      </div>

      <div className={styles.grid}>
        {/* ── Column 1 — 2 rows ─────────────────────────────── */}
        <div className={styles.col}>
          <DashboardCard
            title="Criticality Score"
            subtitle="AHP Assessment"
            accent="#ef4444"
          >
            <div className={styles.scoreDisplay}>
              <span className={styles.scoreBig}>8.4</span>
              <span className={styles.scoreMax}>/10</span>
            </div>
            <div className={styles.scoreBar}>
              <div
                className={styles.scoreBarFill}
                style={{ width: "84%", backgroundColor: "#ef4444" }}
              />
            </div>
            <p className={styles.scoreLabel}>High Criticality — Proactive maintenance recommended</p>
          </DashboardCard>

          <DashboardCard
            title="Maintenance Strategy"
            subtitle="Recommended Action"
            accent="#0A6EFF"
          >
            <div className={styles.strategyBadge}>Predictive</div>
            <StatRow label="Next Inspection" value="3" unit="days" status="warn" />
            <StatRow label="Last Serviced" value="12" unit="days ago" />
            <StatRow label="Work Orders Open" value="2" status="warn" />
          </DashboardCard>
        </div>

        {/* ── Column 2 — 3 rows ─────────────────────────────── */}
        <div className={styles.col}>
          <DashboardCard title="OEE" subtitle="Overall Equipment Effectiveness" accent="#10b981">
            <div className={styles.gaugeRow}>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeName}>Availability</span>
                <span className={styles.gaugeValue} style={{ color: "#10b981" }}>92%</span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeName}>Performance</span>
                <span className={styles.gaugeValue} style={{ color: "#f59e0b" }}>78%</span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeName}>Quality</span>
                <span className={styles.gaugeValue} style={{ color: "#10b981" }}>95%</span>
              </div>
            </div>
            <div className={styles.oeeFinal}>
              <span className={styles.oeeFinalLabel}>OEE</span>
              <span className={styles.oeeFinalValue}>68.1%</span>
            </div>
          </DashboardCard>

          <DashboardCard title="MTBF / MTTR" subtitle="Reliability Metrics" accent="#6366f1">
            <StatRow label="Mean Time Between Failures" value="312" unit="hrs" status="good" />
            <StatRow label="Mean Time To Repair" value="4.2" unit="hrs" status="good" />
            <StatRow label="Failure Rate (λ)" value="0.0032" unit="/hr" />
            <StatRow label="Availability Index" value="98.7%" status="good" />
          </DashboardCard>

          <DashboardCard title="PF Curve Status" subtitle="Potential-Functional Failure" accent="#f59e0b">
            <StatRow label="P-F Interval" value="21" unit="days" />
            <StatRow label="Time to Functional Failure" value="9" unit="days" status="warn" />
            <StatRow label="Detection Method" value="Vibration" />
            <StatRow label="Alert Threshold" value="Reached" status="warn" />
          </DashboardCard>
        </div>

        {/* ── Column 3 — 2 rows ─────────────────────────────── */}
        <div className={styles.col}>
          <DashboardCard title="KPI Summary" subtitle="Key Performance Indicators" accent="#8b5cf6">
            <StatRow label="Planned Maintenance %" value="87%" status="good" />
            <StatRow label="Unplanned Downtime" value="4.3" unit="hrs/mo" status="warn" />
            <StatRow label="Maintenance Cost" value="₱18,400" unit="/mo" />
            <StatRow label="Schedule Compliance" value="91%" status="good" />
          </DashboardCard>

          <DashboardCard title="Spare Parts" subtitle="Inventory Status" accent="#0ea5e9">
            <StatRow label="Total Parts Tracked" value="48" />
            <StatRow label="Below Reorder Level" value="5" status="warn" />
            <StatRow label="Critical Parts Out" value="1" status="bad" />
            <StatRow label="Last Replenishment" value="6" unit="days ago" />
          </DashboardCard>
        </div>
      </div>
    </section>
  );
}
