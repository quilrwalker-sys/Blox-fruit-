export type FruitRarity =
  | 'Comum'
  | 'Incomum'
  | 'Rara'
  | 'Épica'
  | 'Lendária'
  | 'Mítica'
  | 'Incompreendido';

export type FruitCategory = 'Natural' | 'Elemental' | 'Zoan';

export interface Skill {
  key: 'Z' | 'X' | 'C' | 'V';
  name: string;
  description: string;
  masteryRequired: number;
  damageMultiplier: number;
  energyCost: number;
  cooldown: number; // in seconds
  color: string;
  radius: number;
  type: 'projectile' | 'aoe' | 'dash_attack' | 'transformation' | 'barrage';
}

export interface BloxFruit {
  id: string;
  name: string;
  portugueseName: string;
  rarity: FruitRarity;
  category: FruitCategory;
  description: string;
  iconColor: string;
  element: string;
  skills: Skill[];
  priceBeli: number;
  chance: number; // probability weight in gacha
  passive?: string;
  image?: string;
  hiddenInCatalog?: boolean;
}

export interface Sword {
  id: string;
  name: string;
  description: string;
  rarity: FruitRarity;
  damage: number;
  priceBeli: number;
  levelReq: number;
  color: string;
  skills: Skill[];
  adminOnly?: boolean;
}

export type CharacterRace = 'Humano' | 'Fishman' | 'Skypiean' | 'Mink' | 'Cyborg' | 'Ghoul';
export type CharacterFaction = 'Pirates' | 'Marines' | 'Revolutionaries';
export type CombatArchetype = 'melee' | 'sword' | 'fruit';
export type HairStyle = 'spiky' | 'wild' | 'samurai' | 'short' | 'buzz';
export type HeadAccessory = 'straw_hat' | 'marine_cap' | 'bandana' | 'eyepatch' | 'goggles' | 'none';
export type OutfitColor = 'red_vest' | 'marine_white' | 'dark_cloak' | 'golden_emperor' | 'cyan_shinobi';

export interface CharacterProfile {
  name: string;
  race: CharacterRace;
  faction: CharacterFaction;
  combatStyle: CombatArchetype;
  skinColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  accessory: HeadAccessory;
  outfitColor: OutfitColor;
  title: string;
}

export interface PlayerStats {
  level: number;
  exp: number;
  expToNextLevel: number;
  beli: number;
  fragments: number; // Fragmentos roxos (Frags)
  bounty: number;
  statPoints: number;
  // Attributes (Blox Fruits formula)
  melee: number; // Increases punch dmg & energy
  defense: number; // Increases Max HP
  sword: number; // Increases sword skill & attack dmg
  bloxFruit: number; // Increases fruit skill dmg
  // Masteries
  fruitMastery: number;
  swordMastery: number;
  // Character Profile
  character?: CharacterProfile;
}

export interface Island {
  id: string;
  name: string;
  recommendedLevel: string;
  minLevel: number;
  description: string;
  themeColor: string;
  groundColor: string;
  accentColor: string;
  enemies: EnemyDefinition[];
  quests: QuestDefinition[];
}

export interface EnemyDefinition {
  id: string;
  name: string;
  level: number;
  hp: number;
  attack: number;
  expReward: number;
  beliReward: number;
  isBoss?: boolean;
  color: string;
  weaponType: 'fist' | 'sword' | 'fruit';
}

export interface QuestDefinition {
  id: string;
  title: string;
  targetEnemyId: string;
  targetEnemyName: string;
  targetCount: number;
  levelRequired: number;
  expReward: number;
  beliReward: number;
}

export interface ActiveQuest {
  questId: string;
  title: string;
  targetEnemyId: string;
  targetEnemyName: string;
  currentCount: number;
  targetCount: number;
  expReward: number;
  beliReward: number;
}

export interface EnemyEntity {
  id: string;
  defId: string;
  name: string;
  level: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  hp: number;
  maxHp: number;
  attack: number;
  expReward: number;
  beliReward: number;
  isBoss: boolean;
  isInvasionBoss?: boolean;
  color: string;
  attackCooldown: number;
  hitStun: number;
  radius: number;
}

export interface DamageFloater {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  isCrit?: boolean;
  opacity: number;
  vy: number;
}

export interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SpellVFX {
  id: string;
  type: 'projectile' | 'aoe' | 'slash' | 'barrage' | 'pillar' | 'dash_attack' | 'transformation';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  damage: number;
  source: 'player' | 'enemy';
}

export type HakiColorRarity = 'Comum' | 'Rara' | 'Lendária' | 'Mítica' | 'Incompreendido';

export interface HakiColor {
  id: string;
  name: string;
  rarity: HakiColorRarity;
  primaryColor: string; // Main aura & hand glow
  secondaryColor: string; // Outer pulsing ring & spark accents
  darkColor: string; // Metallic body hardening tint
  priceBeli: number;
  priceFragments: number;
  spawnWeight: number; // Selection probability weight
  description: string;
  auraVisualDescription: string;
  specialEffect?: 'blood' | 'kitsune' | 'darkblade' | 'leviathan' | 'rainbow' | 'standard';
  adminOnly?: boolean;
}

export interface HakiSkills {
  busoHaki: boolean; // Armamento (extra dmg & defense)
  busoHakiActive: boolean;
  busoEnergy?: number; // 0 to 30s
  maxBusoEnergy?: number; // 30s
  kenHaki: boolean; // Instinto (esquiva automática)
  kenHakiActive: boolean;
  kenEnergy?: number; // 0 to 5s
  maxKenEnergy?: number; // 5s
  geppo: boolean; // Pulo Duplo / Air Jump
  soru: boolean; // Flash Step / Teleporte
  activeHakiColorId?: string; // Currently equipped Haki color ID
  unlockedHakiColorIds?: string[]; // List of unlocked color IDs
}

export interface ChaliceRitualButton {
  id: string;
  x: number;
  y: number;
  requiredColorId: 'haki_blood_red' | 'haki_dark_blade_green' | 'haki_kitsune_blue';
  requiredColorName: string;
  colorHex: string;
  secondaryColorHex: string;
  activated: boolean;
}

export type ChestTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface TreasureChest {
  id: string;
  tier: ChestTier;
  name: string;
  baseBeli: number; // Bronze: 80, Silver: 230, Gold: 560, Diamond: 760
  x: number;
  y: number;
  status: 'closed' | 'opening' | 'cooldown';
  animFrame: number; // 0 to 135 during opening animation
  respawnAt: number | null; // Timestamp (ms) when chest respawns (5 mins after opening)
  lastRewardGiven?: number;
}

export interface RemotePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  level: number;
  faction: string;
  race: string;
  clanTag?: string;
  hp: number;
  maxHp: number;
  facingAngle: number;
  busoActive: boolean;
  kenActive?: boolean;
  hakiColorId?: string;
  character?: CharacterProfile;
  activeWeaponType?: CombatArchetype;
  activeSwordId?: string | null;
  activeFruitId?: string | null;
  buddhaActive?: boolean;
  gear5Active?: boolean;
  isAttacking?: boolean;
  islandId?: string;
  isBot?: boolean;
}
