// ── Types ────────────────────────────────────────────────────────────────────

export type MaintenanceStrategy = "Predictive" | "Preventive" | "Corrective" | "Run-to-Failure";
export type StatusLevel = "good" | "warn" | "bad";

export interface CriticalityData {
  score: number;         // 0–10
  label: string;         // e.g. "High Criticality"
  recommendation: string;
}

export interface MaintenanceData {
  strategy: MaintenanceStrategy;
  nextInspectionDays: number;
  lastServicedDaysAgo: number;
  openWorkOrders: number;
}

export interface OEEData {
  availability: number;  // percentage 0–100
  performance: number;
  quality: number;
  oee: number;           // computed or stored
}

export interface ReliabilityData {
  mtbf: number;          // hours
  mttr: number;          // hours
  failureRate: number;   // per hour
  availabilityIndex: number; // percentage
}

export interface PFCurveData {
  pfIntervalDays: number;
  timeToFailureDays: number;
  detectionMethod: string;
  alertThresholdReached: boolean;
}

export interface KPIData {
  plannedMaintenancePct: number;
  unplannedDowntimeHrsPerMonth: number;
  maintenanceCostPerMonth: number;   // in PHP
  scheduleCompliancePct: number;
}

export interface SparePartsData {
  totalTracked: number;
  belowReorderLevel: number;
  criticalPartsOut: number;
  lastReplenishmentDaysAgo: number;
}

export interface Machine {
  id: string;
  name: string;
  description: string;
  image: string | null;   // null = use placeholder; set to "/images/<file>" when ready
  criticality: CriticalityData;
  maintenance: MaintenanceData;
  oee: OEEData;
  reliability: ReliabilityData;
  pfCurve: PFCurveData;
  kpi: KPIData;
  spareParts: SparePartsData;
}

// ── Data ─────────────────────────────────────────────────────────────────────

