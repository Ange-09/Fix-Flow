"use client";

import { useState } from "react";
import styles from "./page.module.css";

// ── Constants ────────────────────────────────────────────────────────────────

const FACTORS = [
  "Cost",
  "Long Term Reliability",
  "Uptime",
  "Utilization of Technology",
] as const;
type Factor = (typeof FACTORS)[number];

const STRATEGIES = [
  { id: "predictive", label: "Predictive Maintenance", color: "#185FA5", icon: "📡" },
  { id: "preventive", label: "Preventive Maintenance", color: "#27500A", icon: "🔧" },
  { id: "reactive",   label: "Reactive Maintenance",   color: "#854F0B", icon: "⚠️" },
] as const;
type StrategyId = (typeof STRATEGIES)[number]["id"];

// Equal (1) removed — users must pick a dominant side
const SLIDER_STEPS = [-9, -7, -5, -3, 3, 5, 7, 9];

// Default to -3 (left factor has moderate importance) — never neutral
const DEFAULT_COMPARISON_VALUE = -3;

// All unique pairs (i < j)
function makePairs<T extends string>(items: readonly T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      pairs.push([items[i], items[j]]);
  return pairs;
}

const FACTOR_PAIRS = makePairs(FACTORS);
const STRAT_LABELS = STRATEGIES.map((s) => s.label) as [string, string, string];
const STRAT_PAIRS  = makePairs(STRAT_LABELS);

// ── State initializers ───────────────────────────────────────────────────────

function initCritComparisons(): Record<string, number> {
  const map: Record<string, number> = {};
  FACTOR_PAIRS.forEach(([a, b]) => { map[`${a}|${b}`] = DEFAULT_COMPARISON_VALUE; });
  return map;
}

function initAltComparisons(): Record<Factor, Record<string, number>> {
  const result = {} as Record<Factor, Record<string, number>>;
  FACTORS.forEach((factor) => {
    result[factor] = {};
    STRAT_PAIRS.forEach(([a, b]) => { result[factor][`${a}|${b}`] = DEFAULT_COMPARISON_VALUE; });
  });
  return result;
}

// ── AHP Math ─────────────────────────────────────────────────────────────────

/**
 * Converts a pairwise comparison map (key = "A|B", value = Saaty integer)
 * into a full n×n ratio matrix.
 *
 * Sign convention (matches the slider UX):
 *   value < 0 (e.g. -5)  → A dominates B  → ratio = |value|
 *   value > 0 (e.g.  5)  → B dominates A  → ratio = 1 / value
 *   (value === 1 / equal is no longer possible)
 */
function buildMatrix(labels: readonly string[], map: Record<string, number>): number[][] {
  const n = labels.length;
  const M: number[][] = Array.from({ length: n }, () => Array(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = map[`${labels[i]}|${labels[j]}`] ?? DEFAULT_COMPARISON_VALUE;
      const ratio = v < 0 ? Math.abs(v) : 1 / v;
      M[i][j] = ratio;
      M[j][i] = 1 / ratio;
    }
  }
  return M;
}

/**
 * Derives priority weights from a pairwise matrix using the
 * normalized column sum (eigenvector approximation).
 */
function deriveWeights(M: number[][]): number[] {
  const n = M.length;
  const colSums = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      colSums[j] += M[i][j];

  const normalized = M.map((row) => row.map((v, j) => v / colSums[j]));
  return normalized.map((row) => row.reduce((sum, v) => sum + v, 0) / n);
}

/**
 * Full two-level AHP:
 *   1. Derive criteria weights from factor pairwise comparisons.
 *   2. For each factor, derive local strategy weights from alternative comparisons.
 *   3. Global score = sum over factors of (criteria_weight × local_strategy_weight).
 */
