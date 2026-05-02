"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { useAppContext } from "@/app/context/AppContext";
import type { AHPFactor, AHPStrategyId } from "@/app/context/AppContext";

// ── Constants ────────────────────────────────────────────────────────────────

const FACTORS: readonly AHPFactor[] = [
  "Cost",
  "Long Term Reliability",
  "Uptime",
  "Utilization of Technology",
];

const STRATEGIES = [
  {
    id: "predictive" as AHPStrategyId,
    label: "Predictive Maintenance",
    color: "#185FA5",
    icon: "📡",
  },
  {
    id: "preventive" as AHPStrategyId,
    label: "Preventive Maintenance",
    color: "#27500A",
    icon: "🔧",
  },
  {
    id: "reactive" as AHPStrategyId,
    label: "Reactive Maintenance",
    color: "#854F0B",
    icon: "⚠️",
  },
] as const;

const SLIDER_STEPS = [9, 7, 5, 3, -3, -5, -7, -9];
const DEFAULT_COMPARISON_VALUE = -3;

function makePairs<T extends string>(items: readonly T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) pairs.push([items[i], items[j]]);
  return pairs;
}

const FACTOR_PAIRS = makePairs(FACTORS);
const STRAT_LABELS = STRATEGIES.map((s) => s.label) as [string, string, string];
const STRAT_PAIRS = makePairs(STRAT_LABELS);

// ── State initializers ───────────────────────────────────────────────────────

const CRIT_DEFAULTS: Record<string, number> = {
  "Cost|Long Term Reliability": -3,
  "Cost|Uptime": -5,
  "Cost|Utilization of Technology": -3,
  "Long Term Reliability|Uptime": -3,
  "Long Term Reliability|Utilization of Technology": 3,
  "Uptime|Utilization of Technology": 3,
};

function initCritComparisons(): Record<string, number> {
  const map: Record<string, number> = {};
  FACTOR_PAIRS.forEach(([a, b]) => {
    const key = `${a}|${b}`;
    map[key] = CRIT_DEFAULTS[key] ?? DEFAULT_COMPARISON_VALUE;
  });
  return map;
}

const ALT_DEFAULTS: Record<AHPFactor, Record<string, number>> = {
  Cost: {
    "Predictive Maintenance|Preventive Maintenance": -3,
    "Predictive Maintenance|Reactive Maintenance": -5,
    "Preventive Maintenance|Reactive Maintenance": -3,
  },
  "Long Term Reliability": {
    "Predictive Maintenance|Preventive Maintenance": 3,
    "Predictive Maintenance|Reactive Maintenance": 7,
    "Preventive Maintenance|Reactive Maintenance": 3,
  },
  Uptime: {
    "Predictive Maintenance|Preventive Maintenance": 3,
    "Predictive Maintenance|Reactive Maintenance": 9,
    "Preventive Maintenance|Reactive Maintenance": 5,
  },
  "Utilization of Technology": {
    "Predictive Maintenance|Preventive Maintenance": 5,
    "Predictive Maintenance|Reactive Maintenance": 9,
    "Preventive Maintenance|Reactive Maintenance": 3,
  },
};

function initAltComparisons(): Record<AHPFactor, Record<string, number>> {
  const result = {} as Record<AHPFactor, Record<string, number>>;
  FACTORS.forEach((factor) => {
    result[factor] = {};
    STRAT_PAIRS.forEach(([a, b]) => {
      const key = `${a}|${b}`;
      result[factor][key] =
        ALT_DEFAULTS[factor]?.[key] ?? DEFAULT_COMPARISON_VALUE;
    });
  });
  return result;
}

// ── Geometric Mean ────────────────────────────────────────────────────────────

/**
 * For each comparison key, convert every respondent's value to its AHP ratio
 * (negative values become 1/|v|), compute the geometric mean of those ratios,
 * then convert back to the closest SLIDER_STEPS value.
 *
 * Convention kept consistent with buildMatrix:
 *   positive v  → ratio = v
 *   negative v  → ratio = 1 / |v|
 */
