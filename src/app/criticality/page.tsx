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

const SLIDER_STEPS = [-9, -7, -5, -3, 3, 5, 7, 9];
const DEFAULT_COMPARISON_VALUE = -3;

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

function buildMatrix(labels: readonly string[], map: Record<string, number>): number[][] {
  const n = labels.length;
  const M: number[][] = Array.from({ length: n }, () => Array(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = map[`${labels[i]}|${labels[j]}`] ?? DEFAULT_COMPARISON_VALUE;
      const ratio = v < 0 ? 1 / Math.abs(v) : v;      M[i][j] = ratio;
      M[j][i] = 1 / ratio;
    }
  }
  return M;
}

function deriveWeights(M: number[][]): number[] {
  const n = M.length;
  const colSums = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      colSums[j] += M[i][j];

  const normalized = M.map((row) => row.map((v, j) => v / colSums[j]));
  return normalized.map((row) => row.reduce((sum, v) => sum + v, 0) / n);
}

const RI_TABLE: Record<number, number> = { 1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24 };

interface ConsistencyResult {
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
}

function computeConsistency(M: number[][], weights: number[]): ConsistencyResult {
  const n = M.length;

  const weightedSum = M.map((row) =>
    row.reduce((sum, val, j) => sum + val * weights[j], 0)
  );

  const lambdaValues = weightedSum.map((ws, i) =>
    weights[i] === 0 ? 0 : ws / weights[i]
  );

  const lambdaMax = lambdaValues.reduce((sum, v) => sum + v, 0) / n;
  const ci = (lambdaMax - n) / (n - 1);
  const ri = RI_TABLE[n] ?? 0.9;
  const cr = ri === 0 ? 0 : ci / ri;

  return { lambdaMax, ci, ri, cr };
}

