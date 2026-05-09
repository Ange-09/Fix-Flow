// lib/machineData.ts — single source of truth for all static machine records

// Today = May 9, 2026
//
// New SparePart life model:
//   inputs : expectedLife (hrs), installationDate ("YYYY-MM-DD"), avgDailyUsage (hrs/day)
//   process: lifeUsedHrs = daysSinceInstall * avgDailyUsage
//            percentLifeUsed = lifeUsedHrs / expectedLife * 100
//   status thresholds:
//            < 70%  → Normal
//            ≥ 70%  → Early Warning
//            ≥ 90%  → Degrading Condition
//            ≥ 100% → Maintenance Trigger
//
// Seeding strategy (avgDailyUsage = 8 hrs/day throughout):
//   Target Normal (≈40%):           installDate = today − (0.40 * expectedLife / 8) days
//   Target Early Warning (≈75%):    installDate = today − (0.75 * expectedLife / 8) days
//   Target Degrading (≈92%):        installDate = today − (0.92 * expectedLife / 8) days
//   Target Maintenance Trigger(≥100%): installDate = today − (1.05 * expectedLife / 8) days

import type { CustomMachine } from "@/app/context/AppContext";

export type AnyMachine = Machine | CustomMachine;

export function getAllMachines(customMachines: CustomMachine[]): AnyMachine[] {
  return [...machines, ...customMachines];
}

export function getMachineByIdFromAll(
  id: string,
  customMachines: CustomMachine[],
): AnyMachine | undefined {
  return (
    machines.find((m) => m.id === id) ?? customMachines.find((m) => m.id === id)
  );
}

export type StatusLevel = "good" | "warn" | "bad";

export interface SparePart {
  id: string;
  name: string;
  classification: "Critical" | "Consumable";
  description?: string;
  // Default values used to seed the component's runtime state on first load
  defaultExpectedLife?: number; // hours
  defaultInstallationDate?: string; // "YYYY-MM-DD"
  defaultAvgDailyUsage?: number; // hours per day
}

