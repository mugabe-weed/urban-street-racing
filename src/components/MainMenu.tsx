/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PlayerProfile } from "../types";
import { CARS_LIST } from "../data";
import { Play, Settings, BookOpen, Key, AlertTriangle, ShieldCheck, HelpCircle, Gamepad2, Target } from "lucide-react";

interface MainMenuProps {
  profile: PlayerProfile;
  onNavigate: (screen: "garage" | "races" | "gdd" | "menu" | "missions") => void;
  isMobileControls: boolean;
  onToggleMobileControls: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  onNavigate,
  isMobileControls,
  onToggleMobileControls,
}) => {
  const [showTutorial, setShowTutorial] = useState(false);

  const selectedCar = CARS_LIST.find((c) => c.id === profile.selectedCarId) || CARS_LIST[0];

  return (
    <div className="w-full h-full flex flex-col justify-between items-center text-[#e0e0e0] bg-[#050505] font-sans p-6 md:p-12 relative overflow-y-auto">
      {/* Decorative atmospheric glow background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FF4E00] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-[#222] rounded-full blur-[100px]" />
      </div>

      {/* Top profile rail */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center bg-zinc-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-zinc-900 border-2 border-[#FF4E00] rounded-xl flex items-center justify-center font-black text-lg text-white shadow-[0_0_15px_rgba(255,78,0,0.3)]">
            {profile.level}
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block uppercase font-mono tracking-widest">Driver Profile</span>
            <span className="text-white font-bold text-sm tracking-wide">STREET RACER LICENSE</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#FF4E00] to-orange-400 h-full" style={{ width: `${(profile.xp % 1000) / 10}%` }} />
              </div>
              <span className="text-[9px] text-zinc-400 font-mono">{(profile.xp % 1000)} / 1000 XP</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-zinc-500 text-[10px] block uppercase font-mono tracking-widest font-bold">TOTAL BANKROLL</span>
            <span className="text-emerald-400 font-mono font-bold text-2xl tracking-tight">${profile.money.toLocaleString()}</span>
          </div>
          <div className="h-8 w-[1px] bg-zinc-800/80 hidden sm:block" />
          <div className="text-right hidden sm:block">
            <span className="text-zinc-500 text-[10px] block uppercase font-mono tracking-widest font-bold">SELECTED CAR</span>
            <span className="text-[#FF4E00] font-bold text-sm uppercase italic tracking-wider">{selectedCar.name}</span>
          </div>
        </div>
      </div>

      {/* Hero Header logo */}
      <div className="my-10 text-center z-10 flex flex-col items-center">
        <div className="flex items-center gap-2 bg-[#FF4E00]/10 border border-[#FF4E00]/30 px-3.5 py-1 rounded-full text-[#FF4E00] font-mono text-[10px] font-bold tracking-[0.2em] mb-4 uppercase animate-pulse">
          <Gamepad2 className="w-3.5 h-3.5" /> WebGL 3D Race Sandbox
        </div>
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none uppercase select-none text-white drop-shadow-[0_0_30px_rgba(255,78,0,0.15)]">
          URBAN <span className="text-[#FF4E00]">STREET</span> RACING
        </h1>
        <p className="text-sm text-zinc-400 mt-3 max-w-md font-medium text-center leading-relaxed">
          Unleash high-octane performance under night-city streetlights. Dominate sprints, escape active roadblocks, and visual-tune your ride.
        </p>
      </div>

      {/* Main triggers grid */}
      <div className="w-full max-w-md flex flex-col gap-3.5 z-10">
        <button
          onClick={() => onNavigate("races")}
          className="w-full py-4 bg-[#FF4E00] hover:bg-[#ff5d1a] hover:scale-[1.03] text-black font-black italic text-lg tracking-wider rounded-xl shadow-[0_0_35px_rgba(255,78,0,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 uppercase"
        >
          <Play className="w-5 h-5 fill-black text-black" />
          START TOURNAMENT
        </button>

        {/* Daily Missions Trigger */}
        {(() => {
          const dailyMissions = profile.dailyMissions || [];
          const claimableMissionsCount = dailyMissions.filter(m => m.completed && !m.claimed).length;
          const completedCount = dailyMissions.filter(m => m.completed).length;

          return (
            <button
              onClick={() => onNavigate("missions")}
              className={`w-full py-3.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                claimableMissionsCount > 0
                  ? "bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-500 hover:text-black hover:border-transparent shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-pulse"
                  : "bg-zinc-900/80 border-white/5 hover:bg-[#FF4E00] hover:text-black hover:border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Target className={`w-4 h-4 group-hover:text-black transition-colors ${claimableMissionsCount > 0 ? "text-emerald-400" : "text-[#FF4E00]"}`} />
                <span>DAILY OBJECTIVES</span>
              </div>
              {claimableMissionsCount > 0 ? (
                <span className="bg-emerald-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg group-hover:bg-black group-hover:text-emerald-400">
                  {claimableMissionsCount} CLAIMABLE!
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono group-hover:text-black/70">
                  {completedCount}/3 COMPLETED
                </span>
              )}
            </button>
          );
        })()}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate("garage")}
            className="py-4 bg-zinc-900/80 hover:bg-[#FF4E00] hover:text-black hover:border-transparent border border-white/5 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer flex flex-col items-center gap-1.5 justify-center group"
          >
            <Settings className="w-4 h-4 text-[#FF4E00] group-hover:text-black transition-colors" />
            GARAGE & TUNING
          </button>

          <button
            onClick={() => onNavigate("gdd")}
            className="py-4 bg-zinc-900/80 hover:bg-[#FF4E00] hover:text-black hover:border-transparent border border-white/5 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer flex flex-col items-center gap-1.5 justify-center group"
          >
            <BookOpen className="w-4 h-4 text-[#FF4E00] group-hover:text-black transition-colors" />
            GDD & SPEC SHEETS
          </button>
        </div>

        {/* Controls preset slider switch */}
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-[#FF4E00]" />
            <div>
              <span className="text-xs font-bold text-white block uppercase tracking-widest text-[10px]">MOBILE HUD CONTROLS</span>
              <span className="text-[9px] text-zinc-500 block">Touch steering & pedals overlays</span>
            </div>
          </div>
          <button
            onClick={onToggleMobileControls}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
              isMobileControls ? "bg-[#FF4E00]" : "bg-zinc-800"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-md transform duration-200 ${
                isMobileControls ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <button
          onClick={() => setShowTutorial(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          How do I drive? Controls manual
        </button>
      </div>

      {/* Tutorial Overlay Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-zinc-950 border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(255,78,0,0.15)]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase italic tracking-tighter">
              <Key className="w-5 h-5 text-[#FF4E00]" />
              STREET RACER MANUAL
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Master extreme curves and perform drift multipliers to earn nitro boosts. Avoid police units, as they will attempt to ram and bust you.
            </p>

            <div className="space-y-2 text-xs">
              <div className="bg-zinc-900 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                <span className="text-white font-semibold">Accelerate / Speed Up</span>
                <span className="bg-[#FF4E00]/10 text-[#FF4E00] border border-[#FF4E00]/30 px-2 py-0.5 rounded font-mono font-bold">W or Up Arrow</span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                <span className="text-white font-semibold">Brake / Reverse Gears</span>
                <span className="bg-[#FF4E00]/10 text-[#FF4E00] border border-[#FF4E00]/30 px-2 py-0.5 rounded font-mono font-bold">S or Down Arrow</span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                <span className="text-white font-semibold">Steer Wheels left / right</span>
                <span className="bg-[#FF4E00]/10 text-[#FF4E00] border border-[#FF4E00]/30 px-2 py-0.5 rounded font-mono font-bold">A / D or Left/Right</span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                <span className="text-white font-semibold">Handbrake Drift</span>
                <span className="bg-[#FF4E00]/10 text-[#FF4E00] border border-[#FF4E00]/30 px-2 py-0.5 rounded font-mono font-bold">Spacebar</span>
              </div>
              <div className="bg-zinc-900 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                <span className="text-white font-semibold">Nitrous Thruster Boost</span>
                <span className="bg-[#FF4E00]/10 text-[#FF4E00] border border-[#FF4E00]/30 px-2 py-0.5 rounded font-mono font-bold">Left Shift</span>
              </div>
            </div>

            <button
              onClick={() => setShowTutorial(false)}
              className="w-full py-2.5 bg-[#FF4E00] hover:bg-[#ff5d1a] text-black font-black uppercase tracking-widest rounded-xl text-xs transition-all cursor-pointer"
            >
              UNDERSTOOD, LET'S RACE
            </button>
          </div>
        </div>
      )}

      {/* Subtle footnote */}
      <span className="text-[10px] text-zinc-600 font-mono mt-8 z-10">
        Urban Street Racing v1.0.0 • Designed with raw WebGL and procedural sound engines
      </span>
    </div>
  );
};
