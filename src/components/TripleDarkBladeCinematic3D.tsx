import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CharacterProfile } from '../types/game';
import { sound } from '../utils/audio';

interface TripleDarkBladeCinematic3DProps {
  character?: CharacterProfile;
  skillName: string;
  onComplete: () => void;
}

export const TripleDarkBladeCinematic3D: React.FC<TripleDarkBladeCinematic3DProps> = ({
  character,
  skillName,
  onComplete,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phaseText, setPhaseText] = useState('IGNIÇÃO DAS TRÊS LÂMINAS NEGRAS');
  const [slowMo, setSlowMo] = useState(false);
  const [shattered, setShattered] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    // Play cinematic sound effects
    sound.legendaryWin();
    sound.slash();

    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL to adapt rendering pipeline
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020806);
    scene.fog = new THREE.FogExp2(0x020b08, 0.045);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 3.2);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x064e3b, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x34d399, 0x022c22, 1.5);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(4, 8, 6);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const emeraldRimLight = new THREE.DirectionalLight(0x10b981, 4.5);
    emeraldRimLight.position.set(-6, 4, -4);
    scene.add(emeraldRimLight);

    const floorLight = new THREE.PointLight(0x34d399, 4.0, 12);
    floorLight.position.set(0, 0.4, 0);
    scene.add(floorLight);

    // 5. Cosmic Arena Floor
    const floorGeo = new THREE.CircleGeometry(16, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x05130e,
      roughness: 0.2,
      metalness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Magic Runic Circles on Floor
    const ringGeo1 = new THREE.RingGeometry(2.4, 2.5, 64);
    const ringGeo2 = new THREE.RingGeometry(4.2, 4.35, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.02;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo2, ringMat.clone());
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.02;
    scene.add(ring2);

    // 6. Ethereal Particles & Stars
    const particleCount = 280;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 16;
      particlePositions[i * 3 + 1] = Math.random() * 8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      particleSpeeds.push(0.02 + Math.random() * 0.04);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.09,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Procedural Character Group
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // Skin & Hair color parsing
    const skinHex = character?.skinColor || '#fbcfe8';
    const hairHex = character?.hairColor || '#1e293b';

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(skinHex),
      roughness: 0.5,
      metalness: 0.1,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hairHex),
      roughness: 0.7,
      metalness: 0.2,
    });

    // Outfit Colors
    let coatColor = 0x1e293b;
    let pantsColor = 0x0f172a;
    let trimColor = 0x10b981;

    if (character?.outfitColor === 'red_vest') {
      coatColor = 0xb91c1c;
      pantsColor = 0x1e3a8a;
      trimColor = 0xf59e0b;
    } else if (character?.outfitColor === 'marine_white') {
      coatColor = 0xf8fafc;
      pantsColor = 0x1e293b;
      trimColor = 0x2563eb;
    } else if (character?.outfitColor === 'golden_emperor') {
      coatColor = 0xd97706;
      pantsColor = 0x451a03;
      trimColor = 0xfef08a;
    } else if (character?.outfitColor === 'cyan_shinobi') {
      coatColor = 0x0891b2;
      pantsColor = 0x164e63;
      trimColor = 0x22d3ee;
    }

    const coatMat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.4,
      metalness: 0.3,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: pantsColor,
      roughness: 0.6,
      metalness: 0.1,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.95,
    });

    // Character Torso
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.75, 16);
    const torso = new THREE.Mesh(torsoGeo, coatMat);
    torso.position.y = 1.05;
    torso.castShadow = !isSoftwareGl;
    characterGroup.add(torso);

    // Belt
    const beltGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16);
    const belt = new THREE.Mesh(beltGeo, goldMat);
    belt.position.y = 0.7;
    characterGroup.add(belt);

    // Pelvis & Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.7, 12);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.16, 0.35, 0);
    leftLeg.rotation.z = 0.08;
    characterGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.16, 0.35, 0);
    rightLeg.rotation.z = -0.08;
    characterGroup.add(rightLeg);

    // Boots
    const bootGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.22, 12);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3 });
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.19, 0.11, 0.04);
    characterGroup.add(leftBoot);

    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.19, 0.11, 0.04);
    characterGroup.add(rightBoot);

    // Head
    const headGeo = new THREE.SphereGeometry(0.24, 20, 20);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.62;
    characterGroup.add(head);

    // Glowing Anime Eyes with emerald admin energy
    const eyeGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 1.66, 0.22);
    characterGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 1.66, 0.22);
    characterGroup.add(rightEye);

    // Hair
    const hairGroup = new THREE.Group();
    const hairStyle = character?.hairStyle || 'spiky';

    if (hairStyle === 'spiky' || hairStyle === 'wild') {
      for (let i = 0; i < 9; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.1, 0.3, 8);
        const spike = new THREE.Mesh(spikeGeo, hairMat);
        const angle = (i / 9) * Math.PI * 1.6 - Math.PI * 0.8;
        spike.position.set(Math.sin(angle) * 0.2, 1.82 + Math.cos(angle) * 0.05, Math.cos(angle) * 0.14);
        spike.rotation.z = -angle * 0.7;
        spike.rotation.x = -0.3;
        hairGroup.add(spike);
      }
    } else {
      const hairBase = new THREE.SphereGeometry(0.26, 16, 16);
      const cap = new THREE.Mesh(hairBase, hairMat);
      cap.position.set(0, 1.68, -0.04);
      cap.scale.set(1.05, 1.05, 0.95);
      hairGroup.add(cap);
    }
    characterGroup.add(hairGroup);

    // Accessories
    const accessory = character?.accessory;
    if (accessory === 'straw_hat') {
      const brimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.03, 24);
      const hatCrownGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.22, 24);
      const strawMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });

      const brim = new THREE.Mesh(brimGeo, strawMat);
      brim.position.set(0, 1.82, -0.02);
      brim.rotation.x = -0.1;
      characterGroup.add(brim);

      const crown = new THREE.Mesh(hatCrownGeo, strawMat);
      crown.position.set(0, 1.94, -0.04);
      crown.rotation.x = -0.1;
      characterGroup.add(crown);

      const ribbon = new THREE.CylinderGeometry(0.285, 0.285, 0.06, 24);
      const ribbonMesh = new THREE.Mesh(ribbon, ribbonMat);
      ribbonMesh.position.set(0, 1.87, -0.03);
      ribbonMesh.rotation.x = -0.1;
      characterGroup.add(ribbonMesh);
    } else if (accessory === 'marine_cap') {
      const capGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.18, 20);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const visorGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16, 1, false, 0, Math.PI);
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 });

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 1.85, 0);
      characterGroup.add(cap);

      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.8, 0.15);
      visor.rotation.x = 0.25;
      characterGroup.add(visor);
    } else if (accessory === 'bandana') {
      const bandGeo = new THREE.TorusGeometry(0.25, 0.05, 12, 24);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, 1.68, 0);
      band.rotation.x = Math.PI / 2;
      characterGroup.add(band);
    }

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.65, 12);
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.4, 1.35, 0);
    const leftArm = new THREE.Mesh(armGeo, coatMat);
    leftArm.position.y = -0.28;
    leftArmGroup.add(leftArm);
    characterGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.4, 1.35, 0);
    const rightArm = new THREE.Mesh(armGeo, coatMat);
    rightArm.position.y = -0.28;
    rightArmGroup.add(rightArm);
    characterGroup.add(rightArmGroup);

    // 8. FUNCTION: Build 3D Kokuto Yoru Sword
    function createYoruSword(scale = 1.0) {
      const swordGroup = new THREE.Group();

      // Materials
      const hiltWrapMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.7,
        metalness: 0.2,
      });
      const goldCrossMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.2,
        metalness: 0.95,
      });
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
      });
      const obsidianBladeMat = new THREE.MeshStandardMaterial({
        color: 0x030706,
        roughness: 0.15,
        metalness: 0.92,
      });
      const emeraldEdgeMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.4,
      });

      // Handle (wrapped grip)
      const handleGeo = new THREE.CylinderGeometry(0.03 * scale, 0.035 * scale, 0.42 * scale, 12);
      const handle = new THREE.Mesh(handleGeo, hiltWrapMat);
      handle.position.y = -0.21 * scale;
      swordGroup.add(handle);

      // Pommel
      const pommelGeo = new THREE.SphereGeometry(0.055 * scale, 12, 12);
      const pommel = new THREE.Mesh(pommelGeo, goldCrossMat);
      pommel.position.y = -0.42 * scale;
      swordGroup.add(pommel);

      const pommelGem = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 10, 10), gemMat);
      pommelGem.position.y = -0.42 * scale;
      swordGroup.add(pommelGem);

      // Cruciform Crossguard (The signature Yoru Cross)
      const crossHorizontalGeo = new THREE.BoxGeometry(0.65 * scale, 0.08 * scale, 0.1 * scale);
      const crossHorizontal = new THREE.Mesh(crossHorizontalGeo, goldCrossMat);
      swordGroup.add(crossHorizontal);

      const crossQuillonLeft = new THREE.Mesh(new THREE.SphereGeometry(0.065 * scale, 12, 12), goldCrossMat);
      crossQuillonLeft.position.x = -0.325 * scale;
      swordGroup.add(crossQuillonLeft);

      const crossQuillonRight = new THREE.Mesh(new THREE.SphereGeometry(0.065 * scale, 12, 12), goldCrossMat);
      crossQuillonRight.position.x = 0.325 * scale;
      swordGroup.add(crossQuillonRight);

      // Central Emerald Jewel in Crossguard
      const centerGemGeo = new THREE.SphereGeometry(0.075 * scale, 16, 16);
      const centerGem = new THREE.Mesh(centerGemGeo, gemMat);
      swordGroup.add(centerGem);

      // Kokuto Blade: Colossal curved black blade
      const bladeGeo = new THREE.BoxGeometry(0.08 * scale, 1.7 * scale, 0.03 * scale);
      const blade = new THREE.Mesh(bladeGeo, obsidianBladeMat);
      blade.position.y = 0.88 * scale;
      swordGroup.add(blade);

      // Emerald Radiant Cutting Edge
      const edgeGeo = new THREE.BoxGeometry(0.018 * scale, 1.72 * scale, 0.032 * scale);
      const edge = new THREE.Mesh(edgeGeo, emeraldEdgeMat);
      edge.position.set(0.045 * scale, 0.88 * scale, 0);
      swordGroup.add(edge);

      // Pointed Tip
      const tipGeo = new THREE.ConeGeometry(0.065 * scale, 0.3 * scale, 4);
      const tip = new THREE.Mesh(tipGeo, obsidianBladeMat);
      tip.position.y = 1.85 * scale;
      swordGroup.add(tip);

      const tipGlow = new THREE.Mesh(new THREE.ConeGeometry(0.04 * scale, 0.32 * scale, 4), emeraldEdgeMat);
      tipGlow.position.set(0.02 * scale, 1.85 * scale, 0);
      swordGroup.add(tipGlow);

      return swordGroup;
    }

    // Attach 3 Swords (Triple Dark Blade / Santoryu Kokuto Setup)
    // Sword 1: Right Hand (Angled forward-right)
    const rightSword = createYoruSword(1.05);
    rightSword.position.set(0, -0.4, 0.1);
    rightSword.rotation.set(-0.4, 0.2, -0.6);
    rightArmGroup.add(rightSword);

    // Sword 2: Left Hand (Angled forward-left)
    const leftSword = createYoruSword(1.05);
    leftSword.position.set(0, -0.4, 0.1);
    leftSword.rotation.set(-0.4, -0.2, 0.6);
    leftArmGroup.add(leftSword);

    // Sword 3: Mouth / Central Floating Ethereal Yoru (Santoryu style)
    const centerSwordGroup = new THREE.Group();
    const mouthSword = createYoruSword(1.18);
    mouthSword.rotation.set(Math.PI / 2, 0, 0); // Pointing directly forward
    centerSwordGroup.position.set(0, 1.6, 0.28);
    centerSwordGroup.add(mouthSword);
    characterGroup.add(centerSwordGroup);

    // 9. Colossal Crescent Energy Slashes (Animated in Phase 2)
    const slashesGroup = new THREE.Group();
    scene.add(slashesGroup);

    const slashMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const arcShape = new THREE.RingGeometry(2.5 + i * 0.4, 3.2 + i * 0.4, 32, 1, 0, Math.PI * 0.7);
      const arcMat = new THREE.MeshBasicMaterial({
        color: i === 1 ? 0x6ee7b7 : 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      const slash = new THREE.Mesh(arcShape, arcMat);
      slash.position.set(0, 1.5, 0);
      slash.rotation.z = (i - 1) * 0.6;
      slashMeshes.push(slash);
      slashesGroup.add(slash);
    }

    // 10. Shatter Glass / Dimension Shards (Phase 3)
    const shardsGroup = new THREE.Group();
    scene.add(shardsGroup);
    const shardCount = 45;
    const shardMeshes: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; rx: number; ry: number }[] = [];

    for (let i = 0; i < shardCount; i++) {
      const size = 0.15 + Math.random() * 0.35;
      const shardGeo = new THREE.TetrahedronGeometry(size);
      const shardMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x34d399 : 0x059669,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85,
      });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.visible = false;
      shardsGroup.add(shard);
      shardMeshes.push({
        mesh: shard,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.2) * 0.18,
        vz: (Math.random() - 0.5) * 0.15,
        rx: Math.random() * 0.2,
        ry: Math.random() * 0.2,
      });
    }

    // 11. Animation Loop with Dynamic 3-Phase Camera Choreography
    let reqId = 0;
    const startTime = performance.now();
    const duration = 4300; // 4.3 seconds cinematic

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Rotate floor magic circles
      ring1.rotation.z += 0.02;
      ring2.rotation.z -= 0.015;

      // Float upward particles
      const posAttr = particleGeo.attributes.position;
      const positions = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i];
        if (positions[i * 3 + 1] > 8) {
          positions[i * 3 + 1] = 0;
        }
      }
      posAttr.needsUpdate = true;

      // PHASE 1: Extreme Close-up & Energy Ignition (0.0s - 1.3s)
      if (elapsed < 1300) {
        const p1 = elapsed / 1300;
        camera.position.set(
          Math.sin(p1 * 0.8) * 0.4,
          1.55 + Math.cos(p1 * 1.2) * 0.1,
          2.1 - p1 * 0.4
        );
        camera.lookAt(0, 1.6, 0);

        // Subtly raise character swords and shake
        const shake = (Math.random() - 0.5) * 0.02 * p1;
        characterGroup.position.x = shake;
        characterGroup.position.z = shake;

        rightArmGroup.rotation.x = -0.3 * p1;
        leftArmGroup.rotation.x = -0.3 * p1;

        floorLight.intensity = 3 + p1 * 5;
      }
      // PHASE 2: Santoryu Orbital Spin & 3D Crescent Slash (1.3s - 2.8s)
      else if (elapsed < 2800) {
        if (!slowMo) {
          setSlowMo(true);
          setPhaseText('CORTE CÓSMICO DAS TRÊS YORUS');
          sound.slash();
        }
        const p2 = (elapsed - 1300) / 1500;
        const orbitAngle = p2 * Math.PI * 1.5;

        // Dynamic orbiting low-angle 3D camera
        camera.position.set(
          Math.sin(orbitAngle) * 3.4,
          0.8 + Math.sin(p2 * Math.PI) * 0.8,
          Math.cos(orbitAngle) * 3.4
        );
        camera.lookAt(0, 1.2, 0);

        // Character spin attack
        characterGroup.rotation.y = p2 * Math.PI * 4;
        characterGroup.position.y = Math.sin(p2 * Math.PI) * 0.4;

        // Animate Colossal Energy Slashes expanding outward
        slashMeshes.forEach((slash, idx) => {
          (slash.material as THREE.MeshBasicMaterial).opacity = Math.sin(p2 * Math.PI) * 0.95;
          slash.scale.set(1 + p2 * 2.8, 1 + p2 * 2.8, 1);
          slash.rotation.z = (idx - 1) * 0.6 + p2 * 1.5;
        });

        floorLight.color.setHex(0x6ee7b7);
        floorLight.intensity = 8;
      }
      // PHASE 3: Dimensional Shatter & Sheathe Pose (2.8s - 4.3s)
      else {
        if (!shattered) {
          setShattered(true);
          setPhaseText('DANO INFINITO: 999.999.999');
          sound.legendaryWin();
          // Initialize shards bursting
          shardMeshes.forEach((s) => {
            s.mesh.visible = true;
            s.mesh.position.set(
              (Math.random() - 0.5) * 1.5,
              1.2 + (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5
            );
          });
        }
        const p3 = (elapsed - 2800) / 1500;

        // Dramatic slow dolly-in
        camera.position.set(0, 1.35, 3.8 - p3 * 1.2);
        camera.lookAt(0, 1.3, 0);

        // Victory Sheathe Pose
        characterGroup.rotation.y = 0;
        characterGroup.position.set(0, 0, 0);

        // Crossed blades
        rightArmGroup.rotation.z = -0.4;
        rightArmGroup.rotation.x = -0.7;
        leftArmGroup.rotation.z = 0.4;
        leftArmGroup.rotation.x = -0.7;

        // Move shattered glass shards outward
        shardMeshes.forEach((s) => {
          s.mesh.position.x += s.vx;
          s.mesh.position.y += s.vy;
          s.mesh.position.z += s.vz;
          s.mesh.rotation.x += s.rx;
          s.mesh.rotation.y += s.ry;
        });

        // Hide crescent slashes
        slashMeshes.forEach((slash) => {
          (slash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - p3 * 2);
        });

        floorLight.intensity = 5 * (1 - p3);
      }

      renderer.render(scene, camera);

      if (elapsed < duration && !completedRef.current) {
        reqId = requestAnimationFrame(tick);
      } else {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }
    };

    reqId = requestAnimationFrame(tick);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard skip with ESC or Space
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);

      // Clean up geometries and materials to avoid memory leaks
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [character, onComplete, skillName, slowMo, shattered]);

  const handleSkip = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  return (
    <div
      onClick={handleSkip}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden cursor-pointer select-none"
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* TOP 4K CINEMATIC LETTERBOX BAR */}
      <div className="relative z-10 w-full h-16 sm:h-20 bg-black/95 border-b border-emerald-500/30 px-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded font-black text-xs tracking-widest font-mono">
            4K CINEMATIC HDR
          </span>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            SANTORYU KOKUTO • 60 FPS
          </span>
          <span className="text-xs font-mono text-emerald-400 hidden md:inline">
            ● 3D SCENE ACTOR
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSkip();
          }}
          className="px-4 py-1.5 bg-slate-900/90 hover:bg-emerald-950 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-2"
        >
          <span>Pular Cena</span>
          <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-slate-400">ESC</kbd>
        </button>
      </div>

      {/* CENTER CINEMATIC VIGNETTE & RETICLE */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none">
        {/* Subtle 4K Viewfinder Framing */}
        <div className="absolute inset-8 border border-emerald-500/20 pointer-events-none rounded-2xl hidden sm:block">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
        </div>

        {/* Phase Announcement Banner */}
        <div className="text-center px-4 max-w-2xl transform transition-all">
          <span className="text-[11px] font-black tracking-widest text-emerald-400 font-mono uppercase bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 shadow-lg">
            {phaseText}
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-200 tracking-wider mt-3 drop-shadow-[0_4px_16px_rgba(16,185,129,0.8)]">
            {skillName.toUpperCase()}
          </h1>

          <p className="text-xs sm:text-sm font-medium text-slate-300 mt-2 max-w-lg mx-auto drop-shadow">
            Boneco {character?.name || 'Administrador'} canaliza o poder supremo das 3 Lâminas Negras!
          </p>
        </div>
      </div>

      {/* BOTTOM 4K CINEMATIC LETTERBOX BAR */}
      <div className="relative z-10 w-full h-16 sm:h-20 bg-black/95 border-t border-emerald-500/30 px-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400" />
          <span className="text-xs font-black text-white tracking-wider">
            TRIPLE DARK BLADE (DANO INFINITO)
          </span>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-bold text-emerald-400">
            999.999.999 DMG • ONE-HIT KILL
          </span>
          <span className="block text-[10px] text-slate-500 font-mono">
            Clique em qualquer lugar para continuar
          </span>
        </div>
      </div>
    </div>
  );
};
