import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BLOX_FRUITS } from '../data/gameData';
import {
  BloxFruit,
  CharacterProfile,
  CharacterRace,
  CharacterFaction,
  CombatArchetype,
  HairStyle,
  HeadAccessory,
  OutfitColor,
  PlayerStats,
} from '../types/game';
import { sound } from '../utils/audio';

interface AuthStartModalProps {
  onStartGame: (
    character: CharacterProfile,
    starterFruit: BloxFruit,
    combatStyle: CombatArchetype
  ) => void;
  hasExistingSave: boolean;
  existingProfile?: {
    stats: PlayerStats;
    activeFruitName?: string;
  };
  onResumeGame: () => void;
}

// Lore & Race definitions
interface RaceData {
  id: CharacterRace;
  name: string;
  icon: string;
  passiveName: string;
  passiveDesc: string;
  perkBadge: string;
  bonusSummary: string;
  defaultSkin: string;
}

const RACES: RaceData[] = [
  {
    id: 'Humano',
    name: 'Humano',
    icon: '👨',
    passiveName: 'Espírito Inabalável',
    passiveDesc: 'Determinação inquebrável dos mares. Maior equilíbrio físico e aumento no dano de socos e espadas.',
    perkBadge: '+10% Dano Físico',
    bonusSummary: 'Equilíbrio Total & Ataque Físico',
    defaultSkin: '#fed7aa',
  },
  {
    id: 'Fishman',
    name: 'Homem-Peixe',
    icon: '🦈',
    passiveName: 'Pele de Tubarão',
    passiveDesc: 'Mestres do Karate Homem-Peixe. Corpo reforçado contra água e aumento substancial na Vida Máxima.',
    perkBadge: '+15% Vida Máxima',
    bonusSummary: 'Alta Vitalidade & Resistência Aquática',
    defaultSkin: '#38bdf8',
  },
  {
    id: 'Skypiean',
    name: 'Skypiean (Anjo)',
    icon: '🦅',
    passiveName: 'Salto Celestial',
    passiveDesc: 'Guerreiros celestiais de Skypiea. Asas divinas concedem estamina expandida e regeneração de energia.',
    perkBadge: '+20% Energia Máxima',
    bonusSummary: 'Regeneração Rápida & Estamina Gigante',
    defaultSkin: '#fef08a',
  },
  {
    id: 'Mink',
    name: 'Mink (Fera)',
    icon: '⚡',
    passiveName: 'Eletro-Agilidade',
    passiveDesc: 'Poder elétrico tribal ancestral. Velocidade de corrida alucinante e reflexos de esquiva aguçados.',
    perkBadge: '+15% Velocidade',
    bonusSummary: 'Corrida Relâmpago & Mobilidade Suprema',
    defaultSkin: '#f59e0b',
  },
  {
    id: 'Cyborg',
    name: 'Cyborg',
    icon: '🤖',
    passiveName: 'Blindagem Pacifista',
    passiveDesc: 'Aprimoramentos tecnológicos de Vegapunk. Placas de liga metálica que absorvem dano recebido.',
    perkBadge: '-10% Dano Sofrido',
    bonusSummary: 'Armadura Blindada & Resistência a Impacto',
    defaultSkin: '#e2e8f0',
  },
  {
    id: 'Ghoul',
    name: 'Ghoul Noturno',
    icon: '🦇',
    passiveName: 'Sede Sombria',
    passiveDesc: 'Seres lendários das sombras oceânicas. Convertem parte do dano causado aos inimigos em cura contínua.',
    perkBadge: '+6% Roubo de Vida',
    bonusSummary: 'Vampirismo em Ataques & Aura Dark',
    defaultSkin: '#cbd5e1',
  },
];

const FACTIONS: {
  id: CharacterFaction;
  name: string;
  icon: string;
  title: string;
  motto: string;
  perk: string;
  badgeColor: string;
}[] = [
  {
    id: 'Pirates',
    name: 'Piratas dos Mares',
    icon: '🏴‍☠️',
    title: 'Capitão Destemido',
    motto: 'Liberdade absoluta e busca ao maior tesouro do mundo!',
    perk: '+5.000 Beli Inicial & +10% Drop de Dinheiro',
    badgeColor: 'border-amber-500 bg-amber-500/20 text-amber-300',
  },
  {
    id: 'Marines',
    name: 'Marinha Mundial',
    icon: '⚓',
    title: 'Oficial de Justiça',
    motto: 'Justiça Absoluta e proteção dos mares contra criminosos!',
    perk: '+500 Recompensa Inicial & Reconhecimento do Governo',
    badgeColor: 'border-sky-500 bg-sky-500/20 text-sky-300',
  },
  {
    id: 'Revolutionaries',
    name: 'Exército Revolucionário',
    icon: '⚔️',
    title: 'Comandante da Chama',
    motto: 'Derrubar a tirania global e libertar todas as ilhas oprimidas!',
    perk: '+150 Fragmentos Raros Iniciais & Maestria Acelerada',
    badgeColor: 'border-rose-500 bg-rose-500/20 text-rose-300',
  },
];

