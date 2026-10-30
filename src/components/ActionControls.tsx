import React from 'react';
import { BloxFruit, HakiSkills, Sword } from '../types/game';
import { sound } from '../utils/audio';

interface ActionControlsProps {
  activeWeaponType: 'melee' | 'sword' | 'fruit';
  onChangeWeapon: (type: 'melee' | 'sword' | 'fruit') => void;
  activeFruit: BloxFruit | null;
  activeSword: Sword | null;
  haki: HakiSkills;
  onToggleBusoHaki: () => void;
  onToggleKenHaki: () => void;
  autoFarm: boolean;
  onToggleAutoFarm: () => void;
  onTriggerAttack: () => void;
  onTriggerDash: () => void;
  onTriggerSkill: (key: 'Z' | 'X' | 'C' | 'V') => void;
  isMobile?: boolean;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  activeWeaponType,
  onChangeWeapon,
  activeFruit,
  activeSword,
  haki,
  onToggleBusoHaki,
  onToggleKenHaki,
  autoFarm,
  onToggleAutoFarm,
  onTriggerAttack,
  onTriggerDash,
  onTriggerSkill,
  isMobile = false,
}) => {
  const activeSkills = activeWeaponType === 'fruit' ? activeFruit?.skills : activeSword?.skills;

  // ============================================================================
  // MOBILE-ONLY COMBAT DECK (Celular) — Desktop version below remains 100% untouched
  // ============================================================================
  if (isMobile) {
    const maxB = haki.maxBusoEnergy || 30;
    const curB = haki.busoEnergy ?? maxB;
    const isBusoRecharging = !haki.busoHakiActive && curB < maxB;

    const maxK = haki.maxKenEnergy || 5;
    const curK = haki.kenEnergy ?? maxK;
    const isKenRecharging = !haki.kenHakiActive && curK < maxK;

    return (
      <footer className="w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2.5 py-2 flex flex-col gap-2 text-white shrink-0 select-none overflow-x-hidden shadow-[0_-8px_25px_rgba(0,0,0,0.6)]">
        {/* Top Row: Weapon Slot Dock & Haki / Auto Toggles */}
        <div className="flex items-center justify-between gap-1.5 w-full">
          {/* Weapon Switcher Pills */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => {
                sound.click();
                onChangeWeapon('melee');
              }}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all active:scale-95 ${
                activeWeaponType === 'melee'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm'
                  : 'text-slate-400'
              }`}
            >
              🥊 Soco
            </button>
            <button
              onClick={() => {
                sound.click();
                if (activeSword) onChangeWeapon('sword');
              }}
              disabled={!activeSword}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all active:scale-95 ${
                activeWeaponType === 'sword'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm'
                  : activeSword
                  ? 'text-slate-400'
                  : 'text-slate-700 opacity-50'
              }`}
            >
              🗡️ Espada
            </button>
            <button
              onClick={() => {
                sound.click();
                if (activeFruit) onChangeWeapon('fruit');
              }}
              disabled={!activeFruit}
              className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition-all active:scale-95 ${
                activeWeaponType === 'fruit'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm'
                  : activeFruit
                  ? 'text-slate-400'
                  : 'text-slate-700 opacity-50'
              }`}
            >
              🔮 Fruta
            </button>
          </div>

          {/* Right: Buso, Ken & Auto-Farm Pills */}
          <div className="flex items-center gap-1 shrink-0">
            {haki.busoHaki && (
              <button
                onClick={onToggleBusoHaki}
                className={`relative overflow-hidden px-2 py-1 rounded-lg border text-[10px] font-black transition-all active:scale-95 ${
                  haki.busoHakiActive
                    ? 'bg-purple-950 border-purple-400 text-purple-100 ring-1 ring-purple-400'
                    : isBusoRecharging
                    ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    isBusoRecharging ? 'bg-amber-500/30' : 'bg-purple-600/35'
                  }`}
                  style={{ width: `${(curB / maxB) * 100}%` }}
                />
                <span className="relative z-10 flex items-center gap-1">
                  <span>🟣Buso</span>
                  <span className="font-mono text-[9px] tabular-nums">
                    {isBusoRecharging ? `${Math.round((curB / maxB) * 100)}%` : `${Math.ceil(curB)}s`}
                  </span>
                </span>
              </button>
            )}

            {haki.kenHaki && (
              <button
                onClick={onToggleKenHaki}
                className={`relative overflow-hidden px-2 py-1 rounded-lg border text-[10px] font-black transition-all active:scale-95 ${
                  haki.kenHakiActive
                    ? 'bg-sky-950 border-sky-400 text-sky-100 ring-1 ring-sky-400'
                    : isKenRecharging
                    ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    isKenRecharging ? 'bg-amber-500/30' : 'bg-sky-600/35'
                  }`}
                  style={{ width: `${(curK / maxK) * 100}%` }}
                />
                <span className="relative z-10 flex items-center gap-1">
                  <span>👁️Ken</span>
                  <span className="font-mono text-[9px] tabular-nums">
                    {isKenRecharging ? `${Math.round((curK / maxK) * 100)}%` : `${curK.toFixed(1)}s`}
                  </span>
                </span>
              </button>
            )}

            <button
              onClick={onToggleAutoFarm}
              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all active:scale-95 ${
                autoFarm
                  ? 'bg-emerald-600 border-emerald-300 text-white animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {autoFarm ? '🤖ON' : '🤖OFF'}
            </button>
          </div>
        </div>

        {/* Bottom Row: 4 Skill Slots (Left) + Primary Thumb Combat Buttons (Right) */}
        <div className="grid grid-cols-12 gap-1.5 items-stretch w-full">
          {/* 4 Skill Buttons (7 cols) */}
          <div className="col-span-7 grid grid-cols-4 gap-1">
            {(['Z', 'X', 'C', 'V'] as const).map((key) => {
              const skill = activeSkills?.find((s) => s.key === key);
              const hasSkill = !!skill;

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (hasSkill) onTriggerSkill(key);
                  }}
                  disabled={!hasSkill}
                  className={`relative min-h-[46px] px-1 py-1 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95 overflow-hidden ${
                    hasSkill
                      ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-500/40 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-600'
                  }`}
                >
                  <span
                    className={`text-[9px] font-mono font-black px-1.5 rounded mb-0.5 ${
                      hasSkill ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 text-slate-600'
                    }`}
                  >
                    {key}
                  </span>
                  <span className="text-[9px] font-bold truncate w-full text-center leading-tight">
                    {skill ? skill.name.split(' ')[0] : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right-Thumb Dash & Attack Triggers (5 cols) */}
          <div className="col-span-5 grid grid-cols-5 gap-1.5">
            <button
              onClick={onTriggerDash}
              className="col-span-2 min-h-[46px] rounded-xl bg-gradient-to-b from-sky-600 to-sky-800 border border-sky-400/50 text-white font-black text-[11px] flex flex-col items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <span className="text-sm leading-none">⚡</span>
              <span className="text-[9px] tracking-tight mt-0.5">DASH</span>
            </button>

            <button
              onClick={onTriggerAttack}
              className="col-span-3 min-h-[46px] rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-orange-600 border border-red-400/60 text-white font-black text-xs flex items-center justify-center gap-1 shadow-lg shadow-red-950/80 active:scale-95 transition-transform"
            >
              <span className="text-base">⚔️</span>
              <span>ATACAR</span>
            </button>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2 sm:p-2.5 flex flex-col gap-2 text-white shrink-0 select-none overflow-x-hidden">
      {/* Top Row: Weapon Tabs & Haki Toggles */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap w-full">
        {/* Weapon Style Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 flex-1 sm:flex-initial justify-center sm:justify-start">
          <button
            onClick={() => {
              sound.click();
              onChangeWeapon('melee');
            }}
            className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              activeWeaponType === 'melee'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🥊 Soco
          </button>
          <button
            onClick={() => {
              sound.click();
              if (activeSword) onChangeWeapon('sword');
            }}
            disabled={!activeSword}
            className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              activeWeaponType === 'sword'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : activeSword
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title={activeSword ? activeSword.name : 'Nenhuma espada equipada'}
          >
            🗡️ Espada
          </button>
          <button
            onClick={() => {
              sound.click();
              if (activeFruit) onChangeWeapon('fruit');
            }}
            disabled={!activeFruit}
            className={`flex-1 sm:flex-initial px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              activeWeaponType === 'fruit'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : activeFruit
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title={activeFruit ? activeFruit.portugueseName : 'Nenhuma fruta equipada'}
          >
            🔮 Fruta
          </button>
        </div>

        {/* Haki & Auto-Farm Quick Actions */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {haki.busoHaki && (() => {
            const maxB = haki.maxBusoEnergy || 30;
            const curB = haki.busoEnergy ?? maxB;
            const isRecharging = !haki.busoHakiActive && curB < maxB;
            return (
              <button
                onClick={onToggleBusoHaki}
                className={`relative overflow-hidden px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  haki.busoHakiActive
                    ? 'bg-purple-900/90 border-purple-400 text-purple-100 shadow-sm shadow-purple-500/40 ring-1 ring-purple-400'
                    : isRecharging
                    ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Armamento Haki (J) - 30s duração / 45s recarga"
              >
                <div
                  className={`absolute inset-0 transition-all duration-200 pointer-events-none ${
                    isRecharging ? 'bg-amber-500/30' : 'bg-purple-600/30'
                  }`}
                  style={{ width: `${(curB / maxB) * 100}%` }}
                />
                <span className="relative z-10 flex items-center gap-1.5">
                  <span>🟣 Buso [J]</span>
                  <span className={`font-mono text-[10px] ${isRecharging ? 'text-amber-300 font-black' : 'text-purple-300'}`}>
                    {isRecharging ? `${Math.round((curB / maxB) * 100)}%` : `${Math.ceil(curB)}s`}
                  </span>
                </span>
              </button>
            );
          })()}

          {haki.kenHaki && (() => {
            const maxK = haki.maxKenEnergy || 5;
            const curK = haki.kenEnergy ?? maxK;
            const isRecharging = !haki.kenHakiActive && curK < maxK;
            return (
              <button
                onClick={onToggleKenHaki}
                className={`relative overflow-hidden px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  haki.kenHakiActive
                    ? 'bg-sky-900/90 border-sky-400 text-sky-100 shadow-sm shadow-sky-500/40 ring-1 ring-sky-400'
                    : isRecharging
                    ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Instinto Ken Haki (E) - 5s duração / 30s recarga"
              >
                <div
                  className={`absolute inset-0 transition-all duration-200 pointer-events-none ${
                    isRecharging ? 'bg-amber-500/30' : 'bg-sky-600/30'
                  }`}
                  style={{ width: `${(curK / maxK) * 100}%` }}
                />
                <span className="relative z-10 flex items-center gap-1.5">
                  <span>👁️ Ken [E]</span>
                  <span className={`font-mono text-[10px] ${isRecharging ? 'text-amber-300 font-black' : 'text-sky-300'}`}>
                    {isRecharging ? `${Math.round((curK / maxK) * 100)}%` : `${curK.toFixed(1)}s`}
                  </span>
                </span>
              </button>
            );
          })()}

          <button
            onClick={onToggleAutoFarm}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              autoFarm
                ? 'bg-emerald-600 text-white animate-pulse shadow-sm shadow-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
            title="Auto-Farm: Seu pirata ataca e caça os inimigos da missão automaticamente"
          >
            {autoFarm ? '🤖 Auto: ON' : '🤖 Auto: OFF'}
          </button>
        </div>
      </div>

      {/* Primary Action Buttons: Attack, Dash & Skills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
        {/* Attack & Dash Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerAttack}
            className="flex-1 sm:flex-initial px-5 py-2 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-950/60 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-red-400/40"
            title="Atacar (Espaço ou Clique)"
          >
            <span>⚔️</span>
            <span>ATACAR [Espaço]</span>
          </button>

          <button
            onClick={onTriggerDash}
            className="px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-sky-700 hover:bg-sky-600 text-white transition-transform active:scale-95 cursor-pointer flex items-center gap-1 border border-sky-500/40"
            title="Flash Step (Q)"
          >
            <span>⚡</span>
            <span>DASH [Q]</span>
          </button>
        </div>

        {/* Skill Buttons Grid (Z, X, C, V) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
          {(['Z', 'X', 'C', 'V'] as const).map((key) => {
            const skill = activeSkills?.find((s) => s.key === key);
            const hasSkill = !!skill;

            return (
              <button
                key={key}
                onClick={() => {
                  if (hasSkill) onTriggerSkill(key);
                }}
                disabled={!hasSkill}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all truncate text-center ${
                  hasSkill
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 shadow-sm active:scale-95 cursor-pointer'
                    : 'bg-slate-950/50 text-slate-600 border border-slate-800/50 cursor-not-allowed'
                }`}
                title={skill ? `${skill.name} (${skill.energyCost} EN)` : 'Sem habilidade'}
              >
                [{key}] {skill ? skill.name : '—'}
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
