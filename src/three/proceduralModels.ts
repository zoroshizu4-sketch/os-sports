import * as THREE from 'three';

export interface FootballerRig {
  group: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  leftThigh: THREE.Group;
  leftCalf: THREE.Group;
  rightThigh: THREE.Group;
  rightCalf: THREE.Group;
}

/**
 * Composite 12-part articulated footballer rig grounded at bottom-center (y = 0).
 */
export function createFootballerRig(options: {
  jerseyColor: number;
  accentColor: number;
  shortsColor: number;
  skinColor?: number;
}): FootballerRig {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinColor ?? 0xb87a52,
    roughness: 0.72,
    metalness: 0.02,
  });
  const jerseyMat = new THREE.MeshStandardMaterial({
    color: options.jerseyColor,
    roughness: 0.58,
    metalness: 0.08,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: options.accentColor,
    roughness: 0.25,
    metalness: 0.85,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: options.shortsColor,
    roughness: 0.62,
    metalness: 0.05,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x111312,
    roughness: 0.35,
    metalness: 0.25,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x171412,
    roughness: 0.85,
    metalness: 0.02,
  });

  // Pelvis pivot at hip height (0.95m)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.95, 0);
  group.add(pelvis);

  const hipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.24), shortsMat);
  hipMesh.castShadow = true;
  pelvis.add(hipMesh);

  // Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.1, 0);
  pelvis.add(torso);

  const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.5, 10), jerseyMat);
  chestMesh.position.y = 0.26;
  chestMesh.scale.set(1.1, 1, 0.72);
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // Metallic gold chest stripe
  const stripeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.28), accentMat);
  stripeMesh.position.y = 0.33;
  torso.add(stripeMesh);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 0.56, 0);
  torso.add(head);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 8), skinMat);
  neckMesh.position.y = 0.04;
  head.add(neckMesh);

  const skullMesh = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), skinMat);
  skullMesh.position.y = 0.18;
  skullMesh.castShadow = true;
  head.add(skullMesh);

  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hairMesh.position.set(0, 0.19, -0.01);
  head.add(hairMesh);

  // Arms helper
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.28, 0.46, 0);
    torso.add(shoulder);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.16, 8), jerseyMat);
    sleeve.position.y = -0.07;
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.22, 8), skinMat);
    upperArm.position.y = -0.22;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.33, 0);
    shoulder.add(forearm);

    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.036, 0.26, 8), skinMat);
    lowerArm.position.y = -0.13;
    lowerArm.castShadow = true;
    forearm.add(lowerArm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skinMat);
    hand.position.y = -0.27;
    forearm.add(hand);

    return { shoulder, forearm };
  };

  const leftA = makeArm(-1);
  const rightA = makeArm(1);

  // Legs helper
  const makeLeg = (side: -1 | 1) => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.12, -0.04, 0);
    pelvis.add(thigh);

    const shortLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.082, 0.24, 8), shortsMat);
    shortLeg.position.y = -0.11;
    shortLeg.castShadow = true;
    thigh.add(shortLeg);

    const kneeSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.065, 0.22, 8), skinMat);
    kneeSkin.position.y = -0.31;
    kneeSkin.castShadow = true;
    thigh.add(kneeSkin);

    const calf = new THREE.Group();
    calf.position.set(0, -0.43, 0);
    thigh.add(calf);

    const sockMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.048, 0.36, 8), jerseyMat);
    sockMesh.position.y = -0.18;
    sockMesh.castShadow = true;
    calf.add(sockMesh);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.24), bootMat);
    boot.position.set(0, -0.42, 0.05);
    boot.castShadow = true;
    calf.add(boot);

    const bootTrim = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.025, 0.14), accentMat);
    bootTrim.position.set(0, -0.40, 0.02);
    calf.add(bootTrim);

    return { thigh, calf };
  };

  const leftL = makeLeg(-1);
  const rightL = makeLeg(1);

  return {
    group,
    pelvis,
    torso,
    head,
    leftArm: leftA.shoulder,
    leftForearm: leftA.forearm,
    rightArm: rightA.shoulder,
    rightForearm: rightA.forearm,
    leftThigh: leftL.thigh,
    leftCalf: leftL.calf,
    rightThigh: rightL.thigh,
    rightCalf: rightL.calf,
  };
}

export interface FloodlightTowerHandle {
  group: THREE.Group;
  bulbMaterial: THREE.MeshStandardMaterial;
  beamMaterial: THREE.MeshBasicMaterial;
  spotLight: THREE.SpotLight;
}

/**
 * Multi-part outdoor floodlight tower (base plinth, pole, gold collar, rack, LED heads, cone beam).
 */