function computeAHP(
  critComparisons: Record<string, number>,
  altComparisons:  Record<Factor, Record<string, number>>
): Record<StrategyId, number> {
  const critWeights  = deriveWeights(buildMatrix(FACTORS, critComparisons));
  const globalScores = STRATEGIES.map(() => 0);

  FACTORS.forEach((factor, fi) => {
    const localWeights = deriveWeights(
      buildMatrix(STRAT_LABELS, altComparisons[factor])
    );
    localWeights.forEach((w, si) => {
      globalScores[si] += critWeights[fi] * w;
    });
  });

  const result = {} as Record<StrategyId, number>;
  STRATEGIES.forEach((s, i) => {
    result[s.id] = globalScores[i] * 100;
  });
  return result;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

function sliderLabel(value: number): string {
  const abs = Math.abs(value);
  const labels: Record<number, string> = {
    3: "Moderate Importance",
    5: "Strong Importance",
    7: "Very Strong Importance",
    9: "Extreme Importance",
  };
  return labels[abs] ?? String(abs);
}

function importanceDescription(a: string, b: string, value: number): string {
  if (value < 0) return `${a} has ${sliderLabel(value).toLowerCase()} over ${b}`;
  return `${b} has ${sliderLabel(value).toLowerCase()} over ${a}`;
}

function stepIndex(value: number): number {
  return SLIDER_STEPS.indexOf(value);
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ComparisonCardProps {
  labelA: string;
  labelB: string;
  value: number;
  onChange: (newValue: number) => void;
}

function ComparisonCard({ labelA, labelB, value, onChange }: ComparisonCardProps) {
  const idx    = stepIndex(value);
  const isLeft = value < 0;

  return (
    <div className={styles.comparisonCard}>
      <div className={styles.factorRow}>
        <span className={`${styles.factorLabel} ${isLeft ? styles.factorActive : ""}`}>
          {labelA}
        </span>
        <span className={styles.vsTag}>vs</span>
        <span className={`${styles.factorLabel} ${styles.factorRight} ${!isLeft ? styles.factorActive : ""}`}>
          {labelB}
        </span>
      </div>

      <div className={styles.sliderWrapper}>
        <div className={styles.sliderTrackLabels}>
          {SLIDER_STEPS.map((step, i) => (
            <div
              key={i}
              className={`${styles.trackMark} ${i === idx ? styles.trackMarkActive : ""}`}
              style={{
                backgroundColor:
                  i === idx
                    ? step < 0 ? "#4a8c5c" : "#1a5c2a"
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
          onChange={(e) => onChange(SLIDER_STEPS[Number(e.target.value)])}
          className={styles.slider}
        />

        <div className={styles.sliderStepLabels}>
          {SLIDER_STEPS.map((step, i) => (
            <span
              key={i}
              className={`${styles.stepLabel} ${i === idx ? styles.stepLabelActive : ""}`}
            >
              {Math.abs(step)}
            </span>
          ))}
        </div>
      </div>

      {/* Direction indicator */}


      <p className={styles.comparisonDesc}>
        {importanceDescription(labelA, labelB, value)}
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CriticalityPage() {
  const [critComparisons, setCritComparisons] = useState(initCritComparisons);
  const [altComparisons,  setAltComparisons]  = useState(initAltComparisons);
  const [submitted,  setSubmitted]  = useState(false);
  const [scores,     setScores]     = useState<Record<StrategyId, number>>({} as Record<StrategyId, number>);
  const [critWeights, setCritWeights] = useState<number[]>([]);

  // ── Handlers ──

  function handleCritChange(key: string, value: number) {
    setCritComparisons((prev) => ({ ...prev, [key]: value }));
  }

  function handleAltChange(factor: Factor, key: string, value: number) {
    setAltComparisons((prev) => ({
      ...prev,
      [factor]: { ...prev[factor], [key]: value },
    }));
  }

  function handleSubmit() {
    const result = computeAHP(critComparisons, altComparisons);
    setScores(result);
    const cw = deriveWeights(buildMatrix(FACTORS, critComparisons));
    setCritWeights(cw);
    setSubmitted(true);
    setTimeout(() => {
      document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleReset() {
    setCritComparisons(initCritComparisons());
    setAltComparisons(initAltComparisons());
    setSubmitted(false);
    setScores({} as Record<StrategyId, number>);
    setCritWeights([]);
  }

  const rankedStrategies = submitted
    ? [...STRATEGIES].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    : [];

  const topStrategy = rankedStrategies[0];

  // ── Render ──

  return (
    <div className={styles.page}>
      <main className={styles.main}>

        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <span className={styles.pageTag}>AHP Assessment</span>
            <h1 className={styles.pageTitle}>Machine Criticality Assessment</h1>
            <p className={styles.pageSubtitle}>
              Complete two steps: first compare the four criteria against each other,
              then for each criterion, compare the three maintenance strategies.
              Every comparison requires a clear choice — no equal ratings allowed.
            </p>
          </div>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Total comparisons</span>
            <span className={styles.progressCount}>
              {FACTOR_PAIRS.length + FACTORS.length * STRAT_PAIRS.length}
            </span>
          </div>
        </div>

        {/* ── Scale Legend ── */}
        <div className={styles.legendCard}>
          <span className={styles.legendTitle}>Saaty Scale Reference</span>
          <div className={styles.legendItems}>
            {[3, 5, 7, 9].map((v) => (
              <div key={v} className={styles.legendItem}>
                <span className={styles.legendValue}>±{v}</span>
                <span className={styles.legendDesc}>{sliderLabel(v)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            STEP 1 — Criteria pairwise comparisons
        ══════════════════════════════════════════ */}
        <div className={styles.stepSection}>
          <div className={styles.stepHeader}>
            <span className={styles.stepPill}>Step 1</span>
            <div>
              <h2 className={styles.stepTitle}>Criteria Importance</h2>
              <p className={styles.stepSubtitle}>
                Compare each pair of factors to establish their relative weights.
                Slide left to favour the first factor, right to favour the second.
              </p>
            </div>
          </div>

          <div className={styles.comparisonsGrid}>
            {FACTOR_PAIRS.map(([a, b]) => {
              const key = `${a}|${b}`;
              return (
                <ComparisonCard
                  key={key}
                  labelA={a}
                  labelB={b}
                  value={critComparisons[key]}
                  onChange={(v) => handleCritChange(key, v)}
                />
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            STEP 2 — Alternative comparisons per factor
        ══════════════════════════════════════════ */}
        <div className={styles.stepSection}>
          <div className={styles.stepHeader}>
            <span className={`${styles.stepPill} ${styles.stepPillGreen}`}>Step 2</span>
            <div>
              <h2 className={styles.stepTitle}>Maintenance Strategies per Criterion</h2>
              <p className={styles.stepSubtitle}>
                For each criterion, compare how well each maintenance strategy satisfies it.
                Slide left to favour the first strategy, right to favour the second.
              </p>
            </div>
          </div>

          {FACTORS.map((factor) => (
            <div key={factor} className={styles.altGroup}>
              <div className={styles.altGroupHeader}>
                <span className={styles.altGroupLabel}>{factor}</span>
                <span className={styles.altGroupSub}>
                  Compare maintenance strategies under this criterion
                </span>
              </div>

              <div className={styles.comparisonsGrid}>
                {STRAT_PAIRS.map(([a, b]) => {
                  const key = `${a}|${b}`;
                  return (
                    <ComparisonCard
                      key={`${factor}|${key}`}
                      labelA={a}
                      labelB={b}
                      value={altComparisons[factor][key]}
                      onChange={(v) => handleAltChange(factor, key, v)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Submit / Reset ── */}
        <div className={styles.actionRow}>
          <button className={styles.resetBtn} onClick={handleReset}>
            Reset All
          </button>
          <button className={styles.submitBtn} onClick={handleSubmit}>
            Calculate Maintenance Strategy →
          </button>
        </div>

        {/* ══════════════════════════════════════════
            RESULTS
        ══════════════════════════════════════════ */}
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
              style={{
                borderColor: topStrategy.color,
                backgroundColor: topStrategy.color + "12",
              }}
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
                <span className={styles.topRecScoreUnit}>%</span>
              </div>
            </div>

            {/* Full ranking */}
            <div className={styles.rankingList}>
              {rankedStrategies.map((strategy, index) => {
                const score = scores[strategy.id] ?? 0;
                return (
                  <div key={strategy.id} className={styles.rankRow}>
                    <span className={styles.rankNumber}>{index + 1}</span>

                    <div className={styles.rankInfo}>
                      <div className={styles.rankHeader}>
                        <span className={styles.rankIcon}>{strategy.icon}</span>
                        <span className={styles.rankName}>{strategy.label}</span>
                        {index === 0 && (
                          <span
                            className={styles.rankBadge}
                            style={{ backgroundColor: strategy.color }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className={styles.rankBarTrack}>
                        <div
                          className={styles.rankBarFill}
                          style={{ width: `${score}%`, backgroundColor: strategy.color }}
                        />
                      </div>
                    </div>

                    <span className={styles.rankScore} style={{ color: strategy.color }}>
                      {score.toFixed(1)}
                      <span className={styles.rankScoreUnit}>%</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Criteria weights summary */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Criteria Weights</h3>
              <div className={styles.weightsGrid}>
                {FACTORS.map((factor, i) => (
                  <div key={factor} className={styles.weightItem}>
                    <span className={styles.weightValue}>
                      {((critWeights[i] ?? 0) * 100).toFixed(1)}%
                    </span>
                    <span className={styles.weightLabel}>{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Criteria comparison summary table */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Criteria Comparison Summary</h3>
              <div className={styles.summaryTable}>
                <div className={styles.summaryTableHead}>
                  <span>Factor A</span>
                  <span>Factor B</span>
                  <span>Value</span>
                  <span>Interpretation</span>
                </div>
                {FACTOR_PAIRS.map(([a, b]) => {
                  const v = critComparisons[`${a}|${b}`];
                  return (
                    <div key={`${a}|${b}`} className={styles.summaryTableRow}>
                      <span className={styles.summaryFactor}>{a}</span>
                      <span className={styles.summaryFactor}>{b}</span>
                      <span className={styles.summaryValue}>
                        {v < 0 ? `${Math.abs(v)} : 1` : `1 : ${v}`}
                      </span>
                      <span className={styles.summaryInterp}>
                        {importanceDescription(a, b, v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alternative comparison summary — one table per factor */}
            {FACTORS.map((factor) => (
              <div key={factor} className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>
                  Strategy Comparisons — {factor}
                </h3>
                <div className={styles.summaryTable}>
                  <div className={styles.summaryTableHead}>
                    <span>Strategy A</span>
                    <span>Strategy B</span>
                    <span>Value</span>
                    <span>Interpretation</span>
                  </div>
                  {STRAT_PAIRS.map(([a, b]) => {
                    const v = altComparisons[factor][`${a}|${b}`];
                    return (
                      <div key={`${a}|${b}`} className={styles.summaryTableRow}>
                        <span className={styles.summaryFactor}>{a}</span>
                        <span className={styles.summaryFactor}>{b}</span>
                        <span className={styles.summaryValue}>
                          {v < 0 ? `${Math.abs(v)} : 1` : `1 : ${v}`}
                        </span>
                        <span className={styles.summaryInterp}>
                          {importanceDescription(a, b, v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className={styles.recalcRow}>
              <button className={styles.resetBtn} onClick={handleReset}>
                ← Start Over
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}