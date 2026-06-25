import { CarDefinition, RaceCourse, Achievement, PlayerProfile, PerformanceUpgrades } from "./types";

export const CARS_LIST: CarDefinition[] = [
  {
    id: "bolt_hatch",
    name: "Bolt City Hatchback",
    type: "hatchback",
    basePrice: 0, // Starter car
    unlockLevel: 1,
    baseStats: {
      speed: 40,
      acceleration: 45,
      handling: 65,
      braking: 50,
      nitro: 40
    },
    color: "#eab308", // Yellow
    meshStyle: {
      bodyHeight: 1.1,
      bodyWidth: 1.6,
      bodyLength: 3.5,
      wheelRadius: 0.35,
      wheelWidth: 0.25,
      spoilerHeight: 0,
      hasRoof: true
    }
  },
  {
    id: "reaper_gt",
    name: "Reaper GT-R",
    type: "sport",
    basePrice: 25000,
    unlockLevel: 2,
    baseStats: {
      speed: 65,
      acceleration: 60,
      handling: 70,
      braking: 60,
      nitro: 55
    },
    color: "#dc2626", // Red
    meshStyle: {
      bodyHeight: 0.9,
      bodyWidth: 1.8,
      bodyLength: 4.2,
      wheelRadius: 0.4,
      wheelWidth: 0.3,
      spoilerHeight: 0.15,
      hasRoof: true
    }
  },
  {
    id: "specter_ev",
    name: "Specter Electric-V",
    type: "sport",
    basePrice: 55000,
    unlockLevel: 3,
    baseStats: {
      speed: 75,
      acceleration: 85,
      handling: 60,
      braking: 75,
      nitro: 50
    },
    color: "#2563eb", // Blue
    meshStyle: {
      bodyHeight: 0.85,
      bodyWidth: 1.85,
      bodyLength: 4.3,
      wheelRadius: 0.42,
      wheelWidth: 0.32,
      spoilerHeight: 0.1,
      hasRoof: true
    }
  },
  {
    id: "apex_hyper",
    name: "Apex SV Hypercar",
    type: "supercar",
    basePrice: 120000,
    unlockLevel: 5,
    baseStats: {
      speed: 95,
      acceleration: 90,
      handling: 85,
      braking: 85,
      nitro: 80
    },
    color: "#16a34a", // Green
    meshStyle: {
      bodyHeight: 0.75,
      bodyWidth: 2.0,
      bodyLength: 4.6,
      wheelRadius: 0.45,
      wheelWidth: 0.35,
      spoilerHeight: 0.2,
      hasRoof: true
    }
  },
  {
    id: "vortex_interceptor",
    name: "Vortex Interceptor",
    type: "supercar",
    basePrice: 180000,
    unlockLevel: 6,
    baseStats: {
      speed: 100,
      acceleration: 95,
      handling: 90,
      braking: 90,
      nitro: 95
    },
    color: "#0f172a", // Dark Slate / Carbon
    meshStyle: {
      bodyHeight: 0.75,
      bodyWidth: 2.05,
      bodyLength: 4.7,
      wheelRadius: 0.46,
      wheelWidth: 0.36,
      spoilerHeight: 0.25,
      hasRoof: false
    }
  }
];