export function createFloodlightTower(
  x: number,
  z: number,
  targetX: number,
  targetZ: number
): FloodlightTowerHandle {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x222624,
    roughness: 0.85,
    metalness: 0.05,
  });
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x1e2220,
    roughness: 0.3,
    metalness: 0.85,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.2,
    metalness: 0.92,
  });
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff8e7,
    emissive: 0xffefc2,
    emissiveIntensity: 0,
    roughness: 0.15,
    metalness: 0.1,
  });

  // Plinth
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.7, 8), concreteMat);
  plinth.position.y = 0.35;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Tapered steel tower
  const towerHeight = 14.5;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.26, towerHeight, 10),
    poleMat
  );
  mast.position.y = towerHeight / 2;
  mast.castShadow = true;
  group.add(mast);

  // Metallic gold collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 12), goldMat);
  collar.position.y = towerHeight - 0.5;
  group.add(collar);

  // Head assembly aimed at pitch center
  const headPivot = new THREE.Group();
  headPivot.position.set(0, towerHeight, 0);
  headPivot.lookAt(targetX, 0, targetZ);
  group.add(headPivot);

  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.18), poleMat);
  headPivot.add(crossBar);

  // 4 LED floodlight pods
  [-1.05, -0.35, 0.35, 1.05].forEach((offsetX) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.24), poleMat);
    housing.position.set(offsetX, 0.28, 0.05);
    headPivot.add(housing);

    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.32), bulbMaterial);
    lens.position.set(offsetX, 0.28, 0.18);
    headPivot.add(lens);
  });

  // Volumetric cone beam
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe8a8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const coneGeo = new THREE.ConeGeometry(7.5, 22, 20, 1, true);
  coneGeo.translate(0, -11, 0);
  coneGeo.rotateX(-Math.PI / 2);
  const beamCone = new THREE.Mesh(coneGeo, beamMaterial);
  beamCone.position.set(0, 0.25, 0.2);
  headPivot.add(beamCone);

  const spotLight = new THREE.SpotLight(0xfff1d0, 0, 55, Math.PI / 3.4, 0.55, 1.4);
  spotLight.position.set(x, towerHeight, z);
  spotLight.target.position.set(targetX, 0, targetZ);

  return { group, bulbMaterial, beamMaterial, spotLight };
}

export interface GoalpostHandle {
  group: THREE.Group;
  netGeometry: THREE.PlaneGeometry;
  basePositions: Float32Array;
}

/**
 * Multi-part regulation goalpost with reactive vertex-displaced rear netting.
 */
export function createGoalpost(zPos: number, facingDir: 1 | -1): GoalpostHandle {
  const group = new THREE.Group();
  group.position.set(0, 0, zPos);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    roughness: 0.28,
    metalness: 0.55,
  });
  const goldClipMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.9,
  });

  const goalWidth = 5.4;
  const goalHeight = 2.35;
  const goalDepth = 1.65;
  const postRadius = 0.075;
  const halfW = goalWidth / 2;

  // Left & Right front posts
  [-halfW, halfW].forEach((px) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 12),
      frameMat
    );
    post.position.set(px, goalHeight / 2, 0);
    post.castShadow = true;
    group.add(post);

    // Base plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), goldClipMat);
    plate.position.set(px, 0.02, 0);
    group.add(plate);

    // Rear support stanchion
    const rearPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, goalHeight * 0.95, 8),
      frameMat
    );
    rearPost.position.set(px, (goalHeight * 0.95) / 2, -facingDir * goalDepth);
    group.add(rearPost);

    // Top side bar
    const sideTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, goalDepth, 8),
      frameMat
    );
    sideTop.rotation.x = Math.PI / 2;
    sideTop.position.set(px, goalHeight - 0.05, (-facingDir * goalDepth) / 2);
    group.add(sideTop);

    // Bottom side bar
    const sideBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, goalDepth, 8),
      frameMat
    );
    sideBottom.rotation.x = Math.PI / 2;
    sideBottom.position.set(px, 0.04, (-facingDir * goalDepth) / 2);
    group.add(sideBottom);
  });

  // Crossbar
  const crossbar = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, goalWidth + postRadius * 2, 12),
    frameMat
  );
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, goalHeight, 0);
  crossbar.castShadow = true;
  group.add(crossbar);

  // Rear ground bar
  const rearGround = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, goalWidth, 8),
    frameMat
  );
  rearGround.rotation.z = Math.PI / 2;
  rearGround.position.set(0, 0.04, -facingDir * goalDepth);
  group.add(rearGround);

  // Reactive rear net mesh
  const netGeometry = new THREE.PlaneGeometry(goalWidth, goalHeight, 18, 10);
  const basePositions = new Float32Array(netGeometry.attributes.position.array);
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xeaece8,
    wireframe: true,
    transparent: true,
    opacity: 0.42,
    roughness: 0.9,
  });
  const rearNet = new THREE.Mesh(netGeometry, netMat);
  rearNet.position.set(0, goalHeight / 2, -facingDir * goalDepth);
  group.add(rearNet);

  // Side nets & top net
  const sideGeo = new THREE.PlaneGeometry(goalDepth, goalHeight, 6, 8);
  [-halfW, halfW].forEach((px) => {
    const sNet = new THREE.Mesh(sideGeo, netMat);
    sNet.rotation.y = Math.PI / 2;
    sNet.position.set(px, goalHeight / 2, (-facingDir * goalDepth) / 2);
    group.add(sNet);
  });

  const topGeo = new THREE.PlaneGeometry(goalWidth, goalDepth, 16, 6);
  const topNet = new THREE.Mesh(topGeo, netMat);
  topNet.rotation.x = Math.PI / 2;
  topNet.position.set(0, goalHeight - 0.04, (-facingDir * goalDepth) / 2);
  group.add(topNet);

  return { group, netGeometry, basePositions };
}

export interface CornerFlagHandle {
  group: THREE.Group;
  flagPivot: THREE.Group;
}

/**
 * Multi-part pitch corner flag with metallic gold pole and fluttering flag pivot.
 */
export function createCornerFlag(x: number, z: number): CornerFlagHandle {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xf4f2ea,
    roughness: 0.35,
    metalness: 0.4,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.9,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.65,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 8), goldMat);
  base.position.y = 0.025;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 1.35, 8), poleMat);
  pole.position.y = 0.675;
  pole.castShadow = true;
  group.add(pole);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), goldMat);
  finial.position.y = 1.36;
  group.add(finial);

  const flagPivot = new THREE.Group();
  flagPivot.position.set(0, 1.22, 0);
  group.add(flagPivot);

  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24, 4, 2), clothMat);
  cloth.position.set(0.18, 0, 0);
  flagPivot.add(cloth);

  return { group, flagPivot };
}

