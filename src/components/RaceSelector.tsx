/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { RaceCourse, WeatherType, TimeOfDay, PlayerProfile } from "../types";
import { RACES_LIST } from "../data";
import { Trophy, Sun, CloudRain, CloudFog, Clock, Sunset, Moon, Sparkles, MapPin, ArrowLeft, Gamepad } from "lucide-react";
import { audio } from "../audio";

interface RaceSelectorProps {
  profile: PlayerProfile;
  onSelectRace: (courseId: string, weather: WeatherType, time: TimeOfDay) => void;
  onBack: () => void;
}

export const RaceSelector: React.FC<RaceSelectorProps> = ({
  profile,
  onSelectRace,
  onBack,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(RACES_LIST[0].id);
  const [weather, setWeather] = useState<WeatherType>("sunny");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("night"); // Late night racing by default!

  const course = RACES_LIST.find((r) => r.id === selectedCourseId) || RACES_LIST[0];

  return (
    <div className="w-full h-full bg-[#050505] font-sans text-[#e0e0e0] p-4 md:p-8 flex flex-col md:flex-row gap-6 overflow-y-auto relative">
      {/* Decorative atmospheric glow background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FF4E00] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-[#222] rounded-full blur-[100px]" />
      </div>

      {/* LEFT COLUMN: List of available street tracks */}
      <div className="w-full md:w-1/2 flex flex-col gap-4 z-10">
        <div className="flex justify-between items-center bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-md">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">DRIVER RANK</span>
            <span className="text-[#FF4E00] font-black text-lg block">LEVEL {profile.level}</span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-zinc-400 uppercase font-mono tracking-widest px-1 flex items-center gap-2">
          <Gamepad className="w-4 h-4 text-[#FF4E00]" /> SELECT TOURNAMENT TRACK
        </h3>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-[420px] pr-1">
          {RACES_LIST.map((r) => {
            const isSelected = selectedCourseId === r.id;
            const isCompleted = profile.completedRaces.includes(r.id);

            return (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedCourseId(r.id);
                  audio.playBeep(true);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                  isSelected
                    ? "bg-zinc-900 border-[#FF4E00] shadow-[0_0_15px_rgba(255,78,0,0.15)]"
                    : "bg-zinc-900/40 border-white/5 hover:bg-zinc-900/70"
                }`}
              >
                <div>
                  <span className="text-white font-bold text-sm block flex items-center gap-1.5">
                    {r.name}
                    {isCompleted && (
                      <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                        Cleared
                      </span>
                    )}
                  </span>
                  <p className="text-xs text-zinc-400 truncate max-w-xs mt-1">{r.description}</p>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                      r.difficulty === "easy"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : r.difficulty === "medium"
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {r.difficulty}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono capitalize">
                    {r.type} • {r.laps} Laps
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Pre-race configuration and launching */}
      <div className="flex-1 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col justify-between gap-6 z-10">
        <div>
          <div className="space-y-1 mb-5">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest font-bold">PRE-RACE BRIEFING</span>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{course.name}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{course.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-4 rounded-xl border border-white/5 mb-6">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-0.5">TYPE</span>
              <span className="text-sm text-white font-bold capitalize">{course.type} Tournament</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-0.5">LAPS COUNT</span>
              <span className="text-sm text-white font-bold">{course.laps} Laps</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-0.5">EST. REWARD CASH</span>
              <span className="text-sm text-emerald-400 font-bold font-mono">${course.rewardMoney.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold mb-0.5">EST. REWARD XP</span>
              <span className="text-sm text-[#FF4E00] font-bold">+{course.rewardXP} XP</span>
            </div>
          </div>

          {/* Tweak Environment controls */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase font-mono tracking-widest">TWEAK LOCAL CONDITIONS</h3>

            {/* Weather toggle */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold">WEATHER FORECAST</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setWeather("sunny")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    weather === "sunny"
                      ? "bg-[#FF4E00] text-black border-transparent shadow-[0_0_15px_rgba(255,78,0,0.3)]"
                      : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sun className="w-4 h-4" /> Sunny (Grip: 100%)
                </button>
                <button
                  onClick={() => setWeather("rainy")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    weather === "rainy"
                      ? "bg-[#FF4E00] text-black border-transparent shadow-[0_0_15px_rgba(255,78,0,0.3)]"
                      : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <CloudRain className="w-4 h-4" /> Rainy (Grip: 60%)
                </button>
                <button
                  onClick={() => setWeather("foggy")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    weather === "foggy"
                      ? "bg-[#FF4E00] text-black border-transparent shadow-[0_0_15px_rgba(255,78,0,0.3)]"
                      : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <CloudFog className="w-4 h-4" /> Foggy (Vis: 20%)
                </button>
              </div>
            </div>

            {/* Time of day toggle */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono font-bold">TIME OF DAY</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeOfDay("day")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    timeOfDay === "day"
                      ? "bg-[#FF4E00] text-black border-transparent shadow-[0_0_15px_rgba(255,78,0,0.3)]"
                      : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Clock className="w-4 h-4" /> Daytime
                </button>
                <button
                  onClick={() => setTimeOfDay("sunset")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    timeOfDay === "sunset"
                      ? "bg-[#FF4E00] text-black border-transparent shadow-[0_0_15px_rgba(255,78,0,0.3)]"
                      : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sunset className="w-4 h-4" /> Sunset Dusk
                </button>
                <button
                  onClick={() => setTimeOfDay("night")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    timeOfDay === "night"
                      ? "bg-[#FF4E00] text-black border-transparent shadow-[0_0_15px_rgba(255,78,0,0.3)]"
                      : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Moon className="w-4 h-4" /> Midnight
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            audio.playBeep(true);
            onSelectRace(course.id, weather, timeOfDay);
          }}
          className="w-full py-4 bg-[#FF4E00] hover:bg-[#ff5d1a] hover:scale-[1.02] text-black font-black italic text-lg tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_35px_rgba(255,78,0,0.4)] uppercase flex items-center justify-center gap-2"
        >
          <Trophy className="w-5 h-5 text-black fill-black" />
          LAUNCH STREET TOURNAMENT
        </button>
      </div>
    </div>
  );
};