// Race Track Coordinates Design (Centered around grid)
// We will have a 3D city represented dynamically. Our map bounds are roughly -500 to +500 in x and z.
// Checkpoints are designated as (x, z, width).
export const RACES_LIST: RaceCourse[] = [
  {
    id: "downtown_sprint",
    name: "Downtown Grid Sprint",
    description: "Navigate through tight urban canyons in the financial center.",
    type: "sprint",
    laps: 1,
    difficulty: "easy",
    rewardMoney: 1200,
    rewardXP: 150,
    checkpoints: [
      { x: 0, z: 200, width: 30 },
      { x: 150, z: 150, width: 30 },
      { x: 300, z: 50, width: 30 },
      { x: 250, z: -150, width: 30 },
      { x: 50, z: -300, width: 30 },
      { x: -150, z: -350, width: 30 },
      { x: -300, z: -150, width: 35 },
      { x: -200, z: 100, width: 30 },
      { x: -50, z: 250, width: 30 }
    ]
  },
  {
    id: "highway_drag",
    name: "Industrial Highway Drag",
    description: "A straight-line pure speed test down the industrial bypass canal.",
    type: "drag",
    laps: 1,
    difficulty: "easy",
    rewardMoney: 800,
    rewardXP: 100,
    checkpoints: [
      { x: -400, z: -200, width: 25 },
      { x: -300, z: -200, width: 25 },
      { x: -100, z: -200, width: 25 },
      { x: 100, z: -200, width: 25 },
      { x: 300, z: -200, width: 25 },
      { x: 450, z: -200, width: 25 }
    ]
  },
  {
    id: "sunset_circuit",
    name: "Sunset Marina Circuit",
    description: "Challenging curves and ocean views around the coastal highway.",
    type: "circuit",
    laps: 2,
    difficulty: "medium",
    rewardMoney: 3200,
    rewardXP: 400,
    checkpoints: [
      { x: 0, z: 0, width: 30 },
      { x: 100, z: 120, width: 30 },
      { x: 250, z: 200, width: 30 },
      { x: 350, z: 100, width: 30 },
      { x: 280, z: -100, width: 30 },
      { x: 150, z: -250, width: 30 },
      { x: -50, z: -250, width: 30 },
      { x: -200, z: -150, width: 30 },
      { x: -300, z: 50, width: 30 },
      { x: -180, z: 220, width: 30 },
      { x: -50, z: 100, width: 30 }
    ]
  },
  {
    id: "industrial_trial",
    name: "Industrial Time Attack",
    description: "Tight hairpins and narrow pathways through the factory district.",
    type: "time_trial",
    laps: 1,
    difficulty: "hard",
    rewardMoney: 4500,
    rewardXP: 600,
    checkpoints: [
      { x: 300, z: 300, width: 20 },
      { x: 350, z: 100, width: 20 },
      { x: 200, z: 50, width: 20 },
      { x: 100, z: -100, width: 20 },
      { x: 250, z: -200, width: 20 },
      { x: 150, z: -350, width: 20 },
      { x: -100, z: -300, width: 20 },
      { x: -200, z: -100, width: 20 },
      { x: -350, z: -50, width: 20 },
      { x: -400, z: 150, width: 20 },
      { x: -200, z: 300, width: 20 },
      { x: 50, z: 200, width: 20 }
    ]
  },
  {
    id: "metropolitan_gp",
    name: "Metropolitan Grand Prix",
    description: "Ultimate high-stakes 3-lap circuit wrapping the entire street grid.",
    type: "circuit",
    laps: 3,
    difficulty: "hard",
    rewardMoney: 8000,
    rewardXP: 1000,
    checkpoints: [
      { x: 0, z: 150, width: 35 },
      { x: 200, z: 300, width: 35 },
      { x: 400, z: 150, width: 35 },
      { x: 350, z: -150, width: 35 },
      { x: 150, z: -350, width: 35 },
      { x: -150, z: -350, width: 35 },
      { x: -350, z: -150, width: 35 },
      { x: -400, z: 150, width: 35 },
      { x: -200, z: 300, width: 35 }
    ]
  }
];

