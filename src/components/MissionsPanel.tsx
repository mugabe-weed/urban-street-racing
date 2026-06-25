import React, { useState, useEffect } from "react";
import { PlayerProfile, DailyMission } from "../types";
import { audio } from "../audio";
import { Target, Trophy, Clock, ChevronLeft, Award, Sparkles, Coins, Zap } from "lucide-react";

export function generateDailyMissions(): DailyMission[] {
  const missionsPool = [
    {
      type: "drift" as const,
      description: (target: number) => `Score ${target} total drift points`,
      targets: [1500, 3000, 5000],
      rewardMultiplier: 0.35,
    },
    {
      type: "speed" as const,
      description: (target: number) => `Reach ${target} MPH top speed`,
      targets: [110, 130, 150],
      rewardMultiplier: 10,
    },
    {
      type: "police" as const,
      description: (target: number) => `Escape ${target} police chase${target > 1 ? "s" : ""}`,
      targets: [1, 2],
      rewardMultiplier: 1000,
    },
    {
      type: "win_race" as const,
      description: (target: number) => `Win ${target} tournament race${target > 1 ? "s" : ""}`,
      targets: [1, 2],
      rewardMultiplier: 1200,
    },
    {
      type: "spend_money" as const,
      description: (target: number) => `Spend $${target.toLocaleString()} on garage tuning`,
      targets: [2500, 5000, 8000],
      rewardMultiplier: 0.2,
    },
    {
      type: "earn_money" as const,
      description: (target: number) => `Earn $${target.toLocaleString()} from street races`,
      targets: [2000, 4000, 6000],
      rewardMultiplier: 0.25,
    },
  ];

  // Pick 3 random distinct missions
  const shuffled = [...missionsPool].sort(() => 0.5 - Math.random());
  const selectedTemplates = shuffled.slice(0, 3);

  return selectedTemplates.map((tpl, index) => {
    const target = tpl.targets[Math.floor(Math.random() * tpl.targets.length)];
    const rewardMoney = Math.round((target * tpl.rewardMultiplier) / 50) * 50 || 500;
    const rewardXP = Math.round((rewardMoney * 0.1) / 10) * 10 || 50;

    return {
      id: `mission_${Date.now()}_${index}`,
      description: tpl.description(target),
      type: tpl.type,
      target,
      current: 0,
      completed: false,
      claimed: false,
      rewardMoney,
      rewardXP,
    };
  });
}

interface MissionsPanelProps {
  profile: PlayerProfile;
  onUpdateProfile: (newProfile: PlayerProfile) => void;
  onBack: () => void;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({
  profile,
  onUpdateProfile,
  onBack,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);

  // Dynamic countdown timer calculation to midnight local time
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      setTimeRemaining(formatted);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  const missions: DailyMission[] = profile.dailyMissions || [];

  const handleClaimReward = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission || !mission.completed || mission.claimed) return;

    // Play successful reward sound
    audio.playBeep(true);

    // Track claim anim
    setJustClaimedId(missionId);
    setTimeout(() => {
      setJustClaimedId(null);
    }, 1500);

    // Calculate new economy rewards
    const newXP = profile.xp + mission.rewardXP;
    const oldLevel = profile.level;
    const newLevel = Math.floor(newXP / 1000) + 1;

    const updatedMissions = missions.map((m) => {
      if (m.id === missionId) {
        return { ...m, claimed: true };
      }
      return m;
    });

    const updatedProfile: PlayerProfile = {
      ...profile,
      money: profile.money + mission.rewardMoney,
      xp: newXP,
      level: newLevel,
      dailyMissions: updatedMissions,
    };

    onUpdateProfile(updatedProfile);

