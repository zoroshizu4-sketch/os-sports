import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createBoundaryNetTexture,
  createFootballTextures,
  createGlowSpriteTexture,
  createTurfPitchTexture,
} from '../three/proceduralTextures';
import {
  createCornerFlag,
  createFloodlightTower,
  createFootballerRig,
  createGoalpost,
  type CornerFlagHandle,
  type FloodlightTowerHandle,
  type FootballerRig,
  type GoalpostHandle,
} from '../three/proceduralModels';
import {
  TURF_GALLERY_PHOTOS,
  type CameraPreset,
  type LightingMode,
  type PlayerAction,
} from '../types/turf';
import { soundEngine } from '../utils/soundEngine';

// Pre-allocated GC-free math scratch objects for per-frame useFrame
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.2, 0);
const _skyDay = new THREE.Color('#6ca8d9');
const _skySunset = new THREE.Color('#c76b38');
const _skyNight = new THREE.Color('#060908');
const _targetSky = new THREE.Color();
const _sunDayColor = new THREE.Color('#fff4d6');
const _sunSunsetColor = new THREE.Color('#ff9a44');
const _sunNightColor = new THREE.Color('#273a4d');
const _targetSunColor = new THREE.Color();
const _hemiSkyDay = new THREE.Color('#9ad1ff');
const _hemiSkySunset = new THREE.Color('#f59e56');
const _hemiSkyNight = new THREE.Color('#13221c');
const _dummyObj = new THREE.Object3D();

const PITCH_WIDTH = 22;
const PITCH_LENGTH = 36;
const PARTICLE_COUNT = 220;

interface TurfSceneProps {
  lightingMode: LightingMode;
  playerAction: PlayerAction;
  cameraPreset: CameraPreset;
  reducedMotion: boolean;
}