function computeAHP(
  critComparisons: Record<string, number>,
  altComparisons:  Record<Factor, Record<string, number>>
): {
  scores:          Record<StrategyId, number>;
  critWeights:     Record<Factor, number>;
  localWeights:    Record<Factor, number[]>;
  consistency:     { criteria: ConsistencyResult } & Record<string, ConsistencyResult>;
} {
  const critMatrix      = buildMatrix(FACTORS, critComparisons);
  const critWtArray     = deriveWeights(critMatrix);
  const critConsistency = computeConsistency(critMatrix, critWtArray);

  // Build explicit factor→weight map — eliminates index-alignment risk
  const critWeights = {} as Record<Factor, number>;
  FACTORS.forEach((factor, i) => { critWeights[factor] = critWtArray[i]; });

  const localWeights  = {} as Record<Factor, number[]>;
  const globalScores  = STRATEGIES.map(() => 0);
  const altConsistency = {} as Record<string, ConsistencyResult>;

  FACTORS.forEach((factor) => {
    const altMatrix = buildMatrix(STRAT_LABELS, altComparisons[factor]);
    const lw        = deriveWeights(altMatrix);
    localWeights[factor]  = lw;
    altConsistency[factor] = computeConsistency(altMatrix, lw);

    lw.forEach((w, si) => {
      globalScores[si] += critWeights[factor] * w;
    });
  });                        // ← this closing brace was missing in Document 3

  const scores = {} as Record<StrategyId, number>;
  STRATEGIES.forEach((s, i) => {
    scores[s.id] = globalScores[i] * 100;
  });

  return {
    scores,
    critWeights,
    localWeights,
    consistency: { criteria: critConsistency, ...altConsistency },
  };
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

function crStatus(cr: number): "good" | "warn" | "bad" {
  if (cr <= 0.1)  return "good";
  if (cr <= 0.15) return "warn";
  return "bad";
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ComparisonCardProps {
  labelA:   string;
  labelB:   string;
  value:    number;
  onChange: (newValue: number) => void;
}

function ComparisonCard({ labelA, labelB, value, onChange }: ComparisonCardProps) {
  const isLeft = value < 0;
  const idx    = stepIndex(value);

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
                backgroundColor: i === idx
                  ? (step < 0 ? "#4a8c5c" : "#1a5c2a")
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
  const [submitted,    setSubmitted]    = useState(false);
  const [scores,       setScores]       = useState<Record<StrategyId, number>>({} as Record<StrategyId, number>);
const [critWeights, setCritWeights] = useState<Record<Factor, number>>({} as Record<Factor, number>);  const [localWeights, setLocalWeights] = useState<Record<Factor, number[]>>({} as Record<Factor, number[]>);
  const [consistency,  setConsistency]  = useState<{ criteria: ConsistencyResult } & Record<string, ConsistencyResult>>({ criteria: { lambdaMax: 0, ci: 0, ri: 0, cr: 0 } });

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
    setScores(result.scores);
    setCritWeights(result.critWeights);
    setLocalWeights(result.localWeights);
    setConsistency(result.consistency);
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
    setCritWeights({} as Record<Factor, number>);    setLocalWeights({} as Record<Factor, number[]>);
    setConsistency({ criteria: { lambdaMax: 0, ci: 0, ri: 0, cr: 0 } });
  }

  const rankedStrategies = submitted
    ? [...STRATEGIES].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    : [];

  const topStrategy = rankedStrategies[0];

  // All 5 matrices for the consistency check section
  const consistencyMatrices = submitted ? [
    { label: "Criteria Matrix", key: "criteria", n: 4 },
    ...FACTORS.map((f) => ({ label: `${f} (Alternatives)`, key: f, n: 3 })),
  ] : [];

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
              Every comparison requires a clear choice — slide left to favour the
              first factor, or right to favour the second. No ties allowed.
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
                Slide left to favour the first factor, or right to favour the second.
                Every comparison requires a clear choice — no ties allowed.
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
                borderColor:     topStrategy.color,
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

            {/* Criteria weights + CR */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Criteria Weights</h3>
              <div className={styles.weightsGrid}>
              {FACTORS.map((factor) => (
                <div key={factor} className={styles.weightItem}>
                  <span className={styles.weightValue}>
                    {((critWeights[factor] ?? 0) * 100).toFixed(1)}%
                  </span>
                  <span className={styles.weightLabel}>{factor}</span>
                </div>
                ))}
              </div>

            </div>

            {/* Local strategy weights per factor */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Local Strategy Weights by Criterion</h3>
              <div className={styles.summaryTable}>
                <div className={`${styles.summaryTableHead} ${styles.summaryTableHeadWide}`}>
                  <span>Criterion</span>
                  {STRATEGIES.map((s) => <span key={s.id}>{s.label}</span>)}
                  <span>CR</span>
                </div>
                {FACTORS.map((factor) => {
                  const lw = localWeights[factor] ?? [];
                  const cr = consistency[factor]?.cr ?? 0;
                  return (
                    <div key={factor} className={`${styles.summaryTableRow} ${styles.summaryTableRowWide}`}>
                      <span className={styles.summaryFactor}>{factor}</span>
                      {STRATEGIES.map((s, si) => (
                        <span key={s.id} className={styles.summaryValue}>
                          {((lw[si] ?? 0) * 100).toFixed(1)}%
                        </span>
                      ))}
                      <span className={`${styles.summaryValue} ${styles[crStatus(cr)]}`}>
                        {(cr * 100).toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══════════════════════════════════════════
                CONSISTENCY CHECK — one row per matrix
            ══════════════════════════════════════════ */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Consistency Check — All Matrices</h3>
              <p className={styles.summaryHint}>
                Acceptable threshold: CR ≤ 10%. Values above this indicate the pairwise judgments should be revised.
              </p>
              <div className={styles.summaryTable}>
                <div className={styles.consistencyTableHead}>
                  <span>Matrix</span>
                  <span>n</span>
                  <span>λ<sub>max</sub></span>
                  <span>CI</span>
                  <span>RI</span>
                  <span>CR</span>
                  <span>Result</span>
                </div>
                {consistencyMatrices.map(({ label, key, n }) => {
                  const c = consistency[key];
                  if (!c) return null;
                  const status = crStatus(c.cr);
                  return (
                    <div key={key} className={styles.consistencyTableRow}>
                      <span className={styles.summaryFactor}>{label}</span>
                      <span className={styles.summaryValue}>{n}</span>
                      <span className={styles.summaryValue}>{c.lambdaMax.toFixed(4)}</span>
                      <span className={styles.summaryValue}>{c.ci.toFixed(4)}</span>
                      <span className={styles.summaryValue}>{c.ri.toFixed(2)}</span>
                      <span className={`${styles.summaryValue} ${styles[status]}`}>
                        {(c.cr * 100).toFixed(2)}%
                      </span>
                      <span className={`${styles.consistencyResult} ${styles[status]}`}>
                        {status === "good" ? "✓ Consistent" : status === "warn" ? "⚠ Borderline" : "✗ Revise"}
                      </span>
                    </div>
                  );
                })}
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