/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PlayerProfile, RaceCourse, ActiveRaceState, WeatherType, TimeOfDay } from "../types";
import { CARS_LIST, RACES_LIST, UPGRADES_CONFIG } from "../data";
import { audio } from "../audio";

interface GameCanvasProps {
  profile: PlayerProfile;
  activeRace: ActiveRaceState | null;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  isPaused: boolean;
  onRaceUpdate: (state: Partial<ActiveRaceState>) => void;
  onRaceFinished: (finalTime: number, completed: boolean, busted: boolean) => void;
  onWantedLevelChange: (level: number) => void;
  onDriftScore: (score: number, duration: number) => void;
  onEscapePolice: () => void;
  isMobileControls: boolean;
  mobileInputs: {
    steer: number; // -1 to 1
    gas: number;   // -1, 0, 1
    handbrake: boolean;
    nitro: boolean;
  };
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  profile,
  activeRace,
  weather,
  timeOfDay,
  isPaused,
  onRaceUpdate,
  onRaceFinished,
  onWantedLevelChange,
  onDriftScore,
  onEscapePolice,
  isMobileControls,
  mobileInputs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep references to values used in loop to avoid closure capture issues
  const stateRef = useRef({
    isPaused,
    weather,
    timeOfDay,
    activeRace,
    isMobileControls,
    mobileInputs,
    wantedLevel: 0,
    policeEscapeProgress: 0,
    isChased: false,
    driftTime: 0,
    totalDriftPoints: 0,
  });

  useEffect(() => {
    stateRef.current = {
      isPaused,
      weather,
      timeOfDay,
      activeRace,
      isMobileControls,
      mobileInputs,
      wantedLevel: stateRef.current.wantedLevel,
      policeEscapeProgress: stateRef.current.policeEscapeProgress,
      isChased: stateRef.current.isChased,
      driftTime: stateRef.current.driftTime,
      totalDriftPoints: stateRef.current.totalDriftPoints,
    };
  }, [isPaused, weather, timeOfDay, activeRace, isMobileControls, mobileInputs]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let animFrameId: number;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // --- THREE JS INITIALIZATION ---
    const scene = new THREE.Scene();

    // Fog setup
    const fogColor = timeOfDay === "day" ? 0x94a3b8 : timeOfDay === "sunset" ? 0xfdba74 : 0x0f172a;
    scene.fog = new THREE.FogExp2(fogColor, weather === "foggy" ? 0.015 : 0.0018);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1500);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Colors & Lighting Based on Time of Day
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(200, 300, 100);
    scene.add(mainLight);

    const updateLighting = (tod: TimeOfDay, wth: WeatherType) => {
      let skyColor = 0x94a3b8;
      let lightColor = 0xfffbeb;
      let lightIntensity = 1.2;

      if (tod === "sunset") {
        skyColor = 0x1e1b4b; // Deep twilight blue
        lightColor = 0xf97316; // Orange
        lightIntensity = 0.8;
      } else if (tod === "night") {
        skyColor = 0x020617; // Black blue
        lightColor = 0x38bdf8; // Moon blue
        lightIntensity = 0.2;
      }

      if (wth === "rainy") {
        lightIntensity *= 0.6;
      } else if (wth === "foggy") {
        lightIntensity *= 0.4;
      }

      renderer.setClearColor(skyColor, 1);
      if (scene.fog) {
        (scene.fog as THREE.FogExp2).color.setHex(skyColor);
      }
      mainLight.color.setHex(lightColor);
      mainLight.intensity = lightIntensity;
      ambientLight.intensity = tod === "day" ? 0.4 : tod === "sunset" ? 0.25 : 0.15;
    };

    updateLighting(timeOfDay, weather);

    // --- GAME WORLD DATA ---
    const activeCarId = profile.selectedCarId;
    const carDef = CARS_LIST.find((c) => c.id === activeCarId) || CARS_LIST[0];
    const carConfig = profile.carsConfig[activeCarId] || {
      upgrades: { engine: 0, turbo: 0, tires: 0, suspension: 0, nitro: 0 },
      customization: { paintColor: carDef.color, neonColor: "", spoilerType: "none", rimsType: "stock", neonEnabled: false },
    };

    // Calculate upgraded stats
    const upgrades = carConfig.upgrades;
    const customization = carConfig.customization;

    const speedMult = UPGRADES_CONFIG.engine[upgrades.engine]?.multiplier || 1.0;
    const accelMult = UPGRADES_CONFIG.turbo[upgrades.turbo]?.multiplier || 1.0;
    const handlingMult = UPGRADES_CONFIG.tires[upgrades.tires]?.multiplier || 1.0;
    const brakingMult = UPGRADES_CONFIG.suspension[upgrades.suspension]?.multiplier || 1.0;
    const nitroMult = UPGRADES_CONFIG.nitro[upgrades.nitro]?.multiplier || 1.0;

    // Base properties scaled
    const maxSpeed = (carDef.baseStats.speed * 0.4 + 20) * speedMult; // m/s (approx 45 - 90 mph initially)
    const accelerationRate = (carDef.baseStats.acceleration * 0.15 + 8) * accelMult;
    const handlingTurnRate = (carDef.baseStats.handling * 0.0003 + 0.02) * handlingMult;
    const brakeForce = (carDef.baseStats.braking * 0.4 + 15) * brakingMult;
    const maxNitro = 100;
    let currentNitro = maxNitro;

    // Player position and kinematics
    const playerPhysics = {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vz: 0,
      speed: 0,
      angle: Math.PI, // Facing forward
      driftAngle: 0,
      isDrifting: false,
      driftFactor: 0,
    };