const COMBAT_STYLES: {
  id: CombatArchetype;
  name: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: 'fruit',
    name: 'Usuário de Fruta',
    icon: '🔮',
    desc: 'Domine poderes místicos da Akuma no Mi com ataques em área e explosões elementais.',
  },
  {
    id: 'sword',
    name: 'Mestre Espadachim',
    icon: '⚔️',
    desc: 'Cortes velozes com lâminas afiadas, golpes precisos e domínio de cortes de vento.',
  },
  {
    id: 'melee',
    name: 'Lutador Marcial',
    icon: '🥊',
    desc: 'Combate corpo a corpo frenético com socos sônicos e combos devastadores de perto.',
  },
];

const SKIN_TONES = [
  { id: '#fed7aa', name: 'Claro (Pêssego)' },
  { id: '#fcd34d', name: 'Bronze Dourado' },
  { id: '#d97706', name: 'Moreno Solar' },
  { id: '#78350f', name: 'Escuro Profundo' },
  { id: '#38bdf8', name: 'Azul Homem-Peixe' },
  { id: '#cbd5e1', name: 'Pálido Noturno' },
];

const HAIR_STYLES: { id: HairStyle; name: string; icon: string }[] = [
  { id: 'spiky', name: 'Espetado Anime', icon: '⚡' },
  { id: 'wild', name: 'Selvagem Longo', icon: '🦁' },
  { id: 'samurai', name: 'Coque Samurai', icon: '🗡️' },
  { id: 'short', name: 'Curto Clássico', icon: '✨' },
  { id: 'buzz', name: 'Raspado Militar', icon: '💈' },
];

const HAIR_COLORS = [
  { id: '#0f172a', name: 'Preto Profundo' },
  { id: '#10b981', name: 'Verde Musgo (Zoro)' },
  { id: '#fbbf24', name: 'Loiro Dourado (Sanji)' },
  { id: '#ef4444', name: 'Ruivo Carmesim (Shanks)' },
  { id: '#f8fafc', name: 'Branco Nika (Gear 5)' },
  { id: '#06b6d4', name: 'Ciano Elétrico' },
];

const ACCESSORIES: { id: HeadAccessory; name: string; icon: string; desc: string }[] = [
  { id: 'straw_hat', name: 'Chapéu de Palha', icon: '👒', desc: 'Símbolo do Rei dos Piratas' },
  { id: 'marine_cap', name: 'Quepe da Marinha', icon: '⚓', desc: 'Emblema da Justiça' },
  { id: 'bandana', name: 'Bandana Negra', icon: '🧣', desc: 'Estilo pirata clássico' },
  { id: 'eyepatch', name: 'Tapa-Olho de Capitão', icon: '👁️', desc: 'Marca de veterano dos mares' },
  { id: 'goggles', name: 'Óculos Steampunk', icon: '🥽', desc: 'Lentes táticas de navegador' },
  { id: 'none', name: 'Nenhum Acessório', icon: '❌', desc: 'Visual limpo e direto' },
];

const OUTFITS: { id: OutfitColor; name: string; color: string; desc: string }[] = [
  { id: 'red_vest', name: 'Colete Vermelho Aberto', color: '#dc2626', desc: 'Estilo livre e aventureiro' },
  { id: 'marine_white', name: 'Uniforme da Marinha', color: '#f8fafc', desc: 'Manto imaculado da Justiça' },
  { id: 'dark_cloak', name: 'Capa das Sombras', color: '#1e1b4b', desc: 'Manto misterioso de assassino' },
  { id: 'golden_emperor', name: 'Traje do Imperador', color: '#eab308', desc: 'Vestimenta nobre imperial' },
  { id: 'cyan_shinobi', name: 'Manto Shinobi Ciano', color: '#0891b2', desc: 'Faixas velozes de combate' },
];

// Random Name Components
const NAME_PREFIXES = [
  'Monkey D.',
  'Roronoa',
  'Trafalgar D.',
  'Portgas D.',
  'Edward',
  'Gol D.',
  'Shanks',
  'Kozuki',
  'Marshall D.',
  'Silvers',
  'Donquixote',
  'Eustass',
  'Vinsmoke',
  'Charlotte',
  'Bartholomew',
];

