import React from 'react';
import { ActiveQuest, PlayerStats } from '../types/game';
import { sound } from '../utils/audio';

interface HUDProps {
  stats: PlayerStats;
  playerHp: number;
  maxHp: number;
  playerEnergy: number;
  maxEnergy: number;
  activeQuest: ActiveQuest | null;
  invasionTimeLeft: number;
  invasionActive: boolean;
  onOpenModal: (modal: 'stats' | 'quests' | 'fruits' | 'fragShop' | 'shop' | 'map' | 'admin' | 'clan' | 'menu') => void;
  onTriggerInvasion?: () => void;
  onOpenStartScreen?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  masteryUses: { melee: number; sword: number; fruit: number };
  isMobile?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  playerHp,
  maxHp,
  playerEnergy,
  maxEnergy,
  activeQuest,
  invasionTimeLeft,
  invasionActive,
  onOpenModal,
  onTriggerInvasion,
  onOpenStartScreen,
  soundEnabled,
  onToggleSound,
  masteryUses,
  isMobile = false,
}) => {
  const expPercent = Math.min(100, Math.floor((stats.exp / stats.expToNextLevel) * 100));
  const hpPercent = Math.min(100, Math.max(0, Math.floor((playerHp / maxHp) * 100)));
  const energyPercent = Math.min(100, Math.max(0, Math.floor((playerEnergy / maxEnergy) * 100)));

  const formatInvasionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getMasteryData = (uses: number) => {
    const level = Math.floor(uses / 100) + 1;
    const progress = Math.min(100, Math.floor(((uses % 100) / 100) * 100));
    return { level, progress };
  };

  const meleeM = getMasteryData(masteryUses.melee);
  const swordM = getMasteryData(masteryUses.sword);
  const fruitM = getMasteryData(masteryUses.fruit);

  // ============================================================================
  // MOBILE-ONLY HUD (Celular) — Desktop version below remains 100% untouched
  // ============================================================================
  if (isMobile) {
    return (
      <header className="w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 px-2.5 pt-1.5 pb-1.5 flex flex-col gap-1.5 text-white shrink-0 select-none overflow-x-hidden shadow-lg shadow-black/50">
        {/* Row 1: Player Badge, Currencies & Quick Actions */}
        <div className="flex items-center justify-between gap-1.5 w-full">
          {/* Left: Level Shield + Name + Stat Points */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => {
                sound.click();
                onOpenModal('stats');
              }}
              className="relative flex items-center gap-1.5 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 border border-sky-500/40 rounded-xl px-2 py-1 shadow-inner cursor-pointer active:scale-95 transition-transform shrink-0"
            >
              <span className="w-5 h-5 rounded-lg bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-[10px] font-black text-sky-300 tabular-nums">
                {stats.level}
              </span>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] font-black text-amber-400 truncate max-w-[78px]">
                  {stats.character?.name || 'Pirata'}
                </span>
                <span className="text-[8px] font-semibold text-slate-400">
                  EXP {expPercent}%
                </span>
              </div>
            </button>

            {stats.statPoints > 0 && (
              <button
                onClick={() => {
                  sound.click();
                  onOpenModal('stats');
                }}
                className="px-2 py-1 rounded-lg bg-amber-500/25 border border-amber-400 text-amber-300 text-[10px] font-black tabular-nums animate-pulse shrink-0 active:scale-95"
              >
                +{stats.statPoints} Pts
              </button>
            )}
          </div>

          {/* Center: Compact Beli & Fragments */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-emerald-500/25 px-1.5 py-0.5 rounded-lg text-[10px] font-black text-emerald-400 tabular-nums">
              <span>฿</span>
              <span>
                {stats.beli >= 1_000_000
                  ? `${(stats.beli / 1_000_000).toFixed(1)}M`
                  : stats.beli >= 10_000
                  ? `${(stats.beli / 1_000).toFixed(1)}K`
                  : stats.beli.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 border border-purple-500/25 px-1.5 py-0.5 rounded-lg text-[10px] font-black text-purple-300 tabular-nums">
              <span>🟣</span>
              <span>
                {(stats.fragments || 0) >= 10_000
                  ? `${((stats.fragments || 0) / 1_000).toFixed(1)}K`
                  : (stats.fragments || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Right: Invasion + Audio + Menu Button */}
          <div className="flex items-center gap-1 shrink-0">
            {invasionActive ? (
              <button
                onClick={() => {
                  sound.invasionAlert();
                  onTriggerInvasion?.();
                }}
                className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black animate-pulse border border-red-400 shadow-sm"
              >
                🚨 RAID
              </button>
            ) : (
              <div className="px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold text-amber-300 tabular-nums">
                ⚔️{formatInvasionTime(invasionTimeLeft)}
              </div>
            )}

            <button
              onClick={onToggleSound}
              className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-xs active:scale-95"
              title="Alternar Áudio"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>

            <button
              onClick={() => {
                sound.click();
                onOpenModal('menu');
              }}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-md shadow-amber-500/20 border border-yellow-200 active:scale-95"
            >
              <span>☰</span>
              <span>MENU</span>
            </button>
          </div>
        </div>

        {/* Row 2: Sleek Side-by-Side HP & Energy Capsules + Active Quest Pill */}
        <div className="grid grid-cols-12 gap-1.5 items-center w-full">
          {/* HP Capsule (5 cols) */}
          <div className="col-span-5 relative h-4 bg-slate-900 rounded-md overflow-hidden border border-emerald-500/30 flex items-center px-1.5">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-150"
              style={{ width: `${hpPercent}%` }}
            />
            <div className="relative z-10 flex items-center justify-between w-full text-[9px] font-black tabular-nums drop-shadow">
              <span className="text-emerald-100">❤️ HP</span>
              <span className="text-white">{Math.round(playerHp)}/{maxHp}</span>
            </div>
          </div>

          {/* Energy Capsule (4 cols) */}
          <div className="col-span-4 relative h-4 bg-slate-900 rounded-md overflow-hidden border border-sky-500/30 flex items-center px-1.5">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-150"
              style={{ width: `${energyPercent}%` }}
            />
            <div className="relative z-10 flex items-center justify-between w-full text-[9px] font-black tabular-nums drop-shadow">
              <span className="text-sky-100">⚡ EN</span>
              <span className="text-white">{Math.round(playerEnergy)}</span>
            </div>
          </div>

          {/* Active Quest / Map Quick Button (3 cols) */}
          <button
            onClick={() => {
              sound.click();
              onOpenModal('quests');
            }}
            className="col-span-3 h-4 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 rounded-md px-1.5 flex items-center justify-between text-[9px] font-bold text-amber-300 truncate active:scale-95"
          >
            <span className="truncate">{activeQuest ? '📜 Missão' : '📜 Missões'}</span>
            {activeQuest && (
              <span className="font-mono text-emerald-400 font-black tabular-nums ml-0.5">
                {activeQuest.currentCount}/{activeQuest.targetCount}
              </span>
            )}
          </button>
        </div>

        {/* Ultra-thin EXP Progress Hairline */}
        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-150"
            style={{ width: `${expPercent}%` }}
          />
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2 sm:px-4 py-2 flex flex-col gap-2 text-white shrink-0 select-none overflow-x-hidden">
      {/* Top Row: Brand, Character Profile & Main Navigation */}
      <div className="flex items-center justify-between w-full gap-2">
        {/* Brand, Level & Character Tag */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <span className="text-sm sm:text-base font-black tracking-tight text-amber-400 truncate">
            ⚔️ Blox Fruits
          </span>

          <span className="text-xs font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-500/40 tabular-nums">
            Lv. {stats.level}
          </span>

          {stats.character && (
            <span className="text-xs font-bold text-amber-200 hidden sm:inline max-w-[120px] truncate">
              {stats.character.name}
            </span>
          )}

          {stats.statPoints > 0 && (
            <button
              onClick={() => {
                sound.click();
                onOpenModal('stats');
              }}
              className="text-[11px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded-md border border-amber-500/40 transition-colors cursor-pointer animate-pulse"
            >
              +{stats.statPoints} Pts
            </button>
          )}
        </div>

        {/* Right Navigation & Audio Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              sound.click();
              onOpenModal('menu');
            }}
            className="px-3 py-1.5 text-xs font-black rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all transform active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20 border border-yellow-300"
          >
            <span className="text-sm">☰</span>
            <span className="text-[11px] sm:text-xs">MENU</span>
          </button>

          <button
            onClick={onToggleSound}
            title="Alternar Áudio"
            className="p-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Middle Row: Currencies, Bounty & Invasion Banner */}
      <div className="flex items-center justify-between w-full gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Beli */}
          <div className="flex items-center gap-1 font-bold text-emerald-400 tabular-nums bg-slate-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
            <span>฿</span>
            <span>{stats.beli.toLocaleString()}</span>
          </div>

          {/* Fragments */}
          <div className="flex items-center gap-1 font-bold text-purple-300 tabular-nums bg-slate-950/60 px-2 py-0.5 rounded border border-purple-500/20">
            <span>🟣</span>
            <span>{(stats.fragments || 0).toLocaleString()}</span>
          </div>

          {/* Bounty */}
          <div className="hidden sm:flex items-center gap-1 text-slate-300 tabular-nums bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-400">☠</span>
            <span className="font-semibold text-amber-200">${stats.bounty.toLocaleString()}</span>
          </div>
        </div>

        {/* Invasion Alert / Countdown Badge */}
        <div className="shrink-0">
          {invasionActive ? (
            <button
              onClick={() => {
                sound.invasionAlert();
                onTriggerInvasion?.();
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-black rounded-md bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-md shadow-red-600/40 border border-red-400 cursor-pointer"
            >
              <span>🚨</span>
              <span>INVASÃO ATIVA!</span>
            </button>
          ) : (
            <div
              title="Evento de Invasão de Ilha a cada 15 min"
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-800/90 border border-slate-700 text-amber-300"
            >
              <span>⚔️</span>
              <span className="text-[10px] text-slate-400 hidden xs:inline">Invasão:</span>
              <span className="font-mono text-amber-300 font-bold tabular-nums">
                {formatInvasionTime(invasionTimeLeft)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: HP, Energy & EXP Progress Bars */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {/* HP Bar */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[10px] text-slate-300 mb-0.5 font-bold tabular-nums">
            <span className="text-emerald-400">HP</span>
            <span>{Math.round(playerHp)} / {maxHp}</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-150 rounded-full"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Energy Bar */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[10px] text-slate-300 mb-0.5 font-bold tabular-nums">
            <span className="text-sky-400">ENERGIA</span>
            <span>{Math.round(playerEnergy)} / {maxEnergy}</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-150 rounded-full"
              style={{ width: `${energyPercent}%` }}
            />
          </div>
        </div>

        {/* EXP Bar */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[10px] text-slate-300 mb-0.5 font-bold tabular-nums">
            <span className="text-amber-400">EXP</span>
            <span>{expPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-150 rounded-full"
              style={{ width: `${expPercent}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
