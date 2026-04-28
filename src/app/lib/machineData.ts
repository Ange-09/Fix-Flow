// lib/machineData.ts — single source of truth for all static machine records

// Today = April 28, 2026
// Condition thresholds: elapsed/pfInterval >= 0.8 → Trigger, >= 0.7 → Degrading, >= 0.6 → Early Warning, else Normal
//
// Formula to target a condition given pfInterval:
//   Normal          → pDate such that elapsed < 0.60 * pfInterval  → use 0.40 * pfInterval days ago
//   Early Warning   → elapsed = 0.65 * pfInterval days ago
//   Degrading       → elapsed = 0.75 * pfInterval days ago
//   Maintenance Trigger → elapsed = 0.90 * pfInterval days ago

export interface SparePart {
  id: string;
  name: string;
  classification: "Critical" | "Consumable";
  description?: string;
  defaultPDate?: string; // ISO date string YYYY-MM-DD, optional pre-fill
  defaultPFInterval?: number; // days
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
  currentCondition: "Normal" | "Early Warning" | "Degrading" | "Failure Imminent";
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
  {
    id: "cnc-plasma",
    name: "CNC Plasma Cutting Machine",
    description:
      "High-precision plasma cutting system used for cutting electrically conductive materials with a high-velocity jet of ionised gas.",
    image: "/images/pcutter.png",
    oee: { availability: 87, performance: 91, quality: 96, oee: 76 },
    kpi: { productionOutput: 1840, targetOutput: 2000, defectRate: 4.0, energyConsumption: 320 },
    reliability: { mtbf: 210, mttr: 4.2, failureCount: 3, maintenanceHours: 12.6 },
    pfCurve: { pPointDate: "2025-03-01", fPointDate: "2025-04-30", pfInterval: 60, currentCondition: "Early Warning" },
    criticality: { score: 78, rank: "High", maintenanceStrategy: "Predictive", costWeight: 0.35, reliabilityWeight: 0.30, uptimeWeight: 0.25, utilizationWeight: 0.10 },
    maintenance: { lastMaintenance: "2025-02-14", nextScheduled: "2025-05-14", maintenanceType: "Predictive Inspection", technicianAssigned: "J. Santos" },
    spareParts: [
      // Normal:   elapsed = 0.40 * 45 = 18 days ago  → pDate = Apr 10, 2026
      { id: "plasma-001", name: "Plasma Torch Electrode",  classification: "Critical",    description: "Main current-carrying electrode",          defaultPFInterval: 45,  defaultPDate: "2026-04-10" },
      // Early Warning: elapsed = 0.65 * 30 = 19.5 → 20 days ago → Apr 8, 2026
      { id: "plasma-002", name: "Nozzle / Tip",            classification: "Critical",    description: "Controls plasma arc shape",                defaultPFInterval: 30,  defaultPDate: "2026-04-08" },
      // Degrading: elapsed = 0.75 * 40 = 30 days ago → Mar 29, 2026
      { id: "plasma-003", name: "Shield Cap",              classification: "Critical",    description: "Protects nozzle from spatter",             defaultPFInterval: 40,  defaultPDate: "2026-03-29" },
      // Maintenance Trigger: elapsed = 0.90 * 180 = 162 days ago → Nov 17, 2025
      { id: "plasma-004", name: "Drive Motor (X-axis)",    classification: "Critical",    description: "CNC gantry X-axis servo motor",            defaultPFInterval: 180, defaultPDate: "2025-11-17" },
      // Normal: elapsed = 0.40 * 180 = 72 days ago → Feb 15, 2026
      { id: "plasma-005", name: "Drive Motor (Y-axis)",    classification: "Critical",    description: "CNC gantry Y-axis servo motor",            defaultPFInterval: 180, defaultPDate: "2026-02-15" },
      { id: "plasma-006", name: "Cutting Gas Filter",      classification: "Consumable",  description: "Filters cutting gas supply" },
      { id: "plasma-007", name: "Coolant Fluid",           classification: "Consumable",  description: "Torch cooling system fluid" },
      { id: "plasma-008", name: "Anti-spatter Spray",      classification: "Consumable",  description: "Prevents spatter adhesion on bed" },
      // Early Warning: elapsed = 0.65 * 365 = 237 days ago → Sep 3, 2025
      { id: "plasma-009", name: "Linear Guide Rail",       classification: "Critical",    description: "Gantry guide rail assembly",               defaultPFInterval: 365, defaultPDate: "2025-09-03" },
      // Degrading: elapsed = 0.75 * 90 = 67.5 → 68 days ago → Feb 19, 2026
      { id: "plasma-010", name: "Height Control Sensor",   classification: "Critical",    description: "Automatic torch height controller",        defaultPFInterval: 90,  defaultPDate: "2026-02-19" },
    ],
  },
  {
    id: "cnc-laser",
    name: "CNC Laser Cutting Machine",
    description:
      "CO₂ or fibre laser cutting system capable of high-speed, high-precision cuts on metals, plastics, and composites.",
    image: "/images/lcutter.png",
    oee: { availability: 92, performance: 88, quality: 98, oee: 79 },
    kpi: { productionOutput: 2100, targetOutput: 2200, defectRate: 2.0, energyConsumption: 280 },
    reliability: { mtbf: 340, mttr: 3.1, failureCount: 2, maintenanceHours: 6.2 },
    pfCurve: { pPointDate: "2025-02-15", fPointDate: "2025-04-15", pfInterval: 60, currentCondition: "Degrading" },
    criticality: { score: 82, rank: "High", maintenanceStrategy: "Predictive", costWeight: 0.40, reliabilityWeight: 0.25, uptimeWeight: 0.25, utilizationWeight: 0.10 },
    maintenance: { lastMaintenance: "2025-02-01", nextScheduled: "2025-05-01", maintenanceType: "Optical Alignment Check", technicianAssigned: "M. Reyes" },
    spareParts: [
      // Maintenance Trigger: elapsed = 0.90 * 60 = 54 days ago → Mar 5, 2026
      { id: "laser-001", name: "Laser Focusing Lens",      classification: "Critical",    description: "ZnSe or fused silica focusing optic",      defaultPFInterval: 60,  defaultPDate: "2026-03-05" },
      // Normal: elapsed = 0.40 * 90 = 36 days ago → Mar 23, 2026
      { id: "laser-002", name: "Beam Delivery Mirror",     classification: "Critical",    description: "Gold-coated reflective mirror",            defaultPFInterval: 90,  defaultPDate: "2026-03-23" },
      // Normal: elapsed = 0.40 * 720 = 288 days ago → Jul 14, 2025
      { id: "laser-003", name: "Laser Source / Tube",      classification: "Critical",    description: "CO₂ or fibre laser generator",             defaultPFInterval: 720, defaultPDate: "2025-07-14" },
      // Early Warning: elapsed = 0.65 * 30 = 19.5 → 20 days ago → Apr 8, 2026
      { id: "laser-004", name: "Nozzle",                   classification: "Critical",    description: "Assist gas delivery nozzle",               defaultPFInterval: 30,  defaultPDate: "2026-04-08" },
      // Degrading: elapsed = 0.75 * 360 = 270 days ago → Aug 1, 2025
      { id: "laser-005", name: "X/Y Linear Servo Motor",   classification: "Critical",    description: "Precision servo drive for cutting head",   defaultPFInterval: 360, defaultPDate: "2025-08-01" },
      { id: "laser-006", name: "Chiller Filter",           classification: "Consumable",  description: "Water cooling circuit filter" },
      { id: "laser-007", name: "Assist Gas (N₂/O₂)",      classification: "Consumable",  description: "Assist gas cylinders" },
      { id: "laser-008", name: "Lens Cleaning Wipes",      classification: "Consumable",  description: "Optics-grade cleaning supplies" },
      { id: "laser-009", name: "Dust Collector Filter",    classification: "Consumable",  description: "Fume extraction system filter" },
      // Maintenance Trigger: elapsed = 0.90 * 180 = 162 days ago → Nov 17, 2025
      { id: "laser-010", name: "Drive Belt / Rack",        classification: "Critical",    description: "Motion transmission belt or gear rack",    defaultPFInterval: 180, defaultPDate: "2025-11-17" },
    ],
  },
  {
    id: "cnc-lathe",
    name: "CNC Lathe Machine",
    description:
      "Computer-controlled turning centre for producing cylindrical, conical, and profiled parts through rotating workpiece operations.",
    image: "/images/lathe.png",
    oee: { availability: 89, performance: 93, quality: 97, oee: 80 },
    kpi: { productionOutput: 950, targetOutput: 1000, defectRate: 3.0, energyConsumption: 150 },
    reliability: { mtbf: 280, mttr: 3.8, failureCount: 2, maintenanceHours: 7.6 },
    pfCurve: { pPointDate: "2025-01-20", fPointDate: "2025-04-20", pfInterval: 90, currentCondition: "Failure Imminent" },
    criticality: { score: 71, rank: "High", maintenanceStrategy: "Preventive", costWeight: 0.30, reliabilityWeight: 0.35, uptimeWeight: 0.25, utilizationWeight: 0.10 },
    maintenance: { lastMaintenance: "2025-01-20", nextScheduled: "2025-04-20", maintenanceType: "Spindle Bearing Inspection", technicianAssigned: "R. Cruz" },
    spareParts: [
      // Degrading: elapsed = 0.75 * 180 = 135 days ago → Dec 14, 2025
      { id: "lathe-001", name: "Spindle Bearing",          classification: "Critical",    description: "Main spindle radial/thrust bearing",       defaultPFInterval: 180, defaultPDate: "2025-12-14" },
      // Maintenance Trigger: elapsed = 0.90 * 120 = 108 days ago → Jan 10, 2026
      { id: "lathe-002", name: "Chuck Jaw Set",            classification: "Critical",    description: "3-jaw or 4-jaw workholding jaws",          defaultPFInterval: 120, defaultPDate: "2026-01-10" },
      // Normal: elapsed = 0.40 * 365 = 146 days ago → Dec 3, 2025
      { id: "lathe-003", name: "Turret Indexing Motor",    classification: "Critical",    description: "Servo motor for tool turret",              defaultPFInterval: 365, defaultPDate: "2025-12-03" },
      // Normal: elapsed = 0.40 * 540 = 216 days ago → Sep 24, 2025
      { id: "lathe-004", name: "Ball Screw (Z-axis)",      classification: "Critical",    description: "Z-axis lead ball screw",                   defaultPFInterval: 540, defaultPDate: "2025-09-24" },
      // Early Warning: elapsed = 0.65 * 730 = 474.5 → 475 days ago → Jan 8, 2025
      { id: "lathe-005", name: "Encoder (Spindle)",        classification: "Critical",    description: "Spindle position encoder",                 defaultPFInterval: 730, defaultPDate: "2025-01-08" },
      { id: "lathe-006", name: "Cutting Inserts",          classification: "Consumable",  description: "Carbide turning inserts" },
      { id: "lathe-007", name: "Coolant (Soluble Oil)",    classification: "Consumable",  description: "Metalworking cutting fluid" },
      { id: "lathe-008", name: "Way Lube",                 classification: "Consumable",  description: "Slideway lubrication oil" },
      // Early Warning: elapsed = 0.65 * 360 = 234 days ago → Sep 6, 2025
      { id: "lathe-009", name: "V-Belt (Main Drive)",      classification: "Critical",    description: "Main spindle drive belt",                  defaultPFInterval: 360, defaultPDate: "2025-09-06" },
      // Maintenance Trigger: elapsed = 0.90 * 365 = 328.5 → 329 days ago → Jun 3, 2025
      { id: "lathe-010", name: "Tailstock Quill",          classification: "Critical",    description: "Tailstock support quill assembly",         defaultPFInterval: 365, defaultPDate: "2025-06-03" },
    ],
  },
  {
    id: "cnc-milling",
    name: "CNC Milling Machine",
    description:
      "Multi-axis machining centre for precision milling, drilling, and boring of complex geometries in metal and composite workpieces.",
    image: "/images/milling.png",
    oee: { availability: 91, performance: 90, quality: 98, oee: 80 },
    kpi: { productionOutput: 1200, targetOutput: 1300, defectRate: 2.5, energyConsumption: 200 },
    reliability: { mtbf: 310, mttr: 3.5, failureCount: 2, maintenanceHours: 7.0 },
    pfCurve: { pPointDate: "2025-03-10", fPointDate: "2025-05-10", pfInterval: 60, currentCondition: "Normal" },
    criticality: { score: 68, rank: "Medium", maintenanceStrategy: "Preventive", costWeight: 0.30, reliabilityWeight: 0.30, uptimeWeight: 0.25, utilizationWeight: 0.15 },
    maintenance: { lastMaintenance: "2025-03-10", nextScheduled: "2025-06-10", maintenanceType: "Spindle and Axis Check", technicianAssigned: "L. Garcia" },
    spareParts: [
      // Normal: elapsed = 0.40 * 540 = 216 days ago → Sep 24, 2025
      { id: "mill-001", name: "Spindle Cartridge",         classification: "Critical",    description: "High-speed spindle bearing assembly",      defaultPFInterval: 540, defaultPDate: "2025-09-24" },
      // Early Warning: elapsed = 0.65 * 180 = 117 days ago → Jan 1, 2026
      { id: "mill-002", name: "ATC Tool Gripper",          classification: "Critical",    description: "Automatic tool changer finger gripper",    defaultPFInterval: 180, defaultPDate: "2026-01-01" },
      // Degrading: elapsed = 0.75 * 720 = 540 days ago → Oct 5, 2024
      { id: "mill-003", name: "Ball Screw (X-axis)",       classification: "Critical",    description: "X-axis linear ball screw",                 defaultPFInterval: 720, defaultPDate: "2024-10-05" },
      // Maintenance Trigger: elapsed = 0.90 * 720 = 648 days ago → Jun 19, 2024
      { id: "mill-004", name: "Ball Screw (Y-axis)",       classification: "Critical",    description: "Y-axis linear ball screw",                 defaultPFInterval: 720, defaultPDate: "2024-06-19" },
      // Normal: elapsed = 0.40 * 1095 = 438 days ago → Feb 24, 2025
      { id: "mill-005", name: "Servo Drive (Z-axis)",      classification: "Critical",    description: "Z-axis servo amplifier/drive",             defaultPFInterval: 1095, defaultPDate: "2025-02-24" },
      { id: "mill-006", name: "End Mills / Face Mills",    classification: "Consumable",  description: "Carbide milling cutters" },
      { id: "mill-007", name: "Coolant Fluid",             classification: "Consumable",  description: "Flood/mist coolant" },
      { id: "mill-008", name: "Air Filter Element",        classification: "Consumable",  description: "Pneumatic system filter" },
      // Degrading: elapsed = 0.75 * 720 = 540 days ago → Oct 5, 2024
      { id: "mill-009", name: "Linear Guide Block",        classification: "Critical",    description: "Axis linear guide carriage block",         defaultPFInterval: 720, defaultPDate: "2024-10-05" },
      // Early Warning: elapsed = 0.65 * 365 = 237 days ago → Sep 3, 2025
      { id: "mill-010", name: "Coolant Pump",              classification: "Critical",    description: "Cutting fluid circulation pump",           defaultPFInterval: 365, defaultPDate: "2025-09-03" },
    ],
  },
  {
    id: "cnc-controller",
    name: "CNC Controller",
    description:
      "Central computational unit that interprets G-code and M-code programs and coordinates all machine axes, spindle, and auxiliary functions.",
    image: "/images/controller.png",
    oee: { availability: 99, performance: 99, quality: 100, oee: 98 },
    kpi: { productionOutput: 0, targetOutput: 0, defectRate: 0.0, energyConsumption: 12 },
    reliability: { mtbf: 8760, mttr: 6.0, failureCount: 0, maintenanceHours: 0 },
    pfCurve: { pPointDate: "2024-01-01", fPointDate: "2026-01-01", pfInterval: 730, currentCondition: "Normal" },
    criticality: { score: 90, rank: "High", maintenanceStrategy: "Predictive", costWeight: 0.20, reliabilityWeight: 0.40, uptimeWeight: 0.30, utilizationWeight: 0.10 },
    maintenance: { lastMaintenance: "2024-12-01", nextScheduled: "2025-06-01", maintenanceType: "Firmware & Diagnostics", technicianAssigned: "E. Villanueva" },
    spareParts: [
      // Normal: elapsed = 0.40 * 1825 = 730 days ago → Apr 28, 2024
      { id: "ctrl-001", name: "CPU / Motherboard Module",       classification: "Critical",    description: "Main processing board of the CNC controller", defaultPFInterval: 1825, defaultPDate: "2024-04-28" },
      // Early Warning: elapsed = 0.65 * 1095 = 711.75 → 712 days ago → May 11, 2024
      { id: "ctrl-002", name: "Servo Drive Module",             classification: "Critical",    description: "Axis servo amplifier card",                   defaultPFInterval: 1095, defaultPDate: "2024-05-11" },
      // Degrading: elapsed = 0.75 * 1095 = 821.25 → 821 days ago → Jan 21, 2024
      { id: "ctrl-003", name: "I/O Interface Board",            classification: "Critical",    description: "Digital/analog I/O expansion board",          defaultPFInterval: 1095, defaultPDate: "2024-01-21" },
      // Maintenance Trigger: elapsed = 0.90 * 730 = 657 days ago → Jun 10, 2024
      { id: "ctrl-004", name: "CMOS Battery",                   classification: "Critical",    description: "Retains parameters on power loss",            defaultPFInterval: 730,  defaultPDate: "2024-06-10" },
      // Normal: elapsed = 0.40 * 1095 = 438 days ago → Feb 24, 2025
      { id: "ctrl-005", name: "Memory Card / SSD",              classification: "Critical",    description: "Program and OS storage media",                defaultPFInterval: 1095, defaultPDate: "2025-02-24" },
      // Maintenance Trigger: elapsed = 0.90 * 365 = 328.5 → 329 days ago → Jun 3, 2025
      { id: "ctrl-006", name: "Cooling Fan (Control Cabinet)",  classification: "Critical",    description: "Cabinet internal ventilation fan",            defaultPFInterval: 365,  defaultPDate: "2025-06-03" },
      { id: "ctrl-007", name: "Air Filter (Cabinet)",           classification: "Consumable",  description: "Cabinet air inlet filter" },
      { id: "ctrl-008", name: "Fuses / Circuit Breakers",       classification: "Consumable",  description: "Electrical protection components" },
      // Early Warning: elapsed = 0.65 * 1095 = 711.75 → 712 days ago → May 11, 2024
      { id: "ctrl-009", name: "Encoder Cable Set",              classification: "Critical",    description: "Shielded encoder signal cables",              defaultPFInterval: 1095, defaultPDate: "2024-05-11" },
      // Degrading: elapsed = 0.75 * 730 = 547.5 → 548 days ago → Oct 27, 2024
      { id: "ctrl-010", name: "Power Supply Unit",              classification: "Critical",    description: "24 VDC regulated controller PSU",             defaultPFInterval: 730,  defaultPDate: "2024-10-27" },
    ],
  },
];

export function getMachineById(id: string): Machine | undefined {
  return machines.find((m) => m.id === id);
}