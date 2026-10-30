import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ActiveQuest,
  BloxFruit,
  ChaliceRitualButton,
  ChestTier,
  DamageFloater,
  EnemyDefinition,
  EnemyEntity,
  HakiColor,
  HakiSkills,
  Island,
  ParticleEffect,
  PlayerStats,
  RemotePlayer,
  SpellVFX,
  Sword,
  TreasureChest,
} from '../types/game';
import { sound } from '../utils/audio';
import { getHakiColorById } from '../data/hakiColors';
import { SWORDS } from '../data/gameData';

import { Gear5Settings } from './Gear5HackModal';

// Expanded World Geometry
const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1600;
const CHEST_RESPAWN_MS = 5 * 60 * 1000; // 5 minutes (300,000 ms)

// Exact initial rewards at Level 1: Bronze = 80, Silver = 230, Gold = 560, Diamond = 760
// Scales up very gently (+1.2% per level above Level 1)
export const calculateChestBeliReward = (baseBeli: number, playerLevel: number): number => {
  if (playerLevel <= 1) return baseBeli;
  return Math.round(baseBeli * (1 + (playerLevel - 1) * 0.012));
};

interface ChestCoinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  groundY: number;
  size: number;
  spin: number;
  spinSpeed: number;
  kind: 'coin' | 'gem';
  color: string;
  rimColor: string;
  life: number;
  maxLife: number;
}

interface HakiLightningBranch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface HakiShockwave {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  primaryColor: string;
  secondaryColor: string;
  life: number;
  maxLife: number;
  branches: HakiLightningBranch[];
}