    // Keyboard Input states
    const keys: Record<string, boolean> = {
      w: false,
      s: false,
      a: false,
      d: false,
      space: false,
      shift: false,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") keys.w = true;
      if (k === "arrowdown" || k === "s") keys.s = true;
      if (k === "arrowleft" || k === "a") keys.a = true;
      if (k === "arrowright" || k === "d") keys.d = true;
      if (k === " " || k === "spacebar") keys.space = true;
      if (k === "shift") keys.shift = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") keys.w = false;
      if (k === "arrowdown" || k === "s") keys.s = false;
      if (k === "arrowleft" || k === "a") keys.a = false;
      if (k === "arrowright" || k === "d") keys.d = false;
      if (k === " " || k === "spacebar") keys.space = false;
      if (k === "shift") keys.shift = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // --- CREATE THE 3D WORLD MAP ---
    // Ground Grid & Roads
    const citySize = 1200;
    const groundGeo = new THREE.PlaneGeometry(citySize, citySize);
    // Dark procedural ground
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Dark slate ground
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Dynamic procedural textures for road lanes
    const createRoadTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1e293b"; // Dark asphalt
        ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = "#e2e8f0"; // White side boundaries
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 0, 120, 128);
        // Yellow double dashed lane markers
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(64, 0);
        ctx.lineTo(64, 128);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    const roadTex = createRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.6,
      metalness: 0.2,
    });

    const roadsList: THREE.Mesh[] = [];

    // Helper to add straight road
    const addRoad = (x: number, z: number, length: number, width: number, isVertical: boolean) => {
      const roadGeo = new THREE.PlaneGeometry(isVertical ? width : length, isVertical ? length : width);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.02, z); // Slightly above ground to prevent z-fighting
      scene.add(road);
      roadsList.push(road);

      // Repeat textures appropriately based on size
      if (road.material instanceof THREE.MeshStandardMaterial && road.material.map) {
        const mat = road.material.clone();
        mat.map = roadTex.clone();
        mat.map.repeat.set(isVertical ? 1 : length / 20, isVertical ? length / 20 : 1);
        road.material = mat;
      }
    };

    // Build grid network of streets
    // Main cross grid (verticals)
    addRoad(0, 0, 1000, 30, true);
    addRoad(200, 0, 1000, 30, true);
    addRoad(-200, 0, 1000, 30, true);
    addRoad(400, 0, 1000, 30, true);
    addRoad(-400, 0, 1000, 30, true);

    // Horizontals
    addRoad(0, 0, 1000, 30, false);
    addRoad(0, 200, 1000, 30, false);
    addRoad(0, -200, 1000, 30, false);
    addRoad(0, 400, 1000, 30, false);
    addRoad(0, -400, 1000, 30, false);

    // Overpasses & Highway bridges (Higher planes)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const addBridge = (x: number, z: number, length: number, width: number, isVertical: boolean) => {
      const bridgeGeo = new THREE.BoxGeometry(isVertical ? width : length, 1.5, isVertical ? length : width);
      const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridge.position.set(x, 4, z);
      scene.add(bridge);

      // Add ramp segments
      const rampGeo = new THREE.BoxGeometry(isVertical ? width : 40, 1.5, isVertical ? 40 : width);
      const ramp1 = new THREE.Mesh(rampGeo, bridgeMat);
      const ramp2 = new THREE.Mesh(rampGeo, bridgeMat);

      if (isVertical) {
        ramp1.position.set(x, 2, z - length / 2 - 15);
        ramp1.rotation.x = 0.1;
        ramp2.position.set(x, 2, z + length / 2 + 15);
        ramp2.rotation.x = -0.1;
      } else {
        ramp1.position.set(x - length / 2 - 15, 2, z);
        ramp1.rotation.z = -0.1;
        ramp2.position.set(x + length / 2 + 15, 2, z);
        ramp2.rotation.z = 0.1;
      }
      scene.add(ramp1);
      scene.add(ramp2);
    };

    addBridge(-200, -200, 250, 25, false);
    addBridge(200, 200, 250, 25, false);

    // Decorative Buildings inside grid squares
    const buildingsList: { mesh: THREE.Mesh; x: number; z: number; r: number }[] = [];
    const buildingMatDay = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const buildingMatNight = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      emissive: 0x1e293b,
    });

    const createBuilding = (bx: number, bz: number, bw: number, bd: number, bh: number) => {
      const bGeo = new THREE.BoxGeometry(bw, bh, bd);
      const bMesh = new THREE.Mesh(bGeo, buildingMatDay);
      bMesh.position.set(bx, bh / 2, bz);
      scene.add(bMesh);

      // Add rows of window meshes that glow at night
      const windowGeo = new THREE.PlaneGeometry(bw + 0.1, 0.4);
      const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });

      // Add a couple of side window rows for futuristic look
      if (bh > 15) {
        for (let y = 3; y < bh - 3; y += 4) {
          const winFront = new THREE.Mesh(windowGeo, windowMat);
          winFront.position.set(0, y - bh / 2, bd / 2 + 0.05);
          bMesh.add(winFront);

          const winBack = new THREE.Mesh(windowGeo, windowMat);
          winBack.position.set(0, y - bh / 2, -bd / 2 - 0.05);
          bMesh.add(winBack);
        }
      }

      buildingsList.push({
        mesh: bMesh,
        x: bx,
        z: bz,
        r: Math.max(bw, bd) / 2 + 1.5,
      });
    };

    // Populate block towers inside grid segments
    // A block cell is roughly 170x170 inside intersections
    for (let i = -400; i <= 400; i += 200) {
      for (let j = -400; j <= 400; j += 200) {
        // Skip central intersections and road centers
        if (i === 0 && j === 0) continue;
        // Place towers slightly offset from roads
        createBuilding(i - 60, j - 60, 45, 45, 20 + Math.random() * 40);
        createBuilding(i + 60, j - 60, 40, 45, 25 + Math.random() * 30);
        createBuilding(i - 60, j + 60, 45, 40, 30 + Math.random() * 50);
        createBuilding(i + 60, j + 60, 40, 40, 15 + Math.random() * 20);
      }
    }

    // Street Lamps along main roads
    const lampGeo = new THREE.CylinderGeometry(0.15, 0.2, 8, 5);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const lampLightGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const lampLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const addStreetLamp = (lx: number, lz: number) => {
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(lx, 4, lz);

      const bulb = new THREE.Mesh(lampLightGeo, lampLightMat);
      bulb.position.set(0, 4, 0);
      lamp.add(bulb);

      // At night we can add real light points
      if (timeOfDay === "night" || timeOfDay === "sunset") {
        const pLight = new THREE.PointLight(0xfef08a, 0.4, 25);
        pLight.position.set(0, 4, 0);
        lamp.add(pLight);
      }

      scene.add(lamp);
    };

    // Place a few streetlamps along main downtown center vertical (x=0)
    for (let z = -450; z <= 450; z += 150) {
      if (z !== 0) {
        addStreetLamp(-17, z);
        addStreetLamp(17, z);
      }
    }

    // Tunnels (Heavy structures on highways)
    const addTunnel = (tx: number, tz: number, length: number) => {
      const tunnelGeo = new THREE.BoxGeometry(40, 15, length);
      const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, side: THREE.BackSide });
      const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
      tunnelMesh.position.set(tx, 7.5, tz);

      // Hollow inner structure cut
      scene.add(tunnelMesh);

      // Add a few glowing orange tunnel lights
      for (let offset = -length / 2 + 20; offset < length / 2; offset += 40) {
        const tLight = new THREE.PointLight(0xf97316, 0.6, 30);
        tLight.position.set(0, 6, offset);
        tunnelMesh.add(tLight);

        // Visual light box
        const boxGeo = new THREE.BoxGeometry(4, 0.2, 2);
        const boxMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(0, 7.4, offset);
        tunnelMesh.add(box);
      }
    };

    addTunnel(400, 200, 150); // Tunnel on right highway
    addTunnel(-400, -200, 150); // Tunnel on left highway

    // Gas Station (Visual asset in the corner)
    const addGasStation = (gx: number, gz: number) => {
      const canopyGeo = new THREE.BoxGeometry(35, 1, 20);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // Red roof canopy
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(gx, 6, gz);
      scene.add(canopy);

      const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, 6);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
      for (let px of [-15, 15]) {
        for (let pz of [-8, 8]) {
          const pil = new THREE.Mesh(pillarGeo, pillarMat);
          pil.position.set(px, 3, pz);
          canopy.add(pil);
        }
      }

      // Pumps
      const pumpGeo = new THREE.BoxGeometry(2, 3, 1.5);
      const pumpMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      for (let pz of [-4, 4]) {
        const pump = new THREE.Mesh(pumpGeo, pumpMat);
        pump.position.set(0, 1.5, pz);
        canopy.add(pump);
      }
    };

    addGasStation(100, -100);

    // --- CAR MODELS ---

    // Helper to build a car mesh group
    const buildCarMeshGroup = (definition: typeof carDef, colorHex: string, customVisuals?: typeof customization) => {
      const group = new THREE.Group();
      const style = definition.meshStyle;

      const paintColor = customVisuals?.paintColor || colorHex;
      const neonColor = customVisuals?.neonColor || "";
      const neonEnabled = customVisuals?.neonEnabled || false;
      const spoilerType = customVisuals?.spoilerType || "none";

      // Main body
      const bodyMat = new THREE.MeshStandardMaterial({
        color: paintColor,
        roughness: 0.2,
        metalness: 0.8,
      });
      const bodyGeo = new THREE.BoxGeometry(style.bodyWidth, style.bodyHeight * 0.6, style.bodyLength);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = style.bodyHeight * 0.3;
      group.add(body);

      // Windshield & Roof Cabin
      if (style.hasRoof) {
        const cabinMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a, // dark tinted glass
          roughness: 0.1,
          metalness: 0.9,
        });
        const cabinGeo = new THREE.BoxGeometry(style.bodyWidth * 0.85, style.bodyHeight * 0.5, style.bodyLength * 0.5);
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, style.bodyHeight * 0.75, -style.bodyLength * 0.05);
        group.add(cabin);
      }

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
      const rimMat = new THREE.MeshStandardMaterial({
        color: customVisuals?.rimsType === "chrome" ? 0xf1f5f9 : customVisuals?.rimsType === "alloy" ? 0x94a3b8 : 0x334155,
        roughness: 0.1,
        metalness: 0.9,
      });

      const wheelGeo = new THREE.CylinderGeometry(style.wheelRadius, style.wheelRadius, style.wheelWidth, 12);
      wheelGeo.rotateZ(Math.PI / 2);

      const rimGeo = new THREE.CylinderGeometry(style.wheelRadius * 0.6, style.wheelRadius * 0.6, style.wheelWidth + 0.02, 10);
      rimGeo.rotateZ(Math.PI / 2);

      const positions = [
        { x: -style.bodyWidth / 2 - 0.02, z: style.bodyLength / 2 - 0.5 }, // Front Left
        { x: style.bodyWidth / 2 + 0.02, z: style.bodyLength / 2 - 0.5 },  // Front Right
        { x: -style.bodyWidth / 2 - 0.02, z: -style.bodyLength / 2 + 0.5 }, // Rear Left
        { x: style.bodyWidth / 2 + 0.02, z: -style.bodyLength / 2 + 0.5 },  // Rear Right
      ];

      positions.forEach((pos) => {
        const wheelGroup = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeo, wheelMat);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        wheelGroup.add(tire);
        wheelGroup.add(rim);

        wheelGroup.position.set(pos.x, style.wheelRadius * 0.5, pos.z);
        group.add(wheelGroup);
      });

      // Headlights (Front glowing circles)
      const headlightGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

      const headL = new THREE.Mesh(headlightGeo, headlightMat);
      headL.position.set(-style.bodyWidth * 0.35, style.bodyHeight * 0.25, style.bodyLength * 0.5);
      const headR = new THREE.Mesh(headlightGeo, headlightMat);
      headR.position.set(style.bodyWidth * 0.35, style.bodyHeight * 0.25, style.bodyLength * 0.5);
      group.add(headL);
      group.add(headR);

      // Tail lights
      const taillightGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
      const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      const tailL = new THREE.Mesh(taillightGeo, taillightMat);
      tailL.position.set(-style.bodyWidth * 0.35, style.bodyHeight * 0.25, -style.bodyLength * 0.5);
      const tailR = new THREE.Mesh(taillightGeo, taillightMat);
      tailR.position.set(style.bodyWidth * 0.35, style.bodyHeight * 0.25, -style.bodyLength * 0.5);
      group.add(tailL);
      group.add(tailR);

      // Custom Spoilers
      if (spoilerType !== "none" || style.spoilerHeight > 0) {
        const spoilerMat = new THREE.MeshStandardMaterial({ color: paintColor, roughness: 0.3 });
        const spoilerWidth = style.bodyWidth * 1.1;

        // Pillars
        const pillGeo = new THREE.CylinderGeometry(0.04, 0.04, style.spoilerHeight + 0.1);
        const pillL = new THREE.Mesh(pillGeo, spoilerMat);
        pillL.position.set(-style.bodyWidth * 0.35, style.bodyHeight * 0.4 + style.spoilerHeight / 2, -style.bodyLength * 0.45);
        const pillR = new THREE.Mesh(pillGeo, spoilerMat);
        pillR.position.set(style.bodyWidth * 0.35, style.bodyHeight * 0.4 + style.spoilerHeight / 2, -style.bodyLength * 0.45);
        group.add(pillL);
        group.add(pillR);

        // Spoiler Wing
        const wingGeo = new THREE.BoxGeometry(spoilerWidth, 0.05, 0.4);
        const wing = new THREE.Mesh(wingGeo, spoilerMat);
        wing.position.set(0, style.bodyHeight * 0.4 + style.spoilerHeight + 0.1, -style.bodyLength * 0.45);
        group.add(wing);

        // Fin edges
        if (spoilerType === "gt_wing") {
          const finGeo = new THREE.BoxGeometry(0.05, 0.2, 0.4);
          const finL = new THREE.Mesh(finGeo, spoilerMat);
          finL.position.set(-spoilerWidth / 2, style.bodyHeight * 0.4 + style.spoilerHeight + 0.15, -style.bodyLength * 0.45);
          const finR = new THREE.Mesh(finGeo, spoilerMat);
          finR.position.set(spoilerWidth / 2, style.bodyHeight * 0.4 + style.spoilerHeight + 0.15, -style.bodyLength * 0.45);
          group.add(finL);
          group.add(finR);
        }
      }

      // Neon Underglow Light Source
      if (neonEnabled && neonColor) {
        const uLight = new THREE.PointLight(new THREE.Color(neonColor), 2.5, 5);
        uLight.position.set(0, -0.2, 0);
        group.add(uLight);

        // Visual neon bar
        const barGeo = new THREE.BoxGeometry(style.bodyWidth * 0.8, 0.05, style.bodyLength * 0.7);
        const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(neonColor) });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(0, 0.05, 0);
        group.add(bar);
      }

      return group;
    };

    // Instantiate and add player car
    const playerGroup = buildCarMeshGroup(carDef, carDef.color, customization);
    scene.add(playerGroup);

    // --- TRACK CHECKPOINTS (visual and functional indicators) ---
    const checkpointsContainer = new THREE.Group();
    scene.add(checkpointsContainer);

    let activeCourse: RaceCourse | null = activeRace ? RACES_LIST.find((r) => r.id === activeRace.courseId) || null : null;
    const checkpointRings: THREE.Mesh[] = [];

    const buildCheckpoints = () => {
      // Clear old rings
      while (checkpointRings.length > 0) {
        const ring = checkpointRings.pop();
        if (ring) checkpointsContainer.remove(ring);
      }

      if (!activeCourse) return;

      activeCourse.checkpoints.forEach((cp, idx) => {
        const gateGroup = new THREE.Group();
        gateGroup.position.set(cp.x, 0, cp.z);

        // Main neon glowing ring (Toroidal cylinder/ring)
        const ringGeo = new THREE.TorusGeometry(cp.width / 2, 0.6, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: idx === 0 ? 0x22c55e : 0x3b82f6, // Start green, others blue
          transparent: true,
          opacity: 0.55,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = cp.width / 4;
        ring.rotation.y = Math.PI / 2; // Face direction
        gateGroup.add(ring);

        // Side Pillars
        const pilGeo = new THREE.CylinderGeometry(0.5, 0.8, cp.width / 2, 8);
        const pilMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });

        const pilL = new THREE.Mesh(pilGeo, pilMat);
        pilL.position.set(-cp.width / 2, cp.width / 4, 0);
        const pilR = new THREE.Mesh(pilGeo, pilMat);
        pilR.position.set(cp.width / 2, cp.width / 4, 0);

        gateGroup.add(pilL);
        gateGroup.add(pilR);

        // Keep direct access to update materials
        (gateGroup as any).cpIndex = idx;
        checkpointsContainer.add(gateGroup);
        checkpointRings.push(gateGroup as any);
      });
    };

    buildCheckpoints();

    // --- TRAFFIC AI VEHICLES ---
    const trafficCount = 20;
    const trafficList: {
      mesh: THREE.Group;
      x: number;
      z: number;
      vx: number;
      vz: number;
      speed: number;
      lane: number;
      roadIndex: number;
      length: number;
    }[] = [];

    const trafficColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x6b7280, 0xffffff, 0xfed7aa];

    const spawnTrafficVehicle = () => {
      // Pick a random straight road
      if (roadsList.length === 0) return;
      const roadIdx = Math.floor(Math.random() * roadsList.length);
      const road = roadsList[roadIdx];

      const geo = road.geometry as any;
      const isVert = geo.parameters.width < geo.parameters.height;
      const roadW = isVert ? geo.parameters.width : geo.parameters.height;
      const roadL = isVert ? geo.parameters.height : geo.parameters.width;

      const randomOffsetL = (Math.random() - 0.5) * roadL;
      // Spawn in left or right lane
      const laneSide = Math.random() > 0.5 ? 1 : -1;
      const laneOffset = (roadW / 4) * laneSide;

      const tx = isVert ? road.position.x + laneOffset : road.position.x + randomOffsetL;
      const tz = isVert ? road.position.z + randomOffsetL : road.position.z + laneOffset;

      const carGroup = new THREE.Group();
      const colHex = trafficColors[Math.floor(Math.random() * trafficColors.length)];

      const bGeo = new THREE.BoxGeometry(1.6, 0.9, 3.8);
      const bMat = new THREE.MeshStandardMaterial({ color: colHex, roughness: 0.4 });
      const body = new THREE.Mesh(bGeo, bMat);
      body.position.y = 0.45;
      carGroup.add(body);

      const cabGeo = new THREE.BoxGeometry(1.4, 0.5, 1.8);
      const cabMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
      const cabin = new THREE.Mesh(cabGeo, cabMat);
      cabin.position.set(0, 0.95, -0.2);
      carGroup.add(cabin);

      // Wheels
      const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8);
      wGeo.rotateZ(Math.PI / 2);
      const wMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
      for (let px of [-0.85, 0.85]) {
        for (let pz of [-1.2, 1.2]) {
          const wh = new THREE.Mesh(wGeo, wMat);
          wh.position.set(px, 0.35, pz);
          carGroup.add(wh);
        }
      }

      carGroup.position.set(tx, 0, tz);
      scene.add(carGroup);

      // Align rotation with direction of the road
      const tSpeed = 8 + Math.random() * 6; // slow traffic
      // Vert roads go up/down, horiz go left/right
      let travelAngle = 0;
      if (isVert) {
        travelAngle = laneSide > 0 ? 0 : Math.PI; // Go north or south
      } else {
        travelAngle = laneSide > 0 ? Math.PI / 2 : -Math.PI / 2; // Go east or west
      }
      carGroup.rotation.y = travelAngle;

      trafficList.push({
        mesh: carGroup,
        x: tx,
        z: tz,
        vx: Math.sin(travelAngle) * tSpeed,
        vz: Math.cos(travelAngle) * tSpeed,
        speed: tSpeed,
        lane: laneSide,
        roadIndex: roadIdx,
        length: 4.2,
      });
    };

    for (let i = 0; i < trafficCount; i++) {
      spawnTrafficVehicle();
    }

    // --- OPPONENT AI VEHICLES (RACE ONLY) ---
    const opponentsList: {
      mesh: THREE.Group;
      name: string;
      carId: string;
      speed: number;
      maxSpeed: number;
      accel: number;
      handling: number;
      angle: number;
      x: number;
      z: number;
      currentCheckpoint: number;
      finished: boolean;
      progress: number;
      lap: number;
    }[] = [];

    const aiNames = ["Rezo", "Kira", "Talon", "Jax", "Sienna", "Viper"];
    const aiColors = [0xd97706, 0xc084fc, 0x22c55e, 0xef4444, 0xec4899, 0x3b82f6];

    const setupOpponents = () => {
      // Clear previous opponents
      opponentsList.forEach((opp) => scene.remove(opp.mesh));
      opponentsList.length = 0;

      if (!activeCourse) return;

      const count = activeCourse.difficulty === "easy" ? 2 : activeCourse.difficulty === "medium" ? 3 : 4;
      const startX = activeCourse.checkpoints[0].x;
      const startZ = activeCourse.checkpoints[0].z;

      for (let i = 0; i < count; i++) {
        const aiCarDef = CARS_LIST[1 + (i % 3)] || CARS_LIST[1];
        const oppColor = aiColors[i % aiColors.length];
        const oppGroup = buildCarMeshGroup(aiCarDef, "#" + oppColor.toString(16));

        // Stagger spawn behind player (staggered grid)
        const sideOffset = ((i % 2) - 0.5) * 8;
        const rearOffset = -12 - Math.floor(i / 2) * 12;

        oppGroup.position.set(startX + sideOffset, 0, startZ + rearOffset);
        oppGroup.rotation.y = Math.PI; // Face forward
        scene.add(oppGroup);

        opponentsList.push({
          mesh: oppGroup,
          name: aiNames[i % aiNames.length],
          carId: aiCarDef.id,
          speed: 0,
          maxSpeed: maxSpeed * (0.8 + i * 0.05), // slightly varied max speed
          accel: accelerationRate * (0.8 + Math.random() * 0.2),
          handling: handlingTurnRate * (0.9 + Math.random() * 0.15),
          angle: Math.PI,
          x: startX + sideOffset,
          z: startZ + rearOffset,
          currentCheckpoint: 1, // targeting checkpoint 1
          finished: false,
          progress: 0,
          lap: 1,
        });
      }
    };

    if (activeRace) {
      setupOpponents();
    }

    // --- POLICE AI VEHICLES (WANTED SYSTEM) ---
    const policeCount = 4;
    const policeList: {
      mesh: THREE.Group;
      x: number;
      z: number;
      vx: number;
      vz: number;
      speed: number;
      angle: number;
      lastSirenToggle: number;
      sirenOn: boolean;
      beaconL: THREE.Mesh;
      beaconR: THREE.Mesh;
    }[] = [];

    const spawnPoliceCar = (px: number, pz: number) => {
      const copGroup = new THREE.Group();

      // Police visual: White body with black hood and doors
      const bGeo = new THREE.BoxGeometry(1.8, 1.0, 4.4);
      const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }); // White base
      const body = new THREE.Mesh(bGeo, bMat);
      body.position.y = 0.5;
      copGroup.add(body);

      // Black details
      const blkGeo = new THREE.BoxGeometry(1.82, 0.6, 1.4);
      const blkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
      const hood = new THREE.Mesh(blkGeo, blkMat);
      hood.position.set(0, 0.4, 1.2);
      copGroup.add(hood);

      const cabinGeo = new THREE.BoxGeometry(1.4, 0.6, 2.0);
      const cabin = new THREE.Mesh(cabinGeo, blkMat);
      cabin.position.set(0, 1.1, -0.2);
      copGroup.add(cabin);

      // Red and Blue flashing beacons on top
      const beaconGeo = new THREE.BoxGeometry(0.5, 0.15, 0.2);
      const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

      const beaconL = new THREE.Mesh(beaconGeo, blueMat);
      beaconL.position.set(-0.4, 1.45, -0.2);
      copGroup.add(beaconL);

      const beaconR = new THREE.Mesh(beaconGeo, redMat);
      beaconR.position.set(0.4, 1.45, -0.2);
      copGroup.add(beaconR);

      // Add actual warning lights that can flash
      const pL1 = new THREE.PointLight(0x3b82f6, 1.5, 10);
      pL1.position.set(-0.4, 1.45, -0.2);
      copGroup.add(pL1);

      const pL2 = new THREE.PointLight(0xef4444, 1.5, 10);
      pL2.position.set(0.4, 1.45, -0.2);
      copGroup.add(pL2);

      // Wheels
      const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
      wGeo.rotateZ(Math.PI / 2);
      const wMat = new THREE.MeshStandardMaterial({ color: 0x090d16 });
      for (let xPos of [-0.95, 0.95]) {
        for (let zPos of [-1.4, 1.4]) {
          const wh = new THREE.Mesh(wGeo, wMat);
          wh.position.set(xPos, 0.4, zPos);
          copGroup.add(wh);
        }
      }

      copGroup.position.set(px, 0, pz);
      scene.add(copGroup);

      policeList.push({
        mesh: copGroup,
        x: px,
        z: pz,
        vx: 0,
        vz: 0,
        speed: 0,
        angle: 0,
        lastSirenToggle: 0,
        sirenOn: false,
        beaconL,
        beaconR,
      });
    };

    // Trigger initial police patrols nearby but not too close
    const spawnInitialPolicePatrols = () => {
      // Clean previous cops
      policeList.forEach((cop) => scene.remove(cop.mesh));
      policeList.length = 0;

      // Spawn cops around player starting position
      spawnPoliceCar(150, 150);
      spawnPoliceCar(-150, -150);
      spawnPoliceCar(350, -250);
    };

    spawnInitialPolicePatrols();

    // Roadblock structures (Police blocking grid lanes dynamically based on Wanted Level)
    const roadblockContainer = new THREE.Group();
    scene.add(roadblockContainer);

    const setupRoadblock = (rx: number, rz: number, isVert: boolean) => {
      roadblockContainer.clear();

      // Police cruiser parked sideways
      const copBarGroup = new THREE.Group();
      copBarGroup.position.set(rx, 0, rz);
      copBarGroup.rotation.y = isVert ? Math.PI / 2 : 0;

      // Visual barricade mesh
      const barGeo = new THREE.BoxGeometry(10, 1.5, 0.5);
      const barMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 }); // Yellow barriers
      const barrier = new THREE.Mesh(barGeo, barMat);
      barrier.position.set(0, 0.75, 0);
      copBarGroup.add(barrier);

      // Glow indicators
      const glowGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      for (let offset = -4; offset <= 4; offset += 2) {
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(offset, 1.6, 0);
        copBarGroup.add(glow);
      }

      roadblockContainer.add(copBarGroup);
    };

    // --- PARTICLE EFFECTS (RAIN, EXHAUST, SPARKS) ---
    // Rain Particles
    const rainCount = 1000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 150;     // X around camera
      rainPositions[i + 1] = Math.random() * 50;           // Y height
      rainPositions[i + 2] = (Math.random() - 0.5) * 150;   // Z depth
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    scene.add(rainParticles);

    // Exhaust Smoke / Nitro Fire Particles
    const exhaustParticlesCount = 60;
    const exhaustGeo = new THREE.BufferGeometry();
    const exhaustPositions = new Float32Array(exhaustParticlesCount * 3);
    const exhaustAges = new Float32Array(exhaustParticlesCount);
    for (let i = 0; i < exhaustParticlesCount; i++) {
      exhaustPositions[i * 3] = 0;
      exhaustPositions[i * 3 + 1] = -100; // start hidden
      exhaustPositions[i * 3 + 2] = 0;
      exhaustAges[i] = Math.random();
    }
    exhaustGeo.setAttribute("position", new THREE.BufferAttribute(exhaustPositions, 3));
    const exhaustMat = new THREE.PointsMaterial({
      color: 0xff4500, // Flame orange for nitro, turns grey for normal exhaust
      size: 0.35,
      transparent: true,
      opacity: 0.8,
    });
    const exhaustPoints = new THREE.Points(exhaustGeo, exhaustMat);
    scene.add(exhaustPoints);

    let nextExhaustIndex = 0;
    const triggerExhaustParticle = (px: number, py: number, pz: number, angle: number, isNitroActive: boolean) => {
      const idx = nextExhaustIndex;
      nextExhaustIndex = (nextExhaustIndex + 1) % exhaustParticlesCount;

      const pos = exhaustPoints.geometry.attributes.position.array as Float32Array;
      pos[idx * 3] = px - Math.sin(angle) * 2.1 + (Math.random() - 0.5) * 0.3; // slightly behind exhaust pipes
      pos[idx * 3 + 1] = py + 0.25;
      pos[idx * 3 + 2] = pz - Math.cos(angle) * 2.1 + (Math.random() - 0.5) * 0.3;
      exhaustAges[idx] = 0; // Fresh particle

      // Dynamically change colors based on nitro status
      if (isNitroActive) {
        exhaustMat.color.setHex(0x38bdf8); // Blue hot plasma flame
        exhaustMat.size = 0.55;
      } else {
        exhaustMat.color.setHex(0xef4444); // Red/Orange standard exhaust
        exhaustMat.size = 0.3;
      }
      exhaustPoints.geometry.attributes.position.needsUpdate = true;
    };

    // --- MINI-MAP CAMERA ---
    // The minimap has an overhead Orthographic camera following the player
    const minimapSize = 120;
    const minimapCam = new THREE.OrthographicCamera(
      -minimapSize,
      minimapSize,
      minimapSize,
      -minimapSize,
      1,
      1000
    );
    minimapCam.position.set(0, 150, 0);
    minimapCam.lookAt(0, 0, 0);

    // --- GAME ENGINE LOOP ---
    let lastTime = performance.now();
    let frameCount = 0;

    const gameLoop = () => {
      animFrameId = requestAnimationFrame(gameLoop);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // Cap dt to prevent massive jumps on background lag
      lastTime = now;

      // Gather current state from refs (reactive inputs)
      const {
        isPaused: paused,
        weather: curWeather,
        timeOfDay: curTOD,
        activeRace: curRace,
        isMobileControls: mobControls,
        mobileInputs: mobInputs,
      } = stateRef.current;

      if (paused) {
        audio.stopAll();
        return;
      }

      frameCount++;

      // Adjust environments dynamically if changed
      updateLighting(curTOD, curWeather);

      // --- PLAYER INPUT RESOLUTION ---
      let gasInput = 0;
      let steerInput = 0;
      let handbrakeActive = false;
      let nitroActive = false;

      if (mobControls) {
        gasInput = mobInputs.gas;
        steerInput = mobInputs.steer;
        handbrakeActive = mobInputs.handbrake;
        nitroActive = mobInputs.nitro;
      } else {
        if (keys.w) gasInput = 1;
        else if (keys.s) gasInput = -1;

        if (keys.a) steerInput = -1;
        else if (keys.d) steerInput = 1;

        handbrakeActive = keys.space;
        nitroActive = keys.shift;
      }

      // --- PLAYER PHYSICS ENGINE ---
      const gripFactor = curWeather === "rainy" ? 0.6 : 1.0; // wet slippery asphalt!

      // Drift physics mechanics
      const isActuallyDrifting = handbrakeActive && playerPhysics.speed > 8 && Math.abs(steerInput) > 0.15;
      playerPhysics.isDrifting = isActuallyDrifting;

      if (isActuallyDrifting) {
        // Reduced lateral grip, slide sideways
        playerPhysics.driftFactor = THREE.MathUtils.lerp(playerPhysics.driftFactor, 0.85, dt * 5);
        playerPhysics.driftAngle = THREE.MathUtils.lerp(
          playerPhysics.driftAngle,
          -steerInput * 0.45 * (1.2 - playerPhysics.speed / maxSpeed),
          dt * 4
        );

        // Increase drift scores
        stateRef.current.driftTime += dt;
        stateRef.current.totalDriftPoints += Math.floor(playerPhysics.speed * dt * 8);

        // Trigger tire screech synthesizer
        audio.setScreech(true, Math.min(playerPhysics.speed / 15, 1.2));
      } else {
        playerPhysics.driftFactor = THREE.MathUtils.lerp(playerPhysics.driftFactor, 0.1, dt * 6);
        playerPhysics.driftAngle = THREE.MathUtils.lerp(playerPhysics.driftAngle, 0, dt * 8);

        if (stateRef.current.driftTime > 0.5) {
          // Commit drift score to GDD UI
          onDriftScore(stateRef.current.totalDriftPoints, stateRef.current.driftTime);
        }
        stateRef.current.driftTime = 0;
        stateRef.current.totalDriftPoints = 0;

        audio.setScreech(false);
      }

      // Nitro application
      const usingNitro = nitroActive && currentNitro > 0 && gasInput === 1;
      if (usingNitro) {
        currentNitro = Math.max(0, currentNitro - dt * 30);
        audio.setNitro(true);
      } else {
        audio.setNitro(false);
        // Slowly recharge nitro
        currentNitro = Math.min(maxNitro, currentNitro + dt * (4 + upgrades.nitro * 1.5));
      }

      // Acceleration, deceleration, and braking
      const currentMaxSpeed = maxSpeed * (usingNitro ? 1.45 : 1.0);
      const accelRate = accelerationRate * (usingNitro ? 1.6 : 1.0);

      if (gasInput > 0) {
        // Accelerating
        playerPhysics.speed += accelRate * dt;
        if (playerPhysics.speed > currentMaxSpeed) {
          playerPhysics.speed = THREE.MathUtils.lerp(playerPhysics.speed, currentMaxSpeed, dt * 3);
        }
      } else if (gasInput < 0) {
        if (playerPhysics.speed > 1) {
          // Active Braking
          playerPhysics.speed -= brakeForce * dt;
        } else {
          // Reverse acceleration
          playerPhysics.speed -= accelRate * 0.4 * dt;
          playerPhysics.speed = Math.max(-15, playerPhysics.speed);
        }
      } else {
        // Engine braking / natural friction deceleration
        const frictionCoeff = 2.5 * gripFactor;
        playerPhysics.speed = THREE.MathUtils.lerp(playerPhysics.speed, 0, dt * frictionCoeff);
      }

      // Angular Steering update
      const currentTurnFactor = handlingTurnRate * (1.0 - (playerPhysics.speed / currentMaxSpeed) * 0.4) * (isActuallyDrifting ? 1.8 : 1.0);
      playerPhysics.angle += -steerInput * currentTurnFactor * playerPhysics.speed * dt * 1.5 * gripFactor;

      // Update position vector based on angle, sliding drift angle, and velocity
      const targetMoveAngle = playerPhysics.angle + playerPhysics.driftAngle;
      const vxTarget = Math.sin(targetMoveAngle) * playerPhysics.speed;
      const vzTarget = Math.cos(targetMoveAngle) * playerPhysics.speed;

      playerPhysics.vx = THREE.MathUtils.lerp(playerPhysics.vx, vxTarget, dt * (8 - playerPhysics.driftFactor * 5));
      playerPhysics.vz = THREE.MathUtils.lerp(playerPhysics.vz, vzTarget, dt * (8 - playerPhysics.driftFactor * 5));

      playerPhysics.x += playerPhysics.vx * dt;
      playerPhysics.z += playerPhysics.vz * dt;

      // Boundary collision check
      const bound = citySize / 2 - 15;
      if (Math.abs(playerPhysics.x) > bound) {
        playerPhysics.x = Math.sign(playerPhysics.x) * bound;
        playerPhysics.speed *= -0.4;
        audio.playCrash();
      }
      if (Math.abs(playerPhysics.z) > bound) {
        playerPhysics.z = Math.sign(playerPhysics.z) * bound;
        playerPhysics.speed *= -0.4;
        audio.playCrash();
      }

      // Building blocks collision bounds check (simplified rectangular envelope)
      buildingsList.forEach((b) => {
        const dx = playerPhysics.x - b.x;
        const dz = playerPhysics.z - b.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < b.r) {
          // Bounce back physics
          const angleToB = Math.atan2(dx, dz);
          playerPhysics.x = b.x + Math.sin(angleToB) * b.r;
          playerPhysics.z = b.z + Math.cos(angleToB) * b.r;
          playerPhysics.speed = -playerPhysics.speed * 0.5; // crash bounce
          audio.playCrash();
          // Increase police wanted stars if crashes are heavy
          if (Math.abs(playerPhysics.speed) > 15 && stateRef.current.wantedLevel === 0) {
            stateRef.current.wantedLevel = 1;
            onWantedLevelChange(1);
          }
        }
      });

      // Update player 3D mesh coordinates and rotation
      playerGroup.position.set(playerPhysics.x, 0, playerPhysics.z);
      playerGroup.rotation.y = playerPhysics.angle;

      // Rotate wheels visually
      playerGroup.children.forEach((child) => {
        if (child instanceof THREE.Group && child.children.length === 2) {
          // wheel rotation around axis
          const spinSpeed = (playerPhysics.speed / (2 * Math.PI * carDef.meshStyle.wheelRadius)) * dt * 10;
          child.children[0].rotation.x += spinSpeed;
        }
      });

      // Procedural exhaust sparks / smoke
      if (frameCount % 2 === 0) {
        triggerExhaustParticle(playerPhysics.x, playerPhysics.y, playerPhysics.z, playerPhysics.angle, usingNitro);
      }

      // Update dynamic RPM and send sound levels
      const relativeSpeed = Math.abs(playerPhysics.speed) / currentMaxSpeed;
      const simulatedRPM = Math.max(0.1, Math.min(1.0, 0.2 + relativeSpeed * 0.8));
      audio.updateEngineSound(simulatedRPM, gasInput !== 0);

      // --- RACE SYSTEM LOGIC ---
      if (curRace && curRace.status === "racing" && activeCourse) {
        const elapsed = (now - curRace.startTime) / 1000;

        // Check if player passed current checkpoint
        const currentCP = activeCourse.checkpoints[curRace.currentCheckpointIndex];
        const dx = playerPhysics.x - currentCP.x;
        const dz = playerPhysics.z - currentCP.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < currentCP.width) {
          // Play pass chime
          audio.playBeep(true);

          let nextIdx = curRace.currentCheckpointIndex + 1;
          let newLap = curRace.lap;
          let completed = false;

          if (nextIdx >= activeCourse.checkpoints.length) {
            if (activeCourse.type === "circuit" && curRace.lap < activeCourse.laps) {
              nextIdx = 0;
              newLap += 1;
            } else {
              completed = true;
            }
          }

          if (completed) {
            audio.stopAll();
            onRaceFinished(elapsed, true, false);
          } else {
            // Update HUD via React callbacks
            onRaceUpdate({
              currentCheckpointIndex: nextIdx,
              lap: newLap,
              checkpointsPassed: curRace.checkpointsPassed + 1,
            });
          }
        }

        // --- UPDATE CHECKPOINT RING STYLING ---
        checkpointRings.forEach((gate) => {
          const cpIdx = (gate as any).cpIndex;
          const ringMesh = gate.children[0] as THREE.Mesh;
          if (cpIdx === curRace.currentCheckpointIndex) {
            // Make targeted ring flashy yellow
            (ringMesh.material as THREE.MeshBasicMaterial).color.setHex(0xfacc15);
            (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
            gate.rotation.y += dt * 2; // spin slowly
          } else {
            (ringMesh.material as THREE.MeshBasicMaterial).color.setHex(0x3b82f6);
            (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.25;
          }
        });

        // --- UPDATE AI OPPONENTS LOGIC ---
        opponentsList.forEach((opp) => {
          if (opp.finished) return;

          const aiCP = activeCourse!.checkpoints[opp.currentCheckpoint];
          const oppDX = aiCP.x - opp.x;
          const oppDZ = aiCP.z - opp.z;
          const oppDist = Math.sqrt(oppDX * oppDX + oppDZ * oppDZ);

          if (oppDist < aiCP.width * 1.5) {
            opp.currentCheckpoint = (opp.currentCheckpoint + 1) % activeCourse!.checkpoints.length;
            if (opp.currentCheckpoint === 0) {
              if (activeCourse!.type === "circuit" && opp.lap < activeCourse!.laps) {
                opp.lap += 1;
              } else {
                opp.finished = true;
                opp.speed = 0;
              }
            }
          }

          // Steer AI to target checkpoint
          const targetAngle = Math.atan2(oppDX, oppDZ);
          opp.angle = THREE.MathUtils.lerp(opp.angle, targetAngle, dt * 5);

          // Accelerate AI
          opp.speed = THREE.MathUtils.lerp(opp.speed, opp.maxSpeed, dt * 2);

          // Position updates
          opp.x += Math.sin(opp.angle) * opp.speed * dt;
          opp.z += Math.cos(opp.angle) * opp.speed * dt;

          opp.mesh.position.set(opp.x, 0, opp.z);
          opp.mesh.rotation.y = opp.angle;

          // Track progress metric (checkpoint index + fractional distance to next)
          const totalCPs = activeCourse!.checkpoints.length;
          const nextCP = activeCourse!.checkpoints[(opp.currentCheckpoint + 1) % totalCPs];
          const distToNext = Math.sqrt((nextCP.x - opp.x) ** 2 + (nextCP.z - opp.z) ** 2);
          opp.progress = opp.lap * 1000 + opp.currentCheckpoint * 100 + (1 - Math.min(distToNext / 300, 1)) * 50;
        });

        // Calculate rankings (player vs AI progress)
        const playerProgress = curRace.lap * 1000 + curRace.currentCheckpointIndex * 100 + (1 - Math.min(dist / 300, 1)) * 50;
        const allRacers = [
          { name: "Player", progress: playerProgress, finished: curRace.status === "finished" },
          ...opponentsList.map((opp) => ({ name: opp.name, progress: opp.progress, finished: opp.finished })),
        ];

        allRacers.sort((a, b) => b.progress - a.progress);
        const playerRank = allRacers.findIndex((r) => r.name === "Player") + 1;

        if (frameCount % 10 === 0) {
          onRaceUpdate({
            elapsedTime: elapsed,
            position: playerRank,
          });
        }
      }

      // --- AI TRAFFIC SYSTEM DRIVING LOOP ---
      trafficList.forEach((car) => {
        car.x += car.vx * dt;
        car.z += car.vz * dt;

        car.mesh.position.set(car.x, 0, car.z);

        // Respawn traffic if they travel too far out of town grid
        if (Math.abs(car.x) > citySize / 2 || Math.abs(car.z) > citySize / 2) {
          car.x = (Math.random() - 0.5) * citySize * 0.7;
          car.z = (Math.random() - 0.5) * citySize * 0.7;
        }

        // Check collision with player car
        const pDX = playerPhysics.x - car.x;
        const pDZ = playerPhysics.z - car.z;
        const pDist = Math.sqrt(pDX * pDX + pDZ * pDZ);

        if (pDist < 3.2) {
          // Play crash sound
          audio.playCrash();
          // Bounce traffic back
          car.x -= car.vx * dt * 5;
          car.z -= car.vz * dt * 5;
          // Impact player speed
          playerPhysics.speed *= -0.3;

          // Alert police!
          if (stateRef.current.wantedLevel < 2) {
            stateRef.current.wantedLevel = 2;
            onWantedLevelChange(2);
          }
        }
      });

      // --- POLICE AI PURSUIT SYSTEM ---
      const activeWantedLevel = stateRef.current.wantedLevel;

      if (activeWantedLevel > 0) {
        stateRef.current.isChased = true;
        audio.setPoliceSiren(true);

        policeList.forEach((cop, idx) => {
          // Flashing light beacon triggers
          if (frameCount % 10 === 0) {
            cop.sirenOn = !cop.sirenOn;
            (cop.beaconL.material as THREE.MeshBasicMaterial).color.setHex(cop.sirenOn ? 0x3b82f6 : 0x111827);
            (cop.beaconR.material as THREE.MeshBasicMaterial).color.setHex(cop.sirenOn ? 0x111827 : 0xef4444);
          }

          // Steer directly towards player car coordinates
          const cDX = playerPhysics.x - cop.x;
          const cDZ = playerPhysics.z - cop.z;
          const copDist = Math.sqrt(cDX * cDX + cDZ * cDZ);

          // Chase behavior logic
          const copTargetAngle = Math.atan2(cDX, cDZ);
          cop.angle = THREE.MathUtils.lerp(cop.angle, copTargetAngle, dt * (3 + activeWantedLevel * 0.5));

          const copMaxSpeed = maxSpeed * (0.65 + activeWantedLevel * 0.08);
          cop.speed = THREE.MathUtils.lerp(cop.speed, copMaxSpeed, dt * 2.5);

          cop.vx = Math.sin(cop.angle) * cop.speed;
          cop.vz = Math.cos(cop.angle) * cop.speed;

          cop.x += cop.vx * dt;
          cop.z += cop.vz * dt;

          cop.mesh.position.set(cop.x, 0, cop.z);
          cop.mesh.rotation.y = cop.angle;

          // If cop gets very close to player, trigger bust progress
          if (copDist < 4.2) {
            // Police rammings
            if (cop.speed > 10 && Math.abs(playerPhysics.speed) > 2) {
              audio.playCrash();
              playerPhysics.speed *= -0.2;
            }

            // Fill up bust progress if player is trapped/slow
            if (Math.abs(playerPhysics.speed) < 5) {
              stateRef.current.policeEscapeProgress -= dt * 25; // Negative means getting busted!
            }
          }
        });

        // Calculate escape progress bar based on closeness of all cops
        let closestCopDist = 9999;
        policeList.forEach((cop) => {
          const cDist = Math.sqrt((playerPhysics.x - cop.x) ** 2 + (playerPhysics.z - cop.z) ** 2);
          if (cDist < closestCopDist) closestCopDist = cDist;
        });

        if (closestCopDist > 160) {
          // Player is getting away, progress escapes
          stateRef.current.policeEscapeProgress += dt * 15;
          if (stateRef.current.policeEscapeProgress >= 100) {
            // Successfully escaped police!
            audio.setPoliceSiren(false);
            stateRef.current.wantedLevel = 0;
            stateRef.current.policeEscapeProgress = 0;
            stateRef.current.isChased = false;
            onEscapePolice();
          }
        } else {
          // Under active chase
          stateRef.current.policeEscapeProgress = Math.max(-100, Math.min(100, stateRef.current.policeEscapeProgress - dt * 2));
          if (stateRef.current.policeEscapeProgress <= -99) {
            // Player got BUSTED!
            audio.stopAll();
            onRaceFinished(0, false, true); // Failed due to arrest!
          }
        }
      } else {
        // No wanted level, quiet patrols
        stateRef.current.isChased = false;
        audio.setPoliceSiren(false);
        policeList.forEach((cop) => {
          // Slow patrol loop in a square block
          if (frameCount % 100 === 0) {
            cop.angle += Math.PI / 2; // turn at intersections
          }
          cop.speed = 10;
          cop.x += Math.sin(cop.angle) * cop.speed * dt;
          cop.z += Math.cos(cop.angle) * cop.speed * dt;
          cop.mesh.position.set(cop.x, 0, cop.z);
          cop.mesh.rotation.y = cop.angle;
        });
      }

      // --- CAMERA CHASE ENGINE (SPRING ARM) ---
      // Position camera slightly behind and above player car based on rotation angle
      const armLength = 8.5 + (playerPhysics.speed / maxSpeed) * 1.5; // dynamically pull camera back at high speed!
      const armHeight = 2.4;

      const targetCamX = playerPhysics.x - Math.sin(playerPhysics.angle) * armLength;
      const targetCamZ = playerPhysics.z - Math.cos(playerPhysics.angle) * armLength;
      const targetCamY = armHeight;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, dt * 8);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, dt * 8);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, dt * 8);

      camera.lookAt(playerPhysics.x, playerPhysics.y + 0.6, playerPhysics.z);

      // Camera FOV high-speed stretch
      camera.fov = 65 + (playerPhysics.speed / maxSpeed) * 12;
      camera.updateProjectionMatrix();

      // --- WEATHER EFFECT LOOP (RAIN SPLASHES) ---
      if (curWeather === "rainy") {
        rainParticles.visible = true;
        const rainPos = rainParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount * 3; i += 3) {
          rainPos[i + 1] -= dt * 30; // Rain falls downwards
          if (rainPos[i + 1] < 0) {
            // Respawn above camera cluster
            rainPos[i] = playerPhysics.x + (Math.random() - 0.5) * 150;
            rainPos[i + 1] = 45 + Math.random() * 15;
            rainPos[i + 2] = playerPhysics.z + (Math.random() - 0.5) * 150;
          }
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      } else {
        rainParticles.visible = false;
      }

      // --- OVERHEAD MINIMAP TRACKING ---
      minimapCam.position.set(playerPhysics.x, 150, playerPhysics.z);
      minimapCam.lookAt(playerPhysics.x, 0, playerPhysics.z);

      // Write parameters to global window scope for low-overhead HUD reading
      const w = window as any;
      w.playerSpeedMPH = playerPhysics.speed * 2.237; // convert m/s to MPH
      w.playerNitro = currentNitro;
      w.playerEscProgress = stateRef.current.policeEscapeProgress;
      w.playerX = playerPhysics.x;
      w.playerZ = playerPhysics.z;
      w.playerAngle = playerPhysics.angle;

      // Map police positions list
      w.policeXList = policeList.map((cop) => cop.x);
      w.policeZList = policeList.map((cop) => cop.z);

      // Render actual gameplay viewport
      renderer.setViewport(0, 0, width, height);
      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(gameLoop);

    // Dynamic resize handler
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      audio.stopAll();
      renderer.dispose();
    };
  }, [profile.selectedCarId, activeRace?.courseId]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" id="game_viewport" />

      {/* Touch overlays indicators (for touch steering visualization) */}
      {isMobileControls && (
        <div className="absolute inset-0 pointer-events-none select-none flex justify-between items-end p-8 z-20">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] text-zinc-400">TOUCH STEERING RAIL</span>
          </div>
        </div>
      )}
    </div>
  );
};
