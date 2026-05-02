"use client";

import { useEffect } from "react";
import styles from "./page.module.css";
import { useAppContext, TIME_FRAME_OPTIONS, TimeFrame } from "@/app/context/AppContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function formatPercent(val: number | null): string {
  if (val === null) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

function formatHours(val: number | null): string {
  if (val === null) return "—";
  return `${val.toFixed(2)} hrs`;
}

function statusClass(val: number | null, thresholds: { good: number; warn: number }): string {
  if (val === null) return "";
  if (val >= thresholds.good) return styles.good;
  if (val >= thresholds.warn) return styles.warn;
  return styles.bad;
}

function oeeStatus(val: number | null): string {
  if (val === null) return "";
  if (val >= 0.85) return styles.good;
  if (val >= 0.65) return styles.warn;
  return styles.bad;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}

function InputField({ label, unit, value, onChange, placeholder = "0", hint }: InputFieldProps) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>
        {label}
        {unit && <span className={styles.fieldUnit}>{unit}</span>}
      </label>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.fieldInput}
      />
    </div>
  );
}

interface ComputedRowProps {
  label: string;
  formula: string;
  value: string;
  valueClass?: string;
}

function ComputedRow({ label, formula, value, valueClass }: ComputedRowProps) {
  return (
    <div className={styles.computedRow}>
      <div className={styles.computedMeta}>
        <span className={styles.computedLabel}>{label}</span>
        <span className={styles.computedFormula}>{formula}</span>
      </div>
      <span className={`${styles.computedValue} ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function KPIPage() {
  const {
    selectedMachineId,
    oeeInputs,  setOeeInputs,
    mtbfInputs, setMtbfInputs,
    mttrInputs, setMttrInputs,
    setKpiOutputs,
    timeFrame,  setTimeFrame,
  } = useAppContext();

  const selectedOption = TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)!;

  // ── OEE Computed ──
  const runTime        = toNum(oeeInputs.runTime);
  const plannedTime    = toNum(oeeInputs.plannedProductionTime);
  const idealCycleTime = toNum(oeeInputs.idealCycleTime);
  const totalCount     = toNum(oeeInputs.totalCount);
  const goodCount      = toNum(oeeInputs.goodCount);

  const availability = safeDivide(runTime, plannedTime);
  const performance  = safeDivide(idealCycleTime * totalCount, runTime);
  const quality      = safeDivide(goodCount, totalCount);

  const oeeScore =
    availability !== null && performance !== null && quality !== null
      ? availability * performance * quality
      : null;

  // ── MTBF Computed ──
  const totalOpTime = toNum(mtbfInputs.totalOperatingTime);
  const numFailures = toNum(mtbfInputs.numberOfFailures);
  const mtbfValue   = safeDivide(totalOpTime, numFailures);

  // ── MTTR Computed ──
  const totalRepairTime = toNum(mttrInputs.totalRepairTime);
  const numRepairs      = toNum(mttrInputs.numberOfRepairs);
  const mttrValue       = safeDivide(totalRepairTime, numRepairs);

  useEffect(() => {
    setKpiOutputs({
      oeeScore,
      availability,
      performance,
      quality,
      mtbf: mtbfValue,
      mttr: mttrValue,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMachineId,
    oeeScore, availability, performance, quality,
    mtbfValue, mttrValue,
  ]);

  const barWidth = (val: number | null) =>
    val === null ? "0%" : `${Math.min(val * 100, 100).toFixed(1)}%`;

  // ── Time frame hint helper ──
  const tfHint = (base: string) => `${base} (${selectedOption.description})`;

  return (
    <div className={styles.page}>
      <main className={styles.main}>

        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <span className={styles.pageTag}>KPI Dashboard</span>
            <h1 className={styles.pageTitle}>Equipment Performance KPIs</h1>
            <p className={styles.pageSubtitle}>
              Enter the raw measurements for each KPI. Computed values update in real time as you type.
              Each machine stores its own independent values.
            </p>
          </div>
          <div className={styles.headerBadges}>
            <div className={styles.headerBadge}>
              <span className={styles.headerBadgeLabel}>KPIs tracked</span>
              <span className={styles.headerBadgeCount}>3</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            TIME FRAME SELECTOR
        ══════════════════════════════════════════ */}
        <div className={styles.timeFrameCard}>
          <div className={styles.timeFrameIconWrap}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className={styles.timeFrameCardContent}>
            <p className={styles.timeFrameCardTitle}>Reporting Period</p>
            <p className={styles.timeFrameCardSubtitle}>
              Select the time frame that all KPI inputs below are measured over.
            </p>
          </div>
          <div className={styles.timeFrameSelectWrap}>
            <select
              className={styles.timeFrameSelect}
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
            >
              {TIME_FRAME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
            <span className={styles.timeFrameSelectArrow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </div>
        </div>

        {/* ── Active time frame badge (sticky reminder) ── */}
        <div className={styles.timeFrameBadgeRow}>
          <span className={styles.timeFrameActiveBadge}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Reporting period:&nbsp;<strong>{selectedOption.label}</strong>&nbsp;·&nbsp;{selectedOption.description}
          </span>
        </div>

        {/* ══════════════════════════════════════════
            OEE CARD
        ══════════════════════════════════════════ */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <div className={styles.kpiAccent} style={{ backgroundColor: "#1a5c2a" }} />
            <div>
              <h2 className={styles.kpiTitle}>Overall Equipment Effectiveness</h2>
              <p className={styles.kpiSubtitle}>OEE = Availability × Performance × Quality</p>
            </div>
            <div className={`${styles.kpiBigScore} ${oeeStatus(oeeScore)}`}>
              {oeeScore !== null ? `${(oeeScore * 100).toFixed(1)}%` : "—"}
              <span className={styles.kpiBigScoreLabel}>OEE</span>
            </div>
          </div>

          <div className={styles.oeeBarSection}>
            <div className={styles.oeeBarTrack}>
              <div
                className={`${styles.oeeBarFill} ${oeeStatus(oeeScore)}`}
                style={{ width: barWidth(oeeScore) }}
              />
            </div>
            <div className={styles.oeeBarBenchmarks}>
              <span>0%</span>
              <span className={styles.benchmarkWarn}>65% Acceptable</span>
              <span className={styles.benchmarkGood}>85% World class</span>
              <span>100%</span>
            </div>
          </div>

          <div className={styles.kpiBody}>

            {/* ── Availability ── */}
            <div className={styles.kpiSection}>
              <div className={styles.kpiSectionHeader}>
                <span className={styles.kpiSectionTag}>Availability</span>
                <span className={`${styles.kpiSectionResult} ${statusClass(availability, { good: 0.9, warn: 0.75 })}`}>
                  {formatPercent(availability)}
                </span>
              </div>
              <div className={styles.miniBar}>
                <div
                  className={`${styles.miniBarFill} ${statusClass(availability, { good: 0.9, warn: 0.75 })}`}
                  style={{ width: barWidth(availability) }}
                />
              </div>
              <div className={styles.inputsGrid}>
                <InputField
                  label="Run Time"
                  unit="hrs"
                  value={oeeInputs.runTime}
                  onChange={(v) => setOeeInputs({ ...oeeInputs, runTime: v })}
                  hint={tfHint("Actual time the machine was running")}
                />
                <InputField
                  label="Planned Production Time"
                  unit="hrs"
                  value={oeeInputs.plannedProductionTime}
                  onChange={(v) => setOeeInputs({ ...oeeInputs, plannedProductionTime: v })}
                  hint={tfHint("Scheduled time available for production")}
                />
              </div>
              <ComputedRow
                label="Availability"
                formula="Run Time ÷ Planned Production Time"
                value={formatPercent(availability)}
                valueClass={statusClass(availability, { good: 0.9, warn: 0.75 })}
              />
            </div>

            <div className={styles.kpiDivider} />

            {/* ── Performance ── */}
            <div className={styles.kpiSection}>
              <div className={styles.kpiSectionHeader}>
                <span className={styles.kpiSectionTag}>Performance</span>
                <span className={`${styles.kpiSectionResult} ${statusClass(performance, { good: 0.95, warn: 0.8 })}`}>
                  {formatPercent(performance)}
                </span>
              </div>
              <div className={styles.miniBar}>
                <div
                  className={`${styles.miniBarFill} ${statusClass(performance, { good: 0.95, warn: 0.8 })}`}
                  style={{ width: barWidth(performance) }}
                />
              </div>
              <div className={styles.inputsGrid}>
                <InputField
                  label="Ideal Cycle Time"
                  unit="hrs/unit"
                  value={oeeInputs.idealCycleTime}
                  onChange={(v) => setOeeInputs({ ...oeeInputs, idealCycleTime: v })}
                  hint={tfHint("Fastest possible time to produce one unit")}
                />
                <InputField
                  label="Total Count"
                  unit="units"
                  value={oeeInputs.totalCount}
                  onChange={(v) => setOeeInputs({ ...oeeInputs, totalCount: v })}
                  hint={tfHint("Total units produced (good + defective)")}
                />
              </div>
              <ComputedRow
                label="Performance"
                formula="(Ideal Cycle Time × Total Count) ÷ Run Time"
                value={formatPercent(performance)}
                valueClass={statusClass(performance, { good: 0.95, warn: 0.8 })}
              />
            </div>

            <div className={styles.kpiDivider} />

            {/* ── Quality ── */}
            <div className={styles.kpiSection}>
              <div className={styles.kpiSectionHeader}>
                <span className={styles.kpiSectionTag}>Quality</span>
                <span className={`${styles.kpiSectionResult} ${statusClass(quality, { good: 0.99, warn: 0.95 })}`}>
                  {formatPercent(quality)}
                </span>
              </div>
              <div className={styles.miniBar}>
                <div
                  className={`${styles.miniBarFill} ${statusClass(quality, { good: 0.99, warn: 0.95 })}`}
                  style={{ width: barWidth(quality) }}
                />
              </div>
              <div className={styles.inputsGrid}>
                <InputField
                  label="Good Count"
                  unit="units"
                  value={oeeInputs.goodCount}
                  onChange={(v) => setOeeInputs({ ...oeeInputs, goodCount: v })}
                  hint={tfHint("Units that meet quality standards")}
                />
                <InputField
                  label="Total Count"
                  unit="units"
                  value={oeeInputs.totalCount}
                  onChange={(v) => setOeeInputs({ ...oeeInputs, totalCount: v })}
                  hint="Already entered above — shared field"
                />
              </div>
              <ComputedRow
                label="Quality"
                formula="Good Count ÷ Total Count"
                value={formatPercent(quality)}
                valueClass={statusClass(quality, { good: 0.99, warn: 0.95 })}
              />
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════
            MTBF + MTTR SIDE BY SIDE
        ══════════════════════════════════════════ */}
        <div className={styles.twoColGrid}>

          {/* ── MTBF ── */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardHeader}>
              <div className={styles.kpiAccent} style={{ backgroundColor: "#0d3d1f" }} />
              <div>
                <h2 className={styles.kpiTitle}>Mean Time Between Failures</h2>
                <p className={styles.kpiSubtitle}>MTBF = Total Operating Time ÷ Number of Failures</p>
              </div>
              <div className={`${styles.kpiBigScore} ${styles.good}`}>
                {mtbfValue !== null ? formatHours(mtbfValue) : "—"}
                <span className={styles.kpiBigScoreLabel}>MTBF</span>
              </div>
            </div>

            <div className={styles.kpiBody}>
              <div className={styles.kpiSection}>
                <div className={styles.inputsGrid}>
                  <InputField
                    label="Total Operating Time"
                    unit="hrs"
                    value={mtbfInputs.totalOperatingTime}
                    onChange={(v) => setMtbfInputs({ ...mtbfInputs, totalOperatingTime: v })}
                    hint={tfHint("Total uptime in the period")}
                  />
                  <InputField
                    label="Number of Failures"
                    value={mtbfInputs.numberOfFailures}
                    onChange={(v) => setMtbfInputs({ ...mtbfInputs, numberOfFailures: v })}
                    hint={tfHint("Total failure events recorded")}
                  />
                </div>
                <ComputedRow
                  label="MTBF"
                  formula="Total Operating Time ÷ Number of Failures"
                  value={formatHours(mtbfValue)}
                  valueClass={styles.good}
                />
                <div className={styles.kpiNote}>
                  <span className={styles.kpiNoteIcon}>ℹ</span>
                  Higher MTBF indicates greater reliability. Track trends over time to detect degradation.
                </div>
              </div>
            </div>
          </div>

          {/* ── MTTR ── */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardHeader}>
              <div className={styles.kpiAccent} style={{ backgroundColor: "#4a8c5c" }} />
              <div>
                <h2 className={styles.kpiTitle}>Mean Time To Repair</h2>
                <p className={styles.kpiSubtitle}>MTTR = Total Repair Time ÷ Number of Repairs</p>
              </div>
              <div className={`${styles.kpiBigScore} ${styles.warn}`}>
                {mttrValue !== null ? formatHours(mttrValue) : "—"}
                <span className={styles.kpiBigScoreLabel}>MTTR</span>
              </div>
            </div>

            <div className={styles.kpiBody}>
              <div className={styles.kpiSection}>
                <div className={styles.inputsGrid}>
                  <InputField
                    label="Total Repair Time"
                    unit="hrs"
                    value={mttrInputs.totalRepairTime}
                    onChange={(v) => setMttrInputs({ ...mttrInputs, totalRepairTime: v })}
                    hint={tfHint("Sum of all time spent on repairs")}
                  />
                  <InputField
                    label="Number of Repairs"
                    value={mttrInputs.numberOfRepairs}
                    onChange={(v) => setMttrInputs({ ...mttrInputs, numberOfRepairs: v })}
                    hint={tfHint("Total repair events in the period")}
                  />
                </div>
                <ComputedRow
                  label="MTTR"
                  formula="Total Repair Time ÷ Number of Repairs"
                  value={formatHours(mttrValue)}
                  valueClass={styles.warn}
                />
                <div className={styles.kpiNote}>
                  <span className={styles.kpiNoteIcon}>ℹ</span>
                  Lower MTTR indicates faster recovery. Combine with MTBF to assess overall maintainability.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════
            SUMMARY ROW
        ══════════════════════════════════════════ */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>OEE Score</span>
            <span className={`${styles.summaryValue} ${oeeStatus(oeeScore)}`}>
              {oeeScore !== null ? `${(oeeScore * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Availability</span>
            <span className={`${styles.summaryValue} ${statusClass(availability, { good: 0.9, warn: 0.75 })}`}>
              {formatPercent(availability)}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Performance</span>
            <span className={`${styles.summaryValue} ${statusClass(performance, { good: 0.95, warn: 0.8 })}`}>
              {formatPercent(performance)}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Quality</span>
            <span className={`${styles.summaryValue} ${statusClass(quality, { good: 0.99, warn: 0.95 })}`}>
              {formatPercent(quality)}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>MTBF</span>
            <span className={`${styles.summaryValue} ${styles.good}`}>
              {formatHours(mtbfValue)}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>MTTR</span>
            <span className={`${styles.summaryValue} ${styles.warn}`}>
              {formatHours(mttrValue)}
            </span>
          </div>
        </div>

      </main>
    </div>
  );
}