function computeGeometricMeanComparisons(
  allResponses: Record<string, number>[],
): Record<string, number> {
  if (allResponses.length === 0) return {};
  const keys = Object.keys(allResponses[0]);
  const result: Record<string, number> = {};

  keys.forEach((key) => {
    // Convert each respondent value to a positive ratio
    const ratios = allResponses.map((resp) => {
      const v = resp[key];
      return v < 0 ? 1 / Math.abs(v) : v;
    });

    // Geometric mean of ratios
    const product = ratios.reduce((acc, r) => acc * r, 1);
    const geoMean = Math.pow(product, 1 / ratios.length);

    // Convert back to the closest slider step value
    // geoMean >= 1 → positive step;  geoMean < 1 → negative step (reciprocal)
    const positiveSteps = [3, 5, 7, 9];
    if (geoMean >= 1) {
      const closest = positiveSteps.reduce((best, s) =>
        Math.abs(s - geoMean) < Math.abs(best - geoMean) ? s : best,
      );
      result[key] = closest;
    } else {
      const reciprocal = 1 / geoMean;
      const closest = positiveSteps.reduce((best, s) =>
        Math.abs(s - reciprocal) < Math.abs(best - reciprocal) ? s : best,
      );
      result[key] = -closest;
    }
  });

  return result;
}

function computeGeometricMeanAlt(
  allAltResponses: Record<AHPFactor, Record<string, number>>[],
): Record<AHPFactor, Record<string, number>> {
  const result = {} as Record<AHPFactor, Record<string, number>>;
  FACTORS.forEach((factor) => {
    const factorResponses = allAltResponses.map((r) => r[factor]);
    result[factor] = computeGeometricMeanComparisons(factorResponses);
  });
  return result;
}

// ── AHP Math ─────────────────────────────────────────────────────────────────

function buildMatrix(
  labels: readonly string[],
  map: Record<string, number>,
): number[][] {
  const n = labels.length;
  const M: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = map[`${labels[i]}|${labels[j]}`] ?? DEFAULT_COMPARISON_VALUE;
      const ratio = v < 0 ? 1 / Math.abs(v) : v;
      M[i][j] = ratio;
      M[j][i] = 1 / ratio;
    }
  }
  return M;
}

function deriveWeights(M: number[][]): number[] {
  const n = M.length;
  const colSums = Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) colSums[j] += M[i][j];
  const normalized = M.map((row) => row.map((v, j) => v / colSums[j]));
  return normalized.map((row) => row.reduce((sum, v) => sum + v, 0) / n);
}

const RI_TABLE: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
};

interface ConsistencyResult {
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
}

function computeConsistency(
  M: number[][],
  weights: number[],
): ConsistencyResult {
  const n = M.length;
  const weightedSum = M.map((row) =>
    row.reduce((sum, val, j) => sum + val * weights[j], 0),
  );
  const lambdaValues = weightedSum.map((ws, i) =>
    weights[i] === 0 ? 0 : ws / weights[i],
  );
  const lambdaMax = lambdaValues.reduce((sum, v) => sum + v, 0) / n;
  const ci = (lambdaMax - n) / (n - 1);
  const ri = RI_TABLE[n] ?? 0.9;
  const cr = ri === 0 ? 0 : ci / ri;
  return { lambdaMax, ci, ri, cr };
}

function computeAHP(
  critComparisons: Record<string, number>,
  altComparisons: Record<AHPFactor, Record<string, number>>,
) {
  const critMatrix = buildMatrix(FACTORS, critComparisons);
  const critWtArray = deriveWeights(critMatrix);
  const critConsistency = computeConsistency(critMatrix, critWtArray);

  const critWeights = {} as Record<AHPFactor, number>;
  FACTORS.forEach((factor, i) => {
    critWeights[factor] = critWtArray[i];
  });

  const localWeights = {} as Record<AHPFactor, number[]>;
  const globalScores = STRATEGIES.map(() => 0);
  const altConsistency = {} as Record<string, ConsistencyResult>;

  FACTORS.forEach((factor) => {
    const altMatrix = buildMatrix(STRAT_LABELS, altComparisons[factor]);
    const lw = deriveWeights(altMatrix);
    localWeights[factor] = lw;
    altConsistency[factor] = computeConsistency(altMatrix, lw);
    lw.forEach((w, si) => {
      globalScores[si] += w;
    });
  });

  const totalScore = globalScores.reduce((sum, s) => sum + s, 0);
  globalScores.forEach((_, i) => {
    globalScores[i] /= totalScore;
  });

  const scores = {} as Record<AHPStrategyId, number>;
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
  if (value > 0)
    return `${a} has ${sliderLabel(value).toLowerCase()} over ${b}`;
  return `${b} has ${sliderLabel(value).toLowerCase()} over ${a}`;
}