const TurfScene: React.FC<TurfSceneProps> = ({
  lightingMode,
  playerAction,
  cameraPreset,
  reducedMotion,
}) => {
  const { gl, scene, camera } = useThree();
  const maxAnisotropy = useMemo(() => Math.min(gl.capabilities.getMaxAnisotropy(), 8), [gl]);

  const pointerRef = useRef({ x: 0, y: 0 });
  const netRippleRef = useRef(0);
  const shockwaveRef = useRef(0);
  const particleBurstRef = useRef(0);
  const particleOriginRef = useRef(new THREE.Vector3(0, 0.35, 3));
  const actionTimerRef = useRef(0);
  const shotTriggeredCycleRef = useRef(-1);

  // Refs for scene objects
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const heroBallRef = useRef<THREE.Mesh | null>(null);
  const heroAuraRef = useRef<THREE.Mesh | null>(null);
  const matchBallRef = useRef<THREE.Mesh | null>(null);
  const shockwaveRingRef = useRef<THREE.Mesh | null>(null);
  const cloudsGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  // Procedural textures
  const textures = useMemo(() => {
    const pitchMap = createTurfPitchTexture(maxAnisotropy);
    const ballTex = createFootballTextures(maxAnisotropy);
    const netMap = createBoundaryNetTexture();
    const glowTex = createGlowSpriteTexture('rgba(255, 240, 175, 1)', 'rgba(212, 175, 55, 0.55)');
    return { pitchMap, ballTex, netMap, glowTex };
  }, [maxAnisotropy]);

  // Dispose textures on unmount
  useEffect(() => {
    return () => {
      textures.pitchMap.dispose();
      textures.ballTex.map.dispose();
      textures.ballTex.bumpMap.dispose();
      textures.netMap.dispose();
      textures.glowTex.dispose();
    };
  }, [textures]);

  // Setup RoomEnvironment & Fog once
  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    pmremGenerator.dispose();

    scene.background = new THREE.Color('#c76b38');
    scene.fog = new THREE.FogExp2('#c76b38', 0.0085);

    return () => {
      envMap.dispose();
    };
  }, [gl, scene]);

  // Pointer tracking for mouse-following parallax
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // Build composite models once
  const models = useMemo(() => {
    const striker: FootballerRig = createFootballerRig({
      jerseyColor: 0x111513,
      accentColor: 0xd4af37,
      shortsColor: 0x0b0d0c,
    });
    const defender: FootballerRig = createFootballerRig({
      jerseyColor: 0x15803d,
      accentColor: 0xf4f2ea,
      shortsColor: 0x0e1a12,
    });
    const keeper: FootballerRig = createFootballerRig({
      jerseyColor: 0xd4af37,
      accentColor: 0x0d1210,
      shortsColor: 0x101311,
    });

    const goalNorth: GoalpostHandle = createGoalpost(-PITCH_LENGTH / 2 + 1.2, -1);
    const goalSouth: GoalpostHandle = createGoalpost(PITCH_LENGTH / 2 - 1.2, 1);

    const flags: CornerFlagHandle[] = [
      createCornerFlag(-PITCH_WIDTH / 2 + 1.1, -PITCH_LENGTH / 2 + 1.2),
      createCornerFlag(PITCH_WIDTH / 2 - 1.1, -PITCH_LENGTH / 2 + 1.2),
      createCornerFlag(-PITCH_WIDTH / 2 + 1.1, PITCH_LENGTH / 2 - 1.2),
      createCornerFlag(PITCH_WIDTH / 2 - 1.1, PITCH_LENGTH / 2 - 1.2),
    ];

    const towers: FloodlightTowerHandle[] = [
      createFloodlightTower(-PITCH_WIDTH / 2 - 1.6, -PITCH_LENGTH / 2 - 1.4, -2, -4),
      createFloodlightTower(PITCH_WIDTH / 2 + 1.6, -PITCH_LENGTH / 2 - 1.4, 2, -4),
      createFloodlightTower(-PITCH_WIDTH / 2 - 1.6, PITCH_LENGTH / 2 + 1.4, -2, 4),
      createFloodlightTower(PITCH_WIDTH / 2 + 1.6, PITCH_LENGTH / 2 + 1.4, 2, 4),
    ];

    // Boundary posts instanced mesh
    const postPositions: [number, number][] = [];
    for (let x = -PITCH_WIDTH / 2 - 0.8; x <= PITCH_WIDTH / 2 + 0.8; x += 5.9) {
      postPositions.push([x, -PITCH_LENGTH / 2 - 0.8]);
      postPositions.push([x, PITCH_LENGTH / 2 + 0.8]);
    }
    for (let z = -PITCH_LENGTH / 2 + 3.2; z <= PITCH_LENGTH / 2 - 3.2; z += 5.9) {
      postPositions.push([-PITCH_WIDTH / 2 - 0.8, z]);
      postPositions.push([PITCH_WIDTH / 2 + 0.8, z]);
    }
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 6.2, 8);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x181c1a,
      roughness: 0.35,
      metalness: 0.8,
    });
    const postsInstanced = new THREE.InstancedMesh(postGeo, postMat, postPositions.length);
    postPositions.forEach(([px, pz], idx) => {
      _dummyObj.position.set(px, 3.1, pz);
      _dummyObj.rotation.set(0, 0, 0);
      _dummyObj.scale.set(1, 1, 1);
      _dummyObj.updateMatrix();
      postsInstanced.setMatrixAt(idx, _dummyObj.matrix);
    });
    postsInstanced.instanceMatrix.needsUpdate = true;
    postsInstanced.computeBoundingSphere();

    // Distant outdoor trees instanced mesh
    const treeCount = 44;
    const treeGeo = new THREE.ConeGeometry(1.7, 5.8, 7);
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x1b4628,
      roughness: 0.88,
      metalness: 0.02,
    });
    const treesInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const dist = 34 + (i % 4) * 5.5;
      const s = 0.85 + ((i * 7) % 10) * 0.04;
      _dummyObj.position.set(Math.cos(angle) * dist, 2.8 * s, Math.sin(angle) * dist * 1.15);
      _dummyObj.rotation.set(0, angle, 0);
      _dummyObj.scale.set(s, s, s);
      _dummyObj.updateMatrix();
      treesInstanced.setMatrixAt(i, _dummyObj.matrix);
    }
    treesInstanced.instanceMatrix.needsUpdate = true;
    treesInstanced.computeBoundingSphere();

    return {
      striker,
      defender,
      keeper,
      goalNorth,
      goalSouth,
      flags,
      towers,
      postsInstanced,
      treesInstanced,
    };
  }, []);

  // Particle system geometry & velocities
  const particleState = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 5 + 0.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 28;
      velocities[i * 3] = (Math.random() - 0.5) * 8;
      velocities[i * 3 + 1] = Math.random() * 6 + 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geo, velocities };
  }, []);

  useEffect(() => {
    return () => {
      particleState.geo.dispose();
    };
  }, [particleState]);

  // Trigger golden burst & shockwave on action changes
  useEffect(() => {
    if (playerAction === 'celebrate') {
      particleBurstRef.current = 1.0;
      particleOriginRef.current.set(0, 1.1, -6);
      shockwaveRef.current = 1.0;
      soundEngine.playChime();
    } else if (playerAction === 'shoot' || playerAction === 'dive') {
      shockwaveRef.current = 0.85;
      soundEngine.playKickImpact();
    }
  }, [playerAction]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const elapsed = performance.now() * 0.001;

    // 1. Lighting & Sky smooth transitions
    if (lightingMode === 'day') {
      _targetSky.copy(_skyDay);
      _targetSunColor.copy(_sunDayColor);
    } else if (lightingMode === 'sunset') {
      _targetSky.copy(_skySunset);
      _targetSunColor.copy(_sunSunsetColor);
    } else {
      _targetSky.copy(_skyNight);
      _targetSunColor.copy(_sunNightColor);
    }

    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(_targetSky, 1 - Math.exp(-3.2 * delta));
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(_targetSky, 1 - Math.exp(-3.2 * delta));
      const targetDensity = lightingMode === 'night' ? 0.015 : 0.0085;
      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetDensity, 3.2, delta);
    }

    if (dirLightRef.current) {
      const targetSunInt = lightingMode === 'day' ? 2.1 : lightingMode === 'sunset' ? 1.65 : 0.25;
      dirLightRef.current.intensity = THREE.MathUtils.damp(
        dirLightRef.current.intensity,
        targetSunInt,
        3.5,
        delta
      );
      dirLightRef.current.color.lerp(_targetSunColor, 1 - Math.exp(-3.5 * delta));
      const sunX = lightingMode === 'sunset' ? -24 : 18;
      const sunY = lightingMode === 'sunset' ? 9 : 28;
      dirLightRef.current.position.x = THREE.MathUtils.damp(dirLightRef.current.position.x, sunX, 2.5, delta);
      dirLightRef.current.position.y = THREE.MathUtils.damp(dirLightRef.current.position.y, sunY, 2.5, delta);
    }

    if (hemiLightRef.current) {
      const targetHemiSky =
        lightingMode === 'day'
          ? _hemiSkyDay
          : lightingMode === 'sunset'
            ? _hemiSkySunset
            : _hemiSkyNight;
      hemiLightRef.current.color.lerp(targetHemiSky, 1 - Math.exp(-3.2 * delta));
      hemiLightRef.current.intensity = THREE.MathUtils.damp(
        hemiLightRef.current.intensity,
        lightingMode === 'night' ? 0.45 : 0.95,
        3.2,
        delta
      );
    }

    // Floodlight towers illumination
    models.towers.forEach((tower) => {
      const targetTowerOn = lightingMode === 'night' ? 1.0 : lightingMode === 'sunset' ? 0.65 : 0.04;
      tower.bulbMaterial.emissiveIntensity = THREE.MathUtils.damp(
        tower.bulbMaterial.emissiveIntensity,
        targetTowerOn * 4.2,
        6.0,
        delta
      );
      tower.beamMaterial.opacity = THREE.MathUtils.damp(
        tower.beamMaterial.opacity,
        targetTowerOn * (lightingMode === 'night' ? 0.095 : 0.04),
        4.0,
        delta
      );
      tower.spotLight.intensity = THREE.MathUtils.damp(
        tower.spotLight.intensity,
        targetTowerOn * (lightingMode === 'night' ? 280 : 120),
        4.5,
        delta
      );
    });

    // Flutter corner flags gently in outdoor breeze
    models.flags.forEach((f, idx) => {
      f.flagPivot.rotation.y = Math.sin(elapsed * 4.2 + idx * 1.4) * 0.28 + 0.2;
    });

    // Drift open-air clouds
    if (cloudsGroupRef.current && !reducedMotion) {
      cloudsGroupRef.current.children.forEach((cloud, i) => {
        cloud.position.x += delta * (0.45 + (i % 3) * 0.18);
        if (cloud.position.x > 46) cloud.position.x = -46;
      });
      cloudsGroupRef.current.visible = lightingMode !== 'night';
    }

    // 2. Hero Ball Rotation & Glowing Turf Aura
    if (heroBallRef.current) {
      heroBallRef.current.visible = cameraPreset === 'broadcast';
      heroBallRef.current.rotation.y += delta * (reducedMotion ? 0 : 0.85);
      heroBallRef.current.rotation.x += delta * (reducedMotion ? 0 : 0.3);
      heroBallRef.current.position.y = 1.48 + Math.sin(elapsed * 2.1) * 0.14;
    }
    if (heroAuraRef.current) {
      heroAuraRef.current.visible = cameraPreset === 'broadcast';
      const pulse = 1 + Math.sin(elapsed * 2.1) * 0.12;
      heroAuraRef.current.scale.set(pulse, pulse, 1);
      heroAuraRef.current.rotation.z += delta * 0.45;
    }

    // Mouse parallax offset
    const px = reducedMotion ? 0 : pointerRef.current.x * 1.35;
    const py = reducedMotion ? 0 : pointerRef.current.y * 0.65;

    if (cameraPreset === 'broadcast') {
      _camTargetPos.set(11.5 + px, 6.2 + py, 16.5);
      _camTargetLook.set(px * 0.4, 1.1, -1.5);
    } else if (cameraPreset === 'drone') {
      _camTargetPos.set(px * 2.2, 19.5 + py, 20.0);
      _camTargetLook.set(0, 0.4, -2.0);
    } else {
      _camTargetPos.set(-3.2 + px, 1.35 + py * 0.4, -2.5);
      _camTargetLook.set(0, 1.2, -16.5);
    }

    // 3. Articulated 3D Footballer, Defender & Goalkeeper Animations
    actionTimerRef.current += delta;
    const cycleT = actionTimerRef.current;
    let activeAction: Exclude<PlayerAction, 'auto'> = 'dribble';
    if (playerAction === 'auto') {
      const cycle = cycleT % 12;
      if (cycle < 4.5) activeAction = 'dribble';
      else if (cycle < 7.0) activeAction = 'shoot';
      else if (cycle < 9.2) activeAction = 'dive';
      else activeAction = 'celebrate';
    } else {
      activeAction = playerAction;
    }

    const striker = models.striker;
    const defender = models.defender;
    const keeper = models.keeper;
    const matchBall = matchBallRef.current;

    // Defender continuously jockeys / tracks play dynamically
    const defX = Math.sin(cycleT * 1.25) * 3.4 + 2.4;
    const defZ = -4.2 + Math.cos(cycleT * 0.9) * 2.2;
    defender.group.position.set(defX, 0, defZ);
    defender.group.rotation.y = Math.atan2(striker.group.position.x - defX, striker.group.position.z - defZ);
    const defStride = Math.sin(cycleT * 7.5);
    defender.leftThigh.rotation.x = defStride * 0.38;
    defender.rightThigh.rotation.x = -defStride * 0.38;
    defender.leftArm.rotation.x = -defStride * 0.3;
    defender.rightArm.rotation.x = defStride * 0.3;
    defender.pelvis.position.y = 0.94 + Math.abs(Math.sin(cycleT * 7.5)) * 0.03;

    if (activeAction === 'dribble') {
      const weaveX = Math.sin(cycleT * 1.5) * 2.8;
      const weaveZ = 4.0 - ((cycleT * 1.2) % 8);
      striker.group.position.set(weaveX, 0, weaveZ);
      striker.group.rotation.y = Math.PI + Math.cos(cycleT * 1.5) * 0.45;
      const stride = Math.sin(cycleT * 9);
      striker.leftThigh.rotation.x = stride * 0.55;
      striker.rightThigh.rotation.x = -stride * 0.55;
      striker.leftCalf.rotation.x = Math.max(0, -stride * 0.5);
      striker.rightCalf.rotation.x = Math.max(0, stride * 0.5);
      striker.leftArm.rotation.x = -stride * 0.45;
      striker.rightArm.rotation.x = stride * 0.45;
      striker.leftArm.rotation.z = -0.15;
      striker.rightArm.rotation.z = 0.15;
      striker.torso.rotation.x = 0.12;
      striker.pelvis.position.y = 0.95 + Math.abs(Math.sin(cycleT * 9)) * 0.05;
      striker.pelvis.rotation.z = 0;

      if (matchBall) {
        matchBall.position.set(weaveX + Math.sin(cycleT * 6) * 0.25, 0.24, weaveZ - 0.65);
        matchBall.rotation.x -= delta * 8;
      }
      keeper.group.position.set(Math.sin(cycleT * 1.8) * 1.2, 0, -PITCH_LENGTH / 2 + 2.0);
      keeper.group.rotation.set(0, 0, 0);
      keeper.pelvis.position.y = 0.92;
      keeper.leftArm.rotation.set(-0.7, 0, -0.5);
      keeper.rightArm.rotation.set(-0.7, 0, 0.5);
    } else if (activeAction === 'shoot' || activeAction === 'dive') {
      const shotCycleIdx = Math.floor(cycleT / 2.4);
      const shotProgress = (cycleT % 2.4) / 2.4;
      striker.group.position.set(-1.2, 0, -6.5);
      striker.group.rotation.y = Math.PI - 0.18;
      striker.pelvis.position.y = 0.95;
      striker.pelvis.rotation.z = 0;

      if (shotProgress < 0.35) {
        const w = shotProgress / 0.35;
        striker.rightThigh.rotation.x = THREE.MathUtils.lerp(0, 0.85, w);
        striker.leftThigh.rotation.x = -0.25;
        striker.torso.rotation.x = 0.18;
        if (matchBall) matchBall.position.set(-0.8, 0.24, -7.2);
        keeper.group.position.set(0, 0, -PITCH_LENGTH / 2 + 1.9);
        keeper.group.rotation.set(0, 0, 0);
      } else {
        const f = (shotProgress - 0.35) / 0.65;
        striker.rightThigh.rotation.x = THREE.MathUtils.lerp(0.85, -1.0, Math.min(1, f * 3));
        striker.torso.rotation.x = -0.15;
        if (matchBall) {
          matchBall.position.set(
            THREE.MathUtils.lerp(-0.8, 1.75, f),
            0.24 + Math.sin(f * Math.PI) * 1.65,
            THREE.MathUtils.lerp(-7.2, -PITCH_LENGTH / 2 + 0.6, f)
          );
          matchBall.rotation.x -= delta * 18;
          matchBall.rotation.y += delta * 10;
        }
        const diveEase = Math.sin(Math.min(1, f * 1.35) * Math.PI * 0.5);
        keeper.group.position.set(diveEase * 1.85, diveEase * 0.45, -PITCH_LENGTH / 2 + 2.0);
        keeper.group.rotation.z = -diveEase * 1.25;
        keeper.leftArm.rotation.set(-2.5, 0, -0.3);
        keeper.rightArm.rotation.set(-2.5, 0, 0.3);

        if (f > 0.78 && shotTriggeredCycleRef.current !== shotCycleIdx) {
          shotTriggeredCycleRef.current = shotCycleIdx;
          netRippleRef.current = 1.0;
          shockwaveRef.current = 1.0;
          particleBurstRef.current = 1.0;
          particleOriginRef.current.set(1.5, 1.3, -PITCH_LENGTH / 2 + 0.8);
        }
      }
    } else {
      const celT = cycleT * 4;
      striker.group.position.set(Math.sin(celT * 0.35) * 1.8, 0, -8.5);
      striker.group.rotation.y = Math.PI * 0.2;
      striker.pelvis.position.y = 0.78 + Math.abs(Math.sin(celT)) * 0.14;
      striker.torso.rotation.x = -0.22;
      striker.leftArm.rotation.set(-2.6, 0, -0.45);
      striker.rightArm.rotation.set(-2.6, 0, 0.45);
      striker.leftThigh.rotation.x = -0.45;
      striker.rightThigh.rotation.x = 0.35;
      keeper.group.position.set(0, 0, -PITCH_LENGTH / 2 + 2.0);
      keeper.group.rotation.set(0, 0, 0);
      if (matchBall) {
        matchBall.position.set(1.2, 0.24, -PITCH_LENGTH / 2 + 0.9);
      }
    }

    // 4. Turf Golden Impact Shockwave Ring
    if (shockwaveRingRef.current) {
      if (shockwaveRef.current > 0.01) {
        shockwaveRef.current *= Math.exp(-2.8 * delta);
        const s = (1 - shockwaveRef.current) * 6.5 + 0.4;
        shockwaveRingRef.current.scale.set(s, s, 1);
        (shockwaveRingRef.current.material as THREE.MeshBasicMaterial).opacity =
          shockwaveRef.current * 0.75;
        shockwaveRingRef.current.visible = true;
      } else {
        shockwaveRingRef.current.visible = false;
      }
    }

    // 5. Goal Net Wave Ripple Physics
    if (netRippleRef.current > 0.005) {
      netRippleRef.current *= Math.exp(-3.2 * delta);
      const posAttr = models.goalNorth.netGeometry.attributes.position;
      const base = models.goalNorth.basePositions;
      const amp = netRippleRef.current * 0.42;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const wave = Math.sin(bx * 2.2 + elapsed * 18) * Math.cos(by * 2.5) * amp;
        posAttr.setZ(i, base[i * 3 + 2] - Math.abs(wave));
      }
      posAttr.needsUpdate = true;
    }

    // 6. Golden Particles (burst + ambient floating gold motes)
    if (particlesRef.current) {
      const pAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      if (particleBurstRef.current > 0.02) {
        particleBurstRef.current *= Math.exp(-1.5 * delta);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const vx = particleState.velocities[i * 3];
          const vy = particleState.velocities[i * 3 + 1];
          const vz = particleState.velocities[i * 3 + 2];
          let x = pAttr.getX(i) + vx * delta * 1.4;
          let y = pAttr.getY(i) + vy * delta * 1.1;
          let z = pAttr.getZ(i) + vz * delta * 1.4;
          if (particleBurstRef.current > 0.88) {
            x = particleOriginRef.current.x + (Math.random() - 0.5) * 0.6;
            y = particleOriginRef.current.y + Math.random() * 0.6;
            z = particleOriginRef.current.z + (Math.random() - 0.5) * 0.6;
          }
          pAttr.setXYZ(i, x, Math.max(0.15, y), z);
        }
      } else {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          let y = pAttr.getY(i) + delta * 0.28;
          if (y > 7.5) y = 0.25;
          pAttr.setY(i, y);
        }
      }
      pAttr.needsUpdate = true;
    }

    // 7. Smooth damped camera glide
    camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 3.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 3.2, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 3.2, delta);

    _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _camTargetLook.x, 3.8, delta);
    _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _camTargetLook.y, 3.8, delta);
    _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _camTargetLook.z, 3.8, delta);
    camera.lookAt(_currentLook);
  });

  return (
    <>
      <hemisphereLight ref={hemiLightRef} args={['#f59e56', '#0e2816', 0.9]} />
      <directionalLight
        ref={dirLightRef}
        position={[-18, 12, 12]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Extended Open-Air Ground Terrain (offset -0.04 on Y to avoid Z-fighting) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color="#122116" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Main Artificial Green Football Pitch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[PITCH_WIDTH, PITCH_LENGTH]} />
        <meshStandardMaterial map={textures.pitchMap} roughness={0.86} metalness={0.02} />
      </mesh>

      {/* Perimeter Open-Air Boundary Netting */}
      {[
        { pos: [0, 3.1, -PITCH_LENGTH / 2 - 0.8] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: PITCH_WIDTH + 1.6 },
        { pos: [0, 3.1, PITCH_LENGTH / 2 + 0.8] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number], w: PITCH_WIDTH + 1.6 },
        { pos: [-PITCH_WIDTH / 2 - 0.8, 3.1, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: PITCH_LENGTH + 1.6 },
        { pos: [PITCH_WIDTH / 2 + 0.8, 3.1, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number], w: PITCH_LENGTH + 1.6 },
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos} rotation={wall.rot}>
          <planeGeometry args={[wall.w, 6.2]} />
          <meshBasicMaterial
            map={textures.netMap}
            transparent
            alphaTest={0.08}
            side={THREE.DoubleSide}
            opacity={0.75}
          />
        </mesh>
      ))}

      {/* Instanced Boundary Posts & Surrounding Open-Air Trees */}
      <primitive object={models.postsInstanced} />
      <primitive object={models.treesInstanced} />

      {/* Goalposts & Corner Flags */}
      <primitive object={models.goalNorth.group} />
      <primitive object={models.goalSouth.group} />
      {models.flags.map((flag, i) => (
        <primitive key={i} object={flag.group} />
      ))}

      {/* 4 Outdoor Floodlight Towers */}
      {models.towers.map((tower, idx) => (
        <React.Fragment key={idx}>
          <primitive object={tower.group} />
          <primitive object={tower.spotLight} />
          <primitive object={tower.spotLight.target} />
        </React.Fragment>
      ))}

      {/* Articulated 3D Striker, Defender & Goalkeeper */}
      <primitive object={models.striker.group} />
      <primitive object={models.defender.group} />
      <primitive object={models.keeper.group} />

      {/* Match Ball on Pitch */}
      <mesh ref={matchBallRef} position={[0, 0.24, 2]} castShadow>
        <sphereGeometry args={[0.24, 28, 24]} />
        <meshPhysicalMaterial
          map={textures.ballTex.map}
          bumpMap={textures.ballTex.bumpMap}
          bumpScale={0.015}
          roughness={0.32}
          metalness={0.18}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
        />
      </mesh>

      {/* Golden Impact Shockwave Ring */}
      <mesh
        ref={shockwaveRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, -14]}
        visible={false}
      >
        <ringGeometry args={[0.7, 0.95, 32]} />
        <meshBasicMaterial
          color="#f6e27a"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Hero Centerpiece 3D Rotating Football & Gold Ring Aura */}
      <mesh ref={heroBallRef} position={[6.2, 1.48, 9.2]} castShadow>
        <sphereGeometry args={[0.92, 42, 32]} />
        <meshPhysicalMaterial
          map={textures.ballTex.map}
          bumpMap={textures.ballTex.bumpMap}
          bumpScale={0.028}
          roughness={0.24}
          metalness={0.38}
          clearcoat={0.7}
          clearcoatRoughness={0.18}
        />
      </mesh>
      <mesh ref={heroAuraRef} rotation={[-Math.PI / 2, 0, 0]} position={[6.2, 0.03, 9.2]}>
        <ringGeometry args={[0.95, 1.25, 32]} />
        <meshBasicMaterial
          color="#d4af37"
          transparent
          opacity={0.42}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Animated Open-Sky 3D Clouds */}
      <group ref={cloudsGroupRef}>
        {[
          [-26, 24, -30, 1.2],
          [-6, 27, -38, 1.5],
          [16, 23, -28, 1.1],
          [32, 26, -36, 1.4],
          [-18, 25, -18, 0.9],
        ].map(([cx, cy, cz, cs], idx) => (
          <group key={idx} position={[cx, cy, cz]} scale={cs}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[2.8, 14, 12]} />
              <meshStandardMaterial color="#f6f7f8" roughness={0.95} transparent opacity={0.82} />
            </mesh>
            <mesh position={[2.2, -0.4, 0.3]}>
              <sphereGeometry args={[2.0, 12, 10]} />
              <meshStandardMaterial color="#f2f4f6" roughness={0.95} transparent opacity={0.78} />
            </mesh>
            <mesh position={[-2.1, -0.5, -0.2]}>
              <sphereGeometry args={[2.1, 12, 10]} />
              <meshStandardMaterial color="#f2f4f6" roughness={0.95} transparent opacity={0.78} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Golden Particle Burst & Motes */}
      <points ref={particlesRef} geometry={particleState.geo}>
        <pointsMaterial
          map={textures.glowTex}
          color="#f6e27a"
          size={0.55}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
};

