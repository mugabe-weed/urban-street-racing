/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CarStats {
  speed: number;        // Max speed (0-100 scale for UI)
  acceleration: number; // Accel rate (0-100 scale for UI)
  handling: number;     // Grip & cornering (0-100 scale for UI)
  braking: number;      // Brake force (0-100 scale for UI)
  nitro: number;        // Nitro duration/recharge (0-100 scale for UI)
}

export interface UpgradeLevel {
  level: number;
  cost: number;
  multiplier: number; // percentage improvement (e.g. 1.1 = +10%)
}

export interface PerformanceUpgrades {
  engine: number;     // level 0 (stock) to 5
  turbo: number;      // level 0 to 5
  tires: number;      // level 0 to 5
  suspension: number; // level 0 to 5
  nitro: number;      // level 0 to 5
}

export interface VisualCustomization {
  paintColor: string;     // Hex color code (e.g., "#FF0000")
  neonColor: string;      // Hex color code (e.g., "#00FF00" or "" for none)
  spoilerType: string;    // "none" | "sports" | "gt_wing"
  rimsType: string;       // "stock" | "alloy" | "chrome"
  neonEnabled: boolean;
}

export interface CarDefinition {
  id: string;
  name: string;
  type: "hatchback" | "sport" | "supercar";
  basePrice: number;
  unlockLevel: number;
  baseStats: CarStats;
  color: string; // Default visual color
  meshStyle: {
    bodyHeight: number;
    bodyWidth: number;
    bodyLength: number;
    wheelRadius: number;
    wheelWidth: number;
    spoilerHeight: number;
    hasRoof: boolean;
  };
}

export interface PlayerCarState {
  carId: string;
  upgrades: PerformanceUpgrades;
  customization: VisualCustomization;
}

export interface DailyMission {
  id: string;
  description: string;
  type: "drift" | "speed" | "police" | "win_race" | "spend_money" | "earn_money";
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  rewardMoney: number;
  rewardXP: number;
}

export interface PlayerProfile {
  money: number;
  xp: number;
  level: number;
  ownedCars: string[]; // List of carIds
  selectedCarId: string;
  carsConfig: Record<string, PlayerCarState>; // carId -> stats/customization
  completedRaces: string[]; // List of completed raceIds
  achievements: string[]; // List of unlocked achievementIds
  dailyMissions?: DailyMission[];
  dailyMissionsDate?: string;
}

export interface RaceCheckpoint {
  x: number;
  z: number;
  width: number;
}

export interface RaceCourse {
  id: string;
  name: string;
  description: string;
  type: "sprint" | "circuit" | "time_trial" | "drag";
  laps: number;
  checkpoints: RaceCheckpoint[];
  difficulty: "easy" | "medium" | "hard";
  rewardMoney: number;
  rewardXP: number;
  bestTime?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  moneyReward: number;
  type: "speed" | "drift" | "police" | "win" | "level" | "customization";
  requirement: number;
}

export type WeatherType = "sunny" | "rainy" | "foggy";
export type TimeOfDay = "day" | "sunset" | "night";

export interface ActiveRaceState {
  courseId: string;
  status: "countdown" | "racing" | "finished" | "busted";
  lap: number;
  currentCheckpointIndex: number;
  position: number;
  elapsedTime: number;
  startTime: number;
  checkpointsPassed: number;
  opponentsProgress: { name: string; carId: string; progress: number; position: number; currentCheckpoint: number; finished: boolean; time?: number }[];
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}