function stepIndex(value: number): number {
  return SLIDER_STEPS.indexOf(value);
}

function crStatus(cr: number): "good" | "warn" | "bad" {
  if (cr <= 0.1) return "good";
  if (cr <= 0.15) return "warn";
  return "bad";
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ComparisonCardProps {
  labelA: string;
  labelB: string;
  value: number;
  onChange: (newValue: number) => void;
}

function ComparisonCard({
  labelA,
  labelB,
  value,
  onChange,
}: ComparisonCardProps) {
  const isLeft = value > 0;
  const idx = stepIndex(value);

  return (
    <div className={styles.comparisonCard}>
      <div className={styles.factorRow}>
        <span
          className={`${styles.factorLabel} ${isLeft ? styles.factorActive : ""}`}
        >
          {labelA}
        </span>
        <span className={styles.vsTag}>vs</span>
        <span
          className={`${styles.factorLabel} ${styles.factorRight} ${!isLeft ? styles.factorActive : ""}`}
        >
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
                  i === idx ? (step < 0 ? "#4a8c5c" : "#1a5c2a") : undefined,
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

// ── Respondent Setup Panel ────────────────────────────────────────────────────

interface RespondentSetupProps {
  respondentCount: number;
  onConfirm: (count: number) => void;
}

function RespondentSetup({ respondentCount, onConfirm }: RespondentSetupProps) {
  const [inputValue, setInputValue] = useState(String(respondentCount || 1));
  const parsed = parseInt(inputValue, 10);
  const isValid = !isNaN(parsed) && parsed >= 1 && parsed <= 20;

  return (
    <div className={styles.respondentSetup}>
      <div className={styles.respondentSetupInner}>
        <div className={styles.respondentSetupIcon}>👥</div>
        <div className={styles.respondentSetupText}>
          <h2 className={styles.respondentSetupTitle}>How many respondents?</h2>
          <p className={styles.respondentSetupDesc}>
            Each respondent will complete the pairwise comparisons
            independently. When there are multiple respondents, the{" "}
            <strong>geometric mean</strong> of all inputs is used before the AHP
            computation.
          </p>
        </div>
        <div className={styles.respondentSetupControls}>
          <input
            type="number"
            min={1}
            max={20}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={styles.respondentCountInput}
            placeholder="e.g. 3"
          />
          <button
            className={styles.submitBtn}
            onClick={() => isValid && onConfirm(parsed)}
            disabled={!isValid}
          >
            Begin Assessment →
          </button>
        </div>
        {!isValid && inputValue !== "" && (
          <p className={styles.respondentError}>
            Please enter a number between 1 and 20.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CriticalityPage() {
  const {
    selectedMachineId,
    ahpInputs,
    setAhpInputs,
    ahpOutputs,
    setAhpOutputs,
  } = useAppContext();

  // ── Respondent state ─────────────────────────────────────────────────────────
  // Phase: "setup" → user enters count | "collecting" → filling respondent responses | "done" → results
  const [phase, setPhase] = useState<"setup" | "collecting" | "done">(
    ahpOutputs.submitted ? "done" : "setup",
  );
  const [totalRespondents, setTotalRespondents] = useState<number>(1);
  const [currentRespondent, setCurrentRespondent] = useState<number>(0); // 0-indexed

  // All collected responses (one entry per respondent)
  const [allCritResponses, setAllCritResponses] = useState<
    Record<string, number>[]
  >([]);
  const [allAltResponses, setAllAltResponses] = useState<
    Record<AHPFactor, Record<string, number>>[]
  >([]);

  // Current respondent's working comparisons
  const [critComparisons, setCritComparisons] = useState<
    Record<string, number>
  >(initCritComparisons());
  const [altComparisons, setAltComparisons] =
    useState<Record<AHPFactor, Record<string, number>>>(initAltComparisons());

  // Results
  const [submitted, setSubmitted] = useState(ahpOutputs.submitted);
  const [scores, setScores] = useState(ahpOutputs.scores);
  const [critWeights, setCritWeights] = useState(ahpOutputs.critWeights);
  const [localWeights, setLocalWeights] = useState(ahpOutputs.localWeights);
  const [consistency, setConsistency] = useState(ahpOutputs.consistency);

  // Aggregated (geometric mean) comparisons — shown in results
  const [aggregatedCrit, setAggregatedCrit] = useState<Record<string, number>>(
    {},
  );
  const [aggregatedAlt, setAggregatedAlt] = useState<
    Record<AHPFactor, Record<string, number>>
  >({} as Record<AHPFactor, Record<string, number>>);

  // ── Re-seed when machine changes ─────────────────────────────────────────────
  useEffect(() => {
    setPhase(ahpOutputs.submitted ? "done" : "setup");
    setTotalRespondents(1);
    setCurrentRespondent(0);
    setAllCritResponses([]);
    setAllAltResponses([]);
    setCritComparisons(initCritComparisons());
    setAltComparisons(initAltComparisons());
    setSubmitted(ahpOutputs.submitted);
    setScores(ahpOutputs.scores);
    setCritWeights(ahpOutputs.critWeights);
    setLocalWeights(ahpOutputs.localWeights);
    setConsistency(ahpOutputs.consistency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMachineId]);

  // ── Persist inputs ────────────────────────────────────────────────────────────
  useEffect(() => {
    setAhpInputs({ critComparisons, altComparisons });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critComparisons, altComparisons]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleRespondentCountConfirm(count: number) {
    setTotalRespondents(count);
    setCurrentRespondent(0);
    setAllCritResponses([]);
    setAllAltResponses([]);
    setCritComparisons(initCritComparisons());
    setAltComparisons(initAltComparisons());
    setPhase("collecting");
  }

  function handleCritChange(key: string, value: number) {
    setCritComparisons((prev) => ({ ...prev, [key]: value }));
  }

  function handleAltChange(factor: AHPFactor, key: string, value: number) {
    setAltComparisons((prev) => ({
      ...prev,
      [factor]: { ...prev[factor], [key]: value },
    }));
  }

  /**
   * Called when a respondent finishes filling in comparisons.
   * If this is the last respondent, proceed to compute AHP.
   * Otherwise, advance to the next respondent.
   */
  function handleNextRespondent() {
    const updatedCritResponses = [...allCritResponses, critComparisons];
    const updatedAltResponses = [...allAltResponses, altComparisons];

    setAllCritResponses(updatedCritResponses);
    setAllAltResponses(updatedAltResponses);

    const isLast = currentRespondent === totalRespondents - 1;

    if (isLast) {
      // Determine the effective comparisons to feed into AHP
      let effectiveCrit: Record<string, number>;
      let effectiveAlt: Record<AHPFactor, Record<string, number>>;

      if (totalRespondents === 1) {
        effectiveCrit = critComparisons;
        effectiveAlt = altComparisons;
      } else {
        effectiveCrit = computeGeometricMeanComparisons(updatedCritResponses);
        effectiveAlt = computeGeometricMeanAlt(updatedAltResponses);
      }

      setAggregatedCrit(effectiveCrit);
      setAggregatedAlt(effectiveAlt);

      const result = computeAHP(effectiveCrit, effectiveAlt);
      const recommended = (
        Object.entries(result.scores) as [AHPStrategyId, number][]
      ).sort((a, b) => b[1] - a[1])[0][0];

      setScores(result.scores);
      setCritWeights(result.critWeights);
      setLocalWeights(result.localWeights);
      setConsistency(result.consistency);
      setSubmitted(true);
      setPhase("done");

      setAhpOutputs({
        submitted: true,
        scores: result.scores,
        critWeights: result.critWeights,
        localWeights: result.localWeights,
        consistency: result.consistency,
        recommendedStrategy: recommended,
      });

      setTimeout(() => {
        document
          .getElementById("results-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      // Advance to next respondent with fresh defaults
      setCurrentRespondent(currentRespondent + 1);
      setCritComparisons(initCritComparisons());
      setAltComparisons(initAltComparisons());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleReset() {
    setPhase("setup");
    setTotalRespondents(1);
    setCurrentRespondent(0);
    setAllCritResponses([]);
    setAllAltResponses([]);
    setCritComparisons(initCritComparisons());
    setAltComparisons(initAltComparisons());
    setSubmitted(false);
    setScores({ predictive: 0, preventive: 0, reactive: 0 });
    setCritWeights({
      Cost: 0,
      "Long Term Reliability": 0,
      Uptime: 0,
      "Utilization of Technology": 0,
    });
    setLocalWeights({
      Cost: [],
      "Long Term Reliability": [],
      Uptime: [],
      "Utilization of Technology": [],
    });
    setConsistency({ criteria: { lambdaMax: 0, ci: 0, ri: 0, cr: 0 } });
    setAggregatedCrit({});
    setAggregatedAlt({} as Record<AHPFactor, Record<string, number>>);

    setAhpInputs({
      critComparisons: initCritComparisons(),
      altComparisons: initAltComparisons(),
    });
    setAhpOutputs({
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
    });
  }

  const rankedStrategies = submitted
    ? [...STRATEGIES].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    : [];

  const topStrategy = rankedStrategies[0];

  const consistencyMatrices = submitted
    ? [
        { label: "Criteria Matrix", key: "criteria", n: 4 },
        ...FACTORS.map((f) => ({ label: `${f} (Alternatives)`, key: f, n: 3 })),
      ]
    : [];

  // Which comparisons to show in the summary tables (aggregated if multi-respondent, else single)
  const displayCrit =
    totalRespondents > 1 && Object.keys(aggregatedCrit).length > 0
      ? aggregatedCrit
      : (allCritResponses[0] ?? critComparisons);
  const displayAlt =
    totalRespondents > 1 && Object.keys(aggregatedAlt).length > 0
      ? aggregatedAlt
      : (allAltResponses[0] ?? altComparisons);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <span className={styles.pageTag}>AHP Assessment</span>
            <h1 className={styles.pageTitle}>Machine Criticality Assessment</h1>
            <p className={styles.pageSubtitle}>
              Complete two steps: first compare the four criteria against each
              other, then for each criterion, compare the three maintenance
              strategies. Every comparison requires a clear choice — slide left
              to favour the first factor, or right to favour the second. No ties
              allowed. Each machine stores its own independent assessment.
            </p>
          </div>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Total comparisons</span>
            <span className={styles.progressCount}>
              {FACTOR_PAIRS.length + FACTORS.length * STRAT_PAIRS.length}
            </span>
          </div>
        </div>

        {/* ── PHASE: Setup — ask for respondent count ── */}
        {phase === "setup" && (
          <RespondentSetup
            respondentCount={totalRespondents}
            onConfirm={handleRespondentCountConfirm}
          />
        )}

        {/* ── PHASE: Collecting respondent comparisons ── */}
        {phase === "collecting" && (
          <>
            {/* Respondent progress banner */}
            <div className={styles.respondentBanner}>
              <div className={styles.respondentBannerLeft}>
                <span className={styles.respondentBannerLabel}>Respondent</span>
                <span className={styles.respondentBannerCount}>
                  {currentRespondent + 1}
                  <span className={styles.respondentBannerTotal}>
                    {" "}
                    / {totalRespondents}
                  </span>
                </span>
              </div>
              <div className={styles.respondentProgressBar}>
                <div
                  className={styles.respondentProgressFill}
                  style={{
                    width: `${(currentRespondent / totalRespondents) * 100}%`,
                  }}
                />
              </div>
              {totalRespondents > 1 && (
                <span className={styles.respondentBannerHint}>
                  Geometric mean will be applied across all {totalRespondents}{" "}
                  responses
                </span>
              )}
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

            {/* ══ STEP 1 — Criteria pairwise comparisons ══ */}
            <div className={styles.stepSection}>
              <div className={styles.stepHeader}>
                <span className={styles.stepPill}>Step 1</span>
                <div>
                  <h2 className={styles.stepTitle}>Criteria Importance</h2>
                  <p className={styles.stepSubtitle}>
                    Compare each pair of factors to establish their relative
                    weights. Slide left to favour the first factor, or right to
                    favour the second. Every comparison requires a clear choice
                    — no ties allowed.
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

            {/* ══ STEP 2 — Alternative comparisons per factor ══ */}
            <div className={styles.stepSection}>
              <div className={styles.stepHeader}>
                <span className={`${styles.stepPill} ${styles.stepPillGreen}`}>
                  Step 2
                </span>
                <div>
                  <h2 className={styles.stepTitle}>
                    Maintenance Strategies per Criterion
                  </h2>
                  <p className={styles.stepSubtitle}>
                    For each criterion, compare how well each maintenance
                    strategy satisfies it. Slide left to favour the first
                    strategy, right to favour the second.
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

            {/* ── Action row ── */}
            <div className={styles.actionRow}>
              <button className={styles.resetBtn} onClick={handleReset}>
                Start Over
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleNextRespondent}
              >
                {currentRespondent < totalRespondents - 1
                  ? `Save & Continue to Respondent ${currentRespondent + 2} →`
                  : "Calculate Maintenance Strategy →"}
              </button>
            </div>
          </>
        )}

        {/* ── PHASE: Results ── */}
        {phase === "done" && submitted && (
          <div id="results-section" className={styles.resultsSection}>
            <div className={styles.resultsSectionHeader}>
              <h2 className={styles.resultsTitle}>Assessment Results</h2>
              <p className={styles.resultsSubtitle}>
                {totalRespondents > 1
                  ? `Ranked maintenance strategies based on the geometric mean of ${totalRespondents} respondents' pairwise comparisons`
                  : "Ranked maintenance strategies based on your pairwise comparisons"}
              </p>
              {totalRespondents > 1 && (
                <div className={styles.geoMeanNotice}>
                  <span className={styles.geoMeanIcon}>∑</span>
                  <span>
                    The geometric mean was applied across all {totalRespondents}{" "}
                    respondents' comparison values before the AHP computation.
                  </span>
                </div>
              )}
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
                <span
                  className={styles.topRecName}
                  style={{ color: topStrategy.color }}
                >
                  {topStrategy.label}
                </span>
              </div>
              <div
                className={styles.topRecScore}
                style={{ color: topStrategy.color }}
              >
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
                        <span className={styles.rankName}>
                          {strategy.label}
                        </span>
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
                          style={{
                            width: `${score}%`,
                            backgroundColor: strategy.color,
                          }}
                        />
                      </div>
                    </div>

                    <span
                      className={styles.rankScore}
                      style={{ color: strategy.color }}
                    >
                      {score.toFixed(1)}
                      <span className={styles.rankScoreUnit}>%</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Respondent breakdown — only shown when multi-respondent */}
            {totalRespondents > 1 && (
              <div className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>
                  Respondent Input Summary
                </h3>
                <p className={styles.summaryHint}>
                  Raw comparison values entered by each respondent for the
                  criteria matrix. The geometric mean of these values was used
                  for the AHP computation.
                </p>
                <div className={styles.respondentBreakdownTable}>
                  <div className={styles.respondentBreakdownHead}>
                    <span>Comparison Pair</span>
                    {allCritResponses.map((_, i) => (
                      <span key={i}>R{i + 1}</span>
                    ))}
                    <span>Geo. Mean</span>
                  </div>
                  {FACTOR_PAIRS.map(([a, b]) => {
                    const key = `${a}|${b}`;
                    const geoVal = aggregatedCrit[key];
                    return (
                      <div key={key} className={styles.respondentBreakdownRow}>
                        <span className={styles.respondentBreakdownPair}>
                          {a} vs {b}
                        </span>
                        {allCritResponses.map((resp, i) => {
                          const v = resp[key];
                          return (
                            <span
                              key={i}
                              className={styles.respondentBreakdownVal}
                            >
                              {v > 0 ? `${v}:1` : `1:${Math.abs(v)}`}
                            </span>
                          );
                        })}
                        <span className={styles.respondentBreakdownGeo}>
                          {geoVal > 0 ? `${geoVal}:1` : `1:${Math.abs(geoVal)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Criteria weights */}
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
              <h3 className={styles.summaryTitle}>
                Local Strategy Weights by Criterion
              </h3>
              <div className={styles.summaryTable}>
                <div
                  className={`${styles.summaryTableHead} ${styles.summaryTableHeadWide}`}
                >
                  <span>Criterion</span>
                  {STRATEGIES.map((s) => (
                    <span key={s.id}>{s.label}</span>
                  ))}
                  <span>CR</span>
                </div>
                {FACTORS.map((factor) => {
                  const lw = localWeights[factor] ?? [];
                  const cr = consistency[factor]?.cr ?? 0;
                  return (
                    <div
                      key={factor}
                      className={`${styles.summaryTableRow} ${styles.summaryTableRowWide}`}
                    >
                      <span className={styles.summaryFactor}>{factor}</span>
                      {STRATEGIES.map((s, si) => (
                        <span key={s.id} className={styles.summaryValue}>
                          {((lw[si] ?? 0) * 100).toFixed(1)}%
                        </span>
                      ))}
                      <span
                        className={`${styles.summaryValue} ${styles[crStatus(cr)]}`}
                      >
                        {(cr * 100).toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consistency check */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>
                Consistency Check — All Matrices
              </h3>
              <p className={styles.summaryHint}>
                Acceptable threshold: CR ≤ 10%. Values above this indicate the
                pairwise judgments should be revised.
              </p>
              <div className={styles.summaryTable}>
                <div className={styles.consistencyTableHead}>
                  <span>Matrix</span>
                  <span>n</span>
                  <span>
                    λ<sub>max</sub>
                  </span>
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
                      <span className={styles.summaryValue}>
                        {c.lambdaMax.toFixed(4)}
                      </span>
                      <span className={styles.summaryValue}>
                        {c.ci.toFixed(4)}
                      </span>
                      <span className={styles.summaryValue}>
                        {c.ri.toFixed(2)}
                      </span>
                      <span
                        className={`${styles.summaryValue} ${styles[status]}`}
                      >
                        {(c.cr * 100).toFixed(2)}%
                      </span>
                      <span
                        className={`${styles.consistencyResult} ${styles[status]}`}
                      >
                        {status === "good"
                          ? "✓ Consistent"
                          : status === "warn"
                            ? "⚠ Borderline"
                            : "✗ Revise"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Criteria comparison summary (uses aggregated / geometric mean values) */}
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>
                Criteria Comparison Summary
                {totalRespondents > 1 && (
                  <span className={styles.summaryTitleSub}>
                    {" "}
                    — Geometric Mean Values
                  </span>
                )}
              </h3>
              <div className={styles.summaryTable}>
                <div className={styles.summaryTableHead}>
                  <span>Factor A</span>
                  <span>Factor B</span>
                  <span>Value</span>
                  <span>Interpretation</span>
                </div>
                {FACTOR_PAIRS.map(([a, b]) => {
                  const v =
                    displayCrit[`${a}|${b}`] ?? critComparisons[`${a}|${b}`];
                  return (
                    <div key={`${a}|${b}`} className={styles.summaryTableRow}>
                      <span className={styles.summaryFactor}>{a}</span>
                      <span className={styles.summaryFactor}>{b}</span>
                      <span className={styles.summaryValue}>
                        {v > 0 ? `${v} : 1` : `1 : ${Math.abs(v)}`}
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
                  {totalRespondents > 1 && (
                    <span className={styles.summaryTitleSub}>
                      {" "}
                      — Geometric Mean Values
                    </span>
                  )}
                </h3>
                <div className={styles.summaryTable}>
                  <div className={styles.summaryTableHead}>
                    <span>Strategy A</span>
                    <span>Strategy B</span>
                    <span>Value</span>
                    <span>Interpretation</span>
                  </div>
                  {STRAT_PAIRS.map(([a, b]) => {
                    const altDisplayMap =
                      displayAlt[factor] ?? altComparisons[factor];
                    const v =
                      altDisplayMap?.[`${a}|${b}`] ??
                      altComparisons[factor][`${a}|${b}`];
                    return (
                      <div key={`${a}|${b}`} className={styles.summaryTableRow}>
                        <span className={styles.summaryFactor}>{a}</span>
                        <span className={styles.summaryFactor}>{b}</span>
                        <span className={styles.summaryValue}>
                          {v > 0 ? `${v} : 1` : `1 : ${Math.abs(v)}`}
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