export interface OEEData {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface KPIData {
  productionOutput: number;
  targetOutput: number;
  defectRate: number;
  energyConsumption: number;
}

export interface ReliabilityData {
  mtbf: number; // hours
  mttr: number; // hours
  failureCount: number;
  maintenanceHours: number;
}

export interface PFCurveData {
  pPointDate: string;
  fPointDate: string;
  pfInterval: number; // days
  currentCondition:
    | "Normal"
    | "Early Warning"
    | "Degrading"
    | "Failure Imminent";
}

export interface CriticalityData {
  score: number; // 0–100
  rank: "High" | "Medium" | "Low";
  maintenanceStrategy: "Predictive" | "Preventive" | "Reactive";
  costWeight: number;
  reliabilityWeight: number;
  uptimeWeight: number;
  utilizationWeight: number;
}

export interface MaintenanceData {
  lastMaintenance: string;
  nextScheduled: string;
  maintenanceType: string;
  technicianAssigned: string;
}

export interface Machine {
  id: string;
  name: string;
  description: string;
  image: string | null;
  oee: OEEData;
  kpi: KPIData;
  reliability: ReliabilityData;
  pfCurve: PFCurveData;
  criticality: CriticalityData;
  maintenance: MaintenanceData;
  spareParts: SparePart[];
}

export const DEFAULT_MACHINE_ID = "cnc-plasma";

export const machines: Machine[] = [
  // ── CNC Plasma Cutting Machine ─────────────────────────────────────────────
  {
    id: "cnc-plasma",
    name: "CNC Plasma Cutting Machine",
    description:
      "High-precision plasma cutting system used for cutting electrically conductive materials with a high-velocity jet of ionised gas.",
    image: "/images/pcutter.png",
    oee: { availability: 87, performance: 91, quality: 96, oee: 76 },
    kpi: {
      productionOutput: 1840,
      targetOutput: 2000,
      defectRate: 4.0,
      energyConsumption: 320,
    },
    reliability: {
      mtbf: 210,
      mttr: 4.2,
      failureCount: 3,
      maintenanceHours: 12.6,
    },
    pfCurve: {
      pPointDate: "2025-03-01",
      fPointDate: "2025-04-30",
      pfInterval: 60,
      currentCondition: "Early Warning",
    },
    criticality: {
      score: 78,
      rank: "High",
      maintenanceStrategy: "Predictive",
      costWeight: 0.35,
      reliabilityWeight: 0.3,
      uptimeWeight: 0.25,
      utilizationWeight: 0.1,
    },
    maintenance: {
      lastMaintenance: "2025-02-14",
      nextScheduled: "2025-05-14",
      maintenanceType: "Predictive Inspection",
      technicianAssigned: "J. Santos",
    },
    spareParts: [
      // Normal (~40%): expectedLife=500hrs, 8hrs/day → days=500/8=62.5 → 40%=25days ago → 2026-04-14
      {
        id: "plasma-001",
        name: "Plasma Torch Electrode",
        classification: "Critical",
        description: "Main current-carrying electrode",
        defaultExpectedLife: 500,
        defaultInstallationDate: "2026-04-14",
        defaultAvgDailyUsage: 8,
      },
      // Early Warning (~75%): expectedLife=500hrs → 75%=46.9days ago → 2026-03-23
      {
        id: "plasma-002",
        name: "Nozzle / Tip",
        classification: "Critical",
        description: "Controls plasma arc shape",
        defaultExpectedLife: 500,
        defaultInstallationDate: "2026-03-23",
        defaultAvgDailyUsage: 8,
      },
      // Degrading (~92%): expectedLife=500hrs → 92%=57.5days ago → 2026-03-12
      {
        id: "plasma-003",
        name: "Shield Cap",
        classification: "Critical",
        description: "Protects nozzle from spatter",
        defaultExpectedLife: 500,
        defaultInstallationDate: "2026-03-12",
        defaultAvgDailyUsage: 8,
      },
      // Maintenance Trigger (≥100%): expectedLife=8000hrs → 105%=1050days ago → 2023-07-23
      {
        id: "plasma-004",
        name: "Drive Motor (X-axis)",
        classification: "Critical",
        description: "CNC gantry X-axis servo motor",
        defaultExpectedLife: 8000,
        defaultInstallationDate: "2023-07-23",
        defaultAvgDailyUsage: 8,
      },
      // Normal (~40%): expectedLife=8000hrs → 40%=400days ago → 2025-04-04
      {
        id: "plasma-005",
        name: "Drive Motor (Y-axis)",
        classification: "Critical",
        description: "CNC gantry Y-axis servo motor",
        defaultExpectedLife: 8000,
        defaultInstallationDate: "2025-04-04",
        defaultAvgDailyUsage: 8,
      },
      {
        id: "plasma-006",
        name: "Cutting Gas Filter",
        classification: "Consumable",
        description: "Filters cutting gas supply",
      },
      {
        id: "plasma-007",
        name: "Coolant Fluid",
        classification: "Consumable",
        description: "Torch cooling system fluid",
      },
      {
        id: "plasma-008",
        name: "Anti-spatter Spray",
        classification: "Consumable",
        description: "Prevents spatter adhesion on bed",
      },
      // Early Warning (~75%): expectedLife=16000hrs → 75%=1500days ago → 2022-02-14
      {
        id: "plasma-009",
        name: "Linear Guide Rail",
        classification: "Critical",
        description: "Gantry guide rail assembly",
        defaultExpectedLife: 16000,
        defaultInstallationDate: "2022-02-14",
        defaultAvgDailyUsage: 8,
      },
      // Degrading (~92%): expectedLife=4000hrs → 92%=460days ago → 2025-03-05
      {
        id: "plasma-010",
        name: "Height Control Sensor",
        classification: "Critical",
        description: "Automatic torch height controller",
        defaultExpectedLife: 4000,
        defaultInstallationDate: "2025-03-05",
        defaultAvgDailyUsage: 8,
      },
    ],
  },

  // ── CNC Laser Cutting Machine ──────────────────────────────────────────────
  {
    id: "cnc-laser",
    name: "CNC Laser Cutting Machine",
    description:
      "CO₂ or fibre laser cutting system capable of high-speed, high-precision cuts on metals, plastics, and composites.",
    image: "/images/lcutter.png",
    oee: { availability: 92, performance: 88, quality: 98, oee: 79 },
    kpi: {
      productionOutput: 2100,
      targetOutput: 2200,
      defectRate: 2.0,
      energyConsumption: 280,
    },
    reliability: {
      mtbf: 340,
      mttr: 3.1,
      failureCount: 2,
      maintenanceHours: 6.2,
    },
    pfCurve: {
      pPointDate: "2025-02-15",
      fPointDate: "2025-04-15",
      pfInterval: 60,
      currentCondition: "Degrading",
    },
    criticality: {
      score: 82,
      rank: "High",
      maintenanceStrategy: "Predictive",
      costWeight: 0.4,
      reliabilityWeight: 0.25,
      uptimeWeight: 0.25,
      utilizationWeight: 0.1,
    },
    maintenance: {
      lastMaintenance: "2025-02-01",
      nextScheduled: "2025-05-01",
      maintenanceType: "Optical Alignment Check",
      technicianAssigned: "M. Reyes",
    },
    spareParts: [
      // Maintenance Trigger (≥100%): expectedLife=2000hrs → 105%=262.5days ago → 2025-08-19
      {
        id: "laser-001",
        name: "Laser Focusing Lens",
        classification: "Critical",
        description: "ZnSe or fused silica focusing optic",
        defaultExpectedLife: 2000,
        defaultInstallationDate: "2025-08-19",
        defaultAvgDailyUsage: 8,
      },
      // Normal (~40%): expectedLife=4000hrs → 40%=200days ago → 2025-10-21
      {
        id: "laser-002",
        name: "Beam Delivery Mirror",
        classification: "Critical",
        description: "Gold-coated reflective mirror",
        defaultExpectedLife: 4000,
        defaultInstallationDate: "2025-10-21",
        defaultAvgDailyUsage: 8,
      },
      // Normal (~40%): expectedLife=20000hrs → 40%=1000days ago → 2023-07-13
      {
        id: "laser-003",
        name: "Laser Source / Tube",
        classification: "Critical",
        description: "CO₂ or fibre laser generator",
        defaultExpectedLife: 20000,
        defaultInstallationDate: "2023-07-13",
        defaultAvgDailyUsage: 8,
      },
      // Early Warning (~75%): expectedLife=1000hrs → 75%=93.75days ago → 2026-02-03
      {
        id: "laser-004",
        name: "Nozzle",
        classification: "Critical",
        description: "Assist gas delivery nozzle",
        defaultExpectedLife: 1000,
        defaultInstallationDate: "2026-02-03",
        defaultAvgDailyUsage: 8,
      },
      // Degrading (~92%): expectedLife=12000hrs → 92%=1380days ago → 2022-06-28
      {
        id: "laser-005",
        name: "X/Y Linear Servo Motor",
        classification: "Critical",
        description: "Precision servo drive for cutting head",
        defaultExpectedLife: 12000,
        defaultInstallationDate: "2022-06-28",
        defaultAvgDailyUsage: 8,
      },
      {
        id: "laser-006",
        name: "Chiller Filter",
        classification: "Consumable",
        description: "Water cooling circuit filter",
      },
      {
        id: "laser-007",
        name: "Assist Gas (N₂/O₂)",
        classification: "Consumable",
        description: "Assist gas cylinders",
      },
      {
        id: "laser-008",
        name: "Lens Cleaning Wipes",
        classification: "Consumable",
        description: "Optics-grade cleaning supplies",
      },
      {
        id: "laser-009",
        name: "Dust Collector Filter",
        classification: "Consumable",
        description: "Fume extraction system filter",
      },
      // Maintenance Trigger (≥100%): expectedLife=8000hrs → 105%=1050days ago → 2023-07-23
      {
        id: "laser-010",
        name: "Drive Belt / Rack",
        classification: "Critical",
        description: "Motion transmission belt or gear rack",
        defaultExpectedLife: 8000,
        defaultInstallationDate: "2023-07-23",
        defaultAvgDailyUsage: 8,
      },
    ],
  },

  // ── CNC Lathe Machine ──────────────────────────────────────────────────────
  {
    id: "cnc-lathe",
    name: "CNC Lathe Machine",
    description:
      "Computer-controlled turning centre for producing cylindrical, conical, and profiled parts through rotating workpiece operations.",
    image: "/images/lathe.png",
    oee: { availability: 89, performance: 93, quality: 97, oee: 80 },
    kpi: {
      productionOutput: 950,
      targetOutput: 1000,
      defectRate: 3.0,
      energyConsumption: 150,
    },
    reliability: {
      mtbf: 280,
      mttr: 3.8,
      failureCount: 2,
      maintenanceHours: 7.6,
    },
    pfCurve: {
      pPointDate: "2025-01-20",
      fPointDate: "2025-04-20",
      pfInterval: 90,
      currentCondition: "Failure Imminent",
    },
    criticality: {
      score: 71,
      rank: "High",
      maintenanceStrategy: "Preventive",
      costWeight: 0.3,
      reliabilityWeight: 0.35,
      uptimeWeight: 0.25,
      utilizationWeight: 0.1,
    },
    maintenance: {
      lastMaintenance: "2025-01-20",
      nextScheduled: "2025-04-20",
      maintenanceType: "Spindle Bearing Inspection",
      technicianAssigned: "R. Cruz",
    },
    spareParts: [
      // Degrading (~92%): expectedLife=10000hrs → 92%=1150days ago → 2023-03-15
      {
        id: "lathe-001",
        name: "Spindle Bearing",
        classification: "Critical",
        description: "Main spindle radial/thrust bearing",
        defaultExpectedLife: 10000,
        defaultInstallationDate: "2023-03-15",
        defaultAvgDailyUsage: 8,
      },
      // Maintenance Trigger (≥100%): expectedLife=5000hrs → 105%=656.25days ago → 2024-07-22
      {
        id: "lathe-002",
        name: "Chuck Jaw Set",
        classification: "Critical",
        description: "3-jaw or 4-jaw workholding jaws",
        defaultExpectedLife: 5000,
        defaultInstallationDate: "2024-07-22",
        defaultAvgDailyUsage: 8,
      },
      // Normal (~40%): expectedLife=16000hrs → 40%=800days ago → 2024-03-05
      {
        id: "lathe-003",
        name: "Turret Indexing Motor",
        classification: "Critical",
        description: "Servo motor for tool turret",
        defaultExpectedLife: 16000,
        defaultInstallationDate: "2024-03-05",
        defaultAvgDailyUsage: 8,
      },
      // Normal (~40%): expectedLife=20000hrs → 40%=1000days ago → 2023-07-13
      {
        id: "lathe-004",
        name: "Ball Screw (Z-axis)",
        classification: "Critical",
        description: "Z-axis lead ball screw",
        defaultExpectedLife: 20000,
        defaultInstallationDate: "2023-07-13",
        defaultAvgDailyUsage: 8,
      },
      // Early Warning (~75%): expectedLife=24000hrs → 75%=2250days ago → 2020-01-15
      {
        id: "lathe-005",
        name: "Encoder (Spindle)",
        classification: "Critical",
        description: "Spindle position encoder",
        defaultExpectedLife: 24000,
        defaultInstallationDate: "2020-01-15",
        defaultAvgDailyUsage: 8,
      },
      {
        id: "lathe-006",
        name: "Cutting Inserts",
        classification: "Consumable",
        description: "Carbide turning inserts",
      },
      {
        id: "lathe-007",
        name: "Coolant (Soluble Oil)",
        classification: "Consumable",
        description: "Metalworking cutting fluid",
      },
      {
        id: "lathe-008",
        name: "Way Lube",
        classification: "Consumable",
        description: "Slideway lubrication oil",
      },
      // Early Warning (~75%): expectedLife=12000hrs → 75%=1125days ago → 2023-01-04
      {
        id: "lathe-009",
        name: "V-Belt (Main Drive)",
        classification: "Critical",
        description: "Main spindle drive belt",
        defaultExpectedLife: 12000,
        defaultInstallationDate: "2023-01-04",
        defaultAvgDailyUsage: 8,
      },
      // Maintenance Trigger (≥100%): expectedLife=16000hrs → 105%=2100days ago → 2020-08-17
      {
        id: "lathe-010",
        name: "Tailstock Quill",
        classification: "Critical",
        description: "Tailstock support quill assembly",
        defaultExpectedLife: 16000,
        defaultInstallationDate: "2020-08-17",
        defaultAvgDailyUsage: 8,
      },
    ],
  },

  // ── CNC Milling Machine ────────────────────────────────────────────────────
  {
    id: "cnc-milling",
    name: "CNC Milling Machine",
    description:
      "Multi-axis machining centre for precision milling, drilling, and boring of complex geometries in metal and composite workpieces.",
    image: "/images/milling.png",
    oee: { availability: 91, performance: 90, quality: 98, oee: 80 },
    kpi: {
      productionOutput: 1200,
      targetOutput: 1300,
      defectRate: 2.5,
      energyConsumption: 200,
    },
    reliability: {
      mtbf: 310,
      mttr: 3.5,
      failureCount: 2,
      maintenanceHours: 7.0,
    },
    pfCurve: {
      pPointDate: "2025-03-10",
      fPointDate: "2025-05-10",
      pfInterval: 60,
      currentCondition: "Normal",
    },
    criticality: {
      score: 68,
      rank: "Medium",
      maintenanceStrategy: "Preventive",
      costWeight: 0.3,
      reliabilityWeight: 0.3,
      uptimeWeight: 0.25,
      utilizationWeight: 0.15,
    },
    maintenance: {
      lastMaintenance: "2025-03-10",
      nextScheduled: "2025-06-10",
      maintenanceType: "Spindle and Axis Check",
      technicianAssigned: "L. Garcia",
    },
    spareParts: [
      // Normal (~40%): expectedLife=20000hrs → 40%=1000days ago → 2023-07-13
      {
        id: "mill-001",
        name: "Spindle Cartridge",
        classification: "Critical",
        description: "High-speed spindle bearing assembly",
        defaultExpectedLife: 20000,
        defaultInstallationDate: "2023-07-13",
        defaultAvgDailyUsage: 8,
      },
      // Early Warning (~75%): expectedLife=8000hrs → 75%=750days ago → 2024-04-24
      {
        id: "mill-002",
        name: "ATC Tool Gripper",
        classification: "Critical",
        description: "Automatic tool changer finger gripper",
        defaultExpectedLife: 8000,
        defaultInstallationDate: "2024-04-24",
        defaultAvgDailyUsage: 8,
      },
      // Degrading (~92%): expectedLife=24000hrs → 92%=2760days ago → 2018-10-12
      {
        id: "mill-003",
        name: "Ball Screw (X-axis)",
        classification: "Critical",
        description: "X-axis linear ball screw",
        defaultExpectedLife: 24000,
        defaultInstallationDate: "2018-10-12",
        defaultAvgDailyUsage: 8,
      },
      // Maintenance Trigger (≥100%): expectedLife=24000hrs → 105%=3150days ago → 2017-09-22
      {
        id: "mill-004",
        name: "Ball Screw (Y-axis)",
        classification: "Critical",
        description: "Y-axis linear ball screw",
        defaultExpectedLife: 24000,
        defaultInstallationDate: "2017-09-22",
        defaultAvgDailyUsage: 8,
      },
      // Normal (~40%): expectedLife=30000hrs → 40%=1500days ago → 2022-02-14
      {
        id: "mill-005",
        name: "Servo Drive (Z-axis)",
        classification: "Critical",
        description: "Z-axis servo amplifier/drive",
        defaultExpectedLife: 30000,
        defaultInstallationDate: "2022-02-14",
        defaultAvgDailyUsage: 8,
      },
      {
        id: "mill-006",
        name: "End Mills / Face Mills",
        classification: "Consumable",
        description: "Carbide milling cutters",
      },
      {
        id: "mill-007",
        name: "Coolant Fluid",
        classification: "Consumable",
        description: "Flood/mist coolant",
      },
      {
        id: "mill-008",
        name: "Air Filter Element",
        classification: "Consumable",
        description: "Pneumatic system filter",
      },
      // Degrading (~92%): expectedLife=24000hrs → 92%=2760days ago → 2018-10-12
      {
        id: "mill-009",
        name: "Linear Guide Block",
        classification: "Critical",
        description: "Axis linear guide carriage block",
        defaultExpectedLife: 24000,
        defaultInstallationDate: "2018-10-12",
        defaultAvgDailyUsage: 8,
      },
      // Early Warning (~75%): expectedLife=16000hrs → 75%=1500days ago → 2022-02-14
      {
        id: "mill-010",
        name: "Coolant Pump",
        classification: "Critical",
        description: "Cutting fluid circulation pump",
        defaultExpectedLife: 16000,
        defaultInstallationDate: "2022-02-14",
        defaultAvgDailyUsage: 8,
      },
    ],
  },

  // ── CNC Controller ─────────────────────────────────────────────────────────
  {
    id: "cnc-controller",
    name: "CNC Controller",
    description:
      "Central computational unit that interprets G-code and M-code programs and coordinates all machine axes, spindle, and auxiliary functions.",
    image: "/images/controller.png",
    oee: { availability: 99, performance: 99, quality: 100, oee: 98 },
    kpi: {
      productionOutput: 0,
      targetOutput: 0,
      defectRate: 0.0,
      energyConsumption: 12,
    },
    reliability: {
      mtbf: 8760,
      mttr: 6.0,
      failureCount: 0,
      maintenanceHours: 0,
    },
    pfCurve: {
      pPointDate: "2024-01-01",
      fPointDate: "2026-01-01",
      pfInterval: 730,
      currentCondition: "Normal",
    },
    criticality: {
      score: 90,
      rank: "High",
      maintenanceStrategy: "Predictive",
      costWeight: 0.2,
      reliabilityWeight: 0.4,
      uptimeWeight: 0.3,
      utilizationWeight: 0.1,
    },
    maintenance: {
      lastMaintenance: "2024-12-01",
      nextScheduled: "2025-06-01",
      maintenanceType: "Firmware & Diagnostics",
      technicianAssigned: "E. Villanueva",
    },
    spareParts: [
      // Normal (~40%): expectedLife=50000hrs → 40%=2500days ago → 2019-07-28
      {
        id: "ctrl-001",
        name: "CPU / Motherboard Module",
        classification: "Critical",
        description: "Main processing board of the CNC controller",
        defaultExpectedLife: 50000,
        defaultInstallationDate: "2019-07-28",
        defaultAvgDailyUsage: 8,
      },
      // Early Warning (~75%): expectedLife=30000hrs → 75%=2812.5days ago → 2018-07-05
      {
        id: "ctrl-002",
        name: "Servo Drive Module",
        classification: "Critical",
        description: "Axis servo amplifier card",
        defaultExpectedLife: 30000,
        defaultInstallationDate: "2018-07-05",
        defaultAvgDailyUsage: 8,
      },
      // Degrading (~92%): expectedLife=30000hrs → 92%=3450days ago → 2016-12-22
      {
        id: "ctrl-003",
        name: "I/O Interface Board",
        classification: "Critical",
        description: "Digital/analog I/O expansion board",
        defaultExpectedLife: 30000,
        defaultInstallationDate: "2016-12-22",
        defaultAvgDailyUsage: 8,
      },
      // Maintenance Trigger (≥100%): expectedLife=8760hrs → 105%=1148.4days ago → 2023-01-16
      {
        id: "ctrl-004",
        name: "CMOS Battery",
        classification: "Critical",
        description: "Retains parameters on power loss",
        defaultExpectedLife: 8760,
        defaultInstallationDate: "2023-01-16",
        defaultAvgDailyUsage: 8,
      },
      // Normal (~40%): expectedLife=30000hrs → 40%=1500days ago → 2022-02-14
      {
        id: "ctrl-005",
        name: "Memory Card / SSD",
        classification: "Critical",
        description: "Program and OS storage media",
        defaultExpectedLife: 30000,
        defaultInstallationDate: "2022-02-14",
        defaultAvgDailyUsage: 8,
      },
      // Maintenance Trigger (≥100%): expectedLife=17520hrs → 105%=2296.9days ago → 2019-11-28
      {
        id: "ctrl-006",
        name: "Cooling Fan (Control Cabinet)",
        classification: "Critical",
        description: "Cabinet internal ventilation fan",
        defaultExpectedLife: 17520,
        defaultInstallationDate: "2019-11-28",
        defaultAvgDailyUsage: 8,
      },
      {
        id: "ctrl-007",
        name: "Air Filter (Cabinet)",
        classification: "Consumable",
        description: "Cabinet air inlet filter",
      },
      {
        id: "ctrl-008",
        name: "Fuses / Circuit Breakers",
        classification: "Consumable",
        description: "Electrical protection components",
      },
      // Early Warning (~75%): expectedLife=30000hrs → 75%=2812.5days ago → 2018-07-05
      {
        id: "ctrl-009",
        name: "Encoder Cable Set",
        classification: "Critical",
        description: "Shielded encoder signal cables",
        defaultExpectedLife: 30000,
        defaultInstallationDate: "2018-07-05",
        defaultAvgDailyUsage: 8,
      },
      // Degrading (~92%): expectedLife=17520hrs → 92%=2014.8days ago → 2020-10-27
      {
        id: "ctrl-010",
        name: "Power Supply Unit",
        classification: "Critical",
        description: "24 VDC regulated controller PSU",
        defaultExpectedLife: 17520,
        defaultInstallationDate: "2020-10-27",
        defaultAvgDailyUsage: 8,
      },
    ],
  },
];

export function getMachineById(id: string): Machine | undefined {
  return machines.find((m) => m.id === id);
}