export const machines: Machine[] = [
  {
    id: "cnc-plasma",
    name: "CNC Plasma Cutting Machine",
    description:
      "A computer-controlled plasma cutting machine used for high-speed cutting of electrically conductive metals including steel, aluminum, and stainless steel. Utilizes a high-temperature plasma arc to melt and expel material along programmed cut paths. Monitored for torch wear, gas pressure consistency, and cut quality deviation.",
    image: null, // TODO: replace with "/images/cnc-plasma.jpg"
    criticality: {
      score: 8.7,
      label: "High Criticality",
      recommendation: "Predictive maintenance recommended",
    },
    maintenance: {
      strategy: "Predictive",
      nextInspectionDays: 2,
      lastServicedDaysAgo: 10,
      openWorkOrders: 3,
    },
    oee: {
      availability: 90,
      performance: 82,
      quality: 96,
      oee: 70.9,
    },
    reliability: {
      mtbf: 290,
      mttr: 5.1,
      failureRate: 0.00345,
      availabilityIndex: 98.3,
    },
    pfCurve: {
      pfIntervalDays: 18,
      timeToFailureDays: 6,
      detectionMethod: "Arc Voltage Monitoring",
      alertThresholdReached: true,
    },
    kpi: {
      plannedMaintenancePct: 84,
      unplannedDowntimeHrsPerMonth: 5.2,
      maintenanceCostPerMonth: 21000,
      scheduleCompliancePct: 88,
    },
    spareParts: {
      totalTracked: 52,
      belowReorderLevel: 6,
      criticalPartsOut: 1,
      lastReplenishmentDaysAgo: 8,
    },
  },

  {
    id: "cnc-laser",
    name: "CNC Laser Cutting Machine",
    description:
      "A high-precision CNC laser cutting system capable of cutting and engraving metals, plastics, and composites with sub-millimeter accuracy. Employs a focused CO₂ or fiber laser beam controlled along 2-axis paths. Key maintenance concerns include laser lens cleanliness, beam alignment, cooling system performance, and assist gas purity.",
    image: null, // TODO: replace with "/images/cnc-laser.jpg"
    criticality: {
      score: 9.1,
      label: "Very High Criticality",
      recommendation: "Proactive and predictive maintenance required",
    },
    maintenance: {
      strategy: "Predictive",
      nextInspectionDays: 1,
      lastServicedDaysAgo: 7,
      openWorkOrders: 4,
    },
    oee: {
      availability: 94,
      performance: 88,
      quality: 98,
      oee: 81.1,
    },
    reliability: {
      mtbf: 410,
      mttr: 3.8,
      failureRate: 0.00244,
      availabilityIndex: 99.1,
    },
    pfCurve: {
      pfIntervalDays: 25,
      timeToFailureDays: 12,
      detectionMethod: "Beam Power Sensor",
      alertThresholdReached: false,
    },
    kpi: {
      plannedMaintenancePct: 91,
      unplannedDowntimeHrsPerMonth: 2.8,
      maintenanceCostPerMonth: 26500,
      scheduleCompliancePct: 94,
    },
    spareParts: {
      totalTracked: 61,
      belowReorderLevel: 3,
      criticalPartsOut: 0,
      lastReplenishmentDaysAgo: 4,
    },
  },

  {
    id: "cnc-lathe",
    name: "CNC Lathe Machine",
    description:
      "Precision CNC lathe used for turning, facing, and threading operations on cylindrical workpieces. Features an automatic tool changer and real-time spindle load monitoring. Maintenance is condition-based, primarily triggered by vibration threshold exceedances, tool wear indicators, and coolant quality checks.",
    image: null, // TODO: replace with "/images/cnc-lathe.jpg"
    criticality: {
      score: 7.5,
      label: "Medium-High Criticality",
      recommendation: "Preventive maintenance schedule recommended",
    },
    maintenance: {
      strategy: "Preventive",
      nextInspectionDays: 5,
      lastServicedDaysAgo: 14,
      openWorkOrders: 1,
    },
    oee: {
      availability: 88,
      performance: 79,
      quality: 97,
      oee: 67.6,
    },
    reliability: {
      mtbf: 335,
      mttr: 4.5,
      failureRate: 0.00299,
      availabilityIndex: 98.7,
    },
    pfCurve: {
      pfIntervalDays: 21,
      timeToFailureDays: 9,
      detectionMethod: "Vibration Analysis",
      alertThresholdReached: true,
    },
    kpi: {
      plannedMaintenancePct: 87,
      unplannedDowntimeHrsPerMonth: 4.1,
      maintenanceCostPerMonth: 17800,
      scheduleCompliancePct: 90,
    },
    spareParts: {
      totalTracked: 44,
      belowReorderLevel: 4,
      criticalPartsOut: 0,
      lastReplenishmentDaysAgo: 11,
    },
  },

  {
    id: "cnc-mill",
    name: "CNC Milling Machine",
    description:
      "A high-precision computer-controlled milling machine used for cutting and shaping metal and composite materials. Operates at variable spindle speeds and supports 3-axis simultaneous machining. Critical to primary production output and subject to routine predictive maintenance scheduling based on spindle vibration and coolant flow data.",
    image: null, // TODO: replace with "/images/cnc-mill.jpg"
    criticality: {
      score: 8.4,
      label: "High Criticality",
      recommendation: "Proactive maintenance recommended",
    },
    maintenance: {
      strategy: "Predictive",
      nextInspectionDays: 3,
      lastServicedDaysAgo: 12,
      openWorkOrders: 2,
    },
    oee: {
      availability: 92,
      performance: 78,
      quality: 95,
      oee: 68.1,
    },
    reliability: {
      mtbf: 312,
      mttr: 4.2,
      failureRate: 0.0032,
      availabilityIndex: 98.7,
    },
    pfCurve: {
      pfIntervalDays: 21,
      timeToFailureDays: 9,
      detectionMethod: "Vibration Monitoring",
      alertThresholdReached: true,
    },
    kpi: {
      plannedMaintenancePct: 87,
      unplannedDowntimeHrsPerMonth: 4.3,
      maintenanceCostPerMonth: 18400,
      scheduleCompliancePct: 91,
    },
    spareParts: {
      totalTracked: 48,
      belowReorderLevel: 5,
      criticalPartsOut: 1,
      lastReplenishmentDaysAgo: 6,
    },
  },

  {
    id: "cnc-controller",
    name: "CNC Controller",
    description:
      "The central computing and motion control unit governing all CNC machine operations on the production floor. Processes G-code instructions, manages axis interpolation, and interfaces with servo drives and feedback systems. Maintenance focuses on software integrity, electrical connection quality, cooling fan performance, and backup power reliability.",
    image: null, // TODO: replace with "/images/cnc-controller.jpg"
    criticality: {
      score: 9.5,
      label: "Critical",
      recommendation: "Immediate proactive maintenance — single point of failure",
    },
    maintenance: {
      strategy: "Preventive",
      nextInspectionDays: 0,
      lastServicedDaysAgo: 20,
      openWorkOrders: 5,
    },
    oee: {
      availability: 97,
      performance: 95,
      quality: 99,
      oee: 91.2,
    },
    reliability: {
      mtbf: 720,
      mttr: 2.5,
      failureRate: 0.00139,
      availabilityIndex: 99.7,
    },
    pfCurve: {
      pfIntervalDays: 30,
      timeToFailureDays: 3,
      detectionMethod: "Error Log Analysis",
      alertThresholdReached: true,
    },
    kpi: {
      plannedMaintenancePct: 95,
      unplannedDowntimeHrsPerMonth: 1.2,
      maintenanceCostPerMonth: 32000,
      scheduleCompliancePct: 97,
    },
    spareParts: {
      totalTracked: 28,
      belowReorderLevel: 2,
      criticalPartsOut: 1,
      lastReplenishmentDaysAgo: 15,
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Look up a machine by its id. Returns undefined if not found. */
export function getMachineById(id: string): Machine | undefined {
  return machines.find((m) => m.id === id);
}

/** Default machine shown on first load. */
export const DEFAULT_MACHINE_ID = machines[0].id;