const generateHakiLightning = (px: number, py: number, boltCount = 8, maxDist = 140): HakiLightningBranch[] => {
  const branches: HakiLightningBranch[] = [];
  for (let b = 0; b < boltCount; b++) {
    const baseAngle = (b / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    let curX = px + Math.cos(baseAngle) * 16;
    let curY = py + Math.sin(baseAngle) * 16;
    const segmentsCount = 4;
    const stepDist = (maxDist * (0.7 + Math.random() * 0.4)) / segmentsCount;
    for (let s = 0; s < segmentsCount; s++) {
      const perp = baseAngle + Math.PI / 2;
      const jag = (Math.random() - 0.5) * 30;
      const nextX = curX + Math.cos(baseAngle) * stepDist + Math.cos(perp) * jag;
      const nextY = curY + Math.sin(baseAngle) * stepDist + Math.sin(perp) * jag;
      branches.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
      curX = nextX;
      curY = nextY;
    }
  }
  return branches;
};

interface GameCanvasProps {
  stats: PlayerStats;
  currentIsland: Island;
  activeFruit: BloxFruit | null;
  activeSword: Sword | null;
  haki: HakiSkills;
  activeQuest: ActiveQuest | null;
  autoFarm: boolean;
  onGainExpAndBeli: (exp: number, beli: number, enemyDefId: string, droppedFrags?: number) => void;
  onPlayerDamage: (damage: number) => void;
  playerHp: number;
  maxHp: number;
  playerEnergy: number;
  maxEnergy: number;
  onConsumeEnergy: (amount: number) => boolean;
  activeWeaponType: 'melee' | 'sword' | 'fruit';
  masteryUses: { melee: number; sword: number; fruit: number };
  onAddMasteryUse: (type: 'melee' | 'sword' | 'fruit') => void;
  onOpenQuestModal: () => void;
  onOpenFragmentShop: () => void;
  triggerSkillAction?: { key: 'Z' | 'X' | 'C' | 'V'; timestamp: number } | null;
  triggerAttackAction?: number | null;
  triggerDashAction?: number | null;
  invasionActive?: boolean;
  onInvasionBossDefeated?: (frags: number, exp: number, beli: number, bossDefId?: string) => void;
  otherPlayersRef?: React.MutableRefObject<RemotePlayer[]>;
  myPlayerId?: string;
  onPlayerMove?: (
    x: number,
    y: number,
    facingAngle: number,
    hp: number,
    maxHp: number,
    level: number,
    busoActive: boolean,
    isAttacking?: boolean,
    buddhaActive?: boolean,
    vx?: number,
    vy?: number
  ) => void;
  onComboChange?: (combo: number) => void;
  isMobile?: boolean;
  onInitiateTrade?: (partnerId: string, partnerName: string) => void;
  gear5Settings?: Gear5Settings;
  bajrangGunTrigger?: number | null;
  onTriggerTripleBladeCinematic?: (skillName: string) => void;
  hakiNpcSpawnedOnThisIsland?: boolean;
  hakiNpcOffer?: HakiColor;
  onOpenHakiNpc?: () => void;
  chaliceCooldownEnd?: number;
  chaliceRitualActive?: boolean;
  chaliceRitualTimeLeft?: number;
  chaliceButtons?: ChaliceRitualButton[];
  onAttemptObtainChalice?: () => void;
  onActivateChaliceButton?: (buttonId: string) => void;
  onEquipHakiColor?: (colorId: string) => void;
  onOpenHakiShop?: () => void;
  spawnMihawkTrigger?: number | null;
  onOpenAdminModal?: () => void;
  respawnTrigger?: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stats,
  currentIsland,
  activeFruit,
  activeSword,
  haki,
  activeQuest,
  autoFarm,
  onGainExpAndBeli,
  onPlayerDamage,
  playerHp,
  maxHp,
  playerEnergy,
  maxEnergy,
  onConsumeEnergy,
  activeWeaponType,
  masteryUses,
  onAddMasteryUse,
  onOpenQuestModal,
  onOpenFragmentShop,
  triggerSkillAction,
  triggerAttackAction,
  triggerDashAction,
  invasionActive = false,
  onInvasionBossDefeated,
  otherPlayersRef,
  myPlayerId,
  onPlayerMove,
  onComboChange,
  isMobile = false,
  onInitiateTrade,
  gear5Settings,
  bajrangGunTrigger,
  onTriggerTripleBladeCinematic,
  hakiNpcSpawnedOnThisIsland = false,
  hakiNpcOffer,
  onOpenHakiNpc,
  chaliceCooldownEnd,
  chaliceRitualActive,
  chaliceRitualTimeLeft,
  chaliceButtons,
  onAttemptObtainChalice,
  onActivateChaliceButton,
  onEquipHakiColor,
  onOpenHakiShop,
  spawnMihawkTrigger,
  onOpenAdminModal,
  respawnTrigger,
}) => {
  const activeHakiColor = getHakiColorById(haki.activeHakiColorId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [invasionBossEntity, setInvasionBossEntity] = useState<EnemyEntity | null>(null);
  const otherPlayersLerpRef = useRef<
    Map<
      string,
      {
        x: number;
        y: number;
        targetX: number;
        targetY: number;
        vx: number;
        vy: number;
        facingAngle: number;
        lastServerX: number;
        lastServerY: number;
        lastPacketTime: number;
        lastFrameTime: number;
      }
    >
  >(new Map());
  const hasSpawnedInvasionBossRef = useRef(false);
  const playerLevelRef = useRef(stats.level);
  useEffect(() => {
    playerLevelRef.current = stats.level;
  }, [stats.level]);

  const lastHitTimeRef = useRef<number>(0);
  const comboCountRef = useRef<number>(0);

  const registerHit = useCallback(() => {
    lastHitTimeRef.current = Date.now();
    comboCountRef.current += 1;
    onComboChange?.(comboCountRef.current);
  }, [onComboChange]);

  // Player position & movement (Spawn in front of the Quest Giver NPC at the village port)
  const playerRef = useRef({
    x: 600,
    y: 890,
    vx: 0,
    vy: 0,
    speed: 5.6,
    facingAngle: -Math.PI / 2,
    attackCooldown: 0,
    buddhaActive: false,
    invulnerableTimer: 0,
    isDashing: 0,
  });

  // Respawn player at Quest Giver area (600, 890) when defeated
  useEffect(() => {
    if (!respawnTrigger) return;
    playerRef.current.x = 600;
    playerRef.current.y = 890;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.facingAngle = -Math.PI / 2;
    playerRef.current.invulnerableTimer = 90; // 1.5s spawn protection
    comboCountRef.current = 0;
    onComboChange?.(0);

    if (canvasRef.current) {
      cameraRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - canvasRef.current.width, 600 - canvasRef.current.width / 2));
      cameraRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - canvasRef.current.height, 890 - canvasRef.current.height / 2));
    }

    addParticles(600, 890, '#38bdf8', 35, 6);
    addParticles(600, 890, '#f43f5e', 25, 5);
    addFloater(600, 845, '💀 RENASCEU NAS MISSÕES! (-RECOMPENSA)', '#f43f5e', true);
  }, [respawnTrigger, onComboChange]);

  // Apply race and Gear 5 speed adjustments (Mink bonus + Gear 5 Hack)
  useEffect(() => {
    let baseSpeed = stats.character?.race === 'Mink' ? 6.4 : 5.6;
    if (gear5Settings?.active) {
      baseSpeed *= (gear5Settings.speedMultiplier || 2.5);
    }
    playerRef.current.speed = baseSpeed;
  }, [stats.character?.race, gear5Settings?.active, gear5Settings?.speedMultiplier]);

  // Bajrang Gun Instant Screen Wipe
  useEffect(() => {
    if (!bajrangGunTrigger) return;
    enemiesRef.current.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      enemy.hp = 0;
      if (enemy.defId === 'enemy_mihawk') {
        const withinFiveMins = mihawkTimeLeftRef.current === null || mihawkTimeLeftRef.current > 0;
        sound.stopMihawkMusic();
        setInvasionBossEntity(null);
        setMihawkTimeLeft(null);
        mihawkTimeLeftRef.current = null;
        if (withinFiveMins && onInvasionBossDefeated) {
          onInvasionBossDefeated(2500, enemy.expReward, enemy.beliReward, 'enemy_mihawk');
        }
      } else if (enemy.isInvasionBoss) {
        setInvasionBossEntity(null);
      }
      addFloater(enemy.x, enemy.y - 40, 'BAJRANG GUN! ☀️ 999,999 (NIKA)', '#facc15', true);
      addParticles(enemy.x, enemy.y, '#facc15', 30, 8);
      addParticles(enemy.x, enemy.y, '#ffffff', 25, 7);
      onGainExpAndBeli(enemy.expReward, enemy.beliReward, enemy.defId);
    });
    screenShakeRef.current = 40;
    sound.legendaryWin();
  }, [bajrangGunTrigger, onGainExpAndBeli, onInvasionBossDefeated]);

  // Smooth Camera position
  const cameraRef = useRef({
    x: 200,
    y: 650,
  });

  // Quest NPC Position (Stationary near the village port)
  const questNpcRef = useRef({
    x: 600,
    y: 840,
    name: 'Mestre de Missões',
    title: 'Oficial de Contratos',
    radius: 24,
  });

  // Fragment Dealer NPC Position (Stationary by the village square)
  const fragmentNpcRef = useRef({
    x: 740,
    y: 840,
    name: 'Mercador das Sombras',
    title: 'Loja de Frutas por Frags 🟣',
    radius: 24,
  });

  // Wandering Haki Colors Master NPC (Moves randomly every 15 minutes)
  const hakiNpcRef = useRef({
    x: 880,
    y: 840,
    name: 'Mestre das Cores de Haki',
    title: 'Viajante dos Mares (15 Min)',
    radius: 26,
  });

  const [nearNpcPrompt, setNearNpcPrompt] = useState(false);
  const [nearFragNpcPrompt, setNearFragNpcPrompt] = useState(false);
  const [nearHakiNpcPrompt, setNearHakiNpcPrompt] = useState(false);
  const [nearChaliceAltarPrompt, setNearChaliceAltarPrompt] = useState(false);
  const [nearChaliceButtonPrompt, setNearChaliceButtonPrompt] = useState<ChaliceRitualButton | null>(null);
  const [hitEffectActive, setHitEffectActive] = useState(false);
  const [screenShakeKey, setScreenShakeKey] = useState(0);

  // Mobile Secret Admin Activation: 10 nonstop taps on D-Pad center circle -> opens Command Terminal
  const [centerPadTapCount, setCenterPadTapCount] = useState(0);
  const centerPadTimeoutRef = useRef<number | null>(null);
  const [showMobileAdminTerminal, setShowMobileAdminTerminal] = useState(false);
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Sistema de Segurança Mobile inicializado.',
    'Aguardando comando de autorização...',
  ]);

  const resetCenterPadSequence = useCallback(() => {
    if (centerPadTimeoutRef.current) {
      window.clearTimeout(centerPadTimeoutRef.current);
      centerPadTimeoutRef.current = null;
    }
    setCenterPadTapCount(0);
  }, []);

  const handleCenterPadTap = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (centerPadTimeoutRef.current) {
      window.clearTimeout(centerPadTimeoutRef.current);
    }

    setCenterPadTapCount((prev) => {
      const next = prev + 1;
      if (next >= 10) {
        sound.hakiToggle();
        setShowMobileAdminTerminal(true);
        setTerminalCommand('');
        setTerminalLogs([
          'Sequência de 10 toques confirmada.',
          'Digite o comando de ativação para liberar o Painel ADM:',
        ]);
        return 0;
      }
      sound.click();
      return next;
    });

    // Reset if user stops tapping for more than 1.6 seconds ("10 vezes sem parar")
    centerPadTimeoutRef.current = window.setTimeout(() => {
      setCenterPadTapCount(0);
    }, 1600);
  };

  // Reset tap count if user clicks/touches ANY other button or element on the screen
  useEffect(() => {
    if (centerPadTapCount === 0) return;
    const handleGlobalWrongTap = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-dpad-center="true"]')) {
        return;
      }
      resetCenterPadSequence();
    };
    window.addEventListener('pointerdown', handleGlobalWrongTap, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handleGlobalWrongTap, { capture: true });
    };
  }, [centerPadTapCount, resetCenterPadSequence]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = terminalCommand.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === '/admin{online}') {
      sound.legendaryWin();
      setTerminalLogs((prev) => [
        ...prev,
        `> ${trimmed}`,
        '✓ Acesso ADM liberado! Abrindo painel...',
      ]);
      setTerminalCommand('');
      setTimeout(() => {
        setShowMobileAdminTerminal(false);
        onOpenAdminModal?.();
      }, 300);
    } else {
      sound.punch();
      setTerminalLogs((prev) => [
        ...prev,
        `> ${trimmed}`,
        '✕ Comando inválido. Acesso negado.',
      ]);
      setTerminalCommand('');
    }
  };

  // Mihawk 5-Minute (300s) Countdown Timer State
  const [mihawkTimeLeft, setMihawkTimeLeft] = useState<number | null>(null);
  const mihawkTimeLeftRef = useRef<number | null>(null);

  // Mihawk Boss Spawning Effect (Nível 2300 - Muito Roubado!)
  useEffect(() => {
    if (!spawnMihawkTrigger) return;
    sound.invasionAlert();
    sound.startMihawkMusic();
    const bossLevel = 2300;
    const bossHp = 5000000; // 5.000.000 de Vida!
    const mihawkBoss: EnemyEntity = {
      id: `mihawk_boss_${Date.now()}`,
      defId: 'enemy_mihawk',
      name: 'Mihawk (Olhos de Gavião)',
      level: bossLevel,
      x: 1100,
      y: 750,
      originX: 1100,
      originY: 750,
      hp: bossHp,
      maxHp: bossHp,
      attack: 14500, // Dano absurdo da Dark Blade (Yoru)
      expReward: 2500000,
      beliReward: 5000000,
      isBoss: true,
      isInvasionBoss: true,
      color: '#10b981',
      attackCooldown: 20,
      hitStun: 0,
      radius: 46,
    };
    enemiesRef.current = [mihawkBoss, ...enemiesRef.current.filter((e) => e.defId !== 'enemy_mihawk')];
    setInvasionBossEntity(mihawkBoss);
    setMihawkTimeLeft(300); // 5 minutes (300 seconds)
    mihawkTimeLeftRef.current = 300;
    addParticles(1100, 750, '#10b981', 60, 12);
    addParticles(1100, 750, '#34d399', 40, 9);
    addFloater(1100, 700, '⚔️ MIHAWK NV. 2300 APARECEU! (5.000.000 HP)', '#34d399', true);
  }, [spawnMihawkTrigger]);

  // 5-Minute Countdown Timer for Mihawk
  useEffect(() => {
    if (mihawkTimeLeft === null) return;

    if (mihawkTimeLeft <= 0) {
      const hadMihawk = enemiesRef.current.some((e) => e.defId === 'enemy_mihawk' && e.hp > 0);
      enemiesRef.current = enemiesRef.current.filter((e) => e.defId !== 'enemy_mihawk');
      setInvasionBossEntity((prev) => (prev?.defId === 'enemy_mihawk' ? null : prev));
      sound.stopMihawkMusic();
      setMihawkTimeLeft(null);
      mihawkTimeLeftRef.current = null;
      if (hadMihawk) {
        sound.punch();
        addFloater(
          playerRef.current.x,
          playerRef.current.y - 50,
          '⏱️ TEMPO ESGOTADO (5 MIN)! MIHAWK FOI EMBORA!',
          '#ef4444',
          true
        );
      }
      return;
    }

    const timer = window.setInterval(() => {
      setMihawkTimeLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        mihawkTimeLeftRef.current = next;
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mihawkTimeLeft]);

  const triggerHitFeedback = () => {
    setHitEffectActive(true);
    setScreenShakeKey((prev) => prev + 1);
    setTimeout(() => setHitEffectActive(false), 350);
  };

  // Entities & VFX
  const enemiesRef = useRef<EnemyEntity[]>([]);
  const particlesRef = useRef<ParticleEffect[]>([]);
  const spellsRef = useRef<SpellVFX[]>([]);
  const damageFloatersRef = useRef<DamageFloater[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastAttackTrigger = useRef<number | null>(null);
  const lastDashTrigger = useRef<number | null>(null);
  const lastSkillTrigger = useRef<number | null>(null);
  const screenShakeRef = useRef<number>(0);
  const lastMoveSendTimeRef = useRef<number>(0);
  const wasMovingRef = useRef<boolean>(false);

  // Haki Activation Shockwaves & Flare State
  const hakiShockwavesRef = useRef<HakiShockwave[]>([]);
  const prevBusoActiveRef = useRef<boolean>(haki.busoHakiActive);
  const prevHakiColorIdRef = useRef<string | undefined>(haki.activeHakiColorId);
  const [hakiFlash, setHakiFlash] = useState<{
    key: number;
    color: string;
    secondaryColor: string;
    name: string;
  } | null>(null);

  // Fruit / Weapon Skill Visual Animation State (Z, X, C, V differentiation)
  const [activeSkillAnim, setActiveSkillAnim] = useState<{
    id: number;
    key: 'Z' | 'X' | 'C' | 'V';
    skillName: string;
    sourceName: string;
    color: string;
    skillType: string;
    facingDeg: number;
  } | null>(null);
  const skillAnimTimeoutRef = useRef<number | null>(null);

  // Spawn initial enemies spaced out across distinct island camps
  const initEnemies = useCallback(() => {
    const list: EnemyEntity[] = [];
    const islandEnemies = currentIsland.enemies;

    // Camp 1: Basic Mobs (East Camp)
    const basicDef = islandEnemies[0];
    if (basicDef) {
      const camp1CenterX = 1500;
      const camp1CenterY = 1050;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const dist = 70 + Math.random() * 80;
        const spawnX = camp1CenterX + Math.cos(angle) * dist;
        const spawnY = camp1CenterY + Math.sin(angle) * dist;

        list.push({
          id: `${basicDef.id}_${Date.now()}_${i}`,
          defId: basicDef.id,
          name: basicDef.name,
          level: basicDef.level,
          x: spawnX,
          y: spawnY,
          originX: spawnX,
          originY: spawnY,
          hp: basicDef.hp,
          maxHp: basicDef.hp,
          attack: basicDef.attack,
          expReward: basicDef.expReward,
          beliReward: basicDef.beliReward,
          isBoss: false,
          color: basicDef.color,
          attackCooldown: Math.random() * 60,
          hitStun: 0,
          radius: 22,
        });
      }
    }

    // Camp 2: Intermediate Mobs (Northeast Camp)
    if (islandEnemies.length > 1 && !islandEnemies[1].isBoss) {
      const interDef = islandEnemies[1];
      const camp2CenterX = 1600;
      const camp2CenterY = 450;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const dist = 65 + Math.random() * 80;
        const spawnX = camp2CenterX + Math.cos(angle) * dist;
        const spawnY = camp2CenterY + Math.sin(angle) * dist;

        list.push({
          id: `${interDef.id}_${Date.now()}_${i}`,
          defId: interDef.id,
          name: interDef.name,
          level: interDef.level,
          x: spawnX,
          y: spawnY,
          originX: spawnX,
          originY: spawnY,
          hp: interDef.hp,
          maxHp: interDef.hp,
          attack: interDef.attack,
          expReward: interDef.expReward,
          beliReward: interDef.beliReward,
          isBoss: false,
          color: interDef.color,
          attackCooldown: Math.random() * 60,
          hitStun: 0,
          radius: 24,
        });
      }
    }

    // Camp 3 / Arena: Boss (Northwest Sanctuary)
    const bossDef = islandEnemies.find((e) => e.isBoss);
    if (bossDef) {
      const bossSpawnX = 550;
      const bossSpawnY = 320;
      list.push({
        id: `${bossDef.id}_boss_${Date.now()}`,
        defId: bossDef.id,
        name: bossDef.name,
        level: bossDef.level,
        x: bossSpawnX,
        y: bossSpawnY,
        originX: bossSpawnX,
        originY: bossSpawnY,
        hp: bossDef.hp,
        maxHp: bossDef.hp,
        attack: bossDef.attack,
        expReward: bossDef.expReward,
        beliReward: bossDef.beliReward,
        isBoss: true,
        color: bossDef.color,
        attackCooldown: Math.random() * 60,
        hitStun: 0,
        radius: 36,
      });
    }

    enemiesRef.current = list;
    sound.stopMihawkMusic();
    setInvasionBossEntity(null);
    setMihawkTimeLeft(null);
    mihawkTimeLeftRef.current = null;
  }, [currentIsland]);

  useEffect(() => {
    initEnemies();
  }, [initEnemies]);

  // Handle Island Invasion Boss Spawning
  useEffect(() => {
    if (invasionActive) {
      if (!hasSpawnedInvasionBossRef.current) {
        hasSpawnedInvasionBossRef.current = true;
        sound.invasionAlert();
        const currentLvl = playerLevelRef.current;
        const bossLevel = Math.max(currentLvl + 25, 60);
        const bossHp = Math.max(10000, currentLvl * 450);
        const invasionBoss: EnemyEntity = {
          id: `invasion_boss_${Date.now()}`,
          defId: 'invasion_boss',
          name: 'Imperador do Abismo (Chefe de Invasão)',
          level: bossLevel,
          x: 1100,
          y: 750,
          originX: 1100,
          originY: 750,
          hp: bossHp,
          maxHp: bossHp,
          attack: Math.max(65, Math.round(currentLvl * 4)),
          expReward: 50000,
          beliReward: 100000,
          isBoss: true,
          isInvasionBoss: true,
          color: '#d946ef',
          attackCooldown: 25,
          hitStun: 0,
          radius: 48,
        };
        enemiesRef.current = [invasionBoss, ...enemiesRef.current.filter((e) => e.defId !== 'invasion_boss')];
        setInvasionBossEntity(invasionBoss);
        addParticles(1100, 750, '#d946ef', 50, 10);
        addParticles(1100, 750, '#ef4444', 35, 8);
        addFloater(1100, 700, '🚨 O CHEFE DE INVASÃO APARECEU!', '#f43f5e', true);
      }
    } else {
      hasSpawnedInvasionBossRef.current = false;
      enemiesRef.current = enemiesRef.current.filter((e) => e.defId !== 'invasion_boss');
      setInvasionBossEntity((prev) => (prev?.defId === 'invasion_boss' ? null : prev));
    }
  }, [invasionActive]);

  // Watch for Haki activation or color change to trigger epic anime burst
  useEffect(() => {
    const justActivated = haki.busoHakiActive && !prevBusoActiveRef.current;
    const colorChanged = haki.busoHakiActive && haki.activeHakiColorId !== prevHakiColorIdRef.current;

    if (justActivated || colorChanged) {
      const player = playerRef.current;
      sound.hakiActivationBurst();
      screenShakeRef.current = 26;

      hakiShockwavesRef.current.push({
        id: Math.random().toString(),
        x: player.x,
        y: player.y,
        radius: 14,
        maxRadius: 260,
        primaryColor: activeHakiColor.primaryColor,
        secondaryColor: activeHakiColor.secondaryColor,
        life: 0,
        maxLife: 35,
        branches: generateHakiLightning(player.x, player.y, 12, 180),
      });

      if (activeHakiColor.specialEffect === 'rainbow') {
        const rainbowBurstColors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#06b6d4', '#a855f7', '#ec4899'];
        rainbowBurstColors.forEach((col) => addParticles(player.x, player.y, col, 16, 10.5));
      } else {
        addParticles(player.x, player.y, activeHakiColor.primaryColor, 60, 10);
        addParticles(player.x, player.y, activeHakiColor.secondaryColor, 40, 7.5);
      }
      addFloater(
        player.x,
        player.y - 55,
        `⚡ BUSO HAKI: ${activeHakiColor.name.toUpperCase()}!`,
        activeHakiColor.specialEffect === 'rainbow' ? '#f472b6' : activeHakiColor.secondaryColor,
        true
      );

      setHakiFlash({
        key: Date.now(),
        color: activeHakiColor.primaryColor,
        secondaryColor: activeHakiColor.secondaryColor,
        name: activeHakiColor.name,
      });
      setTimeout(() => setHakiFlash(null), 850);
    }

    prevBusoActiveRef.current = haki.busoHakiActive;
    prevHakiColorIdRef.current = haki.activeHakiColorId;
  }, [haki.busoHakiActive, haki.activeHakiColorId, activeHakiColor]);

  // Add floating damage text
  const addFloater = (x: number, y: number, text: string, color: string, isCrit = false) => {
    damageFloatersRef.current.push({
      id: Math.random().toString(),
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      text,
      color,
      isCrit,
      opacity: 1,
      vy: -1.8,
    });
  };

  // Add explosion particles
  const addParticles = (x: number, y: number, color: string, count = 12, speed = 4) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.2) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 6 + 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.floor(Math.random() * 20 + 15),
      });
    }
  };

  // =========================================================
  // TREASURE CHESTS SYSTEM (Bronze: 80, Silver: 230, Gold: 560, Diamond: 760)
  // =========================================================
  const chestsRef = useRef<TreasureChest[]>([]);
  const chestCoinsRef = useRef<ChestCoinParticle[]>([]);
  const chestCooldownMapRef = useRef<Map<string, number>>(new Map());
  const [nearChestPrompt, setNearChestPrompt] = useState<TreasureChest | null>(null);
  const [openedChestShowcase, setOpenedChestShowcase] = useState<{
    key: number;
    tier: ChestTier;
    name: string;
    reward: number;
    baseBeli: number;
    level: number;
  } | null>(null);
  const showcaseTimeoutRef = useRef<number | null>(null);

  const initChests = useCallback(() => {
    const definitions: Array<{ id: string; tier: ChestTier; name: string; baseBeli: number; x: number; y: number }> = [
      // 3 Baús de Bronze (80 de dinheiro inicial)
      { id: 'chest_bronze_1', tier: 'bronze', name: 'Baú de Bronze', baseBeli: 80, x: 430, y: 880 },
      { id: 'chest_bronze_2', tier: 'bronze', name: 'Baú de Bronze', baseBeli: 80, x: 830, y: 1050 },
      { id: 'chest_bronze_3', tier: 'bronze', name: 'Baú de Bronze', baseBeli: 80, x: 1280, y: 960 },
      // 2 Baús de Prata (230 de dinheiro inicial)
      { id: 'chest_silver_1', tier: 'silver', name: 'Baú de Prata', baseBeli: 230, x: 1120, y: 560 },
      { id: 'chest_silver_2', tier: 'silver', name: 'Baú de Prata', baseBeli: 230, x: 1720, y: 760 },
      // 2 Baús de Ouro (560 de dinheiro inicial)
      { id: 'chest_gold_1', tier: 'gold', name: 'Baú de Ouro', baseBeli: 560, x: 1480, y: 310 },
      { id: 'chest_gold_2', tier: 'gold', name: 'Baú de Ouro', baseBeli: 560, x: 350, y: 520 },
      // APENAS 1 Baú de Diamante (760 de dinheiro inicial)
      { id: 'chest_diamond_1', tier: 'diamond', name: 'Baú de Diamante', baseBeli: 760, x: 390, y: 220 },
    ];

    const now = Date.now();
    chestsRef.current = definitions.map((def) => {
      const mapKey = `${currentIsland.id}_${def.id}`;
      const savedRespawn = chestCooldownMapRef.current.get(mapKey) || null;
      const isCoolingDown = savedRespawn !== null && savedRespawn > now;
      return {
        ...def,
        status: isCoolingDown ? 'cooldown' : 'closed',
        animFrame: 0,
        respawnAt: isCoolingDown ? savedRespawn : null,
      };
    });
    chestCoinsRef.current = [];
  }, [currentIsland.id]);

  useEffect(() => {
    initChests();
  }, [initChests]);

  const openTreasureChest = useCallback(
    (chestId: string) => {
      const target = chestsRef.current.find((c) => c.id === chestId && c.status === 'closed');
      if (!target) return;

      const currentLvl = playerLevelRef.current;
      const reward = calculateChestBeliReward(target.baseBeli, currentLvl);
      const respawnTimestamp = Date.now() + CHEST_RESPAWN_MS; // 5 minutes (300,000 ms)

      target.status = 'opening';
      target.animFrame = 0;
      target.respawnAt = respawnTimestamp;
      target.lastRewardGiven = reward;
      chestCooldownMapRef.current.set(`${currentIsland.id}_${target.id}`, respawnTimestamp);
      setNearChestPrompt(null);

      // Play chest opening sound
      sound.chestOpen(target.tier);

      // Initial lock-pop sparkle burst
      const tierMainColor =
        target.tier === 'diamond'
          ? '#38bdf8'
          : target.tier === 'gold'
          ? '#facc15'
          : target.tier === 'silver'
          ? '#e2e8f0'
          : '#d97706';
      addParticles(target.x, target.y - 10, tierMainColor, 18, 5);
      addParticles(target.x, target.y - 10, '#ffffff', 10, 4);

      // Grant Beli reward
      onGainExpAndBeli(0, reward, 'treasure_chest');

      // Show animated top-screen showcase banner
      if (showcaseTimeoutRef.current) {
        window.clearTimeout(showcaseTimeoutRef.current);
      }
      setOpenedChestShowcase({
        key: Date.now(),
        tier: target.tier,
        name: target.name,
        reward,
        baseBeli: target.baseBeli,
        level: currentLvl,
      });
      showcaseTimeoutRef.current = window.setTimeout(() => {
        setOpenedChestShowcase(null);
      }, 3600);
    },
    [currentIsland.id, onGainExpAndBeli]
  );


  // Execute Basic Attack
  const performBasicAttack = useCallback(() => {
    const player = playerRef.current;
    if (player.attackCooldown > 0) return;
    player.attackCooldown = 14;

    const isBuddha = activeFruit?.id === 'fruit_buddha' && player.buddhaActive;
    const isLeviathan = activeFruit?.id === 'fruit_leviathan';
    const baseRange = isBuddha ? 130 : isLeviathan ? 85 : activeWeaponType === 'sword' ? 75 : 55;

    let rawDamage = 25;
    if (activeWeaponType === 'melee') {
      rawDamage = 20 + stats.melee * 2.5;
      sound.punch();
    } else if (activeWeaponType === 'sword') {
      const swordPower = activeSword ? activeSword.damage : 20;
      rawDamage = swordPower + stats.sword * 2.8;
      sound.slash();
    } else if (activeWeaponType === 'fruit') {
      rawDamage = 25 + stats.bloxFruit * 3.2;
      if (activeFruit?.element.includes('fire')) sound.fireBoom();
      else if (activeFruit?.element.includes('ice')) sound.iceFreeze();
      else if (activeFruit?.element.includes('light')) sound.lightBeam();
      else if (isLeviathan) sound.fireBoom();
      else sound.punch();
    }

    if (haki.busoHakiActive) {
      rawDamage *= 1.4;
    }
    if (isLeviathan) {
      rawDamage *= 1.5;
    }
    if (gear5Settings?.active) {
      rawDamage *= (gear5Settings.damageMultiplier || 15);
      if (gear5Settings.oneHitKill) rawDamage = 999999;
    }

    // Mastery progression: +1% damage per 100 uses
    const masteryCount = masteryUses[activeWeaponType] || 0;
    const masteryMultiplier = 1 + Math.floor(masteryCount / 100) * 0.01;
    rawDamage *= masteryMultiplier;

    onAddMasteryUse(activeWeaponType);

    const hitEnemies: EnemyEntity[] = [];
    enemiesRef.current.forEach((enemy) => {
      // Ignore dead enemies
      if (enemy.hp <= 0) return;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= baseRange + enemy.radius) {
        hitEnemies.push(enemy);
      }
    });

    const attackColor =
      isLeviathan
        ? '#22d3ee'
        : activeWeaponType === 'sword'
        ? activeSword?.color || '#38bdf8'
        : activeFruit
        ? activeFruit.iconColor
        : haki.busoHakiActive
        ? '#a855f7'
        : '#f87171';

    // Dynamic combat attack particles
    const spawnX = player.x + Math.cos(player.facingAngle) * 45;
    const spawnY = player.y + Math.sin(player.facingAngle) * 45;
    addParticles(spawnX, spawnY, attackColor, 18, 5.5);

    // Element specific spark effects (Fire, Lightning, Ice, Energy)
    if (activeFruit?.element.includes('fire') || isLeviathan || activeFruit?.id === 'fruit_magma' || activeFruit?.id === 'fruit_flame') {
      addParticles(spawnX, spawnY, '#f97316', 12, 5);
      addParticles(spawnX, spawnY, '#facc15', 10, 7);
    } else if (activeFruit?.element.includes('light') || activeFruit?.element.includes('electric') || activeFruit?.id === 'fruit_rumble' || activeFruit?.id === 'fruit_light') {
      addParticles(spawnX, spawnY, '#38bdf8', 14, 6.5);
      addParticles(spawnX, spawnY, '#ffffff', 10, 8);
    } else if (activeFruit?.element.includes('ice') || activeFruit?.id === 'fruit_ice') {
      addParticles(spawnX, spawnY, '#67e8f9', 12, 5);
      addParticles(spawnX, spawnY, '#e0f2fe', 8, 6);
    }

    if (haki.busoHakiActive) {
      addParticles(player.x, player.y, activeHakiColor.primaryColor, 12, 4.5);
      addParticles(spawnX, spawnY, activeHakiColor.secondaryColor, 8, 3.5);

      if (activeHakiColor.specialEffect === 'blood') {
        addParticles(spawnX, spawnY, '#ef4444', 10, 5);
        addParticles(spawnX, spawnY, '#7f1d1d', 8, 3);
      } else if (activeHakiColor.specialEffect === 'kitsune') {
        addParticles(spawnX, spawnY, '#22d3ee', 12, 6);
        addParticles(spawnX, spawnY, '#a5f3fc', 8, 4);
      } else if (activeHakiColor.specialEffect === 'darkblade') {
        addParticles(spawnX, spawnY, '#10b981', 14, 6);
        addParticles(spawnX, spawnY, '#6ee7b7', 10, 4);
      } else if (activeHakiColor.specialEffect === 'leviathan') {
        addParticles(spawnX, spawnY, '#1d4ed8', 16, 7);
        addParticles(spawnX, spawnY, '#60a5fa', 12, 5);
        addParticles(spawnX, spawnY, '#38bdf8', 8, 3);
      }
    }
    if (activeWeaponType === 'sword' && activeSword?.id === 'sword_triple_dark_blade') {
      addParticles(spawnX, spawnY, '#10b981', 26, 8.5);
      addParticles(spawnX, spawnY, '#34d399', 18, 10);
      addParticles(spawnX, spawnY, '#059669', 14, 6);
      screenShakeRef.current = Math.max(screenShakeRef.current, 10);
    }

    spellsRef.current.push({
      id: Math.random().toString(),
      type: 'slash',
      x: player.x + Math.cos(player.facingAngle) * (baseRange * 0.6),
      y: player.y + Math.sin(player.facingAngle) * (baseRange * 0.6),
      radius: baseRange,
      color: attackColor,
      life: 0,
      maxLife: 8,
      damage: 0,
      source: 'player',
    });

    let hitCount = 0;
    hitEnemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      const isCrit = Math.random() < 0.25;
      const finalDmg = Math.round(rawDamage * (isCrit ? 1.8 : 0.9 + Math.random() * 0.2));
      const wasAlive = enemy.hp > 0;
      enemy.hp = Math.max(0, enemy.hp - finalDmg);
      enemy.hitStun = enemy.defId === 'enemy_mihawk' ? 2 : 8;
      hitCount++;

      if (enemy.isInvasionBoss && enemy.hp > 0) {
        setInvasionBossEntity({ ...enemy });
      }

      const isTripleDarkBlade = activeWeaponType === 'sword' && activeSword?.id === 'sword_triple_dark_blade';
      addFloater(
        enemy.x,
        enemy.y,
        isTripleDarkBlade
          ? '💥 CORTE INFINITO! -999.999.999'
          : isCrit
          ? `CRÍTICO! -${finalDmg}`
          : `-${finalDmg}`,
        isTripleDarkBlade ? '#34d399' : isCrit ? '#facc15' : '#ffffff',
        isCrit || isTripleDarkBlade
      );

      addParticles(enemy.x, enemy.y, enemy.color, 8, 3);

      if (wasAlive && enemy.hp <= 0) {
        enemy.attackCooldown = 0;
        let droppedFrags = 0;
        if (enemy.isInvasionBoss) {
          if (enemy.defId === 'enemy_mihawk') {
            sound.stopMihawkMusic();
            setMihawkTimeLeft(null);
            mihawkTimeLeftRef.current = null;
          }
          droppedFrags = enemy.defId === 'enemy_mihawk' ? 2500 : Math.floor(Math.random() * 501) + 1000;
          addFloater(
            enemy.x,
            enemy.y - 80,
            `+${droppedFrags.toLocaleString()} FRAGMENTOS RAROS! 🟣`,
            '#c084fc',
            true
          );
          addParticles(enemy.x, enemy.y, '#c084fc', 40, 10);
          addParticles(enemy.x, enemy.y, '#facc15', 30, 8);
          sound.legendaryWin();
          setInvasionBossEntity(null);
          if (enemy.defId === 'invasion_boss') {
            hasSpawnedInvasionBossRef.current = false;
          }
          enemiesRef.current = enemiesRef.current.filter((e) => e.id !== enemy.id);
          if (onInvasionBossDefeated) {
            onInvasionBossDefeated(droppedFrags, enemy.expReward, enemy.beliReward, enemy.defId);
          }
        } else if (enemy.isBoss) {
          const isRareFrag = Math.random() < 0.20;
          droppedFrags = isRareFrag ? 100 : 5;
          addFloater(
            enemy.x,
            enemy.y - 68,
            isRareFrag ? '+100 FRAGS! 🟣 (DROP RARO)' : '+5 FRAGS! 🟣',
            isRareFrag ? '#c084fc' : '#a855f7',
            true
          );
        }
        onGainExpAndBeli(enemy.expReward, enemy.beliReward, enemy.defId, droppedFrags);
        addFloater(enemy.x, enemy.y - 25, `+${enemy.expReward} EXP`, '#38bdf8');
        addFloater(enemy.x, enemy.y - 45, `+${enemy.beliReward} ฿`, '#facc15');
      }
    });

    if (hitCount > 0) {
      registerHit();
      triggerHitFeedback();
    }
  }, [activeFruit, activeSword, activeWeaponType, haki.busoHakiActive, onGainExpAndBeli, stats, masteryUses, onAddMasteryUse, onInvasionBossDefeated]);

  // Execute Fruit or Sword Skill
  const castSkill = useCallback(
    (skillKey: 'Z' | 'X' | 'C' | 'V') => {
      const player = playerRef.current;
      const skillsPool = activeWeaponType === 'fruit' ? activeFruit?.skills : activeSword?.skills;
      const skill = skillsPool?.find((s) => s.key === skillKey);

      if (!skill) return;

      if (!gear5Settings?.active || !gear5Settings.infiniteEnergy) {
        if (!onConsumeEnergy(skill.energyCost)) {
          addFloater(player.x, player.y - 30, 'Sem Energia!', '#ef4444');
          return;
        }
      }

      const statBase = activeWeaponType === 'fruit' ? stats.bloxFruit : stats.sword;
      const masteryCount = masteryUses[activeWeaponType] || 0;
      const masteryMultiplier = 1 + Math.floor(masteryCount / 100) * 0.01;
      let dmg = (40 + statBase * 3.6) * skill.damageMultiplier * masteryMultiplier;
      if (haki.busoHakiActive) dmg *= 1.35;
      if (gear5Settings?.active) {
        dmg *= (gear5Settings.damageMultiplier || 15);
        if (gear5Settings.oneHitKill) dmg = 999999;
      }
      if (activeWeaponType === 'sword' && activeSword?.id === 'sword_triple_dark_blade') {
        dmg = 999999999;
        onTriggerTripleBladeCinematic?.(skill.name);
      }

      onAddMasteryUse(activeWeaponType);

      if (skill.type === 'projectile') sound.lightBeam();
      else if (skill.type === 'aoe') sound.fireBoom();
      else if (skill.type === 'dash_attack') sound.dash();
      else sound.fireBoom();

      screenShakeRef.current = skill.type === 'barrage' ? 14 : 7;

      // Trigger distinct Framer Motion / CSS Transform animation for Z, X, C, V
      if (skillAnimTimeoutRef.current) {
        window.clearTimeout(skillAnimTimeoutRef.current);
      }
      const animDuration = skillKey === 'V' ? 1150 : skillKey === 'C' ? 900 : 750;
      setActiveSkillAnim({
        id: Date.now() + Math.random(),
        key: skillKey,
        skillName: skill.name,
        sourceName:
          activeWeaponType === 'fruit'
            ? activeFruit?.portugueseName || activeFruit?.name || 'Akuma no Mi'
            : activeSword?.name || 'Espada',
        color: skill.color || activeFruit?.iconColor || '#f59e0b',
        skillType: skill.type,
        facingDeg: Math.round((player.facingAngle * 180) / Math.PI),
      });
      skillAnimTimeoutRef.current = window.setTimeout(() => {
        setActiveSkillAnim(null);
      }, animDuration);

      if (skill.type === 'transformation' && activeFruit?.id === 'fruit_buddha') {
        player.buddhaActive = !player.buddhaActive;
        addFloater(
          player.x,
          player.y - 40,
          player.buddhaActive ? 'BUDA GIGANTE ATIVADO!' : 'Forma Normal',
          '#facc15'
        );
        addParticles(player.x, player.y, '#fef08a', 25, 6);
        return;
      }

      if (skill.type === 'dash_attack') {
        player.isDashing = 10;
        const dashDistance = 150;
        player.x += Math.cos(player.facingAngle) * dashDistance;
        player.y += Math.sin(player.facingAngle) * dashDistance;
        player.x = Math.max(60, Math.min(WORLD_WIDTH - 60, player.x));
        player.y = Math.max(60, Math.min(WORLD_HEIGHT - 60, player.y));
        addParticles(player.x, player.y, skill.color, 16, 5);
      }

      // Dynamic combat skill particle explosions
      addParticles(player.x, player.y, skill.color, 28, 7.5);
      addParticles(player.x + Math.cos(player.facingAngle) * 60, player.y + Math.sin(player.facingAngle) * 60, '#ffffff', 16, 6);
      if (skill.color.includes('cyan') || skill.color === '#22d3ee' || skill.color === '#38bdf8') {
        addParticles(player.x, player.y, '#38bdf8', 18, 7);
        addParticles(player.x, player.y, '#ffffff', 12, 9);
      } else {
        addParticles(player.x, player.y, '#f97316', 16, 6);
        addParticles(player.x, player.y, '#facc15', 12, 8);
      }

      spellsRef.current.push({
        id: Math.random().toString(),
        type: skill.type,
        x: player.x + (skill.type === 'projectile' ? Math.cos(player.facingAngle) * 50 : 0),
        y: player.y + (skill.type === 'projectile' ? Math.sin(player.facingAngle) * 50 : 0),
        targetX: player.x + Math.cos(player.facingAngle) * 250,
        targetY: player.y + Math.sin(player.facingAngle) * 250,
        radius: skill.radius,
        color: skill.color,
        life: 0,
        maxLife: skill.type === 'barrage' ? 42 : 20,
        damage: Math.round(dmg),
        source: 'player',
      });

      let skillHitCount = 0;
      enemiesRef.current.forEach((enemy) => {
        // Ignore dead enemies
        if (enemy.hp <= 0) return;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= skill.radius + 85) {
          const finalDmg = Math.round(dmg * (0.95 + Math.random() * 0.15));
          const wasAlive = enemy.hp > 0;
          enemy.hp = Math.max(0, enemy.hp - finalDmg);
          enemy.hitStun = enemy.defId === 'enemy_mihawk' ? 2 : 12;
          skillHitCount++;

          if (enemy.isInvasionBoss && enemy.hp > 0) {
            setInvasionBossEntity({ ...enemy });
          }

          const isTripleDarkBlade = activeWeaponType === 'sword' && activeSword?.id === 'sword_triple_dark_blade';
          addFloater(
            enemy.x,
            enemy.y,
            isTripleDarkBlade ? '⚡ JULGAMENTO INFINITO! -999.999.999' : `-${finalDmg}`,
            isTripleDarkBlade ? '#34d399' : skill.color,
            true
          );
          addParticles(enemy.x, enemy.y, isTripleDarkBlade ? '#10b981' : skill.color, 12, 4.5);

          if (wasAlive && enemy.hp <= 0) {
            enemy.attackCooldown = 0;
            let droppedFrags = 0;
            if (enemy.isInvasionBoss) {
              if (enemy.defId === 'enemy_mihawk') {
                sound.stopMihawkMusic();
                setMihawkTimeLeft(null);
                mihawkTimeLeftRef.current = null;
              }
              droppedFrags = enemy.defId === 'enemy_mihawk' ? 2500 : Math.floor(Math.random() * 501) + 1000;
              addFloater(
                enemy.x,
                enemy.y - 80,
                `+${droppedFrags.toLocaleString()} FRAGMENTOS RAROS! 🟣`,
                '#c084fc',
                true
              );
              addParticles(enemy.x, enemy.y, '#c084fc', 40, 10);
              addParticles(enemy.x, enemy.y, '#facc15', 30, 8);
              sound.legendaryWin();
              setInvasionBossEntity(null);
              if (enemy.defId === 'invasion_boss') {
                hasSpawnedInvasionBossRef.current = false;
              }
              enemiesRef.current = enemiesRef.current.filter((e) => e.id !== enemy.id);
              if (onInvasionBossDefeated) {
                onInvasionBossDefeated(droppedFrags, enemy.expReward, enemy.beliReward, enemy.defId);
              }
            } else if (enemy.isBoss) {
              const isRareFrag = Math.random() < 0.20;
              droppedFrags = isRareFrag ? 100 : 5;
              addFloater(
                enemy.x,
                enemy.y - 68,
                isRareFrag ? '+100 FRAGS! 🟣 (DROP RARO)' : '+5 FRAGS! 🟣',
                isRareFrag ? '#c084fc' : '#a855f7',
                true
              );
            }
            onGainExpAndBeli(enemy.expReward, enemy.beliReward, enemy.defId, droppedFrags);
            addFloater(enemy.x, enemy.y - 25, `+${enemy.expReward} EXP`, '#38bdf8');
            addFloater(enemy.x, enemy.y - 45, `+${enemy.beliReward} ฿`, '#facc15');
          }
        }
      });

      if (skillHitCount > 0) {
        registerHit();
        triggerHitFeedback();
      }
    },
    [activeFruit, activeSword, activeWeaponType, haki.busoHakiActive, onConsumeEnergy, onGainExpAndBeli, stats, masteryUses, onAddMasteryUse, onInvasionBossDefeated, onTriggerTripleBladeCinematic]
  );

  // Dash mechanic (Soru)
  const performDash = useCallback(() => {
    const player = playerRef.current;
    if (playerEnergy < 15) return;
    if (!onConsumeEnergy(15)) return;

    sound.dash();
    const dashDistance = 140;
    player.x += Math.cos(player.facingAngle) * dashDistance;
    player.y += Math.sin(player.facingAngle) * dashDistance;
    player.x = Math.max(60, Math.min(WORLD_WIDTH - 60, player.x));
    player.y = Math.max(60, Math.min(WORLD_HEIGHT - 60, player.y));
    player.invulnerableTimer = 16;

    addParticles(player.x, player.y, '#38bdf8', 16, 4);
    addFloater(player.x, player.y - 20, 'FLASH STEP!', '#38bdf8');
  }, [onConsumeEnergy, playerEnergy]);

  // Watch for external trigger props
  useEffect(() => {
    if (triggerAttackAction && triggerAttackAction !== lastAttackTrigger.current) {
      lastAttackTrigger.current = triggerAttackAction;
      performBasicAttack();
    }
  }, [triggerAttackAction, performBasicAttack]);

  useEffect(() => {
    if (triggerDashAction && triggerDashAction !== lastDashTrigger.current) {
      lastDashTrigger.current = triggerDashAction;
      performDash();
    }
  }, [triggerDashAction, performDash]);

  useEffect(() => {
    if (triggerSkillAction && triggerSkillAction.timestamp !== lastSkillTrigger.current) {
      lastSkillTrigger.current = triggerSkillAction.timestamp;
      castSkill(triggerSkillAction.key);
    }
  }, [triggerSkillAction, castSkill]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      keysPressed.current[e.key.toLowerCase()] = true;

      // Talk to Quest NPC, Fragment Dealer NPC, Haki Master NPC, or Open Treasure Chest with E
      if (e.key.toLowerCase() === 'e') {
        const player = playerRef.current;
        const npc = questNpcRef.current;
        const fragNpc = fragmentNpcRef.current;
        const distNpc = Math.hypot(player.x - npc.x, player.y - npc.y);
        const distFragNpc = Math.hypot(player.x - fragNpc.x, player.y - fragNpc.y);

        // Check nearby closed Treasure Chest
        const nearClosedChest = chestsRef.current.find(
          (c) => c.status === 'closed' && Math.hypot(player.x - c.x, player.y - c.y) < 95
        );
        if (nearClosedChest) {
          openTreasureChest(nearClosedChest.id);
          return;
        }

        if (hakiNpcSpawnedOnThisIsland) {
          const hNpc = hakiNpcRef.current;
          const distHakiNpc = Math.hypot(player.x - hNpc.x, player.y - hNpc.y);
          if (distHakiNpc < 100) {
            sound.questComplete();
            onOpenHakiNpc?.();
            return;
          }
        }

        if (distFragNpc < 100) {
          sound.questComplete();
          onOpenFragmentShop();
          return;
        } else if (distNpc < 100) {
          sound.questComplete();
          onOpenQuestModal();
          return;
        }
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        performBasicAttack();
      } else if (e.key.toLowerCase() === 'q') {
        performDash();
      } else if (e.key.toLowerCase() === 'z') {
        castSkill('Z');
      } else if (e.key.toLowerCase() === 'x') {
        castSkill('X');
      } else if (e.key.toLowerCase() === 'c') {
        castSkill('C');
      } else if (e.key.toLowerCase() === 'v') {
        castSkill('V');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [performBasicAttack, performDash, castSkill, onOpenQuestModal, onOpenFragmentShop, hakiNpcSpawnedOnThisIsland, onOpenHakiNpc, openTreasureChest]);

  // Main Canvas Render & AI Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      const player = playerRef.current;
      const npc = questNpcRef.current;
      const fragNpc = fragmentNpcRef.current;
      const distToNpc = Math.hypot(player.x - npc.x, player.y - npc.y);

      // Handle screen shake
      let offsetX = 0;
      let offsetY = 0;
      if (screenShakeRef.current > 0) {
        offsetX = (Math.random() - 0.5) * screenShakeRef.current;
        offsetY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // Movement input
      let moveX = 0;
      let moveY = 0;
      const keys = keysPressed.current;

      if (keys['w'] || keys['arrowup']) moveY -= 1;
      if (keys['s'] || keys['arrowdown']) moveY += 1;
      if (keys['a'] || keys['arrowleft']) moveX -= 1;
      if (keys['d'] || keys['arrowright']) moveX += 1;

      // Auto-Farm logic (AI Grinder)
      if (autoFarm) {
        // Prioritize Invasion Boss if active and alive
        let targetEnemy = enemiesRef.current.find((e) => e.isInvasionBoss && e.hp > 0);
        if (!targetEnemy) {
          targetEnemy = enemiesRef.current.find(
            (e) => activeQuest && e.defId === activeQuest.targetEnemyId && e.hp > 0
          );
        }
        if (!targetEnemy) {
          targetEnemy = enemiesRef.current.find((e) => e.hp > 0);
        }

        if (targetEnemy) {
          const dx = targetEnemy.x - player.x;
          const dy = targetEnemy.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          player.facingAngle = Math.atan2(dy, dx);

          const desiredDist = 55;
          if (dist > desiredDist) {
            moveX = dx / dist;
            moveY = dy / dist;
          } else {
            moveX = 0;
            moveY = 0;
            performBasicAttack();

            if (Math.random() < 0.03 && playerEnergy > 30) {
              const skillKeys: ('Z' | 'X' | 'C' | 'V')[] = ['Z', 'X', 'C'];
              const chosen = skillKeys[Math.floor(Math.random() * skillKeys.length)];
              castSkill(chosen);
            }
          }
        }
      }

      // Normalize speed
      const mag = Math.sqrt(moveX * moveX + moveY * moveY);
      if (mag > 0) {
        player.vx = (moveX / mag) * player.speed;
        player.vy = (moveY / mag) * player.speed;
        if (!autoFarm) {
          player.facingAngle = Math.atan2(player.vy, player.vx);
        }
      } else {
        player.vx *= 0.72;
        player.vy *= 0.72;
      }

      player.x += player.vx;
      player.y += player.vy;

      // Boundaries inside the large world
      player.x = Math.max(40, Math.min(WORLD_WIDTH - 40, player.x));
      player.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, player.y));

      // Optimized 10Hz (100ms) network movement & velocity throttler for busy multiplayer servers
      const isMoving = Math.abs(player.vx) > 0.05 || Math.abs(player.vy) > 0.05;
      const isAttackingNow = player.attackCooldown > 0;
      const attackJustStarted = player.attackCooldown === 18;
      const now = Date.now();
      if (onPlayerMove) {
        if (isMoving || isAttackingNow) {
          wasMovingRef.current = true;
          if (attackJustStarted || now - lastMoveSendTimeRef.current >= 100) {
            lastMoveSendTimeRef.current = now;
            onPlayerMove(
              player.x,
              player.y,
              player.facingAngle,
              playerHp,
              maxHp,
              stats.level,
              haki.busoHakiActive,
              isAttackingNow,
              player.buddhaActive,
              player.vx,
              player.vy
            );
          }
        } else if (wasMovingRef.current) {
          // Send final stop position packet immediately with zero velocity so remote interpolation halts cleanly
          wasMovingRef.current = false;
          lastMoveSendTimeRef.current = now;
          onPlayerMove(
            player.x,
            player.y,
            player.facingAngle,
            playerHp,
            maxHp,
            stats.level,
            haki.busoHakiActive,
            false,
            player.buddhaActive,
            0,
            0
          );
        }
      }
      player.x = Math.max(40, Math.min(WORLD_WIDTH - 40, player.x));
      player.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, player.y));

      // Timers
      if (player.attackCooldown > 0) player.attackCooldown--;
      if (player.invulnerableTimer > 0) player.invulnerableTimer--;

      // Check combo reset after 3 seconds (3000ms) without hits
      if (comboCountRef.current > 0 && Date.now() - lastHitTimeRef.current > 3000) {
        comboCountRef.current = 0;
        onComboChange?.(0);
      }

      // Smooth Camera following player
      const targetCamX = player.x - canvas.width / 2;
      const targetCamY = player.y - canvas.height / 2;
      cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.14;
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.14;

      // Clamp camera within world bounds
      cameraRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, cameraRef.current.x));
      cameraRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, cameraRef.current.y));

      const camX = Math.round(cameraRef.current.x);
      const camY = Math.round(cameraRef.current.y);

      // =========================================================
      // Update Enemies (Aggro ONLY when VERY CLOSE: dist < 85)
      // =========================================================
      enemiesRef.current.forEach((enemy) => {
        if (enemy.hp <= 0) {
          if (enemy.isInvasionBoss) {
            return; // Never auto-revive the invasion boss!
          }
          enemy.attackCooldown++;
          // Bosses take 45 seconds (2700 frames at 60fps) to respawn; regular enemies take ~3.3 seconds (200 frames)
          const respawnCooldown = enemy.isBoss ? 2700 : 200;
          if (enemy.attackCooldown > respawnCooldown) {
            enemy.hp = enemy.maxHp;
            enemy.attackCooldown = 0;
            // Respawn at its camp origin
            enemy.x = enemy.originX + (Math.random() - 0.5) * 40;
            enemy.y = enemy.originY + (Math.random() - 0.5) * 40;
            addParticles(enemy.x, enemy.y, enemy.color, 20, 3.5);
          }
          return;
        }

        if (enemy.hitStun > 0) {
          enemy.hitStun--;
          return;
        }

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // AGGRO LOGIC:
        // Mihawk has massive aggro range, speed, reach, and lethal Dark Blade slashes
        const isMihawkBoss = enemy.defId === 'enemy_mihawk';
        const PROXIMITY_RADIUS = isMihawkBoss ? 420 : 115;
        const LEASH_RADIUS = isMihawkBoss ? 850 : 320;
        const isAggroed = dist < PROXIMITY_RADIUS || (enemy.hp < enemy.maxHp && dist < LEASH_RADIUS);

        if (isAggroed) {
          const chaseSpeed = isMihawkBoss ? 3.5 : enemy.isBoss ? 2.4 : 1.85;
          enemy.x += (dx / dist) * chaseSpeed;
          enemy.y += (dy / dist) * chaseSpeed;

          // Attack player if in reach (Mihawk has giant Dark Blade reach & faster attack cadence)
          const attackReach = isMihawkBoss ? enemy.radius + 80 : enemy.radius + 24;
          const attackCadence = isMihawkBoss ? 30 : 48;
          if (dist < attackReach) {
            enemy.attackCooldown++;
            if (enemy.attackCooldown >= attackCadence) {
              enemy.attackCooldown = 0;

              // Ken Haki Dodge
              if (haki.kenHakiActive) {
                addFloater(player.x, player.y - 20, 'ESQUIVA! (Ken Haki)', '#38bdf8');
                sound.dash();
                return;
              }

              // Gear 5 God Mode Invincibility Hack
              if (gear5Settings?.active && gear5Settings.godMode) {
                addFloater(player.x, player.y - 25, 'INVENCÍVEL! 0 ☀️ (HACK)', '#facc15', true);
                addParticles(player.x, player.y, '#facc15', 6, 2.5);
                sound.dash();
                return;
              }

              if (player.invulnerableTimer <= 0) {
                const isMihawkCrit = isMihawkBoss && Math.random() < 0.35;
                let takenDamage = enemy.attack * (isMihawkCrit ? 1.5 : 1);
                if (haki.busoHakiActive) takenDamage *= 0.75;
                if (player.buddhaActive) takenDamage *= 0.5;

                takenDamage = Math.max(1, Math.round(takenDamage));
                const effectiveDmg = stats.character?.race === 'Cyborg' ? Math.round(takenDamage * 0.9) : takenDamage;

                if (isMihawkBoss) {
                  sound.slash();
                  screenShakeRef.current = Math.max(screenShakeRef.current, 14);
                  addFloater(
                    player.x,
                    player.y - 10,
                    isMihawkCrit
                      ? `⚔️ CORTE DIVINO YORU! -${takenDamage.toLocaleString()}`
                      : `🗡️ CORTE NEGRO! -${takenDamage.toLocaleString()}`,
                    '#10b981',
                    true
                  );
                  addParticles(player.x, player.y, '#10b981', 22, 6);
                  addParticles(player.x, player.y, '#09090b', 16, 5);
                } else {
                  addFloater(player.x, player.y, `-${takenDamage}`, '#ef4444');
                  sound.punch();
                  addParticles(player.x, player.y, '#ef4444', 8, 3);
                }

                if (playerHp - effectiveDmg <= 0) {
                  // Immediate respawn protection & teleport to Quest Giver area (600, 890)
                  player.x = 600;
                  player.y = 890;
                  player.vx = 0;
                  player.vy = 0;
                  player.facingAngle = -Math.PI / 2;
                  player.invulnerableTimer = 90;
                }

                onPlayerDamage(takenDamage);
              }
            }
          }
        } else {
          // Not aggroed: Local patrol / idle around camp origin
          const homeDx = enemy.originX - enemy.x;
          const homeDy = enemy.originY - enemy.y;
          const homeDist = Math.sqrt(homeDx * homeDx + homeDy * homeDy);

          if (homeDist > 25) {
            enemy.x += (homeDx / homeDist) * 0.75;
            enemy.y += (homeDy / homeDist) * 0.75;
          } else {
            // Gentle local patrol drift
            const time = Date.now() * 0.001 + enemy.originX;
            const targetX = enemy.originX + Math.sin(time) * 18;
            const targetY = enemy.originY + Math.cos(time * 0.8) * 18;
            enemy.x += (targetX - enemy.x) * 0.03;
            enemy.y += (targetY - enemy.y) * 0.03;
          }
        }
      });

      // Update Spells & Projectiles
      spellsRef.current = spellsRef.current.filter((spell) => {
        spell.life++;
        return spell.life < spell.maxLife;
      });

      // Update Haki Activation Shockwaves
      hakiShockwavesRef.current = hakiShockwavesRef.current.filter((sw) => {
        sw.life++;
        sw.radius += (sw.maxRadius - sw.radius) * 0.15;
        return sw.life < sw.maxLife;
      });

      // Update Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
        return p.life < p.maxLife;
      });

      // Update Damage Floaters
      damageFloatersRef.current = damageFloatersRef.current.filter((f) => {
        f.y += f.vy;
        f.opacity -= 0.022;
        return f.opacity > 0;
      });

      // Update Treasure Chests (Opening Animation & 5-Minute Respawn Timer)
      const nowMs = Date.now();
      chestsRef.current.forEach((chest) => {
        if (chest.status === 'opening') {
          chest.animFrame++;

          // Frame 18: Padlock pops off & lid flings open -> Erupt 3D Coins & Gems Fountain!
          if (chest.animFrame === 18) {
            const rewardVal = chest.lastRewardGiven || calculateChestBeliReward(chest.baseBeli, playerLevelRef.current);
            const tierColor =
              chest.tier === 'diamond'
                ? '#38bdf8'
                : chest.tier === 'gold'
                ? '#facc15'
                : chest.tier === 'silver'
                ? '#e2e8f0'
                : '#f59e0b';

            screenShakeRef.current = Math.max(
              screenShakeRef.current,
              chest.tier === 'diamond' ? 16 : chest.tier === 'gold' ? 11 : 7
            );

            addParticles(chest.x, chest.y - 12, tierColor, 36, 7.5);
            addParticles(chest.x, chest.y - 12, '#fef08a', 26, 6);
            if (chest.tier === 'diamond') {
              addParticles(chest.x, chest.y - 12, '#67e8f9', 28, 8.5);
              addParticles(chest.x, chest.y - 12, '#f472b6', 18, 6.5);
            }

            addFloater(
              chest.x,
              chest.y - 46,
              `💰 +${rewardVal.toLocaleString()} ฿ (${chest.name.toUpperCase()})!`,
              chest.tier === 'diamond' ? '#67e8f9' : '#facc15',
              true
            );

            const coinCount =
              chest.tier === 'diamond'
                ? 52
                : chest.tier === 'gold'
                ? 40
                : chest.tier === 'silver'
                ? 30
                : 22;

            for (let i = 0; i < coinCount; i++) {
              const spreadAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.35;
              const speed = 4.2 + Math.random() * 6.2;
              const isGem =
                chest.tier === 'diamond'
                  ? Math.random() < 0.55
                  : chest.tier === 'gold'
                  ? Math.random() < 0.3
                  : chest.tier === 'silver'
                  ? Math.random() < 0.18
                  : false;

              const gemPalette = [
                { color: '#38bdf8', rim: '#bae6fd' },
                { color: '#f43f5e', rim: '#fecdd3' },
                { color: '#10b981', rim: '#a7f3d0' },
                { color: '#a855f7', rim: '#e9d5ff' },
              ];
              const chosenGem = gemPalette[Math.floor(Math.random() * gemPalette.length)];

              const coinColor =
                chest.tier === 'silver' && Math.random() < 0.5
                  ? '#e2e8f0'
                  : chest.tier === 'bronze' && Math.random() < 0.5
                  ? '#f59e0b'
                  : '#facc15';
              const coinRim =
                coinColor === '#e2e8f0' ? '#ffffff' : coinColor === '#f59e0b' ? '#fde68a' : '#fef08a';

              chestCoinsRef.current.push({
                x: chest.x + (Math.random() - 0.5) * 18,
                y: chest.y - 10,
                vx: Math.cos(spreadAngle) * speed,
                vy: Math.sin(spreadAngle) * speed - 2.2,
                groundY: chest.y + 8 + (Math.random() - 0.5) * 34,
                size: isGem ? 5.5 + Math.random() * 2.5 : 5 + Math.random() * 2.2,
                spin: Math.random() * Math.PI * 2,
                spinSpeed: 0.18 + Math.random() * 0.22,
                kind: isGem ? 'gem' : 'coin',
                color: isGem ? chosenGem.color : coinColor,
                rimColor: isGem ? chosenGem.rim : coinRim,
                life: 0,
                maxLife: 95 + Math.floor(Math.random() * 35),
              });
            }
          }

          // Continuous rising sparkles while open
          if (chest.animFrame > 18 && chest.animFrame % 5 === 0) {
            const sparkColor =
              chest.tier === 'diamond'
                ? '#67e8f9'
                : chest.tier === 'gold'
                ? '#fde047'
                : chest.tier === 'silver'
                ? '#f8fafc'
                : '#fbbf24';
            addParticles(
              chest.x + (Math.random() - 0.5) * 28,
              chest.y - 14,
              sparkColor,
              3,
              2.6
            );
          }

          if (chest.animFrame >= 135) {
            chest.status = 'cooldown';
          }
        } else if (chest.status === 'cooldown') {
          if (chest.respawnAt && nowMs >= chest.respawnAt) {
            chest.status = 'closed';
            chest.animFrame = 0;
            chest.respawnAt = null;
            chestCooldownMapRef.current.delete(`${currentIsland.id}_${chest.id}`);
            addParticles(chest.x, chest.y - 8, '#facc15', 24, 5);
            addParticles(chest.x, chest.y - 8, '#38bdf8', 16, 4);
            addFloater(chest.x, chest.y - 36, `✨ ${chest.name} Reapareceu!`, '#fde047', true);
          }
        }
      });

      // Update 3D Coin & Gem Fountain Physics
      chestCoinsRef.current = chestCoinsRef.current.filter((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.34; // Gravity
        c.spin += c.spinSpeed;
        c.life++;

        // Bounce on ground
        if (c.y >= c.groundY && c.vy > 0) {
          c.y = c.groundY;
          c.vy = -c.vy * 0.48;
          c.vx *= 0.78;
        }
        return c.life < c.maxLife;
      });

      // =========================================================
      // DRAW WORLD & ENTITIES WITH CAMERA TRANSLATION
      // =========================================================
      // Check Proximity to Quest Giver NPC (update state ONLY when boolean changes)
      const qDist = Math.hypot(player.x - questNpcRef.current.x, player.y - questNpcRef.current.y);
      const nextNearNpc = qDist < 75;
      setNearNpcPrompt((prev) => (prev === nextNearNpc ? prev : nextNearNpc));

      // Check Proximity to Fragment Dealer NPC
      const fDist = Math.hypot(player.x - fragmentNpcRef.current.x, player.y - fragmentNpcRef.current.y);
      const nextNearFrag = fDist < 75;
      setNearFragNpcPrompt((prev) => (prev === nextNearFrag ? prev : nextNearFrag));

      // Check Proximity to Wandering Haki Master NPC
      const nextNearHaki = hakiNpcSpawnedOnThisIsland
        ? Math.hypot(player.x - hakiNpcRef.current.x, player.y - hakiNpcRef.current.y) < 75
        : false;
      setNearHakiNpcPrompt((prev) => (prev === nextNearHaki ? prev : nextNearHaki));

      // Check Proximity to Altar do Cálice Sagrado at (950, 950)
      const chaliceDist = Math.hypot(player.x - 950, player.y - 950);
      const nextNearChalice = chaliceDist < 85;
      setNearChaliceAltarPrompt((prev) => (prev === nextNearChalice ? prev : nextNearChalice));

      // Check Proximity to Closed Treasure Chests
      const touchChest = chestsRef.current.find(
        (c) => c.status === 'closed' && Math.hypot(player.x - c.x, player.y - c.y) < 35
      );
      if (touchChest) {
        openTreasureChest(touchChest.id);
      } else {
        const nearChest =
          chestsRef.current.find(
            (c) => c.status === 'closed' && Math.hypot(player.x - c.x, player.y - c.y) < 88
          ) || null;
        setNearChestPrompt((prev) => (prev?.id === nearChest?.id ? prev : nearChest));
      }

      // Check Proximity to Chalice Ritual Altar Buttons
      if (chaliceRitualActive && chaliceButtons && chaliceButtons.length > 0) {
        const nearBtn =
          chaliceButtons.find(
            (b) => !b.activated && Math.hypot(player.x - b.x, player.y - b.y) < 70
          ) || null;
        setNearChaliceButtonPrompt((prev) => (prev?.id === nearBtn?.id ? prev : nearBtn));

        // Auto-activate button if player steps onto it (< 40px)
        const stepBtn = chaliceButtons.find(
          (b) => !b.activated && Math.hypot(player.x - b.x, player.y - b.y) < 40
        );
        if (stepBtn && onActivateChaliceButton) {
          onActivateChaliceButton(stepBtn.id);
        }
      } else {
        setNearChaliceButtonPrompt((prev) => (prev === null ? prev : null));
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Translate camera
      ctx.save();
      ctx.translate(-camX + offsetX, -camY + offsetY);

      // 1. Draw Expanded Island Ground
      const groundGrad = ctx.createRadialGradient(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        200,
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH * 0.7
      );
      groundGrad.addColorStop(0, currentIsland.groundColor);
      groundGrad.addColorStop(0.85, currentIsland.accentColor);
      groundGrad.addColorStop(1, '#020617'); // Deep sea border

      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // World grid tiles
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < WORLD_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < WORLD_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
      }

      // Draw Camp 1 Zone (Bandeira & Acampamento Leste)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.beginPath();
      ctx.arc(1500, 1050, 140, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏴 Acampamento dos Bandidos', 1500, 920);

      // Draw Camp 2 Zone (Acampamento Nordeste)
      ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
      ctx.beginPath();
      ctx.arc(1600, 450, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.3)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillText('⚔ Território de Oficiais', 1600, 330);

      // Draw Boss Sanctuary Arena (Northwest)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.beginPath();
      ctx.arc(550, 320, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText('👑 Santuário do Chefe da Ilha', 550, 180);

      // Draw Starter Port / Village Zone (Southwest)
      ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
      ctx.beginPath();
      ctx.arc(600, 900, 160, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillText('⚓ Vila Segura & Porto', 600, 770);

      // 2. Draw QUEST NPC (Oficial de Missões)
      ctx.save();
      // NPC Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(npc.x, npc.y + 18, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Quest Counter Desk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(npc.x - 30, npc.y - 4, 60, 14);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.strokeRect(npc.x - 30, npc.y - 4, 60, 14);

      // Parchment paper on desk
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(npc.x - 12, npc.y - 2, 24, 10);

      // NPC Body
      ctx.fillStyle = '#1e3a8a'; // Marine / Quest Giver Blue Coat
      ctx.beginPath();
      ctx.arc(npc.x, npc.y - 10, npc.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // NPC Hat / Bandana
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(npc.x - 18, npc.y - 32, 36, 8);

      // NPC Name & Tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(npc.name, npc.x, npc.y - 46);

      // Animated Glowing Quest Exclamation Mark `[!]`
      const bounce = Math.sin(Date.now() * 0.006) * 5;
      ctx.fillStyle = '#facc15';
      ctx.font = 'black 22px sans-serif';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 14;
      ctx.fillText('!', npc.x, npc.y - 64 + bounce);

      ctx.restore();

      // 2b. Draw FRAGMENT DEALER NPC (Mercador das Sombras)
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(fragNpc.x, fragNpc.y + 18, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mysterious Dark Obsidian / Amethyst Stall
      ctx.fillStyle = '#1e1b4b'; // Deep indigo/black
      ctx.fillRect(fragNpc.x - 30, fragNpc.y - 4, 60, 14);
      ctx.strokeStyle = '#7e22ce'; // Purple border
      ctx.lineWidth = 2;
      ctx.strokeRect(fragNpc.x - 30, fragNpc.y - 4, 60, 14);

      // Floating Fragment Relic on Desk
      const relicBounce = Math.sin(Date.now() * 0.005) * 3;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(fragNpc.x, fragNpc.y - 2 + relicBounce, 6, 0, Math.PI * 2);
      ctx.fill();

      // NPC Body (Dark Hooded Sorcerer)
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#3b0764'; // Deep dark violet
      ctx.beginPath();
      ctx.arc(fragNpc.x, fragNpc.y - 10, fragNpc.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Hood
      ctx.fillStyle = '#1e1035';
      ctx.beginPath();
      ctx.arc(fragNpc.x, fragNpc.y - 12, fragNpc.radius * 0.85, Math.PI, 0, false);
      ctx.fill();

      // Glowing Eyes
      ctx.fillStyle = '#e879f9';
      ctx.shadowColor = '#e879f9';
      ctx.shadowBlur = 8;
      ctx.fillRect(fragNpc.x - 7, fragNpc.y - 13, 3, 3);
      ctx.fillRect(fragNpc.x + 4, fragNpc.y - 13, 3, 3);

      // Name & Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(fragNpc.name, fragNpc.x, fragNpc.y - 46);

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('LOJA DE FRAGS', fragNpc.x, fragNpc.y - 35);

      // Floating Purple Frag Icon above head
      ctx.fillStyle = '#a855f7';
      ctx.font = 'black 18px sans-serif';
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 16;
      ctx.fillText('🟣', fragNpc.x, fragNpc.y - 62 + relicBounce);

      ctx.restore();

      // 2c. Draw WANDERING HAKI COLOR MASTER NPC (Mestre das Cores de Haki)
      if (hakiNpcSpawnedOnThisIsland) {
        const hNpc = hakiNpcRef.current;
        const offerColor = hakiNpcOffer?.primaryColor || '#a855f7';
        const offerSecColor = hakiNpcOffer?.secondaryColor || '#d946ef';
        const offerName = hakiNpcOffer?.name || 'Cor Misteriosa';
        const auraBob = Math.sin(Date.now() / 250) * 4;

        ctx.save();
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(hNpc.x, hNpc.y + 18, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Haki Aura Magic Circle around base
        ctx.save();
        ctx.shadowColor = offerColor;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = offerColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(hNpc.x, hNpc.y + 16, 36 + Math.sin(Date.now() / 200) * 3, 14, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = offerSecColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.ellipse(hNpc.x, hNpc.y + 16, 44, 17, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Master Monk Robe
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(hNpc.x, hNpc.y - 8, hNpc.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = offerColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Master Straw / Bamboo Conical Hat
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(hNpc.x - 26, hNpc.y - 14);
        ctx.lineTo(hNpc.x, hNpc.y - 38);
        ctx.lineTo(hNpc.x + 26, hNpc.y - 14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glowing Spiritual Eyes under hat
        ctx.fillStyle = offerColor;
        ctx.shadowColor = offerColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(hNpc.x - 6, hNpc.y - 10, 3, 3);
        ctx.fillRect(hNpc.x + 3, hNpc.y - 10, 3, 3);

        // Overhead Title & Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 5;
        ctx.fillText('🧙‍♂️ Mestre das Cores de Haki', hNpc.x, hNpc.y - 48);

        ctx.fillStyle = offerSecColor;
        ctx.font = 'black 10px sans-serif';
        ctx.fillText(`VENDENDO: ${offerName.toUpperCase()}`, hNpc.x, hNpc.y - 36);

        // Floating Rotating Spiritual Aura Orb
        ctx.shadowColor = offerColor;
        ctx.shadowBlur = 24;
        ctx.fillStyle = offerColor;
        ctx.beginPath();
        ctx.arc(hNpc.x, hNpc.y - 70 + auraBob, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 15-min badge
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('⏳ 15 MIN', hNpc.x, hNpc.y - 84 + auraBob);

        ctx.restore();
      }

      // 2d. Draw ALTAR DO CÁLICE SAGRADO (Altar do Mihawk)
      ctx.save();
      const altarX = 950;
      const altarY = 950;
      const altarBob = Math.sin(Date.now() / 200) * 3;

      // Base Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(altarX, altarY + 20, 32, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stone Pedestal Base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(altarX - 25, altarY - 5, 50, 22);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(altarX - 25, altarY - 5, 50, 22);

      // Golden Chalice Icon / Flame
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'black 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🍷', altarX, altarY - 10 + altarBob);

      // Overhead Title & Subtitle
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 5;
      ctx.fillText('🍷 Altar do Cálice Sagrado (Mihawk)', altarX, altarY - 48);

      const isChaliceCd = Date.now() < (chaliceCooldownEnd || 0);
      if (isChaliceCd) {
        const remSec = Math.ceil(((chaliceCooldownEnd || 0) - Date.now()) / 1000);
        const cdMin = Math.floor(remSec / 60);
        const cdSec = remSec % 60;
        ctx.fillStyle = '#f87171';
        ctx.font = 'black 10px sans-serif';
        ctx.fillText(`⏱️ Recarga: ${String(cdMin).padStart(2, '0')}:${String(cdSec).padStart(2, '0')}`, altarX, altarY - 36);
      } else {
        ctx.fillStyle = '#34d399';
        ctx.font = 'black 10px sans-serif';
        ctx.fillText('★ PRONTO! (2% DE CHANCE)', altarX, altarY - 36);
      }
      ctx.restore();

      // 2e. Draw CHALICE RITUAL ALTAR BUTTONS
      if (chaliceRitualActive && chaliceButtons && chaliceButtons.length > 0) {
        chaliceButtons.forEach((btn) => {
          ctx.save();
          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(btn.x, btn.y + 16, 32, 14, 0, 0, Math.PI * 2);
          ctx.fill();

          if (btn.activated) {
            // Lit Activated Beacon
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 30;
            ctx.fillStyle = '#059669';
            ctx.beginPath();
            ctx.ellipse(btn.x, btn.y + 12, 34, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6ee7b7';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'black 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✓', btn.x, btn.y - 10);

            ctx.fillStyle = '#a7f3d0';
            ctx.font = 'black 11px sans-serif';
            ctx.fillText(`⚡ ${btn.requiredColorName} (ATIVADO)`, btn.x, btn.y - 32);
          } else {
            // Unactivated Glowing Altar Circle
            ctx.shadowColor = btn.colorHex;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = btn.colorHex;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(btn.x, btn.y + 12, 36 + Math.sin(Date.now() / 150) * 3, 16, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = btn.secondaryColorHex;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.ellipse(btn.x, btn.y + 12, 44, 18, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Center Rune Icon
            ctx.fillStyle = btn.colorHex;
            ctx.beginPath();
            ctx.arc(btn.x, btn.y - 4, 8, 0, Math.PI * 2);
            ctx.fill();

            // Title Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 4;
            ctx.fillText(`⚡ Altar ${btn.requiredColorName}`, btn.x, btn.y - 44);

            ctx.fillStyle = btn.secondaryColorHex;
            ctx.font = 'black 10px sans-serif';
            ctx.fillText('EXIGE: BUSO HAKI ATIVO', btn.x, btn.y - 32);
          }
          ctx.restore();
        });
      }

      // 2f. Draw TREASURE CHESTS (Bronze: 80, Silver: 230, Gold: 560, Diamond: 760)
      chestsRef.current.forEach((chest) => {
        ctx.save();
        const t = Date.now();
        const isDiamond = chest.tier === 'diamond';
        const isGold = chest.tier === 'gold';
        const isSilver = chest.tier === 'silver';

        // Color Palette per Tier
        const palette = isDiamond
          ? {
              woodDark: '#0369a1',
              woodLight: '#0ea5e9',
              band: '#67e8f9',
              bandHighlight: '#e0f2fe',
              glow: '#38bdf8',
              lock: '#f472b6',
              badgeColor: '#67e8f9',
              icon: '💎',
            }
          : isGold
          ? {
              woodDark: '#7f1d1d',
              woodLight: '#b91c1c',
              band: '#facc15',
              bandHighlight: '#fef08a',
              glow: '#eab308',
              lock: '#facc15',
              badgeColor: '#fde047',
              icon: '👑',
            }
          : isSilver
          ? {
              woodDark: '#1e293b',
              woodLight: '#334155',
              band: '#cbd5e1',
              bandHighlight: '#f8fafc',
              glow: '#94a3b8',
              lock: '#e2e8f0',
              badgeColor: '#e2e8f0',
              icon: '🥈',
            }
          : {
              woodDark: '#451a03',
              woodLight: '#78350f',
              band: '#d97706',
              bandHighlight: '#fbbf24',
              glow: '#b45309',
              lock: '#f59e0b',
              badgeColor: '#fdba74',
              icon: '📦',
            };

        if (chest.status === 'cooldown') {
          // 5-Minute Respawn Ghost Pedestal & Countdown
          const remMs = Math.max(0, (chest.respawnAt || 0) - t);
          const remSecTotal = Math.ceil(remMs / 1000);
          const mm = String(Math.floor(remSecTotal / 60)).padStart(2, '0');
          const ss = String(remSecTotal % 60).padStart(2, '0');

          ctx.strokeStyle = palette.band;
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(chest.x, chest.y + 8, 24, 10, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.globalAlpha = 0.85;
          ctx.fillStyle = palette.badgeColor;
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.95)';
          ctx.shadowBlur = 4;
          ctx.fillText(`⏳ ${chest.name}: ${mm}:${ss}`, chest.x, chest.y - 8);
          ctx.restore();
          return;
        }

        // Ground Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(chest.x, chest.y + 13, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Special Rotating Prismatic Magic Circle for the 1 Diamond Chest & Gold Chests
        if (isDiamond || isGold) {
          ctx.save();
          ctx.strokeStyle = palette.glow;
          ctx.shadowColor = palette.glow;
          ctx.shadowBlur = isDiamond ? 18 : 12;
          ctx.lineWidth = isDiamond ? 2.2 : 1.5;
          ctx.beginPath();
          ctx.ellipse(
            chest.x,
            chest.y + 11,
            28 + Math.sin(t / 220) * 2.5,
            12,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          if (isDiamond) {
            // Orbiting Diamond Crystals around the Unique Diamond Chest
            for (let d = 0; d < 3; d++) {
              const ang = t * 0.003 + (d * Math.PI * 2) / 3;
              const ox = chest.x + Math.cos(ang) * 28;
              const oy = chest.y - 4 + Math.sin(ang) * 9;
              ctx.fillStyle = '#e0f2fe';
              ctx.beginPath();
              ctx.moveTo(ox, oy - 4);
              ctx.lineTo(ox + 3, oy);
              ctx.lineTo(ox, oy + 4);
              ctx.lineTo(ox - 3, oy);
              ctx.closePath();
              ctx.fill();
            }
          }
          ctx.restore();
        }

        if (chest.status === 'closed') {
          // =========================================================
          // CLOSED CHEST RENDER (Detailed Pirate Chest with Arched Lid)
          // =========================================================
          const hoverBob = isDiamond ? Math.sin(t / 240) * 1.5 : 0;
          ctx.translate(chest.x, chest.y + hoverBob);

          // Chest Base Box (-18 to 18 width, -6 to 10 height)
          const baseGrad = ctx.createLinearGradient(-18, -6, 18, 10);
          baseGrad.addColorStop(0, palette.woodLight);
          baseGrad.addColorStop(1, palette.woodDark);
          ctx.fillStyle = baseGrad;
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.fillRect(-18, -5, 36, 15);
          ctx.strokeRect(-18, -5, 36, 15);

          // Horizontal Wood Plank Seam
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-17, 2.5);
          ctx.lineTo(17, 2.5);
          ctx.stroke();

          // Arched Lid (-19 to 19 width, -16 to -5 height)
          const lidGrad = ctx.createLinearGradient(0, -17, 0, -5);
          lidGrad.addColorStop(0, palette.bandHighlight);
          lidGrad.addColorStop(0.25, palette.woodLight);
          lidGrad.addColorStop(1, palette.woodDark);
          ctx.fillStyle = lidGrad;
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-19, -5);
          ctx.lineTo(-19, -11);
          ctx.quadraticCurveTo(0, -18, 19, -11);
          ctx.lineTo(19, -5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Vertical Metallic Straps (Left & Right)
          ctx.fillStyle = palette.band;
          ctx.fillRect(-13, -14, 4.5, 24);
          ctx.fillRect(8.5, -14, 4.5, 24);

          // Metallic Rim Trim between Lid and Base
          ctx.fillStyle = palette.bandHighlight;
          ctx.fillRect(-19, -6.5, 38, 3);

          // Ornate Center Lock Plate & Keyhole
          ctx.shadowColor = palette.glow;
          ctx.shadowBlur = isDiamond ? 12 : 6;
          ctx.fillStyle = palette.lock;
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(-4.5, -8.5, 9, 10, 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Keyhole
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.arc(0, -4.5, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-1, -4, 2, 3.2);

          // Periodic Twinkle Star on Closed Chest
          const twinklePhase = ((t + chest.x * 13) % 1800) / 1800;
          if (twinklePhase < 0.35) {
            const sAlpha = Math.sin((twinklePhase / 0.35) * Math.PI);
            ctx.save();
            ctx.translate(12, -14);
            ctx.scale(sAlpha, sAlpha);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = palette.bandHighlight;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(1.5, -1.5);
            ctx.lineTo(6, 0);
            ctx.lineTo(1.5, 1.5);
            ctx.lineTo(0, 6);
            ctx.lineTo(-1.5, 1.5);
            ctx.lineTo(-6, 0);
            ctx.lineTo(-1.5, -1.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Overhead Chest Label & Current Reward Preview
          const previewReward = calculateChestBeliReward(chest.baseBeli, stats.level);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.95)';
          ctx.shadowBlur = 4;
          ctx.fillText(
            `${palette.icon} ${chest.name}${isDiamond ? ' [ÚNICO]' : ''}`,
            0,
            -31
          );

          ctx.fillStyle = palette.badgeColor;
          ctx.font = 'black 10px sans-serif';
          ctx.fillText(`💰 +${previewReward.toLocaleString()} ฿`, 0, -20);
        } else if (chest.status === 'opening') {
          // =========================================================
          // GORGEOUS MULTI-STAGE CHEST OPENING ANIMATION
          // =========================================================
          const f = chest.animFrame;
          const isAnticipation = f < 18;

          // Shake & Squash/Stretch during anticipation (frames 0..17) or bounce on open (frames 18..40)
          let shakeX = 0;
          let scaleX = 1;
          let scaleY = 1;
          if (isAnticipation) {
            shakeX = Math.sin(f * 2.1) * (2.5 + (f / 18) * 3.5);
            scaleX = 1 + Math.sin(f * 0.9) * 0.08;
            scaleY = 1 - Math.sin(f * 0.9) * 0.07;
          } else if (f < 42) {
            const bounceT = (f - 18) / 24;
            const spring = Math.sin(bounceT * Math.PI * 2.5) * Math.exp(-bounceT * 3.5);
            scaleX = 1 - spring * 0.14;
            scaleY = 1 + spring * 0.18;
          }

          // 1. Expanding Ground Shockwave Halos (after frame 18)
          if (!isAnticipation) {
            const openFrames = f - 18;
            for (let h = 0; h < 2; h++) {
              const hFrame = openFrames - h * 14;
              if (hFrame > 0 && hFrame < 65) {
                const hProg = hFrame / 65;
                ctx.save();
                ctx.globalAlpha = (1 - hProg) * 0.85;
                ctx.strokeStyle = h === 0 ? palette.bandHighlight : palette.glow;
                ctx.lineWidth = 3.5 * (1 - hProg);
                ctx.shadowColor = palette.glow;
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.ellipse(
                  chest.x,
                  chest.y + 8,
                  22 + hProg * 68,
                  10 + hProg * 28,
                  0,
                  0,
                  Math.PI * 2
                );
                ctx.stroke();
                ctx.restore();
              }
            }

            // 2. Volumetric God-Rays (Feixes de Luz Divina) Erupting from Inside the Chest!
            const rayFade = openFrames < 85 ? 1 : Math.max(0, 1 - (openFrames - 85) / 32);
            if (rayFade > 0) {
              ctx.save();
              ctx.translate(chest.x, chest.y - 6);
              const rayCount = isDiamond ? 9 : 7;
              for (let r = 0; r < rayCount; r++) {
                const baseRayAngle =
                  -Math.PI / 2 + ((r - (rayCount - 1) / 2) / rayCount) * 1.35;
                const sway = Math.sin(t * 0.005 + r * 1.1) * 0.06;
                const angle = baseRayAngle + sway;
                const rayLen = (isDiamond ? 95 : 75) + Math.sin(t * 0.008 + r) * 14;
                const raySpread = 0.09;

                const rayGrad = ctx.createLinearGradient(
                  0,
                  0,
                  Math.cos(angle) * rayLen,
                  Math.sin(angle) * rayLen
                );
                rayGrad.addColorStop(
                  0,
                  isDiamond ? 'rgba(103, 232, 249, 0.85)' : 'rgba(254, 240, 138, 0.85)'
                );
                rayGrad.addColorStop(
                  0.5,
                  isDiamond ? 'rgba(56, 189, 248, 0.35)' : 'rgba(250, 204, 21, 0.35)'
                );
                rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.globalAlpha = rayFade;
                ctx.fillStyle = rayGrad;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(
                  Math.cos(angle - raySpread) * rayLen,
                  Math.sin(angle - raySpread) * rayLen
                );
                ctx.lineTo(
                  Math.cos(angle + raySpread) * rayLen,
                  Math.sin(angle + raySpread) * rayLen
                );
                ctx.closePath();
                ctx.fill();
              }
              ctx.restore();
            }
          }

          ctx.save();
          ctx.translate(chest.x + shakeX, chest.y);
          ctx.scale(scaleX, scaleY);

          if (isAnticipation) {
            // Closed chest trembling with intense light leaking from seam!
            ctx.fillStyle = palette.woodDark;
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 2;
            ctx.fillRect(-18, -5, 36, 15);
            ctx.strokeRect(-18, -5, 36, 15);

            ctx.fillStyle = palette.woodLight;
            ctx.beginPath();
            ctx.moveTo(-19, -5);
            ctx.lineTo(-19, -11);
            ctx.quadraticCurveTo(0, -18, 19, -11);
            ctx.lineTo(19, -5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = palette.band;
            ctx.fillRect(-13, -14, 4.5, 24);
            ctx.fillRect(8.5, -14, 4.5, 24);

            // Glowing Seam Burst
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = isDiamond ? '#67e8f9' : '#fef08a';
            ctx.lineWidth = 2 + (f / 18) * 3.5;
            ctx.beginPath();
            ctx.moveTo(-20, -5);
            ctx.lineTo(20, -5);
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            // OPENED CHEST: Lid Flipped Back + Glowing Treasure Mound Inside!
            const openProgress = Math.min(1, (f - 18) / 14);

            // 1. Flipped-Back Open Lid behind the box
            const lidTopY = -12 - openProgress * 13;
            ctx.fillStyle = palette.woodDark;
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-19, -5);
            ctx.lineTo(-20, lidTopY + 4);
            ctx.quadraticCurveTo(0, lidTopY - 4, 20, lidTopY + 4);
            ctx.lineTo(19, -5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner Velvet / Gold Lining of Open Lid
            ctx.fillStyle = isDiamond ? '#0284c7' : '#450a0a';
            ctx.fillRect(-16, lidTopY + 3, 32, 9);
            ctx.strokeStyle = palette.band;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-16, lidTopY + 3, 32, 9);

            // 2. Overflowing Mound of Gold Coins, Rubies & Diamonds Inside Box!
            ctx.save();
            ctx.shadowColor = isDiamond ? '#38bdf8' : '#facc15';
            ctx.shadowBlur = 16;
            const treasureGrad = ctx.createRadialGradient(0, -6, 2, 0, -6, 18);
            treasureGrad.addColorStop(0, '#ffffff');
            treasureGrad.addColorStop(0.35, isDiamond ? '#67e8f9' : '#fef08a');
            treasureGrad.addColorStop(1, '#f59e0b');
            ctx.fillStyle = treasureGrad;
            ctx.beginPath();
            ctx.ellipse(0, -5.5, 16, 6.5, 0, Math.PI, 0, false);
            ctx.fill();

            // Individual glittering gems in the pile
            const pileGems = [
              { x: -9, y: -7, c: '#f43f5e' },
              { x: -3, y: -9, c: '#38bdf8' },
              { x: 4, y: -8, c: '#10b981' },
              { x: 10, y: -6, c: '#facc15' },
            ];
            pileGems.forEach((g) => {
              ctx.fillStyle = g.c;
              ctx.beginPath();
              ctx.arc(g.x, g.y, 2.5, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();

            // 3. Front Chest Base Box (Drawn in front of the treasure pile)
            const baseGrad = ctx.createLinearGradient(-18, -5, 18, 10);
            baseGrad.addColorStop(0, palette.woodLight);
            baseGrad.addColorStop(1, palette.woodDark);
            ctx.fillStyle = baseGrad;
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 2;
            ctx.fillRect(-18, -5, 36, 15);
            ctx.strokeRect(-18, -5, 36, 15);

            // Vertical Metallic Straps on Base
            ctx.fillStyle = palette.band;
            ctx.fillRect(-13, -5, 4.5, 15);
            ctx.fillRect(8.5, -5, 4.5, 15);

            // Upper Gold Rim of Base
            ctx.fillStyle = palette.bandHighlight;
            ctx.fillRect(-19, -6, 38, 2.5);

            // Flying Padlock Tumbling Off (frames 18..48)
            if (f < 48) {
              const lockT = f - 18;
              const lockX = 10 + lockT * 1.4;
              const lockY = -8 - lockT * 2.2 + 0.12 * lockT * lockT;
              ctx.save();
              ctx.translate(lockX, lockY);
              ctx.rotate(lockT * 0.35);
              ctx.fillStyle = palette.lock;
              ctx.strokeStyle = '#09090b';
              ctx.lineWidth = 1.2;
              ctx.fillRect(-4, -4, 8, 8);
              ctx.strokeRect(-4, -4, 8, 8);
              ctx.restore();
            }
          }

          ctx.restore();

          // Rising Floating Beli Reward Banner directly above the opening chest
          if (!isAnticipation) {
            const openFrames = f - 18;
            const floatY = chest.y - 34 - Math.min(36, openFrames * 0.45);
            const alpha = openFrames < 85 ? 1 : Math.max(0, 1 - (openFrames - 85) / 32);
            const rewardVal =
              chest.lastRewardGiven || calculateChestBeliReward(chest.baseBeli, stats.level);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
            ctx.shadowBlur = 6;

            ctx.fillStyle = palette.badgeColor;
            ctx.font = 'black 15px sans-serif';
            ctx.fillText(`+${rewardVal.toLocaleString()} ฿`, chest.x, floatY);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`${palette.icon} ${chest.name.toUpperCase()} ABERTO!`, chest.x, floatY - 15);
            ctx.restore();
          }
        }

        ctx.restore();
      });

      // 2g. Draw 3D Spinning Coins & Sparkling Gems Fountain from Opened Chests
      chestCoinsRef.current.forEach((c) => {
        ctx.save();
        const fade = c.life > c.maxLife - 20 ? (c.maxLife - c.life) / 20 : 1;
        ctx.globalAlpha = Math.max(0, fade);

        // Ground shadow under each airborne coin/gem
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(c.x, c.groundY + 3, c.size * 0.7, c.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(c.x, c.y);
        const scaleW = Math.max(0.22, Math.abs(Math.cos(c.spin)));

        if (c.kind === 'gem') {
          // Sparkling Faceted Diamond / Ruby / Emerald Gem
          ctx.scale(scaleW, 1);
          ctx.shadowColor = c.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = c.color;
          ctx.strokeStyle = c.rimColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, -c.size);
          ctx.lineTo(c.size * 0.85, 0);
          ctx.lineTo(0, c.size);
          ctx.lineTo(-c.size * 0.85, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // 3D Spinning Beli Coin
          ctx.scale(scaleW, 1);
          ctx.shadowColor = c.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = c.color;
          ctx.strokeStyle = c.rimColor;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, c.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner Coin Slot
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-1, -c.size * 0.45, 2, c.size * 0.9);
        }

        ctx.restore();
      });

      // Draw Haki Activation Shockwaves & Lightning
      hakiShockwavesRef.current.forEach((sw) => {
        ctx.save();
        const progress = sw.life / sw.maxLife;
        const alpha = 1 - progress;

        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = sw.primaryColor;
        ctx.lineWidth = 6 * (1 - progress * 0.5);
        ctx.shadowColor = sw.secondaryColor;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.strokeStyle = sw.secondaryColor;
        sw.branches.forEach((branch) => {
          ctx.beginPath();
          ctx.moveTo(branch.x1, branch.y1);
          ctx.lineTo(branch.x2, branch.y2);
          ctx.stroke();
        });

        ctx.restore();
      });

      // 3. Draw Spells & VFX
      spellsRef.current.forEach((spell) => {
        ctx.save();
        ctx.fillStyle = spell.color;
        ctx.strokeStyle = spell.color;

        const progress = spell.life / spell.maxLife;
        const currentRadius = spell.radius * (0.4 + 0.6 * progress);

        if (spell.type === 'slash') {
          ctx.beginPath();
          ctx.lineWidth = 6;
          ctx.arc(
            spell.x,
            spell.y,
            currentRadius,
            player.facingAngle - 0.7,
            player.facingAngle + 0.7
          );
          ctx.stroke();
        } else if (spell.type === 'aoe') {
          ctx.globalAlpha = 0.5 * (1 - progress);
          ctx.beginPath();
          ctx.arc(spell.x, spell.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.9 * (1 - progress);
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (spell.type === 'projectile') {
          ctx.beginPath();
          ctx.arc(spell.x, spell.y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 15;
          ctx.shadowColor = spell.color;
        } else if (spell.type === 'barrage') {
          ctx.globalAlpha = 0.7 * (1 - progress);
          for (let b = 0; b < 4; b++) {
            const bx = spell.x + (Math.random() - 0.5) * spell.radius * 1.5;
            const by = spell.y + (Math.random() - 0.5) * spell.radius * 1.5;
            ctx.beginPath();
            ctx.arc(bx, by, 18, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      });

      // 4. Draw Enemies
      enemiesRef.current.forEach((enemy) => {
        if (enemy.hp <= 0) {
          if (enemy.isBoss && !enemy.isInvasionBoss) {
            const timeLeft = Math.max(1, Math.ceil((2700 - enemy.attackCooldown) / 60));
            ctx.save();
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.ellipse(enemy.originX, enemy.originY, 28, 14, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 4;
            ctx.fillText(`👑 ${enemy.name}: Renascendo em ${timeLeft}s`, enemy.originX, enemy.originY - 14);
            ctx.restore();
          }
          return;
        }

        ctx.save();
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + enemy.radius * 0.85, enemy.radius, enemy.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        if (enemy.defId === 'enemy_mihawk') {
          // =========================================================
          // CUSTOM CHARACTER SPRITE: DRACULE MIHAWK + DARK BLADE (YORU)
          // =========================================================
          const t = Date.now();
          const pulse = Math.sin(t / 160) * 4;
          const isFlashingHit = enemy.hitStun > 0;

          // 1. Emerald & Black Kokuto Haki Ground Aura
          ctx.save();
          ctx.strokeStyle = '#10b981';
          ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 8 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Orbiting green/black sword aura arcs
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2;
          const orbitAngle = (t / 350) % (Math.PI * 2);
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 14, orbitAngle, orbitAngle + 1.3);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 14, orbitAngle + Math.PI, orbitAngle + Math.PI + 1.3);
          ctx.stroke();
          ctx.restore();

          // 2. Flowing Wine-Red & Black Long Coat / Cape
          ctx.save();
          // High Upturned Burgundy Collar behind head
          ctx.fillStyle = isFlashingHit ? '#ffffff' : '#881337';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(enemy.x - 24, enemy.y - 6);
          ctx.lineTo(enemy.x - 30, enemy.y - 28);
          ctx.lineTo(enemy.x + 30, enemy.y - 28);
          ctx.lineTo(enemy.x + 24, enemy.y - 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Long Black Coat Body & Flowing Lower Hem
          ctx.fillStyle = isFlashingHit ? '#ffffff' : '#09090b';
          ctx.strokeStyle = '#9f1239';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(enemy.x - 22, enemy.y - 8);
          ctx.lineTo(enemy.x + 22, enemy.y - 8);
          ctx.lineTo(enemy.x + 32, enemy.y + 34);
          ctx.lineTo(enemy.x - 32, enemy.y + 34);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Wine-Red Coat Lapels & Sleeves
          ctx.fillStyle = isFlashingHit ? '#ffffff' : '#9f1239';
          ctx.beginPath();
          ctx.moveTo(enemy.x - 20, enemy.y - 6);
          ctx.lineTo(enemy.x - 8, enemy.y + 28);
          ctx.lineTo(enemy.x - 26, enemy.y + 28);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(enemy.x + 20, enemy.y - 6);
          ctx.lineTo(enemy.x + 8, enemy.y + 28);
          ctx.lineTo(enemy.x + 26, enemy.y + 28);
          ctx.closePath();
          ctx.fill();

          // Bare Muscular Chest V-Neck
          ctx.fillStyle = isFlashingHit ? '#ffffff' : '#fde68a';
          ctx.beginPath();
          ctx.moveTo(enemy.x - 10, enemy.y - 6);
          ctx.lineTo(enemy.x + 10, enemy.y - 6);
          ctx.lineTo(enemy.x, enemy.y + 18);
          ctx.closePath();
          ctx.fill();

          // Iconic Golden Cross Dagger Necklace (Kogatana) on Chest
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y + 1);
          ctx.lineTo(enemy.x, enemy.y + 13);
          ctx.moveTo(enemy.x - 5, enemy.y + 5);
          ctx.lineTo(enemy.x + 5, enemy.y + 5);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Belt with Golden Buckle
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(enemy.x - 22, enemy.y + 20, 44, 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(enemy.x - 5, enemy.y + 19, 10, 8);
          ctx.restore();

          // 3. Head, Goatee Beard & Piercing Golden "Hawk-Eyes"
          ctx.save();
          // Face
          ctx.fillStyle = isFlashingHit ? '#ffffff' : '#fef3c7';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y - 16, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Signature Sharp Black Beard / Goatee & Sideburns
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y - 14, 14.5, 0.25, Math.PI - 0.25);
          ctx.lineTo(enemy.x, enemy.y - 4);
          ctx.closePath();
          ctx.fill();

          // Mustache
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(enemy.x - 8, enemy.y - 9);
          ctx.quadraticCurveTo(enemy.x, enemy.y - 12, enemy.x + 8, enemy.y - 9);
          ctx.stroke();

          // Golden "Hawk-Eyes" (Olhos de Gavião)
          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(enemy.x - 5.5, enemy.y - 16, 2.8, 0, Math.PI * 2);
          ctx.arc(enemy.x + 5.5, enemy.y - 16, 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Sharp Pinpoint Pupils & Brows
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(enemy.x - 5.5, enemy.y - 16, 1.1, 0, Math.PI * 2);
          ctx.arc(enemy.x + 5.5, enemy.y - 16, 1.1, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(enemy.x - 9, enemy.y - 20);
          ctx.lineTo(enemy.x - 2, enemy.y - 18);
          ctx.moveTo(enemy.x + 9, enemy.y - 20);
          ctx.lineTo(enemy.x + 2, enemy.y - 18);
          ctx.stroke();

          // 4. Wide-Brimmed Black Cavalier Hat & Plume Feather
          // Feather Plume
          ctx.fillStyle = '#e0f2fe';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(enemy.x + 22, enemy.y - 36, 14, 5, -0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Hat Crown
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y - 27, 15, Math.PI, 0);
          ctx.fill();

          // Red Hat Band
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(enemy.x - 14, enemy.y - 29, 28, 4);

          // Wide Sweeping Hat Brim
          ctx.fillStyle = '#09090b';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(enemy.x, enemy.y - 26, 30, 6.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // 5. THE LEGENDARY DARK BLADE (KOKUTO YORU) IN HIS RIGHT HAND
          ctx.save();
          const handX = enemy.x + 24;
          const handY = enemy.y + 4;
          const angleToPlayer = Math.atan2(player.y - handY, player.x - handX);
          const swingOffset = Math.sin(t / 150) * 0.22 + (enemy.attackCooldown > 32 ? 0.65 : 0);
          ctx.translate(handX, handY);
          ctx.rotate(angleToPlayer + swingOffset - 0.25);

          // Lavender Sleeve Cuff & Pale Hand gripping hilt
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(-6, -6, 8, 12);
          ctx.fillStyle = '#fde68a';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(2, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Long Wrapped Hilt & Golden Pommel (behind hand)
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-18, -3, 28, 6);
          ctx.strokeRect(-18, -3, 28, 6);

          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(-20, 0, 5, 0, Math.PI * 2);
          ctx.fill();

          // Giant Ornate Curved Golden Crossguard (Cruciform Guard of Yoru)
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(10, -22);
          ctx.quadraticCurveTo(16, 0, 10, 22);
          ctx.lineTo(16, 20);
          ctx.quadraticCurveTo(21, 0, 16, -20);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Embedded Emerald & Sapphire Jewels on Crossguard
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(13, 0, 3, 0, Math.PI * 2);
          ctx.arc(13, -11, 2.2, 0, Math.PI * 2);
          ctx.arc(13, 11, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Massive Curved Obsidian Black Blade (Yoru) with Blazing Green Aura
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#09090b';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(15, -5.5);
          ctx.lineTo(82, -7.5);
          ctx.quadraticCurveTo(96, -2, 102, 5); // Iconic curved heavy tip of Yoru
          ctx.lineTo(84, 7.5);
          ctx.lineTo(15, 5.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Neon Emerald Glowing Cutting Edge Highlight
          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(17, 4.5);
          ctx.lineTo(84, 6);
          ctx.lineTo(99, 4.5);
          ctx.stroke();
          ctx.restore();

          // Mini 5-Minute Timer Badge above Mihawk on Canvas
          if (mihawkTimeLeftRef.current !== null && mihawkTimeLeftRef.current > 0) {
            const mins = Math.floor(mihawkTimeLeftRef.current / 60);
            const secs = mihawkTimeLeftRef.current % 60;
            const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            ctx.save();
            ctx.fillStyle = 'rgba(2, 44, 34, 0.92)';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(enemy.x - 48, enemy.y - enemy.radius - 50, 96, 18, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#6ee7b7';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`⏱️ TEMPO: ${timeStr}`, enemy.x, enemy.y - enemy.radius - 37);
            ctx.restore();
          }
        } else if (enemy.isInvasionBoss) {
          // =========================================================================
          // CUSTOM BOSS SPRITE: IMPERADOR DO ABISMO (INVASION RAID BOSS)
          // =========================================================================
          ctx.save();
          const now = Date.now();
          const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          const r = enemy.radius; // ~36

          // 1. Vórtice Abissal & Anéis de Energia Sombria no chão
          const auraPulse = Math.sin(now / 150) * 5;
          const voidGrad = ctx.createRadialGradient(enemy.x, enemy.y, r * 0.2, enemy.x, enemy.y, r + 26 + auraPulse);
          voidGrad.addColorStop(0, 'rgba(88, 28, 135, 0.75)');
          voidGrad.addColorStop(0.6, 'rgba(217, 70, 239, 0.35)');
          voidGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = voidGrad;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, r + 26 + auraPulse, 0, Math.PI * 2);
          ctx.fill();

          // Anel Rúnico Giratório
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.rotate(now / 700);
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.65)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([10, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, r + 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // 2. Manto Imperial do Abismo (Capa flutuante com pontas rasgadas)
          ctx.fillStyle = enemy.hitStun > 0 ? '#ffffff' : '#2e1065';
          ctx.strokeStyle = '#c026d3';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y + 3, r + 3, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.lineTo(enemy.x - r - 6, enemy.y + r * 0.6);
          ctx.lineTo(enemy.x - r * 0.5, enemy.y + r + 8);
          ctx.lineTo(enemy.x, enemy.y + r + 2);
          ctx.lineTo(enemy.x + r * 0.5, enemy.y + r + 8);
          ctx.lineTo(enemy.x + r + 6, enemy.y + r * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 3. Torso de Armadura Obsidiana Pesada
          const armorGrad = ctx.createRadialGradient(enemy.x - 4, enemy.y - 4, 4, enemy.x, enemy.y, r);
          armorGrad.addColorStop(0, enemy.hitStun > 0 ? '#ffffff' : '#4c1d95');
          armorGrad.addColorStop(0.55, enemy.hitStun > 0 ? '#f3e8ff' : '#1e1b4b');
          armorGrad.addColorStop(1, '#09090b');
          ctx.fillStyle = armorGrad;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, r * 0.88, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#a855f7';
          ctx.stroke();

          // Núcleo do Vazio no Peito (Cristal pulsante)
          ctx.save();
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y + 2);
          ctx.lineTo(enemy.x + 7, enemy.y + 10);
          ctx.lineTo(enemy.x, enemy.y + 18);
          ctx.lineTo(enemy.x - 7, enemy.y + 10);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // 4. Ombreiras Imperiais com Espinhos (Spiked Pauldrons)
          const drawPauldron = (side: -1 | 1) => {
            ctx.save();
            ctx.translate(enemy.x + side * (r * 0.72), enemy.y - 2);
            ctx.fillStyle = enemy.hitStun > 0 ? '#ffffff' : '#18181b';
            ctx.strokeStyle = '#d946ef';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 9, side * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Espinho de osso/obsidiana na ombreira
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.moveTo(side * 4, -6);
            ctx.lineTo(side * 16, -12);
            ctx.lineTo(side * 9, 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          };
          drawPauldron(-1);
          drawPauldron(1);

          // 5. Rosto Sombrio, Chifres Abissais e Coroa do Imperador
          ctx.fillStyle = enemy.hitStun > 0 ? '#ffffff' : '#09090b';
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y - 6, r * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#7e22ce';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Chifres Curvos Demoníacos
          const drawHorn = (side: -1 | 1) => {
            ctx.fillStyle = '#18181b';
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(enemy.x + side * 10, enemy.y - 14);
            ctx.quadraticCurveTo(enemy.x + side * 26, enemy.y - 22, enemy.x + side * 22, enemy.y - 36);
            ctx.quadraticCurveTo(enemy.x + side * 16, enemy.y - 24, enemy.x + side * 5, enemy.y - 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          };
          drawHorn(-1);
          drawHorn(1);

          // Coroa Dourada/Ametista do Imperador
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#9333ea';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(enemy.x - 11, enemy.y - 16);
          ctx.lineTo(enemy.x - 13, enemy.y - 26);
          ctx.lineTo(enemy.x - 5, enemy.y - 20);
          ctx.lineTo(enemy.x, enemy.y - 30);
          ctx.lineTo(enemy.x + 5, enemy.y - 20);
          ctx.lineTo(enemy.x + 13, enemy.y - 26);
          ctx.lineTo(enemy.x + 11, enemy.y - 16);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Olhos Carmesim/Magenta Brilhantes
          ctx.save();
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(enemy.x - 9, enemy.y - 8);
          ctx.lineTo(enemy.x - 3, enemy.y - 5);
          ctx.lineTo(enemy.x - 8, enemy.y - 4);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(enemy.x + 9, enemy.y - 8);
          ctx.lineTo(enemy.x + 3, enemy.y - 5);
          ctx.lineTo(enemy.x + 8, enemy.y - 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // 6. Arma na Mão: FOICE / ESPADÃO COLOSSAL DO ABISMO
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          const attackSwing = enemy.attackCooldown > 25
            ? Math.sin((enemy.attackCooldown - 25) * 0.45) * 1.15
            : Math.sin(now / 260) * 0.14;
          ctx.rotate(angleToPlayer + attackSwing);

          // Mão segurando a arma
          ctx.fillStyle = '#3b0764';
          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(r * 0.72, 10, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Cabo Longo de Obsidiana
          ctx.strokeStyle = '#18181b';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(r * 0.35, 22);
          ctx.lineTo(r * 0.95, -28);
          ctx.stroke();

          // Guarda com Olho Abissal
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(r * 0.82, -16, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(r * 0.82, -16, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Lâmina Curva Colossal do Abismo (Foice/Cleaver)
          ctx.shadowColor = '#d946ef';
          ctx.shadowBlur = 16;
          const bladeGrad = ctx.createLinearGradient(r * 0.85, -24, r + 42, -8);
          bladeGrad.addColorStop(0, '#09090b');
          bladeGrad.addColorStop(0.5, '#7e22ce');
          bladeGrad.addColorStop(1, '#f43f5e');
          ctx.fillStyle = bladeGrad;
          ctx.strokeStyle = '#f0abfc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(r * 0.85, -22);
          ctx.quadraticCurveTo(r + 36, -34, r + 46, -2);
          ctx.quadraticCurveTo(r + 22, -12, r * 0.78, -10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // 7. Badge de Raid Boss no topo
          ctx.save();
          ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(enemy.x - 66, enemy.y - r - 48, 132, 18, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fda4af';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('💀 RAID BOSS DA INVASÃO', enemy.x, enemy.y - r - 35);
          ctx.restore();

          ctx.restore();
        } else {
          // Standard Enemy / Island Boss Body
          ctx.fillStyle = enemy.hitStun > 0 ? '#ffffff' : enemy.color;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();

          if (enemy.isBoss) {
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👑', enemy.x, enemy.y - enemy.radius - 18);
          }
        }

        // Enemy Health Bar & Name
        const isMihawk = enemy.defId === 'enemy_mihawk';
        const barWidth = enemy.isInvasionBoss ? 128 : enemy.isBoss ? 80 : 44;
        const barHeight = enemy.isInvasionBoss ? 9 : 6;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.radius - (isMihawk ? 22 : enemy.isInvasionBoss ? 22 : enemy.isBoss ? 14 : 10);

        ctx.fillStyle = isMihawk ? '#34d399' : enemy.isInvasionBoss ? '#f43f5e' : '#0f172a';
        ctx.font = enemy.isInvasionBoss
          ? 'bold 12px sans-serif'
          : enemy.isBoss
          ? 'bold 12px sans-serif'
          : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = isMihawk || enemy.isInvasionBoss ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = isMihawk || enemy.isInvasionBoss ? 4 : 2;
        ctx.fillText(
          isMihawk ? `⚔️ Lv.${enemy.level} ${enemy.name}` : enemy.isInvasionBoss ? `👑 Lv.${enemy.level} ${enemy.name}` : `Lv.${enemy.level} ${enemy.name}`,
          enemy.x,
          barY - 4
        );

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = isMihawk
          ? '#10b981'
          : enemy.isInvasionBoss
          ? '#d946ef'
          : hpPercent > 0.4
          ? '#22c55e'
          : hpPercent > 0.2
          ? '#f59e0b'
          : '#ef4444';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        ctx.restore();
      });

      // 4b. Draw Other Multiplayer Players with Full Character Appearance, Active Haki Color, Weapon & Smooth 60fps Interpolation
      const remoteList = otherPlayersRef?.current || [];
      // Prune disconnected players from interpolation map
      if (otherPlayersLerpRef.current.size > remoteList.length + 5) {
        const activeIds = new Set(remoteList.map((r) => r.id));
        for (const k of otherPlayersLerpRef.current.keys()) {
          if (!activeIds.has(k)) {
            otherPlayersLerpRef.current.delete(k);
          }
        }
      }

      if (remoteList.length > 0) {
        remoteList.forEach((op) => {
          // Strictly never render self or players on a different island
          if (!op || op.id === myPlayerId) return;
          if (op.islandId && op.islandId !== currentIsland.id) return;

          let lerpData = otherPlayersLerpRef.current.get(op.id);
          const frameNow = performance.now();
          if (!lerpData) {
            lerpData = {
              x: op.x,
              y: op.y,
              targetX: op.x,
              targetY: op.y,
              vx: op.vx || 0,
              vy: op.vy || 0,
              facingAngle: op.facingAngle || 0,
              lastServerX: op.x,
              lastServerY: op.y,
              lastPacketTime: frameNow,
              lastFrameTime: frameNow,
            };
            otherPlayersLerpRef.current.set(op.id, lerpData);
          } else {
            const dt = Math.min(0.05, Math.max(0.001, (frameNow - lerpData.lastFrameTime) / 1000));
            lerpData.lastFrameTime = frameNow;

            // Detect new snapshot from server
            if (op.x !== lerpData.lastServerX || op.y !== lerpData.lastServerY) {
              const packetAgeSec = Math.max(0.04, (frameNow - lerpData.lastPacketTime) / 1000);
              const impliedVx = ((op.x - lerpData.lastServerX) / packetAgeSec) / 60;
              const impliedVy = ((op.y - lerpData.lastServerY) / packetAgeSec) / 60;
              lerpData.vx = typeof op.vx === 'number' ? op.vx : impliedVx;
              lerpData.vy = typeof op.vy === 'number' ? op.vy : impliedVy;
              lerpData.targetX = op.x;
              lerpData.targetY = op.y;
              lerpData.lastServerX = op.x;
              lerpData.lastServerY = op.y;
              lerpData.lastPacketTime = frameNow;
            } else if (typeof op.vx === 'number' && typeof op.vy === 'number') {
              lerpData.vx = op.vx;
              lerpData.vy = op.vy;
            }

            // Dead-reckoning prediction between 10Hz network updates (up to 150ms horizon)
            const timeSincePacket = frameNow - lerpData.lastPacketTime;
            if (timeSincePacket < 150 && Math.hypot(lerpData.vx, lerpData.vy) > 0.05) {
              const frameScale = dt * 60;
              lerpData.targetX = Math.max(
                40,
                Math.min(WORLD_WIDTH - 40, lerpData.targetX + lerpData.vx * frameScale * 0.65)
              );
              lerpData.targetY = Math.max(
                40,
                Math.min(WORLD_HEIGHT - 40, lerpData.targetY + lerpData.vy * frameScale * 0.65)
              );
            }

            const dx = lerpData.targetX - lerpData.x;
            const dy = lerpData.targetY - lerpData.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 280) {
              // Snap immediately on teleport / Flash Step / island respawn
              lerpData.x = op.x;
              lerpData.y = op.y;
              lerpData.targetX = op.x;
              lerpData.targetY = op.y;
            } else {
              // Frame-rate-independent exponential smoothing (60fps silky convergence)
              const posSmoothing = 1 - Math.exp(-15 * dt);
              lerpData.x += dx * posSmoothing;
              lerpData.y += dy * posSmoothing;
            }

            // Shortest-arc frame-rate-independent angular interpolation
            const targetAngle = op.facingAngle || 0;
            const angleDiff =
              ((targetAngle - lerpData.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            const rotSmoothing = 1 - Math.exp(-20 * dt);
            lerpData.facingAngle += angleDiff * rotSmoothing;
          }

          ctx.save();
          const opChar = op.character;
          const opRace = opChar?.race || op.race || 'Human';
          const opFaction = opChar?.faction || op.faction || 'Pirates';
          const opIsBuddha = op.activeFruitId === 'fruit_buddha' && !!op.buddhaActive;
          const opIsLeviathan = op.activeFruitId === 'fruit_leviathan';
          const opIsGear5 = !!op.gear5Active;
          const opRadius = opIsBuddha ? 45 : opIsLeviathan ? 26 : opIsGear5 ? 24 : 22;
          const opHakiColor = getHakiColorById(op.hakiColorId || 'haki_amethyst_purple');
          const opX = lerpData.x;
          const opY = lerpData.y;
          const opAngle = lerpData.facingAngle;

          // 1. Remote Player Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(opX, opY + opRadius * 0.85, opRadius, opRadius * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Race Back Traits (Skypiean Wings / Ghoul Aura)
          if (opRace === 'Skypiean') {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(opX - opRadius * 0.9, opY - 4, opRadius * 0.7, opRadius * 0.35, -0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(opX + opRadius * 0.9, opY - 4, opRadius * 0.7, opRadius * 0.35, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          } else if (opRace === 'Ghoul') {
            ctx.save();
            ctx.shadowColor = '#9333ea';
            ctx.shadowBlur = 16;
            ctx.fillStyle = 'rgba(88, 28, 135, 0.3)';
            ctx.beginPath();
            ctx.arc(opX, opY, opRadius + 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 3. Ken Haki Observation Ring
          if (op.kenActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(opX, opY, opRadius + 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }

          // 4. Gear 5 Aura OR Active Buso Haki Color Aura (including Rainbow/Prismatic & Special Effects!)
          const rainbowHue = (Date.now() * 0.18) % 360;
          const isOpRainbow = opHakiColor.specialEffect === 'rainbow';

          if (opIsGear5) {
            ctx.save();
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 34;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(opX, opY, opRadius + 10 + Math.sin(Date.now() * 0.01) * 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const hagBounce = Math.sin(Date.now() * 0.008) * 3;
            ctx.ellipse(opX, opY - opRadius * 0.15 + hagBounce, opRadius * 1.5, opRadius * 0.62, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          } else if (op.busoActive) {
            ctx.save();
            const dynPrimary = isOpRainbow ? `hsl(${rainbowHue}, 95%, 58%)` : opHakiColor.primaryColor;
            const dynSecondary = isOpRainbow ? `hsl(${(rainbowHue + 120) % 360}, 100%, 70%)` : opHakiColor.secondaryColor;

            ctx.shadowColor = dynPrimary;
            ctx.shadowBlur = isOpRainbow ? 36 : 28;
            ctx.strokeStyle = dynSecondary;
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            ctx.arc(opX, opY, opRadius + 8 + Math.sin(Date.now() * 0.012) * 3.5, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = dynPrimary;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(opX, opY, opRadius + 14, 0, Math.PI * 2);
            ctx.stroke();

            if (isOpRainbow) {
              const rainbowPalette = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#06b6d4', '#a855f7', '#ec4899'];
              for (let i = 0; i < rainbowPalette.length; i++) {
                const a = Date.now() * 0.005 + (i * Math.PI * 2) / rainbowPalette.length;
                const d = opRadius + 16 + Math.sin(Date.now() * 0.01 + i) * 4;
                ctx.fillStyle = rainbowPalette[i];
                ctx.shadowColor = rainbowPalette[i];
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(opX + Math.cos(a) * d, opY + Math.sin(a) * d, 3.2, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.strokeStyle = `hsl(${(rainbowHue + 240) % 360}, 100%, 65%)`;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.ellipse(opX, opY, opRadius + 21, opRadius + 10, Date.now() * 0.003, 0, Math.PI * 2);
              ctx.stroke();
            } else if (opHakiColor.specialEffect === 'blood') {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2;
              for (let i = 0; i < 3; i++) {
                const a = Date.now() * 0.005 + (i * Math.PI * 2) / 3;
                ctx.beginPath();
                ctx.arc(opX + Math.cos(a) * (opRadius + 12), opY + Math.sin(a) * (opRadius + 12), 3.8, 0, Math.PI * 2);
                ctx.stroke();
              }
            } else if (opHakiColor.specialEffect === 'kitsune') {
              ctx.fillStyle = '#67e8f9';
              for (let i = 0; i < 4; i++) {
                const a = Date.now() * 0.004 + (i * Math.PI) / 2;
                const d = opRadius + 15 + Math.sin(Date.now() * 0.01 + i) * 4;
                ctx.beginPath();
                ctx.arc(opX + Math.cos(a) * d, opY + Math.sin(a) * d, 3, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (opHakiColor.specialEffect === 'darkblade') {
              ctx.strokeStyle = '#34d399';
              ctx.lineWidth = 2;
              ctx.setLineDash([8, 8]);
              ctx.beginPath();
              ctx.arc(opX, opY, opRadius + 18, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
            } else if (opHakiColor.specialEffect === 'leviathan') {
              ctx.strokeStyle = '#60a5fa';
              ctx.lineWidth = 2.8;
              ctx.beginPath();
              ctx.ellipse(opX, opY, opRadius + 20, opRadius + 10, Date.now() * 0.002, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }

          // 5. Remote Player Body Shader (Skin Color / Buso Haki Color / Transformations)
          if (opIsGear5) {
            ctx.fillStyle = '#ffffff';
          } else if (opIsBuddha) {
            ctx.fillStyle = '#facc15';
          } else if (opIsLeviathan) {
            ctx.fillStyle = '#0891b2';
          } else if (op.busoActive) {
            const bodyGrad = ctx.createRadialGradient(opX - 4, opY - 4, 2, opX, opY, opRadius);
            if (isOpRainbow) {
              bodyGrad.addColorStop(0, `hsl(${rainbowHue}, 95%, 60%)`);
              bodyGrad.addColorStop(0.5, `hsl(${(rainbowHue + 120) % 360}, 85%, 28%)`);
              bodyGrad.addColorStop(1, '#09090b');
            } else {
              bodyGrad.addColorStop(0, opHakiColor.primaryColor);
              bodyGrad.addColorStop(0.5, opHakiColor.darkColor);
              bodyGrad.addColorStop(1, '#09090b');
            }
            ctx.fillStyle = bodyGrad;
          } else if (opChar?.skinColor) {
            ctx.fillStyle = opChar.skinColor;
          } else {
            ctx.fillStyle = '#fcd34d';
          }

          ctx.beginPath();
          ctx.arc(opX, opY, opRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = opIsLeviathan ? 3.5 : op.busoActive || opIsGear5 ? 4 : 3;
          ctx.strokeStyle = opIsGear5
            ? '#facc15'
            : opIsLeviathan
            ? '#67e8f9'
            : op.busoActive
            ? isOpRainbow
              ? `hsl(${(rainbowHue + 90) % 360}, 100%, 70%)`
              : opHakiColor.secondaryColor
            : opIsBuddha
            ? '#ca8a04'
            : '#ffffff';
          ctx.stroke();

          // 6. Hair & Facial Features
          if (opIsGear5) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(opX, opY - opRadius * 0.4, opRadius * 0.95, Math.PI, 0, false);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(opX - 9, opY - opRadius * 0.9, 6.5, 0, Math.PI * 2);
            ctx.arc(opX + 9, opY - opRadius * 0.9, 6.5, 0, Math.PI * 2);
            ctx.arc(opX, opY - opRadius * 1.05, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(opX - 6, opY - opRadius * 0.15, 3, 0, Math.PI * 2);
            ctx.arc(opX + 6, opY - opRadius * 0.15, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (opChar?.hairColor) {
            ctx.fillStyle = opChar.hairColor;
            ctx.beginPath();
            ctx.arc(opX, opY - opRadius * 0.35, opRadius * 0.85, Math.PI, 0, false);
            ctx.fill();
          }

          // 7. Accessory / Hat
          if (opChar?.accessory === 'straw_hat' && !opIsGear5) {
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.ellipse(opX, opY - opRadius * 0.45, opRadius * 1.3, opRadius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#854d0e';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(opX, opY - opRadius * 0.55, opRadius * 0.7, opRadius * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (opChar?.accessory === 'marine_cap' && !opIsGear5) {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.ellipse(opX, opY - opRadius * 0.45, opRadius * 1.1, opRadius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(opX - opRadius * 0.7, opY - opRadius * 0.4, opRadius * 1.4, 4);
          } else if (opChar?.accessory === 'bandana' && !opIsGear5) {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(opX, opY - opRadius * 0.3, opRadius * 0.9, Math.PI, 0, false);
            ctx.fill();
          } else if (opChar?.accessory === 'goggles' && !opIsGear5) {
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.arc(opX - 7, opY - opRadius * 0.4, 5, 0, Math.PI * 2);
            ctx.arc(opX + 7, opY - opRadius * 0.4, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          // 8. Mink Ears
          if (opRace === 'Mink' && !opIsGear5) {
            ctx.fillStyle = opChar?.hairColor || '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(opX - opRadius * 0.7, opY - opRadius * 0.6);
            ctx.lineTo(opX - opRadius * 0.9, opY - opRadius * 1.2);
            ctx.lineTo(opX - opRadius * 0.3, opY - opRadius * 0.8);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(opX + opRadius * 0.7, opY - opRadius * 0.6);
            ctx.lineTo(opX + opRadius * 0.9, opY - opRadius * 1.2);
            ctx.lineTo(opX + opRadius * 0.3, opY - opRadius * 0.8);
            ctx.fill();
          }

          // 9. Remote Player Equipped Weapon / Sword or Haki Fist
          const opHandX = opX + Math.cos(opAngle) * (opRadius + 10);
          const opHandY = opY + Math.sin(opAngle) * (opRadius + 10);
          const opSword = op.activeSwordId ? SWORDS.find((s) => s.id === op.activeSwordId) : null;
          const opSwing = op.isAttacking
            ? Math.sin(Date.now() * 0.035) * 0.85
            : Math.sin(Date.now() / 320) * 0.04;
          const opBladeHakiColor = isOpRainbow
            ? `hsl(${rainbowHue}, 95%, 60%)`
            : opHakiColor.primaryColor;

          if (op.activeWeaponType === 'sword' && opSword) {
            ctx.save();
            ctx.translate(opHandX, opHandY);
            ctx.rotate(opAngle + opSwing - 0.15);

            // Hand gripping hilt
            ctx.fillStyle = op.busoActive ? '#18181b' : opChar?.skinColor || '#fcd34d';
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Hilt & Guard
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = opSword.color || '#facc15';
            ctx.lineWidth = 1.5;
            ctx.fillRect(-10, -2.5, 14, 5);
            ctx.strokeRect(-10, -2.5, 14, 5);

            ctx.fillStyle = '#facc15';
            ctx.fillRect(3, -7, 3, 14);

            // Blade
            const bladeLen =
              opSword.id === 'sword_yoru' || opSword.id === 'sword_triple_dark_blade'
                ? 54
                : opSword.id === 'sword_mihawk_dagger'
                ? 24
                : 38;
            ctx.shadowColor = op.busoActive ? opBladeHakiColor : opSword.color || '#38bdf8';
            ctx.shadowBlur = op.busoActive ? 14 : 8;
            ctx.fillStyle =
              op.busoActive || opSword.id === 'sword_yoru' || opSword.id === 'sword_triple_dark_blade'
                ? '#09090b'
                : '#f8fafc';
            ctx.strokeStyle = op.busoActive ? opBladeHakiColor : opSword.color || '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(6, -2.5);
            ctx.lineTo(6 + bladeLen, -1);
            ctx.lineTo(10 + bladeLen, 1.5);
            ctx.lineTo(6, 2.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          } else {
            if (op.busoActive) {
              ctx.shadowColor = opBladeHakiColor;
              ctx.shadowBlur = 12;
            }
            ctx.fillStyle = opIsGear5
              ? '#ffffff'
              : opIsLeviathan
              ? '#22d3ee'
              : op.busoActive
              ? opBladeHakiColor
              : opChar?.skinColor || '#f97316';
            ctx.beginPath();
            ctx.arc(opHandX, opHandY, opIsGear5 ? 9 : 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // 10. Remote Player Health Bar, Name, Clan Tag & Trade Prompt
          const barW = 48;
          const barH = 5;
          const barX = opX - barW / 2;
          const barY = opY - opRadius - 12;
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(barX, barY, barW, barH);
          const opHpPct = Math.max(0, Math.min(1, (op.hp || 100) / (op.maxHp || 100)));
          ctx.fillStyle = opHpPct > 0.4 ? '#22c55e' : opHpPct > 0.2 ? '#f59e0b' : '#ef4444';
          ctx.fillRect(barX, barY, barW * opHpPct, barH);

          const clanDisplay = op.clanTag ? `[${op.clanTag}] ` : '';
          const factionIcon =
            opFaction === 'Marines' ? '⚓' : opFaction === 'Revolutionaries' ? '⚔️' : '🏴‍☠️';
          ctx.fillStyle = '#93c5fd';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.95)';
          ctx.shadowBlur = 4;
          ctx.fillText(
            `Lv.${op.level} ${clanDisplay}${op.name} ${factionIcon}`,
            opX,
            opY - opRadius - 16
          );

          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('🔄 [Clique para Trocar Fruta]', opX, opY - opRadius - 29);
          ctx.restore();
        });
      }

      // 5. Draw Player
      ctx.save();
      const char = stats.character;
      const isBuddha = activeFruit?.id === 'fruit_buddha' && player.buddhaActive;
      const isLeviathan = activeFruit?.id === 'fruit_leviathan';
      const isGear5 = !!gear5Settings?.active;
      const playerRadius = isBuddha ? 45 : isLeviathan ? 26 : isGear5 ? 24 : 22;

      // Player Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(player.x, player.y + playerRadius * 0.85, playerRadius, playerRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Race Back Traits
      if (char?.race === 'Skypiean') {
        // Divine Angel Wings
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        // Left wing
        ctx.beginPath();
        ctx.ellipse(player.x - playerRadius * 0.9, player.y - 4, playerRadius * 0.7, playerRadius * 0.35, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Right wing
        ctx.beginPath();
        ctx.ellipse(player.x + playerRadius * 0.9, player.y - 4, playerRadius * 0.7, playerRadius * 0.35, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (char?.race === 'Ghoul') {
        ctx.save();
        ctx.shadowColor = '#9333ea';
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(88, 28, 135, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, playerRadius + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Aura & Buso Haki Hardened Armor Rings / Gear 5 Nika Aura
      if (isGear5) {
        // Celestial Sun God Nika Divine Aura & Hagoromo Cloud Ribbon
        ctx.save();
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 38;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, playerRadius + 10 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2);
        ctx.stroke();

        // Hagoromo (Floating Cloud Smoke Ribbon) around shoulders
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        const hagBounce = Math.sin(Date.now() * 0.008) * 3;
        ctx.ellipse(player.x, player.y - playerRadius * 0.15 + hagBounce, playerRadius * 1.55, playerRadius * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (haki.busoHakiActive) {
        ctx.save();
        const isRainbowHaki = activeHakiColor.specialEffect === 'rainbow';
        const rainbowHue1 = (Date.now() * 0.18) % 360;
        const rainbowHue2 = (rainbowHue1 + 120) % 360;
        const dynPrimary = isRainbowHaki ? `hsl(${rainbowHue1}, 95%, 58%)` : activeHakiColor.primaryColor;
        const dynSecondary = isRainbowHaki ? `hsl(${rainbowHue2}, 100%, 70%)` : activeHakiColor.secondaryColor;

        ctx.shadowColor = dynPrimary;
        ctx.shadowBlur = isRainbowHaki ? 38 : 32;
        ctx.strokeStyle = dynSecondary;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, playerRadius + 8 + Math.sin(Date.now() * 0.012) * 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = dynPrimary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, playerRadius + 14, 0, Math.PI * 2);
        ctx.stroke();

        // Special legendary, mythical & incompreendido aura signatures
        if (isRainbowHaki) {
          // Prismatic Rainbow Orbiting Rings & Multi-Color Sparks (Incompreendido Tier)
          const rainbowPalette = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#06b6d4', '#a855f7', '#ec4899'];
          for (let i = 0; i < rainbowPalette.length; i++) {
            const angle = Date.now() * 0.005 + (i * Math.PI * 2) / rainbowPalette.length;
            const dist = playerRadius + 16 + Math.sin(Date.now() * 0.01 + i) * 4;
            ctx.fillStyle = rainbowPalette[i];
            ctx.shadowColor = rainbowPalette[i];
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = `hsl(${(rainbowHue1 + 240) % 360}, 100%, 65%)`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(player.x, player.y, playerRadius + 22, playerRadius + 11, Date.now() * 0.003, 0, Math.PI * 2);
          ctx.stroke();
        } else if (activeHakiColor.specialEffect === 'blood') {
          // Crimson Blood Lightning Tendrils
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const angle = (Date.now() * 0.005) + (i * Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.arc(player.x + Math.cos(angle) * (playerRadius + 12), player.y + Math.sin(angle) * (playerRadius + 12), 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (activeHakiColor.specialEffect === 'kitsune') {
          // Ethereal Kitsune Fox-Fire Wisps
          ctx.fillStyle = '#67e8f9';
          for (let i = 0; i < 4; i++) {
            const angle = (Date.now() * 0.004) + (i * Math.PI / 2);
            const dist = playerRadius + 15 + Math.sin(Date.now() * 0.01 + i) * 5;
            ctx.beginPath();
            ctx.arc(player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (activeHakiColor.specialEffect === 'darkblade') {
          // Kokuto Green Blade Resonance
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.arc(player.x, player.y, playerRadius + 18, 0, Math.PI * 2);
          ctx.stroke();
        } else if (activeHakiColor.specialEffect === 'leviathan') {
          // Abyssal Sea Dragon Navy Bioluminescence
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(player.x, player.y, playerRadius + 20, playerRadius + 10, Date.now() * 0.002, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      } else if (isBuddha) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 24;
      } else if (isLeviathan) {
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 26;
      } else if (char?.race === 'Mink') {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12;
      }

      // Player Body Shader
      const rainbowHueBody = (Date.now() * 0.18) % 360;
      if (isGear5) {
        ctx.fillStyle = '#ffffff';
      } else if (isBuddha) {
        ctx.fillStyle = '#facc15';
      } else if (isLeviathan) {
        ctx.fillStyle = '#0891b2';
      } else if (haki.busoHakiActive) {
        // Metallic obsidian & active Haki color gradient shader
        const bodyGrad = ctx.createRadialGradient(
          player.x - 4, player.y - 4, 2,
          player.x, player.y, playerRadius
        );
        if (activeHakiColor.specialEffect === 'rainbow') {
          bodyGrad.addColorStop(0, `hsl(${rainbowHueBody}, 95%, 60%)`);
          bodyGrad.addColorStop(0.5, `hsl(${(rainbowHueBody + 120) % 360}, 85%, 28%)`);
          bodyGrad.addColorStop(1, '#09090b');
        } else {
          bodyGrad.addColorStop(0, activeHakiColor.primaryColor);
          bodyGrad.addColorStop(0.5, activeHakiColor.darkColor);
          bodyGrad.addColorStop(1, '#09090b');
        }
        ctx.fillStyle = bodyGrad;
      } else if (char?.skinColor) {
        ctx.fillStyle = char.skinColor;
      } else {
        ctx.fillStyle = '#0284c7';
      }

      ctx.beginPath();
      ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = isLeviathan ? 3.5 : (haki.busoHakiActive || isGear5) ? 4 : 3;
      ctx.strokeStyle = isGear5
        ? '#facc15'
        : isLeviathan
        ? '#67e8f9'
        : haki.busoHakiActive
        ? activeHakiColor.specialEffect === 'rainbow'
          ? `hsl(${(rainbowHueBody + 90) % 360}, 100%, 70%)`
          : activeHakiColor.secondaryColor
        : isBuddha
        ? '#ca8a04'
        : '#ffffff';
      ctx.stroke();

      // Hair (if visible or Gear 5 white clouds)
      if (isGear5) {
        // Pure White Fluffy Sun God Hair Curls
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(player.x, player.y - playerRadius * 0.4, playerRadius * 0.95, Math.PI, 0, false);
        ctx.fill();
        // Cloud puffs on hair
        ctx.beginPath();
        ctx.arc(player.x - 9, player.y - playerRadius * 0.9, 7, 0, Math.PI * 2);
        ctx.arc(player.x + 9, player.y - playerRadius * 0.9, 7, 0, Math.PI * 2);
        ctx.arc(player.x, player.y - playerRadius * 1.05, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (char?.hairColor) {
        ctx.fillStyle = char.hairColor;
        ctx.beginPath();
        ctx.arc(player.x, player.y - playerRadius * 0.35, playerRadius * 0.85, Math.PI, 0, false);
        ctx.fill();
      }

      // Gear 5 Red Glowing Eyes & Big Joyful Grin
      if (isGear5) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(player.x - 6, player.y - playerRadius * 0.15, 3.5, 0, Math.PI * 2);
        ctx.arc(player.x + 6, player.y - playerRadius * 0.15, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Big Joyful Smile
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y + playerRadius * 0.15, 6, 0.1, Math.PI - 0.1, false);
        ctx.stroke();
      }

      // Accessory / Headwear
      if (char?.accessory === 'straw_hat' && !isGear5) {
        // Straw Hat with Red Ribbon
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y - playerRadius * 0.45, playerRadius * 1.3, playerRadius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y - playerRadius * 0.55, playerRadius * 0.7, playerRadius * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (char?.accessory === 'marine_cap' && !isGear5) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y - playerRadius * 0.45, playerRadius * 1.1, playerRadius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(player.x - playerRadius * 0.7, player.y - playerRadius * 0.4, playerRadius * 1.4, 4);
      } else if (char?.accessory === 'bandana' && !isGear5) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(player.x, player.y - playerRadius * 0.3, playerRadius * 0.9, Math.PI, 0, false);
        ctx.fill();
      } else if (char?.accessory === 'goggles' && !isGear5) {
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(player.x - 7, player.y - playerRadius * 0.4, 5, 0, Math.PI * 2);
        ctx.arc(player.x + 7, player.y - playerRadius * 0.4, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mink Ears
      if (char?.race === 'Mink' && !isGear5) {
        ctx.fillStyle = char.hairColor || '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(player.x - playerRadius * 0.7, player.y - playerRadius * 0.6);
        ctx.lineTo(player.x - playerRadius * 0.9, player.y - playerRadius * 1.2);
        ctx.lineTo(player.x - playerRadius * 0.3, player.y - playerRadius * 0.8);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(player.x + playerRadius * 0.7, player.y - playerRadius * 0.6);
        ctx.lineTo(player.x + playerRadius * 0.9, player.y - playerRadius * 1.2);
        ctx.lineTo(player.x + playerRadius * 0.3, player.y - playerRadius * 0.8);
        ctx.fill();
      }

      // Weapon / Hand
      const handX = player.x + Math.cos(player.facingAngle) * (playerRadius + 10);
      const handY = player.y + Math.sin(player.facingAngle) * (playerRadius + 10);

      if (activeWeaponType === 'sword' && activeSword) {
        // Dynamic slash swing offset when attacking
        const swingAnim =
          player.attackCooldown > 0
            ? Math.sin((player.attackCooldown / 18) * Math.PI) * 0.85
            : Math.sin(Date.now() / 320) * 0.04;

        // Helper to draw a detailed single katana at a given hand position & angle
        const drawDetailedKatana = (
          originX: number,
          originY: number,
          angle: number,
          gripColor: string,
          guardColor: string,
          bladeLen: number
        ) => {
          ctx.save();
          ctx.translate(originX, originY);
          ctx.rotate(angle);

          // Hand gripping handle
          ctx.fillStyle = haki.busoHakiActive ? '#18181b' : char?.skinColor || '#fcd34d';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Tsuka (Wrapped Katana Handle)
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = gripColor;
          ctx.lineWidth = 1.5;
          ctx.fillRect(-10, -2.5, 14, 5);
          ctx.strokeRect(-10, -2.5, 14, 5);

          // Kashira (Golden Pommel Cap)
          ctx.fillStyle = guardColor;
          ctx.fillRect(-12, -2.8, 2.5, 5.6);

          // Tsuba (Circular Handguard)
          ctx.fillStyle = guardColor;
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(4.5, 0, 2.5, 7.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Habaki (Blade Collar)
          ctx.fillStyle = '#facc15';
          ctx.fillRect(6.5, -2.4, 3, 4.8);

          // Curved Katana Blade
          ctx.shadowColor = haki.busoHakiActive ? activeHakiColor.primaryColor : '#e2e8f0';
          ctx.shadowBlur = haki.busoHakiActive ? 14 : 6;

          const bladeGrad = ctx.createLinearGradient(9, 0, 9 + bladeLen, 0);
          if (haki.busoHakiActive) {
            bladeGrad.addColorStop(0, '#09090b');
            bladeGrad.addColorStop(0.7, '#18181b');
            bladeGrad.addColorStop(1, activeHakiColor.primaryColor);
          } else {
            bladeGrad.addColorStop(0, '#94a3b8');
            bladeGrad.addColorStop(0.5, '#f8fafc');
            bladeGrad.addColorStop(1, '#ffffff');
          }

          ctx.fillStyle = bladeGrad;
          ctx.strokeStyle = haki.busoHakiActive ? activeHakiColor.secondaryColor : '#475569';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(9, -2.2);
          ctx.quadraticCurveTo(9 + bladeLen * 0.55, -4.5, 9 + bladeLen, -1.2);
          ctx.lineTo(9 + bladeLen + 4, 1.5); // Kissaki (Katana Tip)
          ctx.quadraticCurveTo(9 + bladeLen * 0.55, -0.5, 9, 2.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Hamon (Razor Edge Gleam Line)
          ctx.strokeStyle = haki.busoHakiActive ? activeHakiColor.secondaryColor : '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(10, 1.4);
          ctx.quadraticCurveTo(9 + bladeLen * 0.55, -1.2, 9 + bladeLen + 2, 1.2);
          ctx.stroke();

          ctx.restore();
        };

        if (activeSword.id === 'sword_triple_dark_blade') {
          // --- TRIPLE DARK BLADE: 3 LEGENDARY KOKUTO YORUS ---
          const baseAngle = player.facingAngle + swingAnim * 0.6;
          const bladeConfigs = [
            { angle: baseAngle - 0.48, length: 50, sideOffset: -14, scale: 0.92, isCenter: false }, // Left Yoru
            { angle: baseAngle, length: 62, sideOffset: 0, scale: 1.08, isCenter: true },           // Center Supreme Yoru
            { angle: baseAngle + 0.48, length: 50, sideOffset: 14, scale: 0.92, isCenter: false },  // Right Yoru
          ];

          // Emerald pulsing aura under triad of blades
          const time = Date.now() / 200;
          const auraPulse = Math.sin(time) * 3;
          ctx.save();
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 14 + auraPulse;
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(player.x, player.y, playerRadius + 10, baseAngle - 0.65, baseAngle + 0.65);
          ctx.stroke();

          // Green ethereal sparks around the 3 blades
          for (let i = 0; i < 3; i++) {
            const sparkAngle = baseAngle - 0.5 + i * 0.5 + Math.sin(time + i) * 0.1;
            const sparkDist = playerRadius + 35 + Math.cos(time * 1.5 + i) * 8;
            const sx = player.x + Math.cos(sparkAngle) * sparkDist;
            const sy = player.y + Math.sin(sparkAngle) * sparkDist;
            ctx.fillStyle = i === 1 ? '#6ee7b7' : '#34d399';
            ctx.beginPath();
            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Render each of the 3 swords
          bladeConfigs.forEach(({ angle, length, sideOffset, scale, isCenter }) => {
            ctx.save();
            const perpAngle = angle + Math.PI / 2;
            const startX = player.x + Math.cos(perpAngle) * sideOffset + Math.cos(angle) * (playerRadius * 0.35);
            const startY = player.y + Math.sin(perpAngle) * sideOffset + Math.sin(angle) * (playerRadius * 0.35);

            // Handle & Pommel (Gold / Obsidian)
            const handleLen = 13 * scale;
            const hiltX = startX + Math.cos(angle) * handleLen;
            const hiltY = startY + Math.sin(angle) * handleLen;

            // Handle wrap
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 3.5 * scale;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(hiltX, hiltY);
            ctx.stroke();

            // Pommel jewel
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(startX, startY, 2.5 * scale, 0, Math.PI * 2);
            ctx.fill();

            // Cruciform Crossguard (The iconic Yoru Cross)
            const guardSpan = 18 * scale;
            const guardPerpX = Math.cos(perpAngle) * guardSpan;
            const guardPerpY = Math.sin(perpAngle) * guardSpan;

            // Crossguard bar
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3.8 * scale;
            ctx.beginPath();
            ctx.moveTo(hiltX - guardPerpX * 0.5, hiltY - guardPerpY * 0.5);
            ctx.lineTo(hiltX + guardPerpX * 0.5, hiltY + guardPerpY * 0.5);
            ctx.stroke();

            // Crossguard end quillons (curved tips)
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(hiltX - guardPerpX * 0.5, hiltY - guardPerpY * 0.5, 2.2 * scale, 0, Math.PI * 2);
            ctx.arc(hiltX + guardPerpX * 0.5, hiltY + guardPerpY * 0.5, 2.2 * scale, 0, Math.PI * 2);
            ctx.fill();

            // Center Guard Emerald
            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.arc(hiltX, hiltY, 3 * scale, 0, Math.PI * 2);
            ctx.fill();

            // Blade tip
            const tipX = hiltX + Math.cos(angle) * length;
            const tipY = hiltY + Math.sin(angle) * length;

            // Authentic slight curve control point
            const curveOffset = 4.5 * scale;
            const midX = (hiltX + tipX) / 2 + Math.cos(perpAngle) * curveOffset;
            const midY = (hiltY + tipY) / 2 + Math.sin(perpAngle) * curveOffset;

            // Emerald flame back-glow
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 12;
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 6 * scale;
            ctx.beginPath();
            ctx.moveTo(hiltX, hiltY);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.stroke();

            // Kokuto Pitch-Black Blade Core
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 3.8 * scale;
            ctx.beginPath();
            ctx.moveTo(hiltX, hiltY);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.stroke();

            // Radiant Emerald Sharp Edge
            ctx.strokeStyle = isCenter ? '#6ee7b7' : '#34d399';
            ctx.lineWidth = 1.8 * scale;
            ctx.beginPath();
            ctx.moveTo(hiltX, hiltY);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.stroke();

            // Blade tip flare
            ctx.fillStyle = '#a7f3d0';
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2 * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          });
        } else if (activeSword.id === 'sword_mihawk_dagger') {
          // =========================================================
          // ADAGA DO MIHAWK (CRUZ KOGATANA - BARATIE vs ZORO)
          // =========================================================
          ctx.save();
          const angle = player.facingAngle + swingAnim * 0.7;
          const daggerOriginX = player.x + Math.cos(player.facingAngle) * (playerRadius + 5);
          const daggerOriginY = player.y + Math.sin(player.facingAngle) * (playerRadius + 5);
          ctx.translate(daggerOriginX, daggerOriginY);
          ctx.rotate(angle);

          // Hand gripping the golden cross
          ctx.fillStyle = haki.busoHakiActive ? '#18181b' : char?.skinColor || '#fcd34d';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(-1, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Golden Cross Aura
          ctx.shadowColor = haki.busoHakiActive ? activeHakiColor.primaryColor : '#facc15';
          ctx.shadowBlur = 16;

          // 1. Golden Necklace Ring at Pommel (-9, 0)
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(-9.5, 0, 3.2, 0, Math.PI * 2);
          ctx.stroke();

          // 2. Vertical Golden Cross Handle (-6 to +8)
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-6, -2.6, 14.5, 5.2);
          ctx.strokeRect(-6, -2.6, 14.5, 5.2);

          // 3. Wide Horizontal Golden Crossbar (The Iconic Cross Shape ✝)
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(4, -15);
          ctx.lineTo(9.5, -16.5);
          ctx.lineTo(9.5, 16.5);
          ctx.lineTo(4, 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Flared Golden Crossbar Tips
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(6.8, -15.5, 2.4, 0, Math.PI * 2);
          ctx.arc(6.8, 15.5, 2.4, 0, Math.PI * 2);
          ctx.fill();

          // Center Emerald & Ruby Jewels on the Cross
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(6.8, 0, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e11d48';
          ctx.beginPath();
          ctx.arc(6.8, -7.5, 1.5, 0, Math.PI * 2);
          ctx.arc(6.8, 7.5, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // 4. Gleaming Kogatana Cross Dagger Blade (+9.5 to +33)
          ctx.fillStyle = haki.busoHakiActive ? '#09090b' : '#f8fafc';
          ctx.strokeStyle = haki.busoHakiActive ? activeHakiColor.secondaryColor : '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(9.5, -3.4);
          ctx.lineTo(25, -2.3);
          ctx.lineTo(33, 0); // Needle-sharp tip that pierced Zoro
          ctx.lineTo(25, 2.3);
          ctx.lineTo(9.5, 3.4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Center Golden Fuller Ridge on Dagger Blade
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(9.5, 0);
          ctx.lineTo(28, 0);
          ctx.stroke();

          ctx.restore();
        } else if (activeSword.id === 'sword_yoru') {
          // =========================================================
          // LÂMINA NEGRA SUPREMA (KOKUTO YORU - SINGLE SUPREME BLADE)
          // =========================================================
          ctx.save();
          const rightSideAngle = player.facingAngle + Math.PI / 2;
          const yoruX = player.x + Math.cos(rightSideAngle) * (playerRadius * 0.65) + Math.cos(player.facingAngle) * 6;
          const yoruY = player.y + Math.sin(rightSideAngle) * (playerRadius * 0.65) + Math.sin(player.facingAngle) * 6;
          ctx.translate(yoruX, yoruY);
          ctx.rotate(player.facingAngle + swingAnim - 0.15);

          // Hand holding Yoru
          ctx.fillStyle = haki.busoHakiActive ? '#18181b' : char?.skinColor || '#fcd34d';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Long Bandage-Wrapped Hilt & Golden Pommel
          ctx.fillStyle = '#312e81';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-16, -2.8, 24, 5.6);
          ctx.strokeRect(-16, -2.8, 24, 5.6);

          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(-18, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Ornate Golden Cruciform Crossguard (The Giant Yoru Cross)
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(6, -20);
          ctx.lineTo(12, -22);
          ctx.lineTo(12, 22);
          ctx.lineTo(6, 20);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Jewels embedded in the Golden Crossguard
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(9, 0, 3, 0, Math.PI * 2);
          ctx.arc(9, -12, 2, 0, Math.PI * 2);
          ctx.arc(9, 12, 2, 0, Math.PI * 2);
          ctx.fill();

          // Colossal Curved Black Blade (Kokuto Yoru)
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#09090b';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(12, -4.5);
          ctx.quadraticCurveTo(40, -7, 62, -6.5);
          ctx.quadraticCurveTo(72, -2, 76, 3.5); // Curved heavy chopper tip
          ctx.quadraticCurveTo(50, 5.5, 12, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Radiant Emerald-White Cutting Edge
          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(13, 3.8);
          ctx.quadraticCurveTo(50, 4.8, 75, 3);
          ctx.stroke();

          ctx.restore();
        } else if (activeSword.id === 'sword_midnight') {
          // =========================================================
          // LÂMINA DA MEIA-NOITE (CURSED ECTOPLASM & SHADOW BLADE)
          // =========================================================
          ctx.save();
          ctx.translate(handX, handY);
          ctx.rotate(player.facingAngle + swingAnim - 0.1);

          // Hand
          ctx.fillStyle = haki.busoHakiActive ? '#18181b' : char?.skinColor || '#fcd34d';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Dark Violet Wrapped Hilt & Skull Pommel
          ctx.fillStyle = '#2e1065';
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.4;
          ctx.fillRect(-12, -2.5, 16, 5);
          ctx.strokeRect(-12, -2.5, 16, 5);

          ctx.fillStyle = '#e879f9';
          ctx.beginPath();
          ctx.arc(-13.5, 0, 3, 0, Math.PI * 2);
          ctx.fill();

          // Bat-Wing / Crescent Shadow Guard
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(4, -14);
          ctx.lineTo(10, -7);
          ctx.lineTo(8, 0);
          ctx.lineTo(10, 7);
          ctx.lineTo(4, 14);
          ctx.lineTo(2, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing Soul Core in Guard
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(6, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Cursed Jagged Ectoplasm Blade
          const midGrad = ctx.createLinearGradient(8, 0, 56, 0);
          midGrad.addColorStop(0, '#09090b');
          midGrad.addColorStop(0.6, '#4c1d95');
          midGrad.addColorStop(1, '#e879f9');
          ctx.fillStyle = midGrad;
          ctx.strokeStyle = '#d8b4fe';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(8, -3.2);
          ctx.lineTo(24, -5.5);
          ctx.lineTo(28, -3);
          ctx.lineTo(44, -5);
          ctx.lineTo(58, 0); // Sharp cursed tip
          ctx.lineTo(42, 4.2);
          ctx.lineTo(8, 3.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Ectoplasm Violet Energy Vein along the center
          ctx.strokeStyle = '#f0abfc';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(52, 0);
          ctx.stroke();

          ctx.restore();
        } else if (activeSword.id === 'sword_saber') {
          // =========================================================
          // SABRE LENDÁRIO (SHANKS' GRYPHON ROYAL PIRATE SABER)
          // =========================================================
          ctx.save();
          ctx.translate(handX, handY);
          ctx.rotate(player.facingAngle + swingAnim - 0.1);

          // Hand
          ctx.fillStyle = haki.busoHakiActive ? '#18181b' : char?.skinColor || '#fcd34d';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Crimson Royal Grip
          ctx.fillStyle = '#991b1b';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.4;
          ctx.fillRect(-11, -2.5, 15, 5);
          ctx.strokeRect(-11, -2.5, 15, 5);

          // Golden Knuckle-Bow (D-Guard Basket Hilt)
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(4, -10);
          ctx.lineTo(4, 9);
          ctx.quadraticCurveTo(-5, 12, -11, 2.5);
          ctx.stroke();

          // Ruby Gem in Guard
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(4.5, 0, 2.4, 0, Math.PI * 2);
          ctx.fill();

          // Sweeping Curved Saber Blade
          const saberGrad = ctx.createLinearGradient(5, 0, 52, 0);
          if (haki.busoHakiActive) {
            saberGrad.addColorStop(0, '#09090b');
            saberGrad.addColorStop(0.7, '#27272a');
            saberGrad.addColorStop(1, activeHakiColor.primaryColor);
          } else {
            saberGrad.addColorStop(0, '#fde047');
            saberGrad.addColorStop(0.35, '#f8fafc');
            saberGrad.addColorStop(1, '#ffffff');
          }
          ctx.fillStyle = saberGrad;
          ctx.strokeStyle = haki.busoHakiActive ? activeHakiColor.secondaryColor : '#f59e0b';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(5.5, -3);
          ctx.quadraticCurveTo(28, -6.5, 50, -3.5);
          ctx.lineTo(55, 2); // Swept saber point
          ctx.quadraticCurveTo(30, 3.8, 5.5, 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Golden Spine Fuller
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(7, -1.2);
          ctx.quadraticCurveTo(28, -3.8, 47, -1.2);
          ctx.stroke();

          ctx.restore();
        } else if (activeSword.id === 'sword_dual_katana') {
          // =========================================================
          // KATANA DUPLA (NITORYU - TWIN KATANAS IN BOTH HANDS)
          // =========================================================
          const perp = player.facingAngle + Math.PI / 2;
          const rightHandX =
            player.x + Math.cos(perp) * (playerRadius * 0.75) + Math.cos(player.facingAngle) * 8;
          const rightHandY =
            player.y + Math.sin(perp) * (playerRadius * 0.75) + Math.sin(player.facingAngle) * 8;
          const leftHandX =
            player.x - Math.cos(perp) * (playerRadius * 0.75) + Math.cos(player.facingAngle) * 8;
          const leftHandY =
            player.y - Math.sin(perp) * (playerRadius * 0.75) + Math.sin(player.facingAngle) * 8;

          // Right Katana (Crimson-wrapped grip)
          drawDetailedKatana(
            rightHandX,
            rightHandY,
            player.facingAngle + swingAnim - 0.18,
            '#ef4444',
            '#facc15',
            38
          );
          // Left Katana (Cyan/Navy-wrapped grip)
          drawDetailedKatana(
            leftHandX,
            leftHandY,
            player.facingAngle - swingAnim + 0.18,
            '#38bdf8',
            '#facc15',
            38
          );
        } else {
          // =========================================================
          // KATANA BÁSICA (OR CUSTOM SWORD) - DETAILED JAPANESE KATANA
          // =========================================================
          drawDetailedKatana(
            handX,
            handY,
            player.facingAngle + swingAnim - 0.1,
            activeSword.color || '#38bdf8',
            '#facc15',
            38
          );
        }
      } else {
        const fistHakiColor =
          activeHakiColor.specialEffect === 'rainbow'
            ? `hsl(${(Date.now() * 0.2) % 360}, 95%, 60%)`
            : activeHakiColor.primaryColor;
        if (haki.busoHakiActive) {
          ctx.shadowColor = fistHakiColor;
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = isGear5 ? '#ffffff' : isLeviathan ? '#22d3ee' : haki.busoHakiActive ? fistHakiColor : '#f97316';
        ctx.beginPath();
        ctx.arc(handX, handY, isGear5 ? 10 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Player Name / Gear 5 Divine Title
      const factionIcon = char?.faction === 'Marines' ? '⚓' : char?.faction === 'Revolutionaries' ? '⚔️' : '🏴‍☠️';
      const displayName = char?.name || 'Pirata';
      if (isGear5) {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'black 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.fillText(`☀️ [GEAR 5: NIKA] Lv.${stats.level} ${displayName} (INVENCÍVEL)`, player.x, player.y - playerRadius - 14);
      } else if (activeWeaponType === 'sword' && activeSword?.id === 'sword_triple_dark_blade') {
        ctx.fillStyle = '#34d399';
        ctx.font = 'black 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#059669';
        ctx.shadowBlur = 8;
        ctx.fillText(`👑 [ADM: TRIPLE DARK BLADE] Lv.${stats.level} ${displayName} ${factionIcon}`, player.x, player.y - playerRadius - 13);
      } else if (activeWeaponType === 'sword' && activeSword?.id === 'sword_mihawk_dagger') {
        ctx.fillStyle = '#fde047';
        ctx.font = 'black 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#b45309';
        ctx.shadowBlur = 8;
        ctx.fillText(`✝️ [ADAGA DO MIHAWK 0.5%] Lv.${stats.level} ${displayName} ${factionIcon}`, player.x, player.y - playerRadius - 13);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(`Lv.${stats.level} ${displayName} ${factionIcon}`, player.x, player.y - playerRadius - 12);
      }

      ctx.restore();

      // 6. Draw Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Draw Damage Floaters
      damageFloatersRef.current.forEach((f) => {
        ctx.save();
        ctx.globalAlpha = f.opacity;
        ctx.fillStyle = f.color;
        ctx.font = f.isCrit ? 'bold 16px sans-serif' : 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 5;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });

      ctx.restore(); // Restore world translation

      // =========================================================
      // 8. SCREEN-SPACE HUD OVERLAYS (Minimap & Interaction)
      // =========================================================
      // Proximity Prompt for Quest NPC
      if (distToNpc < 90) {
        ctx.save();
        const promptX = canvas.width / 2;
        const promptY = canvas.height - 70;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(promptX - 160, promptY - 18, 320, 36);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(promptX - 160, promptY - 18, 320, 36);

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💬 [E] ou Clique no Oficial para Missões', promptX, promptY + 5);
        ctx.restore();
      }

      // Mini-map Radar (Bottom-Right corner)
      ctx.save();
      const mmWidth = 140;
      const mmHeight = 100;
      const mmX = canvas.width - mmWidth - 12;
      const mmY = canvas.height - mmHeight - 12;

      // Minimap background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(mmX, mmY, mmWidth, mmHeight);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(mmX, mmY, mmWidth, mmHeight);

      // Scale factors
      const sx = mmWidth / WORLD_WIDTH;
      const sy = mmHeight / WORLD_HEIGHT;

      // Draw Quest NPC on minimap
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(mmX + npc.x * sx, mmY + npc.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw Closed Treasure Chests on minimap
      chestsRef.current.forEach((c) => {
        if (c.status !== 'closed') return;
        ctx.fillStyle =
          c.tier === 'diamond'
            ? '#38bdf8'
            : c.tier === 'gold'
            ? '#fde047'
            : c.tier === 'silver'
            ? '#e2e8f0'
            : '#d97706';
        const cx = mmX + c.x * sx;
        const cy = mmY + c.y * sy;
        ctx.fillRect(cx - 2.2, cy - 2.2, 4.4, 4.4);
      });

      // Draw Enemies on minimap
      enemiesRef.current.forEach((e) => {
        if (e.hp <= 0) return;
        if (e.isInvasionBoss) {
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(mmX + e.x * sx, mmY + e.y * sy, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = e.isBoss ? '#c084fc' : '#ef4444';
          ctx.beginPath();
          ctx.arc(mmX + e.x * sx, mmY + e.y * sy, e.isBoss ? 4 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Remote Players on minimap (green dots)
      const mmRemote = otherPlayersRef?.current || [];
      mmRemote.forEach((op) => {
        if (!op || op.id === myPlayerId) return;
        if (op.islandId && op.islandId !== currentIsland.id) return;
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(mmX + op.x * sx, mmY + op.y * sy, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Player on minimap
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mmX + player.x * sx, mmY + player.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    activeFruit,
    activeQuest,
    activeSword,
    activeWeaponType,
    autoFarm,
    castSkill,
    currentIsland,
    haki.busoHakiActive,
    haki.kenHakiActive,
    haki.activeHakiColorId,
    activeHakiColor,
    onPlayerDamage,
    openTreasureChest,
    performBasicAttack,
    playerEnergy,
    stats.level,
  ]);

  // Handle canvas click with camera world space translation
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert screen click into world click
    const worldX = clickX + cameraRef.current.x;
    const worldY = clickY + cameraRef.current.y;

    // Check click on closed Treasure Chest (if player is reasonably close or clicks it)
    const clickedChest = chestsRef.current.find(
      (c) =>
        c.status === 'closed' &&
        Math.hypot(worldX - c.x, worldY - c.y) < 55 &&
        Math.hypot(playerRef.current.x - c.x, playerRef.current.y - c.y) < 130
    );
    if (clickedChest) {
      openTreasureChest(clickedChest.id);
      return;
    }

    // Check click on Quest NPC
    const npc = questNpcRef.current;
    const distToNpc = Math.hypot(worldX - npc.x, worldY - npc.y);
    if (distToNpc < 55) {
      sound.questComplete();
      onOpenQuestModal();
      return;
    }

    // Check click on Fragment Dealer NPC
    const fragNpc = fragmentNpcRef.current;
    const distToFragNpc = Math.hypot(worldX - fragNpc.x, worldY - fragNpc.y);
    if (distToFragNpc < 55) {
      sound.questComplete();
      onOpenFragmentShop();
      return;
    }

    // Check click on Wandering Haki Colors Master NPC
    if (hakiNpcSpawnedOnThisIsland) {
      const hNpc = hakiNpcRef.current;
      const distToHakiNpc = Math.hypot(worldX - hNpc.x, worldY - hNpc.y);
      if (distToHakiNpc < 65) {
        sound.questComplete();
        onOpenHakiNpc?.();
        return;
      }
    }

    // Check click on Altar do Cálice Sagrado at (950, 950)
    if (Math.hypot(worldX - 950, worldY - 950) < 80) {
      onAttemptObtainChalice?.();
      return;
    }

    // Check click on Chalice Ritual Altar Buttons
    if (chaliceRitualActive && chaliceButtons) {
      const clickedBtn = chaliceButtons.find(
        (b) => !b.activated && Math.hypot(worldX - b.x, worldY - b.y) < 70
      );
      if (clickedBtn && onActivateChaliceButton) {
        onActivateChaliceButton(clickedBtn.id);
        return;
      }
    }

    // Check click on other players for Fruit Trade!
    const remotePlayers = otherPlayersRef?.current || [];
    if (remotePlayers.length > 0) {
      for (const op of remotePlayers) {
        if (!op || op.id === myPlayerId) continue;
        if (op.islandId && op.islandId !== currentIsland.id) continue;
        const lerpData = otherPlayersLerpRef.current.get(op.id);
        const px = lerpData ? lerpData.x : op.x;
        const py = lerpData ? lerpData.y : op.y;
        if (Math.hypot(worldX - px, worldY - py) < 50) {
          sound.click();
          if (onInitiateTrade) {
            onInitiateTrade(op.id, op.name);
          }
          return;
        }
      }
    }

    // Aim attack in click direction
    playerRef.current.facingAngle = Math.atan2(
      worldY - playerRef.current.y,
      worldX - playerRef.current.x
    );

    performBasicAttack();
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const clickX = touch.clientX - rect.left;
    const clickY = touch.clientY - rect.top;

    const worldX = clickX + cameraRef.current.x;
    const worldY = clickY + cameraRef.current.y;

    const touchedChest = chestsRef.current.find(
      (c) =>
        c.status === 'closed' &&
        Math.hypot(worldX - c.x, worldY - c.y) < 65 &&
        Math.hypot(playerRef.current.x - c.x, playerRef.current.y - c.y) < 140
    );
    if (touchedChest) {
      openTreasureChest(touchedChest.id);
      return;
    }

    const npc = questNpcRef.current;
    if (Math.hypot(worldX - npc.x, worldY - npc.y) < 70) {
      sound.questComplete();
      onOpenQuestModal();
      return;
    }

    const fragNpc = fragmentNpcRef.current;
    if (Math.hypot(worldX - fragNpc.x, worldY - fragNpc.y) < 70) {
      sound.questComplete();
      onOpenFragmentShop();
      return;
    }

    if (hakiNpcSpawnedOnThisIsland) {
      const hNpc = hakiNpcRef.current;
      if (Math.hypot(worldX - hNpc.x, worldY - hNpc.y) < 75) {
        sound.questComplete();
        onOpenHakiNpc?.();
        return;
      }
    }

    if (Math.hypot(worldX - 950, worldY - 950) < 80) {
      onAttemptObtainChalice?.();
      return;
    }

    if (chaliceRitualActive && chaliceButtons) {
      const clickedBtn = chaliceButtons.find(
        (b) => !b.activated && Math.hypot(worldX - b.x, worldY - b.y) < 70
      );
      if (clickedBtn && onActivateChaliceButton) {
        onActivateChaliceButton(clickedBtn.id);
        return;
      }
    }

    // Check touch on other players for Fruit Trade (Mobile)
    const remotePlayers = otherPlayersRef?.current || [];
    if (remotePlayers.length > 0) {
      for (const op of remotePlayers) {
        if (!op || op.id === myPlayerId) continue;
        if (op.islandId && op.islandId !== currentIsland.id) continue;
        const lerpData = otherPlayersLerpRef.current.get(op.id);
        const px = lerpData ? lerpData.x : op.x;
        const py = lerpData ? lerpData.y : op.y;
        if (Math.hypot(worldX - px, worldY - py) < 55) {
          sound.click();
          if (onInitiateTrade) {
            onInitiateTrade(op.id, op.name);
          }
          return;
        }
      }
    }

    playerRef.current.facingAngle = Math.atan2(
      worldY - playerRef.current.y,
      worldX - playerRef.current.x
    );
    performBasicAttack();
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 rounded-xl select-none">
      {/* Mobile On-Screen Virtual D-Pad (Strictly Mobile Only) */}
      {isMobile && (
        <div className="absolute bottom-3 left-3 z-40 w-32 h-32 rounded-full bg-slate-950/65 backdrop-blur-md border border-slate-700/70 p-1.5 grid grid-cols-3 grid-rows-3 gap-1 select-none touch-none pointer-events-auto shadow-[0_0_25px_rgba(0,0,0,0.65)]">
          {/* Top-Left Diagonal */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['w'] = true; keysPressed.current['a'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['w'] = false; keysPressed.current['a'] = false; }}
            onTouchCancel={() => { keysPressed.current['w'] = false; keysPressed.current['a'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); }}
            className="rounded-tl-full bg-slate-900/50 active:bg-amber-500/40 text-slate-500 text-[10px] flex items-center justify-center"
          >
            ↖
          </button>
          {/* Up */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['w'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['w'] = false; }}
            onTouchCancel={() => { keysPressed.current['w'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); keysPressed.current['w'] = true; }}
            onMouseUp={() => { keysPressed.current['w'] = false; }}
            className="bg-slate-800/90 border border-slate-600/80 rounded-xl text-amber-400 font-black text-sm flex items-center justify-center active:bg-amber-500 active:text-slate-950 active:scale-95 transition-transform shadow-md"
          >
            ▲
          </button>
          {/* Top-Right Diagonal */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['w'] = true; keysPressed.current['d'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['w'] = false; keysPressed.current['d'] = false; }}
            onTouchCancel={() => { keysPressed.current['w'] = false; keysPressed.current['d'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); }}
            className="rounded-tr-full bg-slate-900/50 active:bg-amber-500/40 text-slate-500 text-[10px] flex items-center justify-center"
          >
            ↗
          </button>

          {/* Left */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['a'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['a'] = false; }}
            onTouchCancel={() => { keysPressed.current['a'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); keysPressed.current['a'] = true; }}
            onMouseUp={() => { keysPressed.current['a'] = false; }}
            className="bg-slate-800/90 border border-slate-600/80 rounded-xl text-amber-400 font-black text-sm flex items-center justify-center active:bg-amber-500 active:text-slate-950 active:scale-95 transition-transform shadow-md"
          >
            ◄
          </button>
          {/* Center Anchor Button (Tap 10x nonstop without mis-clicking to open Admin Terminal) */}
          <button
            type="button"
            data-dpad-center="true"
            onPointerDown={handleCenterPadTap}
            className={`rounded-full bg-slate-900/95 border flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
              centerPadTapCount > 0
                ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                : 'border-amber-500/30'
            }`}
          >
            {centerPadTapCount > 0 ? (
              <span className="text-[10px] font-mono font-black text-amber-300 tabular-nums">
                {centerPadTapCount}
              </span>
            ) : (
              <div className="w-3 h-3 rounded-full bg-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.8)] pointer-events-none" />
            )}
          </button>
          {/* Right */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['d'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['d'] = false; }}
            onTouchCancel={() => { keysPressed.current['d'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); keysPressed.current['d'] = true; }}
            onMouseUp={() => { keysPressed.current['d'] = false; }}
            className="bg-slate-800/90 border border-slate-600/80 rounded-xl text-amber-400 font-black text-sm flex items-center justify-center active:bg-amber-500 active:text-slate-950 active:scale-95 transition-transform shadow-md"
          >
            ►
          </button>

          {/* Bottom-Left Diagonal */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['s'] = true; keysPressed.current['a'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['s'] = false; keysPressed.current['a'] = false; }}
            onTouchCancel={() => { keysPressed.current['s'] = false; keysPressed.current['a'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); }}
            className="rounded-bl-full bg-slate-900/50 active:bg-amber-500/40 text-slate-500 text-[10px] flex items-center justify-center"
          >
            ↙
          </button>
          {/* Down */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['s'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['s'] = false; }}
            onTouchCancel={() => { keysPressed.current['s'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); keysPressed.current['s'] = true; }}
            onMouseUp={() => { keysPressed.current['s'] = false; }}
            className="bg-slate-800/90 border border-slate-600/80 rounded-xl text-amber-400 font-black text-sm flex items-center justify-center active:bg-amber-500 active:text-slate-950 active:scale-95 transition-transform shadow-md"
          >
            ▼
          </button>
          {/* Bottom-Right Diagonal */}
          <button
            onTouchStart={(e) => { e.preventDefault(); resetCenterPadSequence(); keysPressed.current['s'] = true; keysPressed.current['d'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['s'] = false; keysPressed.current['d'] = false; }}
            onTouchCancel={() => { keysPressed.current['s'] = false; keysPressed.current['d'] = false; }}
            onMouseDown={() => { resetCenterPadSequence(); }}
            className="rounded-br-full bg-slate-900/50 active:bg-amber-500/40 text-slate-500 text-[10px] flex items-center justify-center"
          >
            ↘
          </button>
        </div>
      )}

      {/* Mobile Secret Command Terminal Modal */}
      {showMobileAdminTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-950 border-2 border-emerald-500/70 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.25)] overflow-hidden text-white font-mono">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold text-xs">⌨️ TERMINAL DE COMANDO</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  setShowMobileAdminTerminal(false);
                }}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Terminal Output Log */}
            <div className="p-4 space-y-1.5 bg-black/70 text-xs max-h-44 overflow-y-auto border-b border-slate-800/80">
              {terminalLogs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.startsWith('✓')
                      ? 'text-emerald-400 font-bold'
                      : log.startsWith('✕')
                      ? 'text-rose-400 font-bold'
                      : log.startsWith('>')
                      ? 'text-amber-300'
                      : 'text-slate-400'
                  }
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Command Input Form */}
            <form onSubmit={handleTerminalSubmit} className="p-3 bg-slate-950 flex items-center gap-2">
              <span className="text-emerald-400 font-black text-sm select-none">$</span>
              <input
                type="text"
                value={terminalCommand}
                onChange={(e) => setTerminalCommand(e.target.value)}
                placeholder="Digite o comando..."
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-emerald-200 placeholder-slate-600 outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs active:scale-95 transition-transform"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      <motion.div
        key={screenShakeKey}
        animate={
          hitEffectActive
            ? {
                x: [0, -6, 6, -4, 4, -2, 2, 0],
                y: [0, 4, -4, 3, -3, -1, 1, 0],
                scale: 1,
                rotate: 0,
              }
            : activeSkillAnim?.key === 'Z'
            ? {
                x: [0, 5, -3, 0],
                scale: [1, 1.012, 1],
                rotate: 0,
              }
            : activeSkillAnim?.key === 'X'
            ? {
                scale: [1, 1.028, 0.992, 1],
                y: [0, -4, 3, 0],
                rotate: 0,
              }
            : activeSkillAnim?.key === 'C'
            ? {
                scale: [1, 0.98, 1.03, 1],
                rotate: [0, -1.2, 1.2, 0],
              }
            : activeSkillAnim?.key === 'V'
            ? {
                scale: [1, 1.045, 0.985, 1.02, 1],
                x: [0, -8, 8, -5, 5, 0],
                y: [0, 5, -5, 3, -3, 0],
                rotate: [0, -1.5, 1.5, 0],
              }
            : { x: 0, y: 0, scale: 1, rotate: 0 }
        }
        transition={{ duration: activeSkillAnim?.key === 'V' ? 0.55 : 0.28, ease: 'easeOut' }}
        className="relative w-full h-full flex items-center justify-center max-w-full"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={560}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasTouch}
          className="w-full max-w-[800px] max-h-full aspect-[800/560] object-contain cursor-crosshair rounded-xl border border-slate-800 shadow-2xl"
        />

        {/* Differentiated Fruit / Weapon Skill Visual Animations (Z, X, C, V) */}
        <AnimatePresence mode="popLayout">
          {activeSkillAnim && (
            <motion.div
              key={activeSkillAnim.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-30 flex items-center justify-center"
            >
              {/* Z SKILL: Rapid Directional Beam / Kinetic Slash Sweep */}
              {activeSkillAnim.key === 'Z' && (
                <>
                  {/* Directional Energy Slash / Beam */}
                  <motion.div
                    initial={{ opacity: 0.95, scaleX: 0.15, scaleY: 1.4, x: -120 }}
                    animate={{ opacity: [0.95, 0.85, 0], scaleX: [0.15, 1.5, 2.1], scaleY: [1.4, 0.7, 0.2], x: [-120, 40, 180] }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    style={{
                      rotate: `${activeSkillAnim.facingDeg}deg`,
                      background: `linear-gradient(90deg, transparent, ${activeSkillAnim.color}88, #ffffff, ${activeSkillAnim.color})`,
                      boxShadow: `0 0 35px ${activeSkillAnim.color}, 0 0 70px ${activeSkillAnim.color}`,
                    }}
                    className="w-72 h-5 rounded-full"
                  />
                  {/* Secondary Cross Slash */}
                  <motion.div
                    initial={{ opacity: 0.85, scale: 0.3, skewX: -25 }}
                    animate={{ opacity: 0, scale: 1.55, skewX: -25 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    style={{
                      borderColor: activeSkillAnim.color,
                      boxShadow: `0 0 25px ${activeSkillAnim.color}`,
                    }}
                    className="absolute w-36 h-36 rounded-full border-4 border-dashed"
                  />
                </>
              )}

              {/* X SKILL: Concentric Expanding AoE Shockwave Rings */}
              {activeSkillAnim.key === 'X' && (
                <>
                  {/* Primary Expanding Shockwave Ring */}
                  <motion.div
                    initial={{ opacity: 0.95, scale: 0.2 }}
                    animate={{ opacity: [0.95, 0.7, 0], scale: [0.2, 1.45, 2.35] }}
                    transition={{ duration: 0.68, ease: 'easeOut' }}
                    style={{
                      borderColor: activeSkillAnim.color,
                      boxShadow: `0 0 40px ${activeSkillAnim.color}, inset 0 0 35px ${activeSkillAnim.color}`,
                    }}
                    className="w-48 h-48 rounded-full border-4"
                  />
                  {/* Secondary Rotating Diamond Burst */}
                  <motion.div
                    initial={{ opacity: 0.85, scale: 0.3, rotate: 0 }}
                    animate={{ opacity: 0, scale: 1.75, rotate: 90 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    style={{
                      borderColor: '#ffffff',
                      boxShadow: `0 0 30px ${activeSkillAnim.color}`,
                    }}
                    className="absolute w-40 h-40 rounded-2xl border-2"
                  />
                  {/* Core Radial Flash */}
                  <motion.div
                    initial={{ opacity: 0.75, scale: 0.4 }}
                    animate={{ opacity: 0, scale: 1.9 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      background: `radial-gradient(circle, #ffffff 0%, ${activeSkillAnim.color}88 45%, transparent 72%)`,
                    }}
                    className="absolute w-56 h-56 rounded-full"
                  />
                </>
              )}

              {/* C SKILL: Spinning Vortex / Dash Combo Spiral */}
              {activeSkillAnim.key === 'C' && (
                <>
                  {/* High-Speed Spinning Dashed Vortex */}
                  <motion.div
                    initial={{ opacity: 0.95, scale: 0.35, rotate: 0 }}
                    animate={{ opacity: [0.95, 0.85, 0], scale: [0.35, 1.35, 1.85], rotate: 240 }}
                    transition={{ duration: 0.78, ease: 'easeOut' }}
                    style={{
                      borderColor: activeSkillAnim.color,
                      boxShadow: `0 0 45px ${activeSkillAnim.color}, inset 0 0 30px ${activeSkillAnim.color}`,
                    }}
                    className="w-56 h-56 rounded-full border-[6px] border-dashed"
                  />
                  {/* Counter-Rotating Conic Spiral */}
                  <motion.div
                    initial={{ opacity: 0.8, scale: 0.4, rotate: 180 }}
                    animate={{ opacity: 0, scale: 1.65, rotate: -60 }}
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                    style={{
                      background: `conic-gradient(from 0deg, transparent, ${activeSkillAnim.color}99, #ffffffaa, transparent, ${activeSkillAnim.color}99, transparent)`,
                    }}
                    className="absolute w-64 h-64 rounded-full mix-blend-screen"
                  />
                  {/* Kinetic Speed Border Flash */}
                  <motion.div
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.55 }}
                    style={{
                      boxShadow: `inset 0 0 70px ${activeSkillAnim.color}99`,
                    }}
                    className="absolute inset-0 rounded-xl"
                  />
                </>
              )}

              {/* V SKILL: Ultimate Awakening / Cataclysmic Pillar & Sacred Rings */}
              {activeSkillAnim.key === 'V' && (
                <>
                  {/* Full-Screen Awakening Vignette Pulse */}
                  <motion.div
                    initial={{ opacity: 0.95, scale: 0.96 }}
                    animate={{ opacity: [0.95, 0.75, 0], scale: [0.96, 1.02, 1.05] }}
                    transition={{ duration: 1.05, ease: 'easeOut' }}
                    style={{
                      borderColor: activeSkillAnim.color,
                      boxShadow: `inset 0 0 130px ${activeSkillAnim.color}, 0 0 60px ${activeSkillAnim.color}`,
                      backgroundColor: `${activeSkillAnim.color}22`,
                    }}
                    className="absolute inset-0 border-8 rounded-xl"
                  />
                  {/* Vertical Heaven-to-Earth Energy Pillar */}
                  <motion.div
                    initial={{ opacity: 0.95, scaleX: 0.1 }}
                    animate={{ opacity: [0.95, 0.85, 0], scaleX: [0.1, 1.5, 0.05] }}
                    transition={{ duration: 0.95, ease: 'easeOut' }}
                    style={{
                      background: `linear-gradient(90deg, transparent, ${activeSkillAnim.color}, #ffffff, ${activeSkillAnim.color}, transparent)`,
                      boxShadow: `0 0 80px ${activeSkillAnim.color}`,
                    }}
                    className="absolute inset-y-0 w-44"
                  />
                  {/* Outer Rotating Sacred Awakening Ring */}
                  <motion.div
                    initial={{ opacity: 0.95, scale: 0.25, rotate: 0 }}
                    animate={{ opacity: [0.95, 0.85, 0], scale: [0.25, 1.65, 2.5], rotate: 180 }}
                    transition={{ duration: 1.0, ease: 'easeOut' }}
                    style={{
                      borderColor: activeSkillAnim.color,
                      boxShadow: `0 0 60px ${activeSkillAnim.color}, inset 0 0 40px #ffffff`,
                    }}
                    className="absolute w-64 h-64 rounded-full border-4 border-double"
                  />
                  {/* Inner Counter-Rotating Star Square */}
                  <motion.div
                    initial={{ opacity: 0.9, scale: 0.3, rotate: 45 }}
                    animate={{ opacity: 0, scale: 2.0, rotate: -135 }}
                    transition={{ duration: 0.95, ease: 'easeOut' }}
                    style={{
                      borderColor: '#ffffff',
                      boxShadow: `0 0 45px ${activeSkillAnim.color}`,
                    }}
                    className="absolute w-52 h-52 rounded-3xl border-2"
                  />
                </>
              )}

              {/* Skill Callout HUD Banner (Differentiated styling per Z, X, C, V) */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.75 }}
                animate={{ opacity: [0, 1, 1, 0], y: [24, 0, -4, -16], scale: [0.75, 1.05, 1, 0.92] }}
                transition={{ duration: activeSkillAnim.key === 'V' ? 1.05 : 0.72, ease: 'easeOut' }}
                style={{
                  borderColor: activeSkillAnim.color,
                  boxShadow: `0 0 28px ${activeSkillAnim.color}88`,
                }}
                className={`absolute ${
                  activeSkillAnim.key === 'V' ? 'bottom-20 sm:bottom-24 px-5 py-2' : 'bottom-14 sm:bottom-16 px-3.5 py-1.5'
                } bg-slate-950/90 backdrop-blur-md border-2 rounded-2xl flex items-center gap-2.5`}
              >
                <span
                  style={{
                    backgroundColor: activeSkillAnim.color,
                    boxShadow: `0 0 12px ${activeSkillAnim.color}`,
                  }}
                  className="w-6 h-6 rounded-lg text-slate-950 font-black font-mono text-xs flex items-center justify-center shrink-0"
                >
                  {activeSkillAnim.key}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-300">
                    {activeSkillAnim.sourceName} •{' '}
                    {activeSkillAnim.key === 'Z'
                      ? 'GOLPE RÁPIDO'
                      : activeSkillAnim.key === 'X'
                      ? 'EXPLOSÃO DE ÁREA'
                      : activeSkillAnim.key === 'C'
                      ? 'COMBO VÓRTICE'
                      : 'DESPERTAR SUPREMO'}
                  </span>
                  <span
                    style={{ color: '#ffffff', textShadow: `0 0 12px ${activeSkillAnim.color}` }}
                    className={`${
                      activeSkillAnim.key === 'V' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                    } font-black tracking-wide uppercase`}
                  >
                    {activeSkillAnim.skillName}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Impact Flash Vignette Overlay using Framer Motion */}
        <AnimatePresence>
          {hitEffectActive && (
            <motion.div
              initial={{ opacity: 0.8, scale: 0.95 }}
              animate={{ opacity: 0, scale: 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none border-4 border-amber-500/60 rounded-xl shadow-[inset_0_0_50px_rgba(245,158,11,0.4)]"
            />
          )}
        </AnimatePresence>

        {/* Cinematic Buso Haki Active Aura Vignette Overlay */}
        <AnimatePresence>
          {haki.busoHakiActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                borderColor: activeHakiColor.primaryColor,
                boxShadow: `inset 0 0 100px ${activeHakiColor.primaryColor}bb`,
              }}
              className="absolute inset-0 pointer-events-none border-4 rounded-xl"
            />
          )}
        </AnimatePresence>

        {/* Epic Haki Activation Flash Overlay */}
        <AnimatePresence>
          {hakiFlash && (
            <motion.div
              key={hakiFlash.key}
              initial={{ opacity: 0.95, scale: 0.92 }}
              animate={{ opacity: 0, scale: 1.08 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65 }}
              style={{
                borderColor: hakiFlash.color,
                boxShadow: `inset 0 0 150px ${hakiFlash.color}`,
                backgroundColor: `${hakiFlash.secondaryColor}33`,
              }}
              className="absolute inset-0 pointer-events-none border-8 rounded-xl flex items-center justify-center z-40"
            >
              <div
                className="bg-slate-950/90 border-2 px-6 py-3 rounded-2xl shadow-2xl flex flex-col items-center gap-1 animate-bounce"
                style={{ borderColor: hakiFlash.color }}
              >
                <span className="text-xs font-mono font-black uppercase tracking-widest text-amber-400">
                  ⚡ HAKI DA VONTADE SUPREMA ⚡
                </span>
                <span
                  className="text-lg font-black tracking-wider text-white"
                  style={{ color: hakiFlash.secondaryColor }}
                >
                  {hakiFlash.name.toUpperCase()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gorgeous Animated Treasure Chest Opening Showcase Banner */}
        <AnimatePresence>
          {openedChestShowcase && (
            <motion.div
              key={openedChestShowcase.key}
              initial={{ opacity: 0, y: -35, scale: 0.78 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -25, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="absolute top-14 sm:top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
            >
              <div
                className={`relative overflow-hidden rounded-2xl border-2 px-5 py-3 shadow-2xl backdrop-blur-md flex items-center gap-4 min-w-[290px] sm:min-w-[350px] ${
                  openedChestShowcase.tier === 'diamond'
                    ? 'bg-slate-950/95 border-cyan-400 shadow-[0_0_45px_rgba(56,189,248,0.65)]'
                    : openedChestShowcase.tier === 'gold'
                    ? 'bg-slate-950/95 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.55)]'
                    : openedChestShowcase.tier === 'silver'
                    ? 'bg-slate-950/95 border-slate-300 shadow-[0_0_35px_rgba(226,232,240,0.45)]'
                    : 'bg-slate-950/95 border-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.45)]'
                }`}
              >
                {/* Rotating Sunburst Rays Behind Chest */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -left-6 -top-6 w-28 h-28 rounded-full opacity-35 pointer-events-none"
                  style={{
                    background:
                      openedChestShowcase.tier === 'diamond'
                        ? 'conic-gradient(from 0deg, transparent, #38bdf8, transparent, #67e8f9, transparent, #f472b6, transparent)'
                        : 'conic-gradient(from 0deg, transparent, #facc15, transparent, #f59e0b, transparent, #fef08a, transparent)',
                  }}
                />

                {/* Animated Opening Chest SVG Illustration */}
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 64 64" className="w-14 h-14 overflow-visible drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]">
                    {/* Erupting Light Beams */}
                    <motion.path
                      initial={{ opacity: 0, scaleY: 0.2 }}
                      animate={{ opacity: [0, 0.95, 0.7], scaleY: [0.2, 1.15, 1] }}
                      transition={{ duration: 0.55 }}
                      d="M16 28 L6 4 L58 4 L48 28 Z"
                      fill={openedChestShowcase.tier === 'diamond' ? 'rgba(56,189,248,0.4)' : 'rgba(250,204,21,0.4)'}
                    />
                    {/* Open Lid (Flips backward) */}
                    <motion.g
                      initial={{ rotate: 0, y: 8 }}
                      animate={{ rotate: -26, y: -5 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
                      style={{ transformOrigin: '14px 28px' }}
                    >
                      <path
                        d="M12 26 Q32 12 52 26 L52 30 L12 30 Z"
                        fill={
                          openedChestShowcase.tier === 'diamond'
                            ? '#0ea5e9'
                            : openedChestShowcase.tier === 'gold'
                            ? '#b91c1c'
                            : openedChestShowcase.tier === 'silver'
                            ? '#334155'
                            : '#78350f'
                        }
                        stroke={
                          openedChestShowcase.tier === 'diamond'
                            ? '#67e8f9'
                            : openedChestShowcase.tier === 'gold'
                            ? '#facc15'
                            : openedChestShowcase.tier === 'silver'
                            ? '#e2e8f0'
                            : '#f59e0b'
                        }
                        strokeWidth="2.5"
                      />
                    </motion.g>
                    {/* Glowing Coins & Gems Pile Inside */}
                    <motion.ellipse
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: 'spring' }}
                      cx="32"
                      cy="30"
                      rx="17"
                      ry="6"
                      fill={openedChestShowcase.tier === 'diamond' ? '#67e8f9' : '#fde047'}
                    />
                    {/* Erupting Coins */}
                    {[
                      { cx: 22, cy: 14, r: 3.5, c: '#facc15', delay: 0.15 },
                      { cx: 32, cy: 9, r: 4, c: openedChestShowcase.tier === 'diamond' ? '#38bdf8' : '#fef08a', delay: 0.2 },
                      { cx: 43, cy: 15, r: 3.5, c: '#f59e0b', delay: 0.25 },
                    ].map((coin, idx) => (
                      <motion.circle
                        key={idx}
                        initial={{ y: 16, opacity: 0, scale: 0.3 }}
                        animate={{ y: [16, -4, 0], opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: coin.delay }}
                        cx={coin.cx}
                        cy={coin.cy}
                        r={coin.r}
                        fill={coin.c}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Chest Base */}
                    <rect
                      x="12"
                      y="30"
                      width="40"
                      height="22"
                      rx="3"
                      fill={
                        openedChestShowcase.tier === 'diamond'
                          ? '#0369a1'
                          : openedChestShowcase.tier === 'gold'
                          ? '#7f1d1d'
                          : openedChestShowcase.tier === 'silver'
                          ? '#1e293b'
                          : '#451a03'
                      }
                      stroke={
                        openedChestShowcase.tier === 'diamond'
                          ? '#67e8f9'
                          : openedChestShowcase.tier === 'gold'
                          ? '#facc15'
                          : openedChestShowcase.tier === 'silver'
                          ? '#cbd5e1'
                          : '#d97706'
                      }
                      strokeWidth="2.5"
                    />
                    {/* Straps & Lock */}
                    <rect
                      x="20"
                      y="30"
                      width="4"
                      height="22"
                      fill={
                        openedChestShowcase.tier === 'diamond'
                          ? '#67e8f9'
                          : openedChestShowcase.tier === 'gold'
                          ? '#facc15'
                          : openedChestShowcase.tier === 'silver'
                          ? '#e2e8f0'
                          : '#d97706'
                      }
                    />
                    <rect
                      x="40"
                      y="30"
                      width="4"
                      height="22"
                      fill={
                        openedChestShowcase.tier === 'diamond'
                          ? '#67e8f9'
                          : openedChestShowcase.tier === 'gold'
                          ? '#facc15'
                          : openedChestShowcase.tier === 'silver'
                          ? '#e2e8f0'
                          : '#d97706'
                      }
                    />
                  </svg>
                </div>

                {/* Reward Text Info */}
                <div className="relative z-10 flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                        openedChestShowcase.tier === 'diamond'
                          ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400/60'
                          : openedChestShowcase.tier === 'gold'
                          ? 'bg-yellow-950/90 text-yellow-300 border-yellow-400/60'
                          : openedChestShowcase.tier === 'silver'
                          ? 'bg-slate-800 text-slate-200 border-slate-400/60'
                          : 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                      }`}
                    >
                      {openedChestShowcase.tier === 'diamond'
                        ? '💎 TESOURO SUPREMO ÚNICO'
                        : openedChestShowcase.tier === 'gold'
                        ? '👑 TESOURO REAL'
                        : openedChestShowcase.tier === 'silver'
                        ? '🥈 TESOURO DE PRATA'
                        : '📦 TESOURO DE BRONZE'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">⏳ 5m</span>
                  </div>

                  <div className="text-sm sm:text-base font-black text-white mt-0.5">
                    {openedChestShowcase.name} Aberto!
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-lg sm:text-xl font-black font-mono tabular-nums ${
                        openedChestShowcase.tier === 'diamond' ? 'text-cyan-300' : 'text-yellow-400'
                      }`}
                    >
                      +{openedChestShowcase.reward.toLocaleString()} ฿
                    </span>
                    {openedChestShowcase.level > 1 ? (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        (Base {openedChestShowcase.baseBeli} ฿ + Bônus Nv.{openedChestShowcase.level})
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400">
                        (Recompensa Inicial)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Epic Raid Boss / Mihawk Boss Health Bar + 5-Minute Mini Timer Overlay */}
        {(invasionActive || invasionBossEntity?.defId === 'enemy_mihawk') &&
          invasionBossEntity &&
          invasionBossEntity.hp > 0 && (
            <div
              className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-lg bg-slate-950/95 backdrop-blur-md border-2 rounded-xl px-4 py-2.5 shadow-2xl pointer-events-none ${
                invasionBossEntity.defId === 'enemy_mihawk'
                  ? 'border-emerald-500 shadow-emerald-950/80'
                  : 'border-fuchsia-500 shadow-fuchsia-950/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5 font-black gap-2">
                <span
                  className={`flex items-center gap-1.5 ${
                    invasionBossEntity.defId === 'enemy_mihawk'
                      ? 'text-emerald-400'
                      : 'text-fuchsia-400 animate-pulse'
                  }`}
                >
                  <span>{invasionBossEntity.defId === 'enemy_mihawk' ? '⚔️' : '🚨'}</span>
                  <span>
                    {invasionBossEntity.name} (Lv. {invasionBossEntity.level})
                  </span>
                </span>

                <div className="flex items-center gap-2">
                  {invasionBossEntity.defId === 'enemy_mihawk' && mihawkTimeLeft !== null && (
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded-md border font-black tabular-nums ${
                        mihawkTimeLeft <= 60
                          ? 'bg-rose-950/90 text-rose-300 border-rose-500 animate-pulse'
                          : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                      }`}
                    >
                      ⏱️ {String(Math.floor(mihawkTimeLeft / 60)).padStart(2, '0')}:
                      {String(mihawkTimeLeft % 60).padStart(2, '0')}
                    </span>
                  )}
                  <span className="font-mono text-amber-300 tabular-nums">
                    {Math.round(invasionBossEntity.hp).toLocaleString()} /{' '}
                    {invasionBossEntity.maxHp.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    invasionBossEntity.defId === 'enemy_mihawk'
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300'
                      : 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-rose-500'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (invasionBossEntity.hp / invasionBossEntity.maxHp) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1 font-semibold">
                <span className="text-emerald-400">
                  {invasionBossEntity.defId === 'enemy_mihawk'
                    ? '🗡️ Dark Blade • Drop: +2.500 Frags 🟣 + 0.5% Adaga em Cruz ✝️'
                    : 'Recompensa: +1.000 ~ 1.500 Fragmentos Raros 🟣'}
                </span>
                <span
                  className={`font-mono ${
                    invasionBossEntity.defId === 'enemy_mihawk' ? 'text-amber-300' : 'text-purple-300'
                  }`}
                >
                  {invasionBossEntity.defId === 'enemy_mihawk'
                    ? 'TEMPO LIMITE: 5 MIN'
                    : 'CHEFÃO DE INVASÃO'}
                </span>
              </div>
            </div>
          )}
      </motion.div>

      {/* Floating Near Treasure Chest Action Button */}
      {nearChestPrompt && (
        <button
          onClick={() => openTreasureChest(nearChestPrompt.id)}
          className={`absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl font-black text-xs shadow-2xl flex items-center gap-2 cursor-pointer transition-transform active:scale-95 animate-bounce border-2 ${
            nearChestPrompt.tier === 'diamond'
              ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 border-cyan-100 shadow-cyan-500/40'
              : nearChestPrompt.tier === 'gold'
              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 border-yellow-100 shadow-yellow-500/40'
              : nearChestPrompt.tier === 'silver'
              ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 border-white shadow-slate-400/40'
              : 'bg-gradient-to-r from-amber-600 to-orange-500 text-white border-amber-300 shadow-amber-600/40'
          }`}
        >
          <span>
            {nearChestPrompt.tier === 'diamond'
              ? '💎'
              : nearChestPrompt.tier === 'gold'
              ? '👑'
              : nearChestPrompt.tier === 'silver'
              ? '🥈'
              : '📦'}
          </span>
          <span>
            Abrir {nearChestPrompt.name} (+
            {calculateChestBeliReward(nearChestPrompt.baseBeli, stats.level).toLocaleString()} ฿) [E]
          </span>
        </button>
      )}

      {/* Floating Near Quest NPC Action Button (mobile touch friendly) */}
      {nearNpcPrompt && (
        <button
          onClick={() => {
            sound.questComplete();
            onOpenQuestModal();
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-2xl shadow-amber-500/30 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 animate-pulse"
        >
          <span>📜</span>
          <span>Falar com o Oficial de Missões</span>
        </button>
      )}

      {/* Floating Near Fragment NPC Action Button */}
      {nearFragNpcPrompt && (
        <button
          onClick={() => {
            sound.questComplete();
            onOpenFragmentShop();
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-purple-100 font-black text-xs shadow-2xl shadow-purple-900/60 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 animate-pulse border border-purple-400"
        >
          <span>🟣</span>
          <span>Mercador das Sombras (Loja de Frags)</span>
        </button>
      )}

      {/* Floating Near Haki Master NPC Action Button */}
      {nearHakiNpcPrompt && (
        <button
          onClick={() => {
            sound.questComplete();
            onOpenHakiNpc?.();
          }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-2xl flex items-center gap-2 cursor-pointer transition-transform active:scale-95 animate-pulse border-2"
          style={{
            backgroundColor: '#09090b',
            borderColor: hakiNpcOffer?.primaryColor || '#a855f7',
            boxShadow: `0 0 25px ${hakiNpcOffer?.primaryColor || '#a855f7'}88`,
          }}
        >
          <span>🧙‍♂️</span>
          <span>Falar com o Mestre do Haki ({hakiNpcOffer?.name || 'Cores de Aura'})</span>
        </button>
      )}

      {/* Floating Near Altar do Cálice Sagrado Action Button */}
      {nearChaliceAltarPrompt && (
        <button
          onClick={() => {
            onAttemptObtainChalice?.();
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 cursor-pointer transition-transform active:scale-95 animate-pulse border-2 border-yellow-200"
        >
          <span>🍷</span>
          <span>
            {Date.now() < (chaliceCooldownEnd || 0)
              ? '⏱️ Cálice em Recarga (15 min)'
              : 'Tentar Obter Cálice Sagrado (2% Chance)'}
          </span>
        </button>
      )}

      {/* Floating Near Chalice Ritual Altar Button Action Button */}
      {nearChaliceButtonPrompt && (
        <button
          onClick={() => {
            onActivateChaliceButton?.(nearChaliceButtonPrompt.id);
          }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-2xl flex items-center gap-2 cursor-pointer transition-transform active:scale-95 animate-pulse border-2"
          style={{
            backgroundColor: '#09090b',
            borderColor: nearChaliceButtonPrompt.colorHex,
            boxShadow: `0 0 25px ${nearChaliceButtonPrompt.colorHex}88`,
          }}
        >
          <span>⚡</span>
          <span>
            Ativar Altar {nearChaliceButtonPrompt.requiredColorName} (Exige Buso Haki)
          </span>
        </button>
      )}

      {/* 30-Second Chalice Ritual Banner & Quick Haki Color Bar Overlay */}
      {chaliceRitualActive && (
        <div className="absolute top-16 sm:top-4 z-40 bg-slate-950/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl px-4 py-2.5 shadow-2xl shadow-amber-500/30 flex flex-col items-center gap-1.5 animate-fadeIn max-w-lg mx-auto pointer-events-auto">
          <div className="flex items-center gap-3 text-xs font-black">
            <span className="text-amber-400 flex items-center gap-1">
              <span>🍷</span>
              <span>RITUAL DO CÁLICE SAGRADO (MIHAWK)</span>
            </span>
            <span className="font-mono text-base text-yellow-300 bg-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-500/50 animate-pulse">
              ⏱️ 00:{String(chaliceRitualTimeLeft || 0).padStart(2, '0')}s
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 flex-wrap justify-center">
            <span>Ative os 3 altares com Buso Haki:</span>
            {chaliceButtons?.map((b) => (
              <span
                key={b.id}
                className={`px-2 py-0.5 rounded border font-black ${
                  b.activated
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
                style={{ color: b.activated ? '#6ee7b7' : b.secondaryColorHex }}
              >
                {b.activated ? '✓' : '⚡'} {b.requiredColorName}
              </span>
            ))}
          </div>

          {/* Quick Haki Color Equip Bar during ritual */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap justify-center">
            <span className="text-[9px] text-amber-300/80 font-bold uppercase">Trocar Cor Rápidamente:</span>
            {[
              { id: 'haki_blood_red', name: 'Sangue 🔴', hex: '#dc2626' },
              { id: 'haki_dark_blade_green', name: 'Dark Blade 🟢', hex: '#10b981' },
              { id: 'haki_kitsune_blue', name: 'Kitsune 🔵', hex: '#06b6d4' },
            ].map((c) => {
              const isUnlocked = haki.unlockedHakiColorIds?.includes(c.id);
              const isActive = haki.activeHakiColorId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (isUnlocked && onEquipHakiColor) {
                      sound.hakiToggle();
                      onEquipHakiColor(c.id);
                    } else if (onOpenHakiShop) {
                      onOpenHakiShop();
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer ${
                    isActive
                      ? 'ring-2 ring-white scale-105 bg-amber-500 text-slate-950 font-black'
                      : isUnlocked
                      ? 'opacity-90 hover:opacity-100 hover:scale-105'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#f59e0b' : `${c.hex}33`,
                    borderColor: c.hex,
                    color: isActive ? '#020617' : '#ffffff',
                  }}
                  title={isUnlocked ? `Equipar ${c.name}` : `Desbloquear ${c.name} na Loja`}
                >
                  {c.name} {isUnlocked ? '' : '🛒'}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

