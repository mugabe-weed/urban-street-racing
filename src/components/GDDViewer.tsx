/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, Cpu, ShieldCheck, Zap, Layers, Trophy } from "lucide-react";

export const GDDViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"gdd" | "architecture" | "mvp" | "optimization">("gdd");

  return (
    <div className="w-full h-full bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col font-sans text-[#e0e0e0]">
      {/* Header bar */}
      <div className="bg-zinc-950 border-b border-white/10 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#FF4E00] animate-pulse" />
            Urban Street Racing — Technical Dossier
          </h2>
          <p className="text-xs text-slate-400">GDD, Architectural Blueprint, and Optimization Manual</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-zinc-900 p-1 rounded-lg border border-white/10">
          {(["gdd", "architecture", "mvp", "optimization"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === tab
                  ? "bg-[#FF4E00] text-black font-black italic shadow-[0_0_15px_rgba(255,78,0,0.3)]"
                  : "hover:bg-zinc-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main body viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[500px]">
        {activeTab === "gdd" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                1. Game Design Document (GDD)
              </h3>
              <p className="text-sm leading-relaxed mb-4">
                <strong>Urban Street Racing</strong> is a fast-paced, immersive 3D arcade-realistic street racing game
                designed for modern browsers, responsive on mobile and PC. The game captures the high-adrenaline culture
                of illegal late-night highway drifting and inner-city circuits under the glow of neon underglows, and introduces a dynamic police pursuit system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950/60 p-4 rounded-lg border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#FF4E00]" /> Core Pillars
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-400 list-disc list-inside">
                  <li><strong>Momentum-Based Drifting</strong>: Reward sliding through corners with nitrous refills and cash.</li>
                  <li><strong>Adaptive Environment</strong>: Changing weather (grip penalties) and day/night transitions.</li>
                  <li><strong>Police Risk-Reward</strong>: Escaping pursuits grants higher driver level XP multipliers.</li>
                </ul>
              </div>
              <div className="bg-zinc-950/60 p-4 rounded-lg border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF4E00]" /> Gameplay Mechanics
                </h4>
                <ul className="text-xs space-y-1.5 text-slate-400 list-disc list-inside">
                  <li><strong>Nitro</strong>: Thermal boost giving 45% speed multipliers with custom visual tail exhaust plasma.</li>
                  <li><strong>Wanted Level</strong>: 1-5 Stars police spawn, roadblocks setup, and persistent chases.</li>
                  <li><strong>Garage Upgrades</strong>: Custom visual paint, underglow neons, spoilers, and performance tunings.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Car Classes Specifications</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-400">
                  <thead className="bg-zinc-950 text-slate-200">
                    <tr>
                      <th className="p-2 border border-white/10">Class</th>
                      <th className="p-2 border border-white/10">Base Speed</th>
                      <th className="p-2 border border-white/10">Handling</th>
                      <th className="p-2 border border-white/10">Default Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 hover:bg-zinc-800/20">
                      <td className="p-2 text-white font-medium">Hatchback</td>
                      <td className="p-2">40 (Max ~55 MPH)</td>
                      <td className="p-2">High (Short Radius)</td>
                      <td className="p-2">Nimble city grids, tight corners</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-zinc-800/20">
                      <td className="p-2 text-white font-medium">Sport Coupe</td>
                      <td className="p-2">70 (Max ~80 MPH)</td>
                      <td className="p-2">Medium (Balanced Slide)</td>
                      <td className="p-2">Coastal drifting and highway speed runs</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-zinc-800/20">
                      <td className="p-2 text-white font-medium">Supercar</td>
                      <td className="p-2">100 (Max ~120 MPH)</td>
                      <td className="p-2">Low (Requires braking)</td>
                      <td className="p-2">Straight line high speed tracks</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "architecture" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#FF4E00]" />
                2. Technical Architecture & File Systems
              </h3>
              <p className="text-sm leading-relaxed mb-4">
                The game leverages a <strong>unidirectional state flow architecture</strong> linking a lightweight React UI
                to an independent <strong>Three.js WebGL rendering thread</strong>. Standard physics integration occurs in
                the RAF (requestAnimationFrame) loop, entirely isolated from the React state lifecycle to prevent overhead lags.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg border border-white/5 font-mono text-xs space-y-1">
              <p className="text-[#FF4E00]">// Project Directory Mapping</p>
              <p>├── /package.json <span className="text-slate-500"># Node metadata and dependencies (three, lucide)</span></p>
              <p>├── /src/types.ts <span className="text-slate-500"># Strictly enforced typing systems for save files and profiles</span></p>
              <p>├── /src/data.ts <span className="text-slate-500"># Core tables for upgrades config, achievements, and tracks</span></p>
              <p>├── /src/audio.ts <span className="text-slate-500"># Procedural Web Audio engine for real-time synthetics</span></p>
              <p>└── /src/components/</p>
              <p>    ├── GameCanvas.tsx <span className="text-slate-500"># WebGL setup, collision matrices, kinematics solvers</span></p>
              <p>    ├── ActiveHUD.tsx <span className="text-slate-500"># Dynamic SVG Speedometer, wanted stars, minimap GPS</span></p>
              <p>    ├── GaragePanel.tsx <span className="text-slate-500"># Interactive purchase & custom neon paints system</span></p>
              <p>    └── GDDViewer.tsx <span className="text-slate-500"># Technical documentation explorer (current view)</span></p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">System Data Flow & Event Pipelines</h4>
              <ul className="text-xs space-y-2 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#FF4E00] font-bold">1.</span>
                  <span><strong>Inputs Controller</strong>: Evaluates physical keyboard mapping (W/S/A/D) or mobile screen overlays and aggregates steering ratios (-1 to +1) for the physics thread.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF4E00] font-bold">2.</span>
                  <span><strong>Physics Solver</strong>: Evaluates forward vectors, slip friction values, angular drift multipliers, and collision checking on every frame.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF4E00] font-bold">3.</span>
                  <span><strong>Procedural Synthesizer</strong>: Bends pitch of oscillators based on live RPM values. Toggles sirens and noise filters on nitro thrusters.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF4E00] font-bold">4.</span>
                  <span><strong>Save Hook</strong>: On race completes or customization saves, encodes profile JSON to standard client-side secure LocalStorage.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "mvp" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                3. Step-by-Step MVP Development Roadmap
              </h3>
              <p className="text-sm leading-relaxed">
                A modular, high-velocity plan to compile the basic racing prototype and systematically layer visual assets and AI engines.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-l-2 border-[#FF4E00] pl-4 space-y-1">
                <span className="text-xs font-bold text-[#FF4E00]">PHASE 1: Core Physics & WebGL Setup (Completed)</span>
                <p className="text-xs text-slate-400">Establish standard scene rendering, lighting vectors, and player vehicle controls. Map basic kinematics equations to support sliding, reverse, and nitro surges.</p>
              </div>
              <div className="border-l-2 border-[#FF4E00] pl-4 space-y-1">
                <span className="text-xs font-bold text-[#FF4E00]">PHASE 2: World Design & Traffic loops (Completed)</span>
                <p className="text-xs text-slate-400">Procedurally spawn intersecting grid roads, skyscrapers with glowing night lights, highways, tunnels, and low-poly AI vehicles acting as traffic obstacles.</p>
              </div>
              <div className="border-l-2 border-[#FF4E00] pl-4 space-y-1">
                <span className="text-xs font-bold text-[#FF4E00]">PHASE 3: UI HUD, Upgrades & Economy (Completed)</span>
                <p className="text-xs text-slate-400">Link high-impact dashboard menus to buy upgraded engine, turbo and suspension, customize paint, configure weather, and render interactive gauges.</p>
              </div>
              <div className="border-l-2 border-emerald-500 pl-4 space-y-1">
                <span className="text-xs font-bold text-emerald-400">PHASE 4: AI Racers & Chase Patrols (Completed)</span>
                <p className="text-xs text-slate-400">Integrate steering algorithms for AI opponents to navigate gates, and wire police cruisers to hunt the player, create roadblocks, and activate wanted status levels.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "optimization" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                4. Production Performance Optimization
              </h3>
              <p className="text-sm leading-relaxed">
                Critical design patterns applied to ensure the game maintains a solid 60 FPS on lower-tier mobile hardware and standard integrated GPUs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-zinc-950 p-4 rounded-lg border border-white/5">
                <strong className="text-white block mb-1">Geometries Instancing & Sharing</strong>
                <p className="text-slate-400">
                  Re-use the same `CylinderGeometry` and `BoxGeometry` buffer objects for wheels, headlights, and barriers across all traffic, police, and player meshes. This reduces VRAM overhead.
                </p>
              </div>
              <div className="bg-zinc-950 p-4 rounded-lg border border-white/5">
                <strong className="text-white block mb-1">State Batching & Throttling</strong>
                <p className="text-slate-400">
                  Avoid updating React states inside the rapid 60 FPS loop. Updates for progress percentages, speedometer dials, and checkpoints are throttled to trigger once every 10 frames, freeing the main thread.
                </p>
              </div>
              <div className="bg-zinc-950 p-4 rounded-lg border border-white/5">
                <strong className="text-white block mb-1">Frustum Culling & Fog</strong>
                <p className="text-slate-400">
                  Utilize dense atmospheric fog constraints to mask far-plane rendering limit reductions, preventing the CPU from passing complex geometry buffers situated beyond 400 meters of the player car.
                </p>
              </div>
              <div className="bg-zinc-950 p-4 rounded-lg border border-white/5">
                <strong className="text-white block mb-1">Zero Garbage Collection Allocation</strong>
                <p className="text-slate-400">
                  Pre-allocate calculations vectors (`THREE.Vector3` or `THREE.Matrix4`) inside global memory once during initialization, rather than instantiating new vectors in the render frame loops.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