    // Show custom visual alert
    if (newLevel > oldLevel) {
      setTimeout(() => {
        alert(`🎉 DRIVER LEVEL UP!\nYou reached Level ${newLevel}! Check the garage for newly unlocked vehicles.`);
      }, 300);
    }
  };

  const totalCompleted = missions.filter((m) => m.completed).length;
  const totalClaimed = missions.filter((m) => m.claimed).length;

  return (
    <div className="w-full h-full bg-[#050505] font-sans text-[#e0e0e0] p-4 md:p-8 flex flex-col items-center overflow-y-auto relative select-none">
      {/* Decorative atmospheric glow background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-15%] right-[-15%] w-[600px] h-[600px] bg-[#FF4E00] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#222] rounded-full blur-[110px]" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-2xl z-10 space-y-6 flex flex-col flex-1 pb-12">
        {/* Navigation / Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-md gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">OBJECTIVES PANEL</span>
              <h1 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                <Target className="w-5 h-5 text-[#FF4E00]" />
                DAILY MISSIONS
              </h1>
            </div>
          </div>

          {/* Time Countdown */}
          <div className="flex items-center gap-2 bg-zinc-950/80 border border-white/5 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-[#FF4E00] animate-pulse" />
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-mono block">RESET TIMER</span>
              <span className="text-xs text-white font-mono font-bold tracking-widest">{timeRemaining || "00:00:00"}</span>
            </div>
          </div>
        </div>

        {/* Overview Progress Card */}
        <div className="bg-gradient-to-r from-zinc-900/90 to-zinc-950/90 p-5 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-lg font-black text-white italic uppercase tracking-wide flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              STREET COMPLETION BONUS
            </h2>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
              Knock out all three assignments to secure maximum street rep. Completed goals can be cashed out immediately.
            </p>
          </div>

          {/* Graphical Circle Completion or fraction */}
          <div className="flex items-center gap-3 bg-zinc-950/60 p-3 rounded-xl border border-white/5">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#FF4E00]/40 flex items-center justify-center font-mono font-black text-white text-lg relative">
              <span className="text-[#FF4E00]">{totalCompleted}</span>/3
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-mono font-bold">DAILY PROGRESS</span>
              <span className="text-xs font-bold text-white uppercase block">
                {totalClaimed === 3 ? "All claimed! ✓" : totalCompleted === 3 ? "Ready to Claim! ★" : `${totalCompleted} of 3 completed`}
              </span>
            </div>
          </div>
        </div>

        {/* Missions list */}
        <div className="space-y-3.5">
          {missions.length === 0 ? (
            <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-xl text-center space-y-2">
              <Clock className="w-8 h-8 text-[#FF4E00] mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">GENERATING MISSIONS...</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Scanning the underground network for current bounties. Hold on tight, driver.
              </p>
            </div>
          ) : (
            missions.map((m) => {
              const progressPct = Math.min(100, (m.current / m.target) * 100);
              const isClaimable = m.completed && !m.claimed;
              const isJustClaimed = justClaimedId === m.id;

              return (
                <div
                  key={m.id}
                  className={`bg-zinc-900/60 backdrop-blur-md rounded-xl border p-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 transition-all duration-300 ${
                    m.claimed
                      ? "opacity-55 border-zinc-800"
                      : isClaimable
                      ? "border-emerald-500/50 bg-zinc-900/80 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  {/* Left segment: title, stats progress bar */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-lg ${m.claimed ? "bg-zinc-950 text-zinc-600" : m.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-[#FF4E00]/10 text-[#FF4E00]"}`}>
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold tracking-wide uppercase ${m.claimed ? "text-zinc-500 line-through" : "text-white"}`}>
                          {m.description}
                        </h3>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono block">Goal Type: {m.type.replace("_", " ")}</span>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>PROGRESS</span>
                        <span className={m.completed ? "text-emerald-400 font-bold" : "text-zinc-300"}>
                          {m.current.toLocaleString()} / {m.target.toLocaleString()} ({Math.floor(progressPct)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            m.claimed
                              ? "bg-zinc-700"
                              : m.completed
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                              : "bg-gradient-to-r from-[#FF4E00] to-orange-400 shadow-[0_0_8px_rgba(255,78,0,0.3)]"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right segment: rewards & claim actions */}
                  <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-3 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 pl-1">
                    {/* Reward info */}
                    <div className="flex gap-4 md:gap-3 text-right">
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block">CASH PAYOUT</span>
                        <span className={`text-xs font-bold font-mono flex items-center gap-1 ${m.claimed ? "text-zinc-500" : "text-emerald-400 font-black"}`}>
                          <Coins className="w-3.5 h-3.5 text-emerald-400" /> +${m.rewardMoney.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block">REP POINTS</span>
                        <span className={`text-xs font-bold font-mono flex items-center gap-1 ${m.claimed ? "text-zinc-500" : "text-[#FF4E00]"}`}>
                          <Zap className="w-3.5 h-3.5" /> +{m.rewardXP} XP
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    {m.claimed ? (
                      <span className="px-4 py-2 bg-zinc-950 border border-zinc-800 text-zinc-600 font-mono font-bold text-[10px] uppercase rounded-lg tracking-wider flex items-center gap-1.5 cursor-not-allowed">
                        ✓ CLAIMED
                      </span>
                    ) : isJustClaimed ? (
                      <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-[10px] uppercase rounded-lg tracking-widest animate-pulse flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" /> COLLECTING...
                      </span>
                    ) : isClaimable ? (
                      <button
                        onClick={() => handleClaimReward(m.id)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black italic text-[11px] uppercase tracking-widest rounded-lg cursor-pointer hover:scale-[1.05] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
                      >
                        CLAIM REWARD
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-zinc-950 border border-white/5 text-zinc-500 font-mono font-bold text-[10px] uppercase rounded-lg tracking-wider block text-center select-none">
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Outer instructions / footers */}
        <p className="text-[10px] text-zinc-600 italic font-mono text-center pt-2 select-none leading-relaxed">
          Daily missions refresh automatically at local midnight. Launch races to complete objectives.
        </p>
      </div>
    </div>
  );
};
