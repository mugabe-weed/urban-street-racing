/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PlayerProfile, PlayerCarState, VisualCustomization } from "../types";
import { CARS_LIST, UPGRADES_CONFIG } from "../data";
import { ArrowLeft, Check, Lock, ShieldCheck, ShoppingCart, Sparkles, Sliders, Palette, ShieldAlert } from "lucide-react";
import { audio } from "../audio";

interface GaragePanelProps {
  profile: PlayerProfile;
  onUpdateProfile: (newProfile: PlayerProfile) => void;
  onBack: () => void;
}

export const GaragePanel: React.FC<GaragePanelProps> = ({
  profile,
  onUpdateProfile,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"performance" | "visual">("performance");
  const [selectedCarId, setSelectedCarId] = useState<string>(profile.selectedCarId);

  const carDef = CARS_LIST.find((c) => c.id === selectedCarId) || CARS_LIST[0];
  const isOwned = profile.ownedCars.includes(selectedCarId);
  const isEquipped = profile.selectedCarId === selectedCarId;
  const isLocked = profile.level < carDef.unlockLevel;

  // Retrieve car config
  const carState: PlayerCarState = (profile.carsConfig as any)[selectedCarId] || {
    carId: selectedCarId,
    upgrades: { engine: 0, turbo: 0, tires: 0, suspension: 0, nitro: 0 },
    customization: {
      paintColor: carDef.color,
      neonColor: "",
      spoilerType: "none",
      rimsType: "stock",
      neonEnabled: false,
    },
  };

  const upgrades = carState.upgrades;
  const customization = carState.customization;

  // Visual Palette options
  const paintSwatches = [
    { name: "Apex Yellow", hex: "#eab308" },
    { name: "Crimson Red", hex: "#dc2626" },
    { name: "Electric Blue", hex: "#2563eb" },
    { name: "Sly Green", hex: "#16a34a" },
    { name: "Hot Pink", hex: "#db2777" },
    { name: "Carbon Black", hex: "#18181b" },
    { name: "Glacier White", hex: "#f8fafc" },
    { name: "Tokyo Purple", hex: "#7c3aed" },
  ];

  const neonSwatches = [
    { name: "None", color: "" },
    { name: "Red Plasma", color: "#ef4444" },
    { name: "Cyber Blue", color: "#06b6d4" },
    { name: "Bio Green", color: "#22c55e" },
    { name: "Acid Purple", color: "#a855f7" },
  ];

  // Helper to purchase car
  const handleBuyCar = () => {
    if (profile.money < carDef.basePrice) {
      audio.playBeep(false); // warning buzz
      alert("Insufficient funds to buy this car! Complete races to earn cash.");
      return;
    }

    const newOwned = [...profile.ownedCars, carDef.id];
    const newConfigs = { ...profile.carsConfig };

    if (!newConfigs[carDef.id]) {
      newConfigs[carDef.id] = {
        carId: carDef.id,
        upgrades: { engine: 0, turbo: 0, tires: 0, suspension: 0, nitro: 0 },
        customization: {
          paintColor: carDef.color,
          neonColor: "",
          spoilerType: "none",
          rimsType: "stock",
          neonEnabled: false,
        },
      };
    }

    const updated: PlayerProfile = {
      ...profile,
      money: profile.money - carDef.basePrice,
      ownedCars: newOwned,
      selectedCarId: carDef.id, // Auto-equip on buy!
      carsConfig: newConfigs,
    };

    audio.playBeep(true); // victory sound chime
    onUpdateProfile(updated);
  };

  // Helper to equip selected owned car
  const handleEquipCar = () => {
    if (!isOwned) return;
    const updated = {
      ...profile,
      selectedCarId: carDef.id,
    };
    audio.playBeep(true);
    onUpdateProfile(updated);
  };

  // Helper to buy upgrade
  const handleBuyUpgrade = (type: keyof typeof upgrades) => {
    const currentLevel = upgrades[type];
    if (currentLevel >= 5) return; // Already maxed!

    const config = UPGRADES_CONFIG[type][currentLevel + 1];
    if (profile.money < config.cost) {
      audio.playBeep(false);
      alert("Insufficient funds for this performance stage upgrade!");
      return;
    }

    const newUpgrades = { ...upgrades, [type]: currentLevel + 1 };
    const newConfigs = {
      ...profile.carsConfig,
      [selectedCarId]: {
        ...carState,
        upgrades: newUpgrades,
      },
    };

    const updated = {
      ...profile,
      money: profile.money - config.cost,
      carsConfig: newConfigs,
    };

    audio.playBeep(true);
    onUpdateProfile(updated);
  };

  // Helper to adjust visual customization
  const handleUpdateVisual = (changes: Partial<VisualCustomization>) => {
    const newConfigs = {
      ...profile.carsConfig,
      [selectedCarId]: {
        ...carState,
        customization: {
          ...customization,
          ...changes,
        },
      },
    };

    const updated = {
      ...profile,
      carsConfig: newConfigs,
    };

    // No cost for visual tweaks in showroom!
    onUpdateProfile(updated);
  };

  return (
    <div className="w-full h-full bg-[#050505] font-sans text-[#e0e0e0] p-4 md:p-8 flex flex-col md:flex-row gap-6 overflow-y-auto relative">
      {/* Decorative atmospheric glow background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FF4E00] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-[#222] rounded-full blur-[100px]" />
      </div>

      {/* LEFT COLUMN: Showroom car list selector */}
      <div className="w-full md:w-2/5 flex flex-col gap-4 z-10">
        <div className="flex justify-between items-center bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-md">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">TUNER WALLET</span>
            <span className="text-emerald-400 font-mono font-bold text-xl block">${profile.money.toLocaleString()}</span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-zinc-400 uppercase font-mono tracking-widest px-1">VEHICLES SHOWROOM</h3>
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[420px] pr-1">
          {CARS_LIST.map((car) => {
            const owned = profile.ownedCars.includes(car.id);
            const selected = selectedCarId === car.id;
            const locked = profile.level < car.unlockLevel;

            return (
              <div
                key={car.id}
                onClick={() => setSelectedCarId(car.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                  selected
                    ? "bg-zinc-900 border-[#FF4E00] shadow-[0_0_15px_rgba(255,78,0,0.15)]"
                    : "bg-zinc-900/40 border-white/5 hover:bg-zinc-900/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Small color preview box */}
                  <div
                    className="w-4 h-8 rounded"
                    style={{ backgroundColor: (profile.carsConfig as any)[car.id]?.customization.paintColor || car.color }}
                  />
                  <div>
                    <span className="text-white font-bold text-sm block">{car.name}</span>
                    <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-mono">
                      {car.type} • LEVEL {car.unlockLevel} UNLOCK
                    </span>
                  </div>
                </div>

                <div>
                  {locked ? (
                    <span className="text-zinc-500 bg-zinc-950 border border-white/5 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-500" /> LVL {car.unlockLevel}
                    </span>
                  ) : owned ? (
                    profile.selectedCarId === car.id ? (
                      <span className="text-white bg-[#FF4E00] px-2.5 py-1 rounded text-[10px] font-black tracking-wide flex items-center gap-1 shadow-[0_0_10px_rgba(255,78,0,0.3)]">
                        <Check className="w-3.5 h-3.5" /> EQUIPPED
                      </span>
                    ) : (
                      <span className="text-zinc-400 bg-zinc-900 border border-white/5 px-2.5 py-1 rounded text-[10px] font-semibold hover:bg-zinc-800">
                        OWNED
                      </span>
                    )
                  ) : (
                    <span className="text-emerald-400 bg-zinc-900/50 border border-white/10 px-2.5 py-1 rounded text-xs font-bold font-mono">
                      ${car.basePrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Car Customization & Specs */}
      <div className="flex-1 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-5 flex flex-col justify-between gap-6 z-10">
        <div>
          {/* Header Stats */}
          <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{carDef.name}</h2>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-0.5">
                {carDef.type} CLASS SPECIFICATION
              </p>
            </div>

            <div className="flex gap-2">
              {!isOwned && !isLocked && (
                <button
                  onClick={handleBuyCar}
                  className="px-4 py-2.5 bg-[#FF4E00] hover:bg-[#ff5d1a] text-black font-black italic text-xs tracking-wider rounded-xl shadow-[0_0_20px_rgba(255,78,0,0.3)] flex items-center gap-1.5 transition-all cursor-pointer uppercase"
                >
                  <ShoppingCart className="w-4 h-4" />
                  BUY FOR ${carDef.basePrice.toLocaleString()}
                </button>
              )}
              {isOwned && !isEquipped && (
                <button
                  onClick={handleEquipCar}
                  className="px-4 py-2.5 bg-zinc-850 hover:bg-[#FF4E00] hover:text-black hover:border-transparent border border-white/10 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer uppercase tracking-wider"
                >
                  EQUIP VEHICLE
                </button>
              )}
            </div>
          </div>

          {/* Core Specifications Bars */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-3 rounded-xl border border-white/5 mb-6">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-1">Top Speed</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-850 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#FF4E00] to-orange-400 h-full transition-all duration-300"
                    style={{ width: `${carDef.baseStats.speed * (1.0 + upgrades.engine * 0.1)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 font-mono font-bold">
                  {Math.floor(carDef.baseStats.speed * (1.0 + upgrades.engine * 0.1))}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-1">Acceleration</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-850 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#FF4E00] to-orange-400 h-full transition-all duration-300"
                    style={{ width: `${carDef.baseStats.acceleration * (1.0 + upgrades.turbo * 0.12)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 font-mono font-bold">
                  {Math.floor(carDef.baseStats.acceleration * (1.0 + upgrades.turbo * 0.12))}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-1">Handling (Grip)</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-850 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#FF4E00] to-orange-400 h-full transition-all duration-300"
                    style={{ width: `${carDef.baseStats.handling * (1.0 + upgrades.tires * 0.08)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 font-mono font-bold">
                  {Math.floor(carDef.baseStats.handling * (1.0 + upgrades.tires * 0.08))}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-1">Braking Force</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-850 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#FF4E00] to-orange-400 h-full transition-all duration-300"
                    style={{ width: `${carDef.baseStats.braking * (1.0 + upgrades.suspension * 0.07)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 font-mono font-bold">
                  {Math.floor(carDef.baseStats.braking * (1.0 + upgrades.suspension * 0.07))}
                </span>
              </div>
            </div>
          </div>

          {/* Subtabs Selectors */}
          <div className="flex gap-2 border-b border-white/10 mb-4 p-1">
            <button
              onClick={() => setActiveTab("performance")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === "performance" ? "bg-[#FF4E00] text-black font-black italic shadow-[0_0_15px_rgba(255,78,0,0.3)]" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Performance Tuning
            </button>
            <button
              onClick={() => setActiveTab("visual")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === "visual" ? "bg-[#FF4E00] text-black font-black italic shadow-[0_0_15px_rgba(255,78,0,0.3)]" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Visual Customization
            </button>
          </div>

          {/* Subtab Viewports */}
          {activeTab === "performance" ? (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {!isOwned ? (
                <div className="bg-zinc-950/60 border border-white/5 p-6 text-center space-y-2 rounded-xl">
                  <ShieldAlert className="w-8 h-8 text-[#FF4E00] mx-auto animate-pulse" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">SHOWROOM VEHICLE SPEC COPIED</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    You do not own this vehicle. Purchase the car from showroom to unlock Stage 1-5 tuning configurations.
                  </p>
                </div>
              ) : (
                (["engine", "turbo", "tires", "suspension", "nitro"] as const).map((type) => {
                  const currentLvl = upgrades[type];
                  const isMax = currentLvl >= 5;
                  const nextConfig = !isMax ? UPGRADES_CONFIG[type][currentLvl + 1] : null;

                  return (
                    <div
                      key={type}
                      className="bg-zinc-950/40 border border-white/5 p-3 rounded-xl flex justify-between items-center"
                    >
                      <div>
                        <span className="text-white font-bold text-xs uppercase block tracking-wider">{type} STAGE</span>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <div
                              key={lvl}
                              className={`w-4 h-1.5 rounded-full ${
                                lvl <= currentLvl ? "bg-[#FF4E00] shadow-[0_0_8px_rgba(255,78,0,0.6)]" : "bg-zinc-800"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        {isMax ? (
                          <span className="text-[#FF4E00] bg-[#FF4E00]/10 border border-[#FF4E00]/20 px-2.5 py-1 rounded text-[10px] font-bold">
                            MAXED OUT
                          </span>
                        ) : (
                          <button
                            onClick={() => handleBuyUpgrade(type)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-[#FF4E00] hover:text-black border border-white/5 hover:border-transparent text-white text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all cursor-pointer"
                          >
                            UPGRADE Stage {currentLvl + 1} (${nextConfig?.cost.toLocaleString()})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {/* Paint Swatches */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold tracking-widest block">
                  BODY PAINT FINISH
                </span>
                <div className="flex flex-wrap gap-2">
                  {paintSwatches.map((swatch) => (
                    <button
                      key={swatch.name}
                      onClick={() => handleUpdateVisual({ paintColor: swatch.hex })}
                      className={`w-6 h-6 rounded-full border transition-transform ${
                        customization.paintColor === swatch.hex ? "scale-125 border-white" : "border-white/10 hover:scale-110"
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    />
                  ))}
                </div>
              </div>

              {/* Neon Underglow Swatches */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold tracking-widest block">
                  NEON UNDERGLOW BEAMS
                </span>
                <div className="flex flex-wrap gap-2">
                  {neonSwatches.map((swatch) => (
                    <button
                      key={swatch.name}
                      onClick={() =>
                        handleUpdateVisual({
                          neonColor: swatch.color,
                          neonEnabled: swatch.color !== "",
                        })
                      }
                      className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold border transition-all ${
                        customization.neonColor === swatch.color
                          ? "bg-[#FF4E00] text-black border-[#FF4E00]"
                          : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {swatch.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rims Selection */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold tracking-widest block">
                  WHEEL RIMS TYPE
                </span>
                <div className="flex gap-2">
                  {(["stock", "alloy", "chrome"] as const).map((rim) => (
                    <button
                      key={rim}
                      onClick={() => handleUpdateVisual({ rimsType: rim })}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold border capitalize transition-all ${
                        customization.rimsType === rim
                          ? "bg-[#FF4E00] text-black border-[#FF4E00]"
                          : "bg-zinc-950 border-white/5 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {rim} Rims
                    </button>
                  ))}
                </div>
              </div>

              {/* Spoiler aerodynamic types */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold tracking-widest block">
                  REAR WING SPOILER
                </span>
                <div className="flex gap-2">
                  {(["none", "sports", "gt_wing"] as const).map((sp) => (
                    <button
                      key={sp}
                      onClick={() => handleUpdateVisual({ spoilerType: sp })}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold border uppercase tracking-wide transition-all ${
                        customization.spoilerType === sp
                          ? "bg-[#FF4E00] text-black border-[#FF4E00]"
                          : "bg-zinc-950 border-white/5 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {sp.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] text-zinc-600 italic font-mono text-center border-t border-white/10 pt-3 mt-4">
          Upgraded configurations apply immediately upon entering street races.
        </p>
      </div>
    </div>
  );
};