export interface Turf3DCanvasProps {
  lightingMode: LightingMode;
  playerAction: PlayerAction;
  cameraPreset: CameraPreset;
  reducedMotion: boolean;
}

export const Turf3DCanvas: React.FC<Turf3DCanvasProps> = ({
  lightingMode,
  playerAction,
  cameraPreset,
  reducedMotion,
}) => {
  const [contextLost, setContextLost] = useState(false);

  const isSoftwareGl = useMemo(() => {
    if (typeof document === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }, []);

  if (contextLost || reducedMotion) {
    const fallbackSrc =
      lightingMode === 'night' ? TURF_GALLERY_PHOTOS[1].src : TURF_GALLERY_PHOTOS[0].src;
    return (
      <div className="relative w-full h-full overflow-hidden bg-[#070908]">
        <img
          src={fallbackSrc}
          alt="OS SPORTS TURF open-air football pitch in Mettupalayam"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070908] via-[#070908]/45 to-black/40" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        dpr={isSoftwareGl ? 1 : [1, 2]}
        shadows={!isSoftwareGl}
        camera={{ position: [4, 18, 28], fov: 48, near: 0.2, far: 180 }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          const canvasEl = gl.domElement;
          canvasEl.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          canvasEl.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <TurfScene
          lightingMode={lightingMode}
          playerAction={playerAction}
          cameraPreset={cameraPreset}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
};
