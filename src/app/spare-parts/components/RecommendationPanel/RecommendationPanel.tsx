"use client";

import { RECOMMENDATIONS, ConditionStatus } from "@/app/lib/pfCurveUtils";
import styles from "./RecommendationPanel.module.css";

interface Props {
  condition: ConditionStatus;
}

const conditionConfig: Record<
  ConditionStatus,
  { icon: string; colorClass: string; title: string }
> = {
  Normal: {
    icon: "✓",
    colorClass: "normal",
    title: "Normal Operation",
  },
  "Early Warning": {
    icon: "⚠",
    colorClass: "warn",
    title: "Early Warning Detected",
  },
  "Degrading Condition": {
    icon: "▲",
    colorClass: "orange",
    title: "Degrading Condition",
  },
  "Maintenance Trigger": {
    icon: "!",
    colorClass: "bad",
    title: "Maintenance Required Immediately",
  },
};

export default function RecommendationPanel({ condition }: Props) {
  const config = conditionConfig[condition];
  const recs = RECOMMENDATIONS[condition];

  return (
    <div className={`${styles.panel} ${styles[config.colorClass]}`}>
      <div className={styles.header}>
        <span className={styles.icon}>{config.icon}</span>
        <span className={styles.title}>{config.title}</span>
      </div>
      <ul className={styles.list}>
        {recs.map((rec, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.bullet} />
            {rec}
          </li>
        ))}
      </ul>
    </div>
  );
}
