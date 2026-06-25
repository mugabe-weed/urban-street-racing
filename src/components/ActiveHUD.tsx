/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { ActiveRaceState, WeatherType, TimeOfDay, PlayerProfile } from "../types";
import { Shield, Zap, AlertTriangle, Play, Pause, RotateCcw, Volume2, VolumeX, Eye } from "lucide-react";
import { CARS_LIST, RACES_LIST } from "../data";

interface ActiveHUDProps {
  activeRace: ActiveRaceState;
  profile: PlayerProfile;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  wantedLevel: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onPauseToggle: () => void;
  onQuitRace: () => void;
  isMobileControls: boolean;
  setMobileInputs: React.Dispatch<React.SetStateAction<{
    steer: number;
    gas: number;
    handbrake: boolean;
    nitro: boolean;
  }>>;
}

export const ActiveHUD: React.FC<ActiveHUDProps> = ({
  activeRace,
  profile,
  weather,
  timeOfDay,
  wantedLevel,
  isMuted,
  onToggleMute,
  onPauseToggle,
  onQuitRace,
  isMobileControls,
  setMobileInputs,
}) => {
  const radarRef = useRef<HTMLCanvasElement>(null);

  const course = RACES_LIST.find((r) => r.id === activeRace.courseId) || RACES_LIST[0];
  const currentCP = course.checkpoints[activeRace.currentCheckpointIndex] || { x: 0, z: 0 };

  // Calculate speed estimation for UI
  // Note: player speed in m/s is multiplied by 2.237 to get real-world MPH
  // Let's assume we read from the engine loop using a global reference or estimate it.
  // Wait, let's look at how we can get speed. We can estimate speed based on elapsed time and checkpoints,
  // or we can pass a dummy state, but wait! We can read speed by polling the visual DOM or passing a small custom event.
  // To make it incredibly robust, let's make the speed dynamically update in the DOM using a simple ID.
  // In `GameCanvas.tsx`, we can write the speed value directly to a global window variable or update a specific text element!
  // This is a common performance pattern:
  // "Using standard id-based updates avoids heavy react state lag!"
  // Let's read speed from `(window as any).playerSpeedMPH` which is set in the 3D loop!
  // Let's write a small interval or custom ref reader in the HUD to update local state or directly modify the SVG text.
  // Let's write an interval in the HUD that reads `(window as any).playerSpeedMPH` or `(window as any).playerNitro` 10 times a second to update the speedometer dial! This is incredibly optimized!

  useEffect(() => {
    const interval = setInterval(() => {
      const speedElement = document.getElementById("hud_speed_value");
      const gearElement = document.getElementById("hud_gear_value");
      const rpmDial = document.getElementById("hud_rpm_circle");
      const nitroBar = document.getElementById("hud_nitro_bar_fill");
      const escProgress = document.getElementById("hud_escape_progress_bar");
      const waypointArrow = document.getElementById("hud_waypoint_arrow");

      // Read values from window global object updated by 3D canvas
      const w = window as any;
      const speedMPH = Math.floor(w.playerSpeedMPH || 0);
      const nitroVal = Math.floor(w.playerNitro || 100);
      const escVal = Math.floor(w.playerEscProgress || 0);
      const playerX = w.playerX || 0;
      const playerZ = w.playerZ || 0;
      const playerAngle = w.playerAngle || 0;

      // Update speed value
      if (speedElement) speedElement.textContent = String(speedMPH);

      // Simple gear shifting simulator
      let gear = "N";
      if (speedMPH > 1) {
        if (speedMPH < 15) gear = "1";
        else if (speedMPH < 35) gear = "2";
        else if (speedMPH < 55) gear = "3";
        else if (speedMPH < 80) gear = "4";
        else if (speedMPH < 110) gear = "5";
        else gear = "6";
      } else if (speedMPH < 0) {
        gear = "R";
      }
      if (gearElement) gearElement.textContent = gear;

      // Update circular RPM SVG circle dashoffset
      if (rpmDial) {
        // RPM runs idle (0.1) to full redline (1.0)
        const rpm = Math.max(0.1, Math.min(1.0, 0.15 + (speedMPH / 130) * 0.85));
        const maxOffset = 188; // 2 * PI * r (30)
        const offset = maxOffset - rpm * maxOffset;
        rpmDial.setAttribute("stroke-dashoffset", String(offset));
      }

      // Update Nitro Bar fill width
      if (nitroBar) {
        nitroBar.style.width = `${nitroVal}%`;
      }

      // Update Escape/Arrest bar
      if (escProgress) {
        escProgress.style.width = `${Math.abs(escVal)}%`;
      }

      // Update Minimap Waypoint Arrow
      if (waypointArrow && currentCP) {
        const dx = currentCP.x - playerX;
        const dz = currentCP.z - playerZ;
        const targetAngle = Math.atan2(dx, dz);
        // Arrow points to target relative to player car direction
        const relAngle = targetAngle - playerAngle;
        waypointArrow.style.transform = `rotate(${relAngle}rad)`;
      }

      // --- DRAW RADAR CANVAS ---
      const canvas = radarRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const size = canvas.width;
          const half = size / 2;
          ctx.clearRect(0, 0, size, size);

          // Background circular radar plate
          ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
          ctx.beginPath();
          ctx.arc(half, half, half - 3, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Radar sweeps rings
          ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
          ctx.beginPath();
          ctx.arc(half, half, half * 0.5, 0, 2 * Math.PI);
          ctx.stroke();

          // Crosshairs
          ctx.beginPath();
          ctx.moveTo(half, 0);
          ctx.lineTo(half, size);
          ctx.moveTo(0, half);
          ctx.lineTo(size, half);
          ctx.stroke();

          // Calculate scaling: 1 meter = 0.3 pixels
          const scale = 0.3;

          // Draw Roads on radar
          ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
          ctx.lineWidth = 10;
          // Vertical and horizontal segments relative to player position
          // Verticals
          for (let rx of [-400, -200, 0, 200, 400]) {
            const relX = half + (rx - playerX) * scale;
            ctx.beginPath();
            ctx.moveTo(relX, 0);
            ctx.lineTo(relX, size);
            ctx.stroke();
          }
          // Horizontals
          for (let rz of [-400, -200, 0, 200, 400]) {
            const relZ = half + (rz - playerZ) * scale;
            ctx.beginPath();
            ctx.moveTo(0, relZ);
            ctx.lineTo(size, relZ);
            ctx.stroke();
          }

          // Draw Checkpoints
          course.checkpoints.forEach((cp, idx) => {
            const relX = half + (cp.x - playerX) * scale;
            const relZ = half + (cp.z - playerZ) * scale;

            if (idx === activeRace.currentCheckpointIndex) {
              ctx.fillStyle = "#eab308"; // target yellow
              ctx.beginPath();
              ctx.arc(relX, relZ, 4, 0, 2 * Math.PI);
              ctx.fill();
            } else {
              ctx.fillStyle = "#3b82f6"; // others blue
              ctx.beginPath();
              ctx.arc(relX, relZ, 3, 0, 2 * Math.PI);
              ctx.fill();
            }
          });

          // Draw Police patrols if nearby
          const copCount = w.policeXList ? w.policeXList.length : 0;
          for (let i = 0; i < copCount; i++) {
            const cx = w.policeXList[i];
            const cz = w.policeZList[i];
            const relX = half + (cx - playerX) * scale;
            const relZ = half + (cz - playerZ) * scale;

            // Flash red/blue
            ctx.fillStyle = Date.now() % 400 > 200 ? "#ef4444" : "#3b82f6";
            ctx.beginPath();
            ctx.arc(relX, relZ, 4, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Draw Player car at the very center as a triangle pointing up
          ctx.save();
          ctx.translate(half, half);
          // Canvas rotation relative to player heading
          ctx.rotate(-playerAngle);

          ctx.fillStyle = "#22c55e"; // Green player triangle
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(-5, 5);
          ctx.lineTo(5, 5);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeRace.courseId, activeRace.currentCheckpointIndex]);

  // Touch steer triggers
  const handleTouchSteer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMobileInputs((prev) => ({ ...prev, steer: val }));
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between font-mono p-4">
      {/* Top Header Rail */}
      <div className="flex justify-between items-start w-full">
        <div className="bg-slate-950/85 backdrop-blur-md p-3 rounded-lg border border-slate-800 pointer-events-auto flex gap-4 items-center">
          <div>
            <span className="text-zinc-400 text-[10px] block">RACE CODE</span>
            <span className="text-indigo-400 font-bold text-sm tracking-widest">{course.name}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div>
            <span className="text-zinc-400 text-[10px] block">CASH REWARD</span>
            <span className="text-emerald-400 font-bold text-sm">${course.rewardMoney}</span>
          </div>
        </div>

        {/* Quick controls top right */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={onPauseToggle}
            className="p-2.5 bg-slate-950/90 hover:bg-indigo-600/20 border border-slate-800 rounded-lg text-white transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={onToggleMute}
            className="p-2.5 bg-slate-950/90 hover:bg-indigo-600/20 border border-slate-800 rounded-lg text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
          <button
            onClick={onQuitRace}
            className="px-3.5 py-2 bg-red-650 hover:bg-red-700 bg-red-950 border border-red-800 rounded-lg text-red-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESTART
          </button>
        </div>
      </div>

      {/* Center Wanted/Alert Messages */}
      <div className="self-center w-full max-w-sm flex flex-col items-center">
        {wantedLevel > 0 && (
          <div className="w-full bg-slate-950/95 border border-red-800/80 p-3 rounded-xl shadow-2xl shadow-red-950/30 flex flex-col items-center gap-2 pointer-events-auto text-center animate-bounce">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="text-red-500 font-black text-sm tracking-widest">POLICE PURSUIT ACTIVE</span>
            </div>
            {/* Flashing wanted stars */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Shield
                  key={star}
                  className={`w-5 h-5 ${
                    star <= wantedLevel ? "text-red-500 fill-red-500 animate-pulse" : "text-zinc-700"
                  }`}
                />
              ))}
            </div>

            {/* Escape Progress Indicator */}
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-800 relative">
              <div
                id="hud_escape_progress_bar"
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: "0%" }}
              />
            </div>
            <span className="text-[9px] text-zinc-400 font-bold tracking-tight">OUT OF SIGHT / ARREST PROXIMITY</span>
          </div>
        )}
      </div>

      {/* Floating Dynamic Drift Notification */}
      <div id="hud_drift_alert" className="hidden self-center bg-indigo-950/90 border border-indigo-700/50 px-4 py-2 rounded-full flex items-center gap-2 animate-bounce">
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-black text-white tracking-widest" id="hud_drift_points_text">DRIFTING</span>
      </div>

      {/* Lower Hud dashboard: Speedometer and Minimap */}
      <div className="flex justify-between items-end w-full">
        {/* Left Speedometer and Stats Panel */}
        <div className="flex flex-col gap-2">
          {/* Lap Counter & Placement */}
          <div className="bg-slate-950/85 backdrop-blur-md p-2 px-3 border border-slate-800 rounded-lg flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 text-[10px]">LAP</span>
              <span className="text-white font-bold">{activeRace.lap} / {course.laps}</span>
            </div>
            <div className="w-[1px] bg-slate-800" />
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 text-[10px]">POS</span>
              <span className="text-indigo-400 font-extrabold">{activeRace.position} / 4</span>
            </div>
            <div className="w-[1px] bg-slate-800" />
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 text-[10px]">TIME</span>
              <span className="text-slate-200 font-bold">{activeRace.elapsedTime.toFixed(1)}s</span>
            </div>
          </div>

          <div className="bg-slate-950/90 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-xl flex items-center gap-4">
            {/* Speedometer radial gauge */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="30" stroke="#1e293b" strokeWidth="5" fill="none" />
                <circle
                  id="hud_rpm_circle"
                  cx="40"
                  cy="40"
                  r="30"
                  stroke="#6366f1"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray="188"
                  strokeDashoffset="188"
                  className="transition-all duration-100"
                />
              </svg>
              <div className="text-center">
                <span id="hud_speed_value" className="text-2xl font-black text-white block leading-none">0</span>
                <span className="text-[8px] text-zinc-500 font-bold block uppercase mt-0.5">MPH</span>
              </div>
              <div className="absolute bottom-1 right-2 bg-indigo-600/30 text-indigo-400 font-bold rounded px-1.5 py-0.5 text-[9px]">
                GEAR <span id="hud_gear_value">N</span>
              </div>
            </div>

            {/* Nitro boost bar */}
            <div className="flex flex-col gap-1 w-24">
              <span className="text-[9px] text-zinc-400 font-bold tracking-widest flex items-center gap-1">
                <Zap className="w-3 h-3 text-sky-400 animate-pulse" /> NITRO BOOST
              </span>
              <div className="w-full bg-slate-900 h-2.5 rounded-full border border-slate-800 overflow-hidden">
                <div
                  id="hud_nitro_bar_fill"
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-100"
                  style={{ width: "100%" }}
                />
              </div>
              <span className="text-[8px] text-zinc-500 tracking-tight">HOLD SHIFT TO BURN</span>
            </div>
          </div>
        </div>

        {/* Mobile controls overlay on middle-bottom if enabled */}
        {isMobileControls && (
          <div className="flex-1 max-w-sm pointer-events-auto mx-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex justify-between items-center gap-4">
            {/* Steering slider */}
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] text-zinc-400 font-bold text-center">STEER CAR</span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                defaultValue="0"
                onChange={handleTouchSteer}
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                onMouseUp={() => setMobileInputs((prev) => ({ ...prev, steer: 0 }))}
                onTouchEnd={() => setMobileInputs((prev) => ({ ...prev, steer: 0 }))}
              />
            </div>

            {/* Pedals controls */}
            <div className="flex gap-2">
              <button
                onTouchStart={() => setMobileInputs((prev) => ({ ...prev, gas: 1 }))}
                onTouchEnd={() => setMobileInputs((prev) => ({ ...prev, gas: 0 }))}
                onMouseDown={() => setMobileInputs((prev) => ({ ...prev, gas: 1 }))}
                onMouseUp={() => setMobileInputs((prev) => ({ ...prev, gas: 0 }))}
                className="px-3 py-2.5 bg-indigo-650 hover:bg-indigo-700 bg-indigo-900 border border-indigo-800 rounded-lg text-white font-extrabold text-xs active:scale-95 transition-all select-none cursor-pointer"
              >
                GAS
              </button>
              <button
                onTouchStart={() => setMobileInputs((prev) => ({ ...prev, gas: -1 }))}
                onTouchEnd={() => setMobileInputs((prev) => ({ ...prev, gas: 0 }))}
                onMouseDown={() => setMobileInputs((prev) => ({ ...prev, gas: -1 }))}
                onMouseUp={() => setMobileInputs((prev) => ({ ...prev, gas: 0 }))}
                className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 font-extrabold text-xs active:scale-95 transition-all select-none cursor-pointer"
              >
                REVERSE
              </button>
              <button
                onTouchStart={() => setMobileInputs((prev) => ({ ...prev, handbrake: true }))}
                onTouchEnd={() => setMobileInputs((prev) => ({ ...prev, handbrake: false }))}
                onMouseDown={() => setMobileInputs((prev) => ({ ...prev, handbrake: true }))}
                onMouseUp={() => setMobileInputs((prev) => ({ ...prev, handbrake: false }))}
                className="px-2.5 py-2.5 bg-yellow-600/30 border border-yellow-500/40 rounded-lg text-yellow-400 font-bold text-[10px] active:scale-95 select-none cursor-pointer"
              >
                DRIFT
              </button>
              <button
                onTouchStart={() => setMobileInputs((prev) => ({ ...prev, nitro: true }))}
                onTouchEnd={() => setMobileInputs((prev) => ({ ...prev, nitro: false }))}
                onMouseDown={() => setMobileInputs((prev) => ({ ...prev, nitro: true }))}
                onMouseUp={() => setMobileInputs((prev) => ({ ...prev, nitro: false }))}
                className="px-2.5 py-2.5 bg-sky-650 hover:bg-sky-700 bg-sky-950 border border-sky-800 rounded-lg text-sky-400 font-extrabold text-xs active:scale-95 select-none cursor-pointer"
              >
                NOS
              </button>
            </div>
          </div>
        )}

        {/* Right Radar Minimap Panel */}
        <div className="bg-slate-950/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-2 relative">
          <div className="absolute -top-3 left-3 bg-indigo-650 bg-indigo-900 border border-indigo-700 px-2 py-0.5 rounded text-[8px] font-bold text-white tracking-widest flex items-center gap-1 shadow-md">
            <Eye className="w-3 h-3 text-indigo-300" /> Waypoint Direction:
            <span id="hud_waypoint_arrow" className="inline-block transform origin-center transition-transform">↑</span>
          </div>

          <canvas
            ref={radarRef}
            width={130}
            height={130}
            className="rounded-lg border border-slate-800/80 bg-slate-950 block"
          />
          <span className="text-[8px] text-center text-zinc-500 font-bold block">GPS AUTO-TRACK RADAR</span>
        </div>
      </div>
    </div>
  );
};