export const UPGRADES_CONFIG = {
  engine: [
    { level: 0, cost: 0, multiplier: 1.0 },
    { level: 1, cost: 2500, multiplier: 1.08 },
    { level: 2, cost: 6000, multiplier: 1.16 },
    { level: 3, cost: 12000, multiplier: 1.25 },
    { level: 4, cost: 22000, multiplier: 1.35 },
    { level: 5, cost: 40000, multiplier: 1.50 }
  ],
  turbo: [
    { level: 0, cost: 0, multiplier: 1.0 },
    { level: 1, cost: 3000, multiplier: 1.10 },
    { level: 2, cost: 7500, multiplier: 1.22 },
    { level: 3, cost: 15000, multiplier: 1.35 },
    { level: 4, cost: 28000, multiplier: 1.50 },
    { level: 5, cost: 50000, multiplier: 1.70 }
  ],
  tires: [
    { level: 0, cost: 0, multiplier: 1.0 },
    { level: 1, cost: 1500, multiplier: 1.06 },
    { level: 2, cost: 4000, multiplier: 1.12 },
    { level: 3, cost: 9000, multiplier: 1.20 },
    { level: 4, cost: 16000, multiplier: 1.30 },
    { level: 5, cost: 30000, multiplier: 1.45 }
  ],
  suspension: [
    { level: 0, cost: 0, multiplier: 1.0 },
    { level: 1, cost: 1200, multiplier: 1.05 },
    { level: 2, cost: 3200, multiplier: 1.11 },
    { level: 3, cost: 7000, multiplier: 1.18 },
    { level: 4, cost: 13000, multiplier: 1.26 },
    { level: 5, cost: 25000, multiplier: 1.38 }
  ],
  nitro: [
    { level: 0, cost: 0, multiplier: 1.0 },
    { level: 1, cost: 2000, multiplier: 1.15 },
    { level: 2, cost: 5000, multiplier: 1.30 },
    { level: 3, cost: 10000, multiplier: 1.50 },
    { level: 4, cost: 18000, multiplier: 1.75 },
    { level: 5, cost: 32000, multiplier: 2.10 }
  ]
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: "first_win",
    title: "Street Royalty Initiate",
    description: "Win your very first race.",
    xpReward: 150,
    moneyReward: 1000,
    type: "win",
    requirement: 1
  },
  {
    id: "all_cars",
    title: "Fleet Master",
    description: "Own 3 or more cars at the same time.",
    xpReward: 500,
    moneyReward: 5000,
    type: "win",
    requirement: 3
  },
  {
    id: "speed_demon",
    title: "Sound Barrier Broken",
    description: "Reach a speed of 120 MPH.",
    xpReward: 200,
    moneyReward: 1500,
    type: "speed",
    requirement: 120
  },
  {
    id: "drift_king",
    title: "Drift Dynasty",
    description: "Perform a continuous drift of 4 seconds or more.",
    xpReward: 300,
    moneyReward: 2000,
    type: "drift",
    requirement: 4
  },
  {
    id: "cops_escape",
    title: "Ghost of the Streets",
    description: "Escape a level 3 or higher Police chase.",
    xpReward: 400,
    moneyReward: 3000,
    type: "police",
    requirement: 3
  },
  {
    id: "fully_loaded",
    title: "Apex Engineering",
    description: "Have at least one performance upgrade fully maxed (Level 5).",
    xpReward: 300,
    moneyReward: 2500,
    type: "customization",
    requirement: 5
  },
  {
    id: "big_saver",
    title: "Millionaire's Club",
    description: "Amass a bankroll of $50,000.",
    xpReward: 600,
    moneyReward: 5000,
    type: "level",
    requirement: 50000
  }
];

export const INITIAL_PROFILE: PlayerProfile = {
  money: 5000, // Healthy starting cash to allow customizing early!
  xp: 0,
  level: 1,
  ownedCars: ["bolt_hatch"],
  selectedCarId: "bolt_hatch",
  carsConfig: {
    bolt_hatch: {
      carId: "bolt_hatch",
      upgrades: { engine: 0, turbo: 0, tires: 0, suspension: 0, nitro: 0 },
      customization: {
        paintColor: "#eab308",
        neonColor: "",
        spoilerType: "none",
        rimsType: "stock",
        neonEnabled: false
      }
    }
  },
  completedRaces: [],
  achievements: []
};
