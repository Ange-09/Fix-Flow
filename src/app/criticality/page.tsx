"use client";

import { useState } from "react";
import styles from "./page.module.css";

// ── Constants ────────────────────────────────────────────────────────────────

const FACTORS = ["Cost", "Long Term Reliability", "Uptime", "Utilization of Technology"] as const;
type Factor = (typeof FACTORS)[number];

const SLIDER_STEPS = [-9, -7, -5, -3, 1, 3, 5, 7, 9];

// All unique pairs (i < j)
const PAIRS: [Factor, Factor][] = [];
for (let i = 0; i < FACTORS.length; i++) {
  for (let j = i + 1; j < FACTORS.length; j++) {
    PAIRS.push([FACTORS[i], FACTORS[j]]);
  }
}

// Maintenance strategy types
const STRATEGIES = [
  { id: "predictive", label: "Predictive Maintenance", color: "#0A6EFF", icon: "📡" },
  { id: "preventive", label: "Preventive Maintenance", color: "#10b981", icon: "🔧" },
  { id: "reactive",   label: "Reactive Maintenance",   color: "#f59e0b", icon: "⚠️" },
] as const;

function initComparisons(): Record<string, number> {
  const map: Record<string, number> = {};
  PAIRS.forEach(([a, b]) => { map[`${a}|${b}`] = 1; });
  return map;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

function sliderLabel(value: number): string {
  if (value === 1) return "Equal";
  const abs = Math.abs(value);
  const labels: Record<number, string> = { 3: "Moderate", 5: "Strong", 7: "Very Strong", 9: "Extreme" };
  return labels[abs] ?? String(abs);
}

function importanceDescription(factorA: Factor, factorB: Factor, value: number): string {
  if (value === 1) return `${factorA} and ${factorB} are equally important`;
  if (value > 0) return `${factorA} is ${sliderLabel(value).toLowerCase()} more important than ${factorB}`;
  return `${factorB} is ${sliderLabel(value).toLowerCase()} more important than ${factorA}`;
}

function stepIndex(value: number): number {
  return SLIDER_STEPS.indexOf(value);
}

/**
 * TODO: Replace this stub with your real AHP computation.
 * Receives the pairwise comparison map (key = "FactorA|FactorB", value = saaty scale)
 * and returns scores 0–100 for each strategy id.
 */
function computeAHPScores(_comparisons: Record<string, number>): Record<string, number> {
  return { predictive: 72, preventive: 58, reactive: 31 };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CriticalityPage() {
  const [comparisons, setComparisons] = useState(initComparisons);
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});

  function handleSliderChange(pairKey: string, rawIndex: number) {
    setComparisons((prev) => ({ ...prev, [pairKey]: SLIDER_STEPS[rawIndex] }));
  }

  function handleSubmit() {
    const result = computeAHPScores(comparisons);
    setScores(result);
    setSubmitted(true);
    setTimeout(() => {
      document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleReset() {
    setComparisons(initComparisons());
    setSubmitted(false);
    setScores({});
  }

  const rankedStrategies = submitted
    ? [...STRATEGIES].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    : [];

  const topStrategy = rankedStrategies[0];

  return (
    <div className={styles.page}>
      <main className={styles.main}>

        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <span className={styles.pageTag}>AHP Assessment</span>
            <h1 className={styles.pageTitle}>Machine Criticality Assessment</h1>
            <p className={styles.pageSubtitle}>
              Compare each factor pair to determine which is more important for this machine.
              Move the slider toward a factor to indicate its relative importance.
            </p>
          </div>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Comparisons</span>
            <span className={styles.progressCount}>{PAIRS.length}</span>
          </div>
        </div>

        {/* ── Scale Legend ── */}
        <div className={styles.legendCard}>
          <span className={styles.legendTitle}>Saaty Scale Reference</span>
          <div className={styles.legendItems}>
            {[1, 3, 5, 7, 9].map((v) => (
              <div key={v} className={styles.legendItem}>
                <span className={styles.legendValue}>{v === 1 ? "1" : `±${v}`}</span>
                <span className={styles.legendDesc}>{sliderLabel(v)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pairwise Comparison Cards ── */}
        <div className={styles.comparisonsGrid}>
          {PAIRS.map(([factorA, factorB]) => {
            const key = `${factorA}|${factorB}`;
            const value = comparisons[key];
            const idx = stepIndex(value);
            const isLeft = value > 0;
            const isEqual = value === 1;

            return (
              <div key={key} className={styles.comparisonCard}>
                <div className={styles.factorRow}>
                  <span className={`${styles.factorLabel} ${!isEqual && isLeft ? styles.factorActive : ""}`}>
                    {factorA}
                  </span>
                  <span className={styles.vsTag}>vs</span>
                  <span className={`${styles.factorLabel} ${styles.factorRight} ${!isEqual && !isLeft ? styles.factorActive : ""}`}>
                    {factorB}
                  </span>
                </div>

                <div className={styles.sliderWrapper}>
                  <div className={styles.sliderTrackLabels}>
                    {SLIDER_STEPS.map((step, i) => (
                      <div
                        key={i}
                        className={`${styles.trackMark} ${i === idx ? styles.trackMarkActive : ""}`}
                        style={{
                          backgroundColor: i === idx
                            ? (step > 0 ? "#0A6EFF" : step < 0 ? "#8b5cf6" : "#64748b")
                            : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={SLIDER_STEPS.length - 1}
                    step={1}
                    value={idx}
                    onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                    className={styles.slider}
                  />
                  <div className={styles.sliderStepLabels}>
                    {SLIDER_STEPS.map((step, i) => (
                      <span
                        key={i}
                        className={`${styles.stepLabel} ${i === idx ? styles.stepLabelActive : ""}`}
                      >
                        {Math.abs(step) === 1 ? "=" : Math.abs(step)}
                      </span>
                    ))}
                  </div>
                </div>

                <p className={styles.comparisonDesc}>
                  {importanceDescription(factorA, factorB, value)}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Submit / Reset ── */}
        <div className={styles.actionRow}>
          <button className={styles.resetBtn} onClick={handleReset}>Reset All</button>
          <button className={styles.submitBtn} onClick={handleSubmit}>
            Calculate Maintenance Strategy →
          </button>
        </div>

        {/* ── Results ── */}
        {submitted && (
          <div id="results-section" className={styles.resultsSection}>

            <div className={styles.resultsSectionHeader}>
              <h2 className={styles.resultsTitle}>Assessment Results</h2>
              <p className={styles.resultsSubtitle}>
                Ranked maintenance strategies based on your pairwise comparisons
              </p>
            </div>

            {/* Top recommendation banner */}
            <div
              className={styles.topRecommendation}
              style={{ borderColor: topStrategy.color, backgroundColor: topStrategy.color + "12" }}
            >
              <div className={styles.topRecIcon}>{topStrategy.icon}</div>
              <div className={styles.topRecText}>
                <span className={styles.topRecLabel}>Recommended Strategy</span>
                <span className={styles.topRecName} style={{ color: topStrategy.color }}>
                  {topStrategy.label}
                </span>
              </div>
              <div className={styles.topRecScore} style={{ color: topStrategy.color }}>
                {scores[topStrategy.id].toFixed(1)}
                <span className={styles.topRecScoreUnit}>/100</span>
              </div>
            </div>

            {/* Full ranking */}
            <div className={styles.rankingList}>
              {rankedStrategies.map((strategy, index) => {
                const score = scores[strategy.id] ?? 0;
                const barWidth = `${score}%`;

                return (
                  <div key={strategy.id} className={styles.rankRow}>
                    <span className={styles.rankNumber}>{index + 1}</span>

                    <div className={styles.rankInfo}>
                      <div className={styles.rankHeader}>
                        <span className={styles.rankIcon}>{strategy.icon}</span>
                        <span className={styles.rankName}>{strategy.label}</span>
                        {index === 0 && (
                          <span className={styles.rankBadge} style={{ backgroundColor: strategy.color }}>
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className={styles.rankBarTrack}>
                        <div
                          className={styles.rankBarFill}
                          style={{ width: barWidth, backgroundColor: strategy.color }}
                        />
                      </div>
                    </div>

                    <span className={styles.rankScore} style={{ color: strategy.color }}>
                      {score.toFixed(1)}
                      <span className={styles.rankScoreUnit}>/100</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Comparison summary table */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Factor Comparison Summary</h3>
              <div className={styles.summaryTable}>
                <div className={styles.summaryTableHead}>
                  <span>Factor A</span>
                  <span>Factor B</span>
                  <span>Value</span>
                  <span>Interpretation</span>
                </div>
                {PAIRS.map(([a, b]) => {
                  const v = comparisons[`${a}|${b}`];
                  return (
                    <div key={`${a}|${b}`} className={styles.summaryTableRow}>
                      <span className={styles.summaryFactor}>{a}</span>
                      <span className={styles.summaryFactor}>{b}</span>
                      <span className={styles.summaryValue}>{v > 0 ? `+${v}` : v}</span>
                      <span className={styles.summaryInterp}>
                        {importanceDescription(a, b, v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.recalcRow}>
              <button className={styles.resetBtn} onClick={handleReset}>← Start Over</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
