/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PlayerProfile, ActiveRaceState, WeatherType, TimeOfDay } from "./types";
import { INITIAL_PROFILE, CARS_LIST, RACES_LIST, ACHIEVEMENTS_LIST } from "./data";
import { GameCanvas } from "./components/GameCanvas";
import { ActiveHUD } from "./components/ActiveHUD";
import { MainMenu } from "./components/MainMenu";
import { GaragePanel } from "./components/GaragePanel";
import { RaceSelector } from "./components/RaceSelector";
import { GDDViewer } from "./components/GDDViewer";
import { MissionsPanel, generateDailyMissions } from "./components/MissionsPanel";
import { audio } from "./audio";
import { ShieldAlert, Trophy, Award, Sparkles, Coins, Zap, Shield, Volume2, VolumeX, Eye } from "lucide-react";

export default function App() {
  const [screen, setScreen] = useState<"menu" | "garage" | "races" | "gdd" | "racing" | "missions">("menu");
  const [profile, setProfile] = useState<PlayerProfile>(INITIAL_PROFILE);
  const [activeRace, setActiveRace] = useState<ActiveRaceState | null>(null);
  const [weather, setWeather] = useState<WeatherType>("sunny");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("night");
  const [wantedLevel, setWantedLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Mobile virtual inputs state
  const [isMobileControls, setIsMobileControls] = useState<boolean>(false);
  const [mobileInputs, setMobileInputs] = useState({
    steer: 0,
    gas: 0,
    handbrake: false,
    nitro: false,
  });

  // Drift points accumulated in current run
  const [runDriftPoints, setRunDriftPoints] = useState<number>(0);

  // Results Overlay states
  const [showResults, setShowResults] = useState<boolean>(false);
  const [resultsData, setResultsData] = useState<{
    courseId: string;
    finalTime: number;
    completed: boolean;
    busted: boolean;
    payout: number;
    xpEarned: number;
    driftBonus: number;
    levelUp: boolean;
    unlockedAchievements: string[];
  } | null>(null);

  // --- DAILY MISSION STATE SYNCHRONIZATION ENGINE ---
  const showMissionCompletedToast = (description: string) => {
    setTimeout(() => {
      const toast = document.createElement("div");
      toast.className = "fixed top-24 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-emerald-500 text-emerald-400 font-bold px-6 py-3 rounded-full text-xs shadow-lg shadow-emerald-950/40 animate-bounce z-50 pointer-events-none flex items-center gap-2";
      toast.innerHTML = `<span class="bg-emerald-500 text-black w-4 h-4 rounded-full flex items-center justify-center text-[10px]">✓</span> DAILY MISSION COMPLETE: ${description}!`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3500);
    }, 100);
  };

  const applyMissionProgressToProfile = (
    prevProfile: PlayerProfile,
    type: "drift" | "speed" | "police" | "win_race" | "spend_money" | "earn_money",
    amount: number,
    isAbsolute: boolean = false
  ): { updatedProfile: PlayerProfile; newlyCompleted: string[] } => {
    const newlyCompleted: string[] = [];
    if (!prevProfile.dailyMissions) return { updatedProfile: prevProfile, newlyCompleted };

    let changed = false;
    const updatedMissions = prevProfile.dailyMissions.map((mission) => {
      if (mission.type === type && !mission.claimed) {
        const prevCurrent = mission.current;
        let newCurrent = isAbsolute ? amount : mission.current + amount;
        newCurrent = Math.min(newCurrent, mission.target);

        if (newCurrent !== prevCurrent) {
          changed = true;
          const completed = newCurrent >= mission.target;

          if (completed && !mission.completed) {
            newlyCompleted.push(mission.description);
          }

          return {
            ...mission,
            current: newCurrent,
            completed,
          };
        }
      }
      return mission;
    });

    if (!changed) return { updatedProfile: prevProfile, newlyCompleted };

    return {
      updatedProfile: {
        ...prevProfile,
        dailyMissions: updatedMissions,
      },
      newlyCompleted,
    };
  };

  const updateMissionProgress = (
    type: "drift" | "speed" | "police" | "win_race" | "spend_money" | "earn_money",
    amount: number,
    isAbsolute: boolean = false
  ) => {
    setProfile((prevProfile) => {
      const { updatedProfile, newlyCompleted } = applyMissionProgressToProfile(prevProfile, type, amount, isAbsolute);
      if (newlyCompleted.length > 0) {
        audio.playBeep(true);
        newlyCompleted.forEach((desc) => showMissionCompletedToast(desc));
      }
      if (updatedProfile !== prevProfile) {
        try {
          localStorage.setItem("urban_street_racing_profile", JSON.stringify(updatedProfile));
        } catch (e) {
          console.error("Failed to persist missions progress:", e);
        }
      }
      return updatedProfile;
    });
  };

  const checkDailyMissionsReset = (currentProfile: PlayerProfile) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (currentProfile.dailyMissionsDate && currentProfile.dailyMissionsDate !== todayStr) {
      const freshMissions = generateDailyMissions();
      const updated = {
        ...currentProfile,
        dailyMissions: freshMissions,
        dailyMissionsDate: todayStr,
      };
      saveProfile(updated);
      return updated;
    }
    return currentProfile;
  };

  // --- SAVE ENGINE HOOKS ---
  // Load profile on start & guarantee daily missions exist
  useEffect(() => {
    try {
      const saved = localStorage.getItem("urban_street_racing_profile");
      let currentProfile = INITIAL_PROFILE;
      if (saved) {
        const loaded = JSON.parse(saved);
        if (loaded.money !== undefined && loaded.selectedCarId) {
          currentProfile = loaded;
        }
      }

      // Check date and generate if required
      const todayStr = new Date().toISOString().split("T")[0];
      if (
        !currentProfile.dailyMissionsDate ||
        currentProfile.dailyMissionsDate !== todayStr ||
        !currentProfile.dailyMissions ||
        currentProfile.dailyMissions.length === 0
      ) {
        const freshMissions = generateDailyMissions();
        currentProfile = {
          ...currentProfile,
          dailyMissions: freshMissions,
          dailyMissionsDate: todayStr,
        };
        localStorage.setItem("urban_street_racing_profile", JSON.stringify(currentProfile));
      }

      setProfile(currentProfile);
    } catch (e) {
      console.warn("Failed to read profile save:", e);
    }
  }, []);

  const saveProfile = (updated: PlayerProfile) => {
    setProfile(updated);
    try {
      localStorage.setItem("urban_street_racing_profile", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist save data:", e);
    }
  };

  // --- CONTROLS EXPOSURE TO WEBGL ---
  // We write player positions directly to window object to allow active HUD SVG elements
  // to grab values without triggering React rendering lag
  useEffect(() => {
    const w = window as any;
    w.playerSpeedMPH = 0;
    w.playerNitro = 100;
    w.playerEscProgress = 0;
    w.playerX = 0;
    w.playerZ = 0;
    w.playerAngle = 0;

    // Default list pointers for HUD minimap
    w.policeXList = [];
    w.policeZList = [];
  }, []);

  // --- REAL-TIME UPDATES & RACING PIPELINE ---
  const handleSelectRace = (courseId: string, customWeather: WeatherType, customTime: TimeOfDay) => {
    setWeather(customWeather);
    setTimeOfDay(customTime);
    setWantedLevel(0);
    setRunDriftPoints(0);
    setIsPaused(false);
    setShowResults(false);

    // Write initial defaults to window
    const w = window as any;
    w.playerSpeedMPH = 0;
    w.playerNitro = 100;
    w.playerEscProgress = 0;

    // Reset police positions
    w.policeXList = [150, -150, 350];
    w.policeZList = [150, -150, -250];

    const course = RACES_LIST.find((r) => r.id === courseId) || RACES_LIST[0];

    // Build initial opponents tracker
    const oppCount = course.difficulty === "easy" ? 2 : course.difficulty === "medium" ? 3 : 4;
    const initialOppProgress = Array.from({ length: oppCount }).map((_, idx) => ({
      name: ["Rezo", "Kira", "Talon", "Jax"][idx],
      carId: "reaper_gt",
      progress: 0,
      position: idx + 2,
      currentCheckpoint: 1,
      finished: false,
    }));

    setActiveRace({
      courseId,
      status: "racing",
      lap: 1,
      currentCheckpointIndex: 0,
      position: 1,
      elapsedTime: 0,
      startTime: performance.now(),
      checkpointsPassed: 0,
      opponentsProgress: initialOppProgress,
    });

    setScreen("racing");
  };

  const handleRaceUpdate = (updated: Partial<ActiveRaceState>) => {
    setActiveRace((prev) => {
      if (!prev) return null;
      const updatedState = { ...prev, ...updated };

      // Sync player coordinates to Window for the radar canvas
      const w = window as any;
      const activeCarDef = CARS_LIST.find((c) => c.id === profile.selectedCarId) || CARS_LIST[0];

      // In the 3D loop, these variables are actively changed inside GameCanvas.tsx.
      // So here we map variables to HUD elements
      // Evaluate if player speed crossed Redline limit for achievements
      if (w.playerSpeedMPH >= 120 && !profile.achievements.includes("speed_demon")) {
        triggerAchievementUnlock("speed_demon");
      }

      // Track daily missions speed progress
      if (w.playerSpeedMPH) {
        updateMissionProgress("speed", Math.floor(w.playerSpeedMPH), true);
      }

      return updatedState;
    });
  };

  const handleDriftScore = (score: number, duration: number) => {
    setRunDriftPoints((prev) => prev + score);

    // Flash drift overlay visually in HUD
    const driftText = document.getElementById("hud_drift_alert");
    const pointsText = document.getElementById("hud_drift_points_text");
    if (driftText && pointsText) {
      pointsText.textContent = `DRIFT +${score} PTS`;
      driftText.classList.remove("hidden");
      setTimeout(() => {
        driftText.classList.add("hidden");
      }, 1500);
    }

    // Drift King achievement check
    if (duration >= 4.0 && !profile.achievements.includes("drift_king")) {
      triggerAchievementUnlock("drift_king");
    }

    // Track daily missions drift progress
    updateMissionProgress("drift", score);
  };

  const handleEscapePolice = () => {
    // Escaped! Reward cash immediately
    const rewardMoney = wantedLevel * 1000;
    const rewardXP = wantedLevel * 150;

    // Check achievement
    if (wantedLevel >= 3 && !profile.achievements.includes("cops_escape")) {
      triggerAchievementUnlock("cops_escape");
    }

    setWantedLevel(0);
    let updated = {
      ...profile,
      money: profile.money + rewardMoney,
      xp: profile.xp + rewardXP,
    };

    // Track daily missions police escape progress
    const res = applyMissionProgressToProfile(updated, "police", 1);
    updated = res.updatedProfile;
    if (res.newlyCompleted.length > 0) {
      audio.playBeep(true);
      res.newlyCompleted.forEach((desc) => showMissionCompletedToast(desc));
    }

    saveProfile(updated);

    alert(`POLICE LOST! Escaped wanted level! Earned +$${rewardMoney} and +${rewardXP} XP!`);
  };

  const handleRaceFinished = (finalTime: number, completed: boolean, busted: boolean) => {
    audio.stopAll();

    if (!activeRace) return;

    const course = RACES_LIST.find((r) => r.id === activeRace.courseId) || RACES_LIST[0];

    let basePayout = 0;
    let baseXP = 0;
    let driftBonus = 0;
    let levelUp = false;
    const unlockedAchievements: string[] = [];

    if (completed) {
      // Scale payout based on position
      const posMult = activeRace.position === 1 ? 1.0 : activeRace.position === 2 ? 0.75 : 0.5;
      basePayout = Math.floor(course.rewardMoney * posMult);
      baseXP = Math.floor(course.rewardXP * posMult);

      // Add drift points conversion (e.g. 10 drift points = $1)
      driftBonus = Math.floor(runDriftPoints * 0.1);

      // Perform updates to save profile
      let newCompleted = [...profile.completedRaces];
      if (!newCompleted.includes(course.id)) {
        newCompleted.push(course.id);
      }

      const totalEarnings = basePayout + driftBonus;
      const finalXP = baseXP;

      let oldLevel = profile.level;
      let newXP = profile.xp + finalXP;
      let newLevel = Math.floor(newXP / 1000) + 1;
      if (newLevel > oldLevel) {
        levelUp = true;
      }

      // First win achievement check
      let newAchievements = [...profile.achievements];
      if (activeRace.position === 1 && !newAchievements.includes("first_win")) {
        newAchievements.push("first_win");
        unlockedAchievements.push("first_win");
      }

      // Accumulator stats achievements
      if (profile.ownedCars.length >= 3 && !newAchievements.includes("all_cars")) {
        newAchievements.push("all_cars");
        unlockedAchievements.push("all_cars");
      }

      if (profile.money + totalEarnings >= 50000 && !newAchievements.includes("big_saver")) {
        newAchievements.push("big_saver");
        unlockedAchievements.push("big_saver");
      }

      // Check fully loaded (if any config upgrade has level 5)
      let maxedUpgrade = false;
      Object.values(profile.carsConfig).forEach((carState: any) => {
        if (Object.values(carState.upgrades).some((lvl: any) => lvl >= 5)) {
          maxedUpgrade = true;
        }
      });
      if (maxedUpgrade && !newAchievements.includes("fully_loaded")) {
        newAchievements.push("fully_loaded");
        unlockedAchievements.push("fully_loaded");
      }

      const updatedProfile: PlayerProfile = {
        ...profile,
        money: profile.money + totalEarnings,
        xp: newXP,
        level: newLevel,
        completedRaces: newCompleted,
        achievements: newAchievements,
      };

      // Track daily missions win_race and earn_money progress synchronously to prevent state overwriting
      let finalProfileToSave = updatedProfile;
      if (activeRace.position === 1) {
        const res = applyMissionProgressToProfile(finalProfileToSave, "win_race", 1);
        finalProfileToSave = res.updatedProfile;
        if (res.newlyCompleted.length > 0) {
          audio.playBeep(true);
          res.newlyCompleted.forEach((desc) => showMissionCompletedToast(desc));
        }
      }
      if (totalEarnings > 0) {
        const res = applyMissionProgressToProfile(finalProfileToSave, "earn_money", totalEarnings);
        finalProfileToSave = res.updatedProfile;
        if (res.newlyCompleted.length > 0) {
          audio.playBeep(true);
          res.newlyCompleted.forEach((desc) => showMissionCompletedToast(desc));
        }
      }

      saveProfile(finalProfileToSave);

      setResultsData({
        courseId: course.id,
        finalTime,
        completed: true,
        busted: false,
        payout: totalEarnings,
        xpEarned: finalXP,
        driftBonus,
        levelUp,
        unlockedAchievements,
      });
    } else if (busted) {
      // arrested by police! Loose some cash penalty
      const cashPenalty = Math.floor(profile.money * 0.15); // 15% impound fee
      const updatedProfile = {
        ...profile,
        money: Math.max(0, profile.money - cashPenalty),
      };
      saveProfile(updatedProfile);

      setResultsData({
        courseId: course.id,
        finalTime: 0,
        completed: false,
        busted: true,
        payout: -cashPenalty,
        xpEarned: 0,
        driftBonus: 0,
        levelUp: false,
        unlockedAchievements: [],
      });
    } else {
      // DNF / Quit
      setResultsData({
        courseId: course.id,
        finalTime: 0,
        completed: false,
        busted: false,
        payout: 0,
        xpEarned: 0,
        driftBonus: 0,
        levelUp: false,
        unlockedAchievements: [],
      });
    }

    setActiveRace(null);
    setWantedLevel(0);
    setShowResults(true);
  };

  const triggerAchievementUnlock = (id: string) => {
    if (profile.achievements.includes(id)) return;

    const ach = ACHIEVEMENTS_LIST.find((a) => a.id === id);
    if (!ach) return;

    const updated = {
      ...profile,
      money: profile.money + ach.moneyReward,
      xp: profile.xp + ach.xpReward,
      achievements: [...profile.achievements, id],
    };

    saveProfile(updated);
    audio.playBeep(true);

    // Show temporary banner
    alert(`🏆 ACHIEVEMENT UNLOCKED: ${ach.title}!\nReward: +$${ach.moneyReward} & +${ach.xpReward} XP!`);
  };

  const handlePauseToggle = () => {
    setIsPaused((prev) => !prev);
  };

  const handleToggleMute = () => {
    const isNowMuted = audio.toggleMute();
    setIsMuted(isNowMuted);
  };

  const handleUpdateProfile = (newProfile: PlayerProfile) => {
    const spentAmount = profile.money - newProfile.money;
    let finalProfile = newProfile;
    if (spentAmount > 0) {
      const res = applyMissionProgressToProfile(finalProfile, "spend_money", spentAmount);
      finalProfile = res.updatedProfile;
      if (res.newlyCompleted.length > 0) {
        audio.playBeep(true);
        res.newlyCompleted.forEach((desc) => showMissionCompletedToast(desc));
      }
    }
    saveProfile(finalProfile);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 overflow-hidden flex flex-col relative select-none">
      {/* Dynamic 3D Game Canvas Layer */}
      {screen === "racing" && activeRace && (
        <GameCanvas
          profile={profile}
          activeRace={activeRace}
          weather={weather}
          timeOfDay={timeOfDay}
          isPaused={isPaused}
          onRaceUpdate={handleRaceUpdate}
          onRaceFinished={handleRaceFinished}
          onWantedLevelChange={setWantedLevel}
          onDriftScore={handleDriftScore}
          onEscapePolice={handleEscapePolice}
          isMobileControls={isMobileControls}
          mobileInputs={mobileInputs}
        />
      )}

      {/* Dynamic HUD Overlay for active gameplay */}
      {screen === "racing" && activeRace && (
        <ActiveHUD
          activeRace={activeRace}
          profile={profile}
          weather={weather}
          timeOfDay={timeOfDay}
          wantedLevel={wantedLevel}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPauseToggle={handlePauseToggle}
          onQuitRace={() => handleRaceFinished(0, false, false)}
          isMobileControls={isMobileControls}
          setMobileInputs={setMobileInputs}
        />
      )}

      {/* Main menu navigation cards */}
      {screen === "menu" && (
        <MainMenu
          profile={profile}
          onNavigate={(scr) => {
            checkDailyMissionsReset(profile);
            setScreen(scr);
          }}
          isMobileControls={isMobileControls}
          onToggleMobileControls={() => setIsMobileControls(!isMobileControls)}
        />
      )}

      {screen === "missions" && (
        <MissionsPanel
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "garage" && (
        <GaragePanel
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "races" && (
        <RaceSelector
          profile={profile}
          onSelectRace={handleSelectRace}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "gdd" && (
        <div className="w-full h-full p-4 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="flex-1 max-w-4xl mx-auto w-full">
            <GDDViewer />
          </div>
          <button
            onClick={() => setScreen("menu")}
            className="mt-6 self-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            RETURN TO MAIN MENU
          </button>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {isPaused && screen === "racing" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-40 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-xs space-y-4 text-center">
            <h3 className="text-xl font-black text-white tracking-wider">GAME PAUSED</h3>
            <p className="text-xs text-zinc-500">Street action is currently frozen.</p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handlePauseToggle}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                RESUME RACE
              </button>
              <button
                onClick={() => handleRaceFinished(0, false, false)}
                className="w-full py-2.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800/60 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                ABANDON RUN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Match Results / Game Over Overlay */}
      {showResults && resultsData && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-40 pointer-events-auto font-sans">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-5 shadow-2xl">
            {/* Header state */}
            {resultsData.completed ? (
              <div className="text-center space-y-1">
                <Trophy className="w-10 h-10 text-yellow-400 mx-auto animate-bounce" />
                <h3 className="text-2xl font-black text-emerald-400 tracking-tight">RACE CLEARED!</h3>
                <p className="text-xs text-zinc-400">You successfully crossed the finish line.</p>
              </div>
            ) : resultsData.busted ? (
              <div className="text-center space-y-1">
                <ShieldAlert className="w-10 h-10 text-red-500 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-red-500 tracking-tight">BUSTED!</h3>
                <p className="text-xs text-zinc-400">The police department impounded your car.</p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <ShieldAlert className="w-10 h-10 text-zinc-500 mx-auto" />
                <h3 className="text-xl font-black text-zinc-400 tracking-tight">DNF • RETIRED</h3>
                <p className="text-xs text-zinc-500">You abandoned the street circuit.</p>
              </div>
            )}

            {/* Earnings Breakdown */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">MATCH BILLING SHEET</span>

              {resultsData.completed ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Circuit Base Payout</span>
                    <span className="text-white font-bold">+${(resultsData.payout - resultsData.driftBonus).toLocaleString()}</span>
                  </div>
                  {resultsData.driftBonus > 0 && (
                    <div className="flex justify-between text-indigo-400">
                      <span>Drift Points Bonus</span>
                      <span>+${resultsData.driftBonus}</span>
                    </div>
                  )}
                  <div className="h-[1px] bg-slate-800 my-2" />
                  <div className="flex justify-between text-emerald-400 font-bold text-sm">
                    <span>Total Cash Earned</span>
                    <span>+${resultsData.payout.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-indigo-300">
                    <span>Driver Experience</span>
                    <span>+{resultsData.xpEarned} XP</span>
                  </div>
                </>
              ) : resultsData.busted ? (
                <div className="flex justify-between text-red-400 font-bold">
                  <span>Impound Release Penalty</span>
                  <span>-${Math.abs(resultsData.payout).toLocaleString()}</span>
                </div>
              ) : (
                <p className="text-zinc-500 italic text-center">No cash or driver ranks earned from retired races.</p>
              )}
            </div>

            {/* Level up alerts */}
            {resultsData.levelUp && (
              <div className="bg-indigo-950/40 border border-indigo-800 p-3 rounded-xl flex items-center gap-2.5 text-indigo-300">
                <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                <div>
                  <span className="font-bold text-xs block">DRIVER LEVEL UP!</span>
                  <span className="text-[10px] text-zinc-400 block">You leveled up! Check the garage to see newly unlocked sports cars!</span>
                </div>
              </div>
            )}

            {/* Achievements alerts */}
            {resultsData.unlockedAchievements.length > 0 && (
              <div className="bg-yellow-950/30 border border-yellow-800/40 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-yellow-400 font-mono font-bold uppercase tracking-wider block">UNLOCKED ACHIEVEMENTS</span>
                {resultsData.unlockedAchievements.map((id) => {
                  const ach = ACHIEVEMENTS_LIST.find((a) => a.id === id);
                  return (
                    <div key={id} className="flex justify-between items-center text-xs">
                      <span className="text-white font-bold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-yellow-400" /> {ach?.title}
                      </span>
                      <span className="text-emerald-400 font-semibold font-mono">+${ach?.moneyReward}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setScreen("menu");
                  setShowResults(false);
                }}
                className="py-3 bg-slate-950 hover:bg-slate-850 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-850"
              >
                RETURN HOME
              </button>
              {resultsData.completed || resultsData.busted ? (
                <button
                  onClick={() => handleSelectRace(resultsData.courseId, weather, timeOfDay)}
                  className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  RETRY RACE
                </button>
              ) : (
                <button
                  onClick={() => {
                    setScreen("races");
                    setShowResults(false);
                  }}
                  className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  CHOOSE RACE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
