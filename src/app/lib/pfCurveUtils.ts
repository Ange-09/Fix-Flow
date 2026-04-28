export type ConditionStatus = "Normal" | "Early Warning" | "Degrading Condition" | "Maintenance Trigger";

export function calculateFDate(pDate: Date, pfIntervalDays: number): Date {
  const f = new Date(pDate);
  f.setDate(f.getDate() + pfIntervalDays);
  return f;
}

export function getConditionStatus(
  pDate: Date,
  pfIntervalDays: number
): ConditionStatus {
  if (pfIntervalDays <= 0) return "Normal";
  const today = new Date();
  const elapsed = (today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24);
  const percentage = elapsed / pfIntervalDays;

  if (percentage >= 0.8) return "Maintenance Trigger";
  if (percentage >= 0.7) return "Degrading Condition";
  if (percentage >= 0.6) return "Early Warning";
  return "Normal";
}

export function getElapsedPercentage(pDate: Date, pfIntervalDays: number): number {
  if (pfIntervalDays <= 0) return 0;
  const today = new Date();
  const elapsed = (today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.min(1, elapsed / pfIntervalDays));
}

export const RECOMMENDATIONS: Record<ConditionStatus, string[]> = {
  Normal: ["Continue normal operation", "Log routine inspection", "Monitor per schedule"],
  "Early Warning": [
    "Increase inspection frequency",
    "Clean machine components",
    "Check lubrication levels",
    "Monitor vibration, temperature, and noise",
    "Record early abnormal signs",
    "Continue operation under observation",
    "Flag recurring minor issues",
  ],
  "Degrading Condition": [
    "Perform detailed inspection",
    "Tighten/adjust components",
    "Re-lubricate parts",
    "Run diagnostics",
    "Check alignment",
    "Reduce machine load",
    "Isolate affected subsystems",
  ],
  "Maintenance Trigger": [
    "Schedule immediate downtime",
    "Replace faulty components",
    "Full calibration and alignment",
    "Conduct test runs",
    "Verify machining accuracy",
    "Restore safe operating condition",
  ],
};

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseDateString(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