const NAME_SUFFIXES = [
  'Luffy',
  'Zoro',
  'Ace',
  'Law',
  'Shadow',
  'Storm',
  'Flame',
  'Kaido',
  'Viper',
  'Phoenix',
  'Thunder',
  'Dragon',
  'Wolf',
  'Hawk',
  'Titan',
  'Kage',
  'Reaper',
  'Ghost',
];

export const AuthStartModal: React.FC<AuthStartModalProps> = ({
  onStartGame,
  hasExistingSave,
  existingProfile,
  onResumeGame,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'identity' | 'appearance' | 'arsenal'>('identity');
  const [isCreatingAccount, setIsCreatingAccount] = useState(!hasExistingSave);

  // Character Profile State
  const [pirateName, setPirateName] = useState<string>('Monkey D. Luffy');
  const [race, setRace] = useState<CharacterRace>('Humano');
  const [faction, setFaction] = useState<CharacterFaction>('Pirates');
  const [combatStyle, setCombatStyle] = useState<CombatArchetype>('fruit');
  const [skinColor, setSkinColor] = useState<string>('#fed7aa');
  const [hairStyle, setHairStyle] = useState<HairStyle>('spiky');
  const [hairColor, setHairColor] = useState<string>('#0f172a');
  const [accessory, setAccessory] = useState<HeadAccessory>('straw_hat');
  const [outfitColor, setOutfitColor] = useState<OutfitColor>('red_vest');

  // Starter Fruit Selection
  const starterFruits = BLOX_FRUITS.filter((f) => ['Comum', 'Incomum'].includes(f.rarity)).slice(0, 6);
  const [selectedFruit, setSelectedFruit] = useState<BloxFruit>(
    BLOX_FRUITS.find((f) => f.id === 'fruit_bomb') || starterFruits[0]
  );

  // Stance / Pose preview toggle
  const [previewPose, setPreviewPose] = useState<'neutral' | 'attack' | 'haki'>('neutral');

  // Randomize name
  const handleRandomizeName = () => {
    sound.click();
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    setPirateName(`${prefix} ${suffix}`);
  };

  // Full randomizer
  const handleFullRandomize = () => {
    sound.legendaryWin();
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    setPirateName(`${prefix} ${suffix}`);

    const randomRace = RACES[Math.floor(Math.random() * RACES.length)].id;
    setRace(randomRace);
    const chosenRaceData = RACES.find((r) => r.id === randomRace);
    if (chosenRaceData) setSkinColor(chosenRaceData.defaultSkin);

    setFaction(FACTIONS[Math.floor(Math.random() * FACTIONS.length)].id);
    setCombatStyle(COMBAT_STYLES[Math.floor(Math.random() * COMBAT_STYLES.length)].id);
    setHairStyle(HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id);
    setHairColor(HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id);
    setAccessory(ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)].id);
    setOutfitColor(OUTFITS[Math.floor(Math.random() * OUTFITS.length)].id);
    setSelectedFruit(starterFruits[Math.floor(Math.random() * starterFruits.length)]);
  };

  const handleSelectRace = (r: RaceData) => {
    sound.click();
    setRace(r.id);
    setSkinColor(r.defaultSkin);
  };

  const currentRaceData = RACES.find((r) => r.id === race) || RACES[0];
  const currentFactionData = FACTIONS.find((f) => f.id === faction) || FACTIONS[0];
  const currentOutfitData = OUTFITS.find((o) => o.id === outfitColor) || OUTFITS[0];

  const handleConfirmCreation = () => {
    sound.levelUp();
    const profile: CharacterProfile = {
      name: pirateName.trim() || 'Capitão Sem Nome',
      race,
      faction,
      combatStyle,
      skinColor,
      hairStyle,
      hairColor,
      accessory,
      outfitColor,
      title: currentFactionData.title,
    };
    onStartGame(profile, selectedFruit, combatStyle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-y-auto p-2 sm:p-4 select-none">
      {/* Background Hero Image with Deep Atmosphere */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/blox_pirate_hero_1792589312665.jpg"
          alt="Blox Fruits Hero Background"
          className="w-full h-full object-cover filter brightness-[0.35] contrast-125 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50 backdrop-blur-xs" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900/95 border-2 border-amber-500/60 rounded-2xl shadow-2xl shadow-amber-950/60 text-white backdrop-blur-md overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌊</span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400">
                BLOX FRUITS: CRIAÇÃO DE PERSONAGEM
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Forje seu legado nos mares da Grand Line e desperte seu poder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!hasExistingSave || isCreatingAccount ? (
              <button
                onClick={handleFullRandomize}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Gera um personagem épico aleatoriamente"
              >
                <span>🎲</span>
                <span className="hidden sm:inline">Aleatório Rápido</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Existing Save Returning User Screen */}
        {hasExistingSave && !isCreatingAccount ? (
          <div className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/30 border-2 border-amber-500/60 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/20 animate-pulse">
              🏴‍☠️
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-amber-300">
                Bem-vindo de Volta, Capitão!
              </h2>
              <p className="text-xs text-slate-300">
                Seu progresso salvo foi detectado. Deseja continuar sua aventura em alto-mar ou criar um personagem inédito?
              </p>
            </div>

            {existingProfile && (
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Nível Atual:</span>
                  <span className="text-amber-400 font-bold">Nível {existingProfile.stats.level}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Beli em Caixa:</span>
                  <span className="text-emerald-400 font-mono font-bold">฿ {existingProfile.stats.beli.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Fragmentos:</span>
                  <span className="text-purple-400 font-mono font-bold">🟣 {(existingProfile.stats.fragments || 0).toLocaleString()} Frags</span>
                </div>
              </div>
            )}

            <div className="w-full space-y-3 pt-2">
              <button
                onClick={() => {
                  sound.click();
                  onResumeGame();
                }}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>⚔️</span>
                <span>Continuar Minha Aventura</span>
              </button>

              <button
                onClick={() => {
                  sound.click();
                  setIsCreatingAccount(true);
                }}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                Criar Novo Personagem / Reiniciar
              </button>
            </div>
          </div>
        ) : (
          /* Main Character Creator Layout */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* LEFT COLUMN: LIVE AVATAR VIEWER & SUMMARY */}
            <div className="w-full md:w-72 bg-slate-950/90 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col items-center justify-between shrink-0">
              {/* Avatar Paperdoll Box */}
              <div className="w-full flex flex-col items-center">
                <div className="relative w-44 h-48 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl border-2 border-amber-500/40 shadow-inner flex items-center justify-center overflow-hidden">
                  {/* Subtle Radar/Compass Ring Background */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
                    <div className="w-36 h-36 border border-dashed border-amber-400 rounded-full animate-spin" style={{ animationDuration: '40s' }} />
                  </div>

                  {/* Character Avatar SVG */}
                  <motion.div
                    animate={{
                      y: previewPose === 'neutral' ? [0, -4, 0] : previewPose === 'attack' ? [0, -2, 0] : [0, -6, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.4,
                      ease: 'easeInOut',
                    }}
                    className="relative flex items-center justify-center"
                  >
                    <svg width="150" height="170" viewBox="0 0 150 170" className="drop-shadow-xl overflow-visible">
                      <defs>
                        {/* Glow Filter */}
                        <filter id="auraGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* 1. BACK RACE TRAITS */}
                      {/* Skypiean Angel Wings */}
                      {race === 'Skypiean' && (
                        <g>
                          {/* Left Wing */}
                          <path
                            d="M 50 75 C 20 45, 5 70, 15 100 C 25 105, 45 95, 50 85 Z"
                            fill="#ffffff"
                            stroke="#e0f2fe"
                            strokeWidth="2"
                            filter="url(#auraGlow)"
                            opacity="0.95"
                          />
                          {/* Right Wing */}
                          <path
                            d="M 100 75 C 130 45, 145 70, 135 100 C 125 105, 105 95, 100 85 Z"
                            fill="#ffffff"
                            stroke="#e0f2fe"
                            strokeWidth="2"
                            filter="url(#auraGlow)"
                            opacity="0.95"
                          />
                        </g>
                      )}

                      {/* Ghoul Dark Shadow Mist */}
                      {race === 'Ghoul' && (
                        <circle cx="75" cy="85" r="48" fill="#581c87" opacity="0.3" filter="url(#auraGlow)" />
                      )}

                      {/* Mink Static Electricity Sparks */}
                      {race === 'Mink' && (
                        <g stroke="#facc15" strokeWidth="2" fill="none">
                          <path d="M 35 60 L 40 70 L 32 75 L 42 88" opacity="0.8" />
                          <path d="M 115 60 L 110 70 L 118 75 L 108 88" opacity="0.8" />
                        </g>
                      )}

                      {/* 2. BODY / TORSO & OUTFIT */}
                      {/* Torso Base */}
                      <path
                        d="M 52 90 Q 75 85 98 90 L 96 140 Q 75 145 54 140 Z"
                        fill={currentOutfitData.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />

                      {/* Inner Vest / Shirt Line */}
                      {outfitColor === 'red_vest' && (
                        <path d="M 66 90 L 75 125 L 84 90 Z" fill={skinColor} />
                      )}
                      {outfitColor === 'marine_white' && (
                        <g>
                          <path d="M 72 90 L 75 130 L 78 90 Z" fill="#0284c7" />
                          <circle cx="75" cy="100" r="3" fill="#eab308" />
                        </g>
                      )}

                      {/* Arms */}
                      <rect x="36" y="94" width="14" height="42" rx="7" fill={skinColor} stroke="#0f172a" strokeWidth="2" />
                      <rect x="100" y="94" width="14" height="42" rx="7" fill={skinColor} stroke="#0f172a" strokeWidth="2" />

                      {/* Belt / Waist */}
                      <rect x="52" y="132" width="46" height="8" rx="2" fill="#78350f" stroke="#0f172a" strokeWidth="1.5" />
                      <rect x="71" y="130" width="8" height="12" rx="1.5" fill="#facc15" stroke="#0f172a" strokeWidth="1" />

                      {/* 3. HEAD & NECK */}
                      <rect x="68" y="76" width="14" height="14" fill={skinColor} stroke="#0f172a" strokeWidth="1.5" />
                      <ellipse cx="75" cy="58" rx="26" ry="28" fill={skinColor} stroke="#0f172a" strokeWidth="2.5" />

                      {/* Race Ears */}
                      {race === 'Mink' && (
                        <g>
                          {/* Left Mink Ear */}
                          <polygon points="50,42 42,20 62,32" fill={skinColor} stroke="#0f172a" strokeWidth="2" />
                          <polygon points="50,40 45,24 58,34" fill="#f472b6" opacity="0.8" />
                          {/* Right Mink Ear */}
                          <polygon points="100,42 108,20 88,32" fill={skinColor} stroke="#0f172a" strokeWidth="2" />
                          <polygon points="100,40 105,24 92,34" fill="#f472b6" opacity="0.8" />
                        </g>
                      )}
                      {race === 'Fishman' && (
                        <g>
                          {/* Fin details */}
                          <path d="M 47 52 Q 40 56 46 64 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
                          <path d="M 103 52 Q 110 56 104 64 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
                        </g>
                      )}

                      {/* 4. FACE EXPRESSION */}
                      {/* Eyebrows */}
                      <path d="M 60 48 Q 66 45 71 47" stroke="#0f172a" strokeWidth="2" fill="none" />
                      <path d="M 89 48 Q 84 45 79 47" stroke="#0f172a" strokeWidth="2" fill="none" />

                      {/* Eyes */}
                      {race === 'Cyborg' ? (
                        <g>
                          <circle cx="65" cy="54" r="3.5" fill="#0f172a" />
                          <circle cx="66" cy="53" r="1.2" fill="#ffffff" />
                          {/* Cyborg Laser Eye */}
                          <circle cx="85" cy="54" r="4.5" fill="#ef4444" filter="url(#auraGlow)" />
                          <circle cx="85" cy="54" r="2" fill="#fef08a" />
                          <path d="M 88 54 L 98 52" stroke="#94a3b8" strokeWidth="1.5" />
                        </g>
                      ) : race === 'Ghoul' ? (
                        <g>
                          <circle cx="65" cy="54" r="3.5" fill="#dc2626" />
                          <circle cx="66" cy="53" r="1" fill="#ffffff" />
                          <circle cx="85" cy="54" r="3.5" fill="#dc2626" />
                          <circle cx="86" cy="53" r="1" fill="#ffffff" />
                        </g>
                      ) : (
                        <g>
                          <circle cx="65" cy="54" r="3.5" fill="#0f172a" />
                          <circle cx="66.5" cy="52.5" r="1.2" fill="#ffffff" />
                          <circle cx="85" cy="54" r="3.5" fill="#0f172a" />
                          <circle cx="86.5" cy="52.5" r="1.2" fill="#ffffff" />
                        </g>
                      )}

                      {/* Nose & Smile */}
                      <path d="M 75 58 L 76 62" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M 69 68 Q 75 73 81 68" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />

                      {/* Heroic Scar */}
                      <path d="M 62 60 L 67 65" stroke="#ef4444" strokeWidth="1.5" opacity="0.75" />

                      {/* 5. HAIR */}
                      {hairStyle === 'spiky' && (
                        <path
                          d="M 48 48 C 42 22, 60 18, 65 26 C 70 14, 82 12, 88 24 C 95 16, 108 24, 102 48 C 96 36, 54 36, 48 48 Z"
                          fill={hairColor}
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                      )}
                      {hairStyle === 'wild' && (
                        <path
                          d="M 46 54 C 38 28, 52 14, 75 16 C 98 14, 112 28, 104 54 C 114 65, 106 82, 102 90 C 98 70, 96 42, 75 40 C 54 42, 52 70, 48 90 C 44 82, 36 65, 46 54 Z"
                          fill={hairColor}
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                      )}
                      {hairStyle === 'samurai' && (
                        <g>
                          <path
                            d="M 50 48 C 48 26, 60 22, 75 22 C 90 22, 102 26, 100 48 Z"
                            fill={hairColor}
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                          {/* Top Knot Bun */}
                          <circle cx="75" cy="14" r="8" fill={hairColor} stroke="#0f172a" strokeWidth="2" />
                          <rect x="71" y="18" width="8" height="4" fill="#dc2626" rx="1" />
                        </g>
                      )}
                      {hairStyle === 'short' && (
                        <path
                          d="M 50 48 C 48 30, 60 24, 75 24 C 90 24, 102 30, 100 48 C 94 40, 56 40, 50 48 Z"
                          fill={hairColor}
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                      )}
                      {hairStyle === 'buzz' && (
                        <path
                          d="M 51 45 C 50 34, 60 30, 75 30 C 90 30, 100 34, 99 45 Z"
                          fill={hairColor}
                          opacity="0.8"
                        />
                      )}

                      {/* 6. HEAD ACCESSORY */}
                      {accessory === 'straw_hat' && (
                        <g>
                          {/* Hat Crown */}
                          <ellipse cx="75" cy="30" rx="20" ry="14" fill="#facc15" stroke="#78350f" strokeWidth="2" />
                          {/* Red Band */}
                          <path d="M 56 34 Q 75 38 94 34 L 94 37 Q 75 41 56 37 Z" fill="#dc2626" />
                          {/* Wide Brim */}
                          <ellipse cx="75" cy="38" rx="38" ry="10" fill="#facc15" stroke="#78350f" strokeWidth="2.5" />
                        </g>
                      )}
                      {accessory === 'marine_cap' && (
                        <g>
                          <ellipse cx="75" cy="30" rx="24" ry="12" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
                          <path d="M 52 32 Q 75 40 98 32 L 95 38 Q 75 45 55 38 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
                          <circle cx="75" cy="27" r="3" fill="#eab308" />
                        </g>
                      )}
                      {accessory === 'bandana' && (
                        <g>
                          <path d="M 48 38 Q 75 32 102 38 L 102 46 Q 75 42 48 46 Z" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
                          <circle cx="50" cy="46" r="3" fill="#0f172a" />
                        </g>
                      )}
                      {accessory === 'eyepatch' && (
                        <g>
                          <line x1="56" y1="46" x2="90" y2="60" stroke="#0f172a" strokeWidth="2" />
                          <polygon points="60,48 70,52 68,62 58,58" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                        </g>
                      )}
                      {accessory === 'goggles' && (
                        <g>
                          <rect x="52" y="34" width="46" height="4" fill="#78350f" />
                          <circle cx="63" cy="36" r="7" fill="#0284c7" stroke="#d97706" strokeWidth="2" />
                          <circle cx="87" cy="36" r="7" fill="#0284c7" stroke="#d97706" strokeWidth="2" />
                        </g>
                      )}

                      {/* 7. WEAPON IN HAND */}
                      {combatStyle === 'sword' && (
                        <g>
                          {/* Sword blade */}
                          <line x1="110" y1="126" x2="136" y2="82" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                          <line x1="110" y1="126" x2="136" y2="82" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                          {/* Guard (Tsuba) */}
                          <ellipse cx="114" cy="120" rx="5" ry="3" fill="#facc15" stroke="#78350f" strokeWidth="1" transform="rotate(-30 114 120)" />
                          {/* Grip */}
                          <line x1="107" y1="132" x2="114" y2="120" stroke="#7f1d1d" strokeWidth="4" strokeLinecap="round" />
                        </g>
                      )}

                      {combatStyle === 'fruit' && (
                        <g>
                          {/* Swirling Fruit Energy Orb in Hand */}
                          <circle cx="112" cy="120" r="9" fill={selectedFruit.iconColor} opacity="0.85" filter="url(#auraGlow)" />
                          <circle cx="112" cy="120" r="4" fill="#ffffff" />
                        </g>
                      )}

                      {combatStyle === 'melee' && (
                        <g>
                          {/* Boxing Wrap on Hand */}
                          <circle cx="110" cy="124" r="6" fill="#f97316" stroke="#0f172a" strokeWidth="2" />
                          <circle cx="40" cy="124" r="6" fill="#f97316" stroke="#0f172a" strokeWidth="2" />
                        </g>
                      )}
                    </svg>
                  </motion.div>

                  {/* Pose Toggle Pills */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-[10px]">
                    <button
                      onClick={() => setPreviewPose('neutral')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${previewPose === 'neutral' ? 'text-amber-400 font-bold' : 'text-slate-500'}`}
                    >
                      Neutro
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => setPreviewPose('attack')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${previewPose === 'attack' ? 'text-amber-400 font-bold' : 'text-slate-500'}`}
                    >
                      Batalha
                    </button>
                  </div>
                </div>

                {/* Character Nameplate & Race Tag */}
                <div className="mt-3 text-center space-y-1 w-full px-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-sm font-black text-amber-300 truncate max-w-[170px]">
                      {pirateName || 'Sem Nome'}
                    </span>
                    <span className="text-xs">{currentFactionData.icon}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      {race}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {combatStyle === 'fruit' ? 'Fruta' : combatStyle === 'sword' ? 'Espadachim' : 'Lutador'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Race & Faction Active Perks Summary Box */}
              <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mt-3 space-y-1.5 text-left text-[11px]">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span>✨</span>
                  <span>Bônus Ativos</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>{currentRaceData.passiveName}:</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 rounded border border-emerald-500/30">
                    {currentRaceData.perkBadge}
                  </span>
                </div>
                <div className="text-slate-400 text-[10px] leading-tight">
                  {currentRaceData.bonusSummary}
                </div>
                <div className="pt-1 border-t border-slate-800/80 text-[10px] text-amber-400">
                  {currentFactionData.perk}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: TABBED CUSTOMIZATION PANEL */}
            <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-y-auto max-h-[58vh] md:max-h-[70vh]">
              {/* Category Navigation Tabs */}
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800 shrink-0">
                <button
                  onClick={() => {
                    sound.click();
                    setActiveTab('identity');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'identity'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🧬</span>
                  <span>1. Raça & Facção</span>
                </button>

                <button
                  onClick={() => {
                    sound.click();
                    setActiveTab('appearance');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'appearance'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🎨</span>
                  <span>2. Aparência & Estilo</span>
                </button>

                <button
                  onClick={() => {
                    sound.click();
                    setActiveTab('arsenal');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'arsenal'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🔮</span>
                  <span>3. Arsenal & Fruta</span>
                </button>
              </div>

              {/* TAB 1: IDENTITY, NAME, RACE, FACTION */}
              {activeTab === 'identity' && (
                <div className="space-y-4">
                  {/* Pirate Name with Randomizer */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Nome do Capitão / Guerreiro</span>
                      <span className="text-[10px] text-slate-500 font-normal">Máx 26 caracteres</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pirateName}
                        onChange={(e) => setPirateName(e.target.value)}
                        placeholder="Ex: Monkey D. Luffy..."
                        maxLength={26}
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold tracking-wide outline-none shadow-inner"
                      />
                      <button
                        onClick={handleRandomizeName}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        title="Gerar nome aleatório"
                      >
                        <span>🎲</span>
                        <span className="hidden sm:inline">Sortear</span>
                      </button>
                    </div>
                  </div>

                  {/* Race Selection (6 Core Blox Fruits Races) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Escolha sua Raça Ancestral (Vantagens Permanentes)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {RACES.map((r) => {
                        const isSelected = race === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleSelectRace(r)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500/50 shadow-md shadow-amber-950/40'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base">{r.icon}</span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {r.perkBadge}
                              </span>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs font-bold text-white">{r.name}</div>
                              <div className="text-[10px] text-amber-300/90 font-medium line-clamp-1 mt-0.5">
                                {r.passiveName}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {/* Race Details Card */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <span>{currentRaceData.icon}</span>
                        <span>{currentRaceData.name} — {currentRaceData.passiveName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {currentRaceData.passiveDesc}
                      </p>
                    </div>
                  </div>

                  {/* Faction Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Aliança Mundial / Facção
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {FACTIONS.map((f) => {
                        const isSelected = faction === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              sound.click();
                              setFaction(f.id);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/40 text-amber-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                              <span>{f.icon}</span>
                              <span>{f.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                              {f.motto}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: APPEARANCE & STYLING */}
              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  {/* Skin Tone Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Tom de Pele
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {SKIN_TONES.map((tone) => {
                        const isSelected = skinColor === tone.id;
                        return (
                          <button
                            key={tone.id}
                            onClick={() => {
                              sound.click();
                              setSkinColor(tone.id);
                            }}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 shadow-sm'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div
                              className="w-7 h-7 rounded-full border-2 border-slate-900 shadow-sm"
                              style={{ backgroundColor: tone.id }}
                            />
                            <span className="text-[9px] font-bold text-slate-300 text-center truncate w-full">
                              {tone.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hair Style & Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hair Style */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">
                        Estilo de Cabelo
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {HAIR_STYLES.map((h) => {
                          const isSelected = hairStyle === h.id;
                          return (
                            <button
                              key={h.id}
                              onClick={() => {
                                sound.click();
                                setHairStyle(h.id);
                              }}
                              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className="text-sm">{h.icon}</span>
                              <span className="text-[11px] font-bold">{h.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hair Color */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">
                        Cor do Cabelo
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {HAIR_COLORS.map((c) => {
                          const isSelected = hairColor === c.id;
                          return (
                            <button
                              key={c.id}
                              onClick={() => {
                                sound.click();
                                setHairColor(c.id);
                              }}
                              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div
                                className="w-5 h-5 rounded-full border border-slate-700"
                                style={{ backgroundColor: c.id }}
                              />
                              <span className="text-[9px] font-semibold text-slate-300 truncate w-full text-center">
                                {c.name.split(' ')[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Head Accessories */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Acessório de Cabeça / Rosto
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ACCESSORIES.map((acc) => {
                        const isSelected = accessory === acc.id;
                        return (
                          <button
                            key={acc.id}
                            onClick={() => {
                              sound.click();
                              setAccessory(acc.id);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-lg shrink-0">{acc.icon}</span>
                            <div>
                              <div className="text-[11px] font-bold text-white">{acc.name}</div>
                              <div className="text-[9px] text-slate-500 line-clamp-1">{acc.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Outfit / Uniform Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Traje / Manto de Batalha
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {OUTFITS.map((outfit) => {
                        const isSelected = outfitColor === outfit.id;
                        return (
                          <button
                            key={outfit.id}
                            onClick={() => {
                              sound.click();
                              setOutfitColor(outfit.id);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <div
                              className="w-4 h-4 rounded-full border border-slate-700 shrink-0 shadow-sm"
                              style={{ backgroundColor: outfit.color }}
                            />
                            <div>
                              <div className="text-[11px] font-bold text-white">{outfit.name}</div>
                              <div className="text-[9px] text-slate-500">{outfit.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: COMBAT ARCHETYPE & STARTER FRUIT */}
              {activeTab === 'arsenal' && (
                <div className="space-y-4">
                  {/* Combat Archetype Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Estilo de Combate Inicial
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {COMBAT_STYLES.map((style) => {
                        const isSelected = combatStyle === style.id;
                        return (
                          <button
                            key={style.id}
                            onClick={() => {
                              sound.click();
                              setCombatStyle(style.id);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                              <span className="text-base">{style.icon}</span>
                              <span>{style.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                              {style.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Starter Fruit Selection with Cards */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 block">
                        Escolha sua Fruta do Diabo Inicial (Akuma no Mi)
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono">100% Desbloqueada</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {starterFruits.map((fruit) => {
                        const isSelected = selectedFruit.id === fruit.id;
                        return (
                          <button
                            key={fruit.id}
                            onClick={() => {
                              sound.click();
                              setSelectedFruit(fruit);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 shadow-md shadow-amber-950/50 ring-1 ring-amber-500/50'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div>
                                <span className="text-xs font-bold block" style={{ color: fruit.iconColor }}>
                                  {fruit.portugueseName}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                                    {fruit.rarity}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    {fruit.category}
                                  </span>
                                </div>
                              </div>
                              <div
                                className="w-5 h-5 rounded-full border border-slate-700 shrink-0 shadow-inner"
                                style={{ backgroundColor: fruit.iconColor }}
                              />
                            </div>

                            <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                              {fruit.description}
                            </p>

                            <div className="text-[9px] text-amber-300 font-mono mt-1.5 pt-1 border-t border-slate-800/80">
                              Habilidades: {fruit.skills.map((s) => s.key).join(' · ')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Action Area */}
              <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
                {hasExistingSave && (
                  <button
                    onClick={() => {
                      sound.click();
                      setIsCreatingAccount(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    Voltar ao Save
                  </button>
                )}

                <div className="flex-1 flex justify-end">
                  <button
                    onClick={handleConfirmCreation}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-yellow-200"
                  >
                    <span>🔥</span>
                    <span>Embarcar na Grand Line (Começar Jogo)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
