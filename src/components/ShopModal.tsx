import React, { useState } from 'react';
import { HAKI_UPGRADES, SWORDS } from '../data/gameData';
import { HakiSkills, Sword } from '../types/game';
import { sound } from '../utils/audio';

interface ShopModalProps {
  beli: number;
  playerLevel: number;
  ownedSwordIds: string[];
  activeSword: Sword | null;
  haki: HakiSkills;
  onBuySword: (sword: Sword) => void;
  onEquipSword: (sword: Sword | null) => void;
  onUnlockHaki: (hakiId: 'buso_haki' | 'ken_haki' | 'geppo' | 'soru', cost: number) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  beli,
  playerLevel,
  ownedSwordIds,
  activeSword,
  haki,
  onBuySword,
  onEquipSword,
  onUnlockHaki,
  onClose,
}) => {
  const [tab, setTab] = useState<'swords' | 'haki'>('swords');

  const renderSwordIllustration = (swordId: string, color: string) => {
    switch (swordId) {
      case 'sword_katana':
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">
            {/* Curved Katana Blade */}
            <path d="M22 42 Q38 24 56 8 L58 11 Q42 29 25 45 Z" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
            <path d="M24 44 Q40 27 57 10" stroke="#ffffff" strokeWidth="1.2" fill="none" />
            {/* Golden Tsuba Guard */}
            <ellipse cx="22" cy="42" rx="6" ry="2.5" transform="rotate(-45 22 42)" fill="#facc15" stroke="#854d0e" strokeWidth="1.2" />
            {/* Wrapped Tsuka Handle */}
            <path d="M10 54 L20 44" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
            <path d="M10 54 L20 44" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="2 2" />
          </svg>
        );
      case 'sword_dual_katana':
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]">
            {/* Crossed Katana 1 */}
            <path d="M18 46 Q35 26 54 10 L56 13 Q38 30 21 49 Z" fill="#f8fafc" stroke="#475569" strokeWidth="1.3" />
            <ellipse cx="19" cy="47" rx="5.5" ry="2" transform="rotate(-45 19 47)" fill="#facc15" />
            <path d="M9 57 L18 48" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
            {/* Crossed Katana 2 */}
            <path d="M46 46 Q29 26 10 10 L8 13 Q26 30 43 49 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.3" />
            <ellipse cx="45" cy="47" rx="5.5" ry="2" transform="rotate(45 45 47)" fill="#facc15" />
            <path d="M55 57 L46 48" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );
      case 'sword_saber':
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_10px_rgba(245,158,11,0.55)]">
            {/* Sweeping Royal Saber Blade */}
            <path d="M21 41 Q35 20 56 8 L58 14 Q40 28 25 45 Z" fill="#fef08a" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M23 43 Q38 25 56 12" stroke="#ffffff" strokeWidth="1.5" fill="none" />
            {/* Golden D-Guard Basket Hilt */}
            <path d="M17 37 L27 47 Q19 56 11 49" fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            {/* Crimson Grip */}
            <path d="M12 52 L21 43" stroke="#991b1b" strokeWidth="5" strokeLinecap="round" />
            <circle cx="22" cy="42" r="2.5" fill="#ef4444" />
          </svg>
        );
      case 'sword_midnight':
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]">
            {/* Cursed Serrated Shadow Blade */}
            <path d="M22 42 L32 26 L35 29 L46 15 L58 7 L45 27 L25 45 Z" fill="#4c1d95" stroke="#e879f9" strokeWidth="1.5" />
            {/* Bat-Wing Guard */}
            <path d="M14 34 L23 41 L30 50 L21 43 Z" fill="#1e1b4b" stroke="#d946ef" strokeWidth="1.5" />
            <circle cx="22" cy="42" r="3" fill="#f43f5e" />
            {/* Dark Handle */}
            <path d="M10 54 L20 44" stroke="#2e1065" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="9" cy="55" r="2.5" fill="#c084fc" />
          </svg>
        );
      case 'sword_yoru':
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_14px_rgba(16,185,129,0.75)]">
            {/* Giant Curved Black Blade (Kokuto Yoru) */}
            <path d="M23 39 Q38 20 55 6 L59 12 Q45 28 27 43 Z" fill="#09090b" stroke="#10b981" strokeWidth="1.8" />
            <path d="M26 42 Q43 27 58 11" stroke="#6ee7b7" strokeWidth="1.4" fill="none" />
            {/* Ornate Golden Crossguard */}
            <path d="M13 29 L35 51" stroke="#facc15" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="24" cy="40" r="3" fill="#10b981" />
            {/* Long Wrapped Handle */}
            <path d="M8 56 L22 42" stroke="#312e81" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="8" cy="56" r="3" fill="#facc15" />
          </svg>
        );
      case 'sword_mihawk_dagger':
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow-[0_0_14px_rgba(250,204,21,0.75)]">
            {/* Pendant Ring */}
            <circle cx="11" cy="53" r="3.5" fill="none" stroke="#facc15" strokeWidth="2" />
            {/* Golden Cross Body */}
            <path d="M14 50 L28 36" stroke="#facc15" strokeWidth="6" strokeLinecap="round" />
            <path d="M13 27 L37 51" stroke="#facc15" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="25" cy="39" r="3" fill="#10b981" />
            {/* Kogatana Dagger Blade */}
            <path d="M27 34 L52 12 L49 18 L30 37 Z" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.5" />
          </svg>
        );
      default:
        return (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black"
            style={{ backgroundColor: `${color}22`, color }}
          >
            ⚔️
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-white max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-amber-400">
              Arsenal & Mestre de Haki
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Seu Saldo: <span className="text-emerald-400 font-bold tabular-nums">฿ {beli.toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="text-slate-400 hover:text-white text-lg p-1 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 my-3 p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => {
              sound.click();
              setTab('swords');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              tab === 'swords'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ferreiro de Espadas
          </button>
          <button
            onClick={() => {
              sound.click();
              setTab('haki');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              tab === 'haki'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Haki & Mobilidade
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
          {tab === 'swords' && (
            <div className="space-y-3">
              {SWORDS.filter((s) => !s.adminOnly && s.id !== 'sword_triple_dark_blade').map((sword) => {
                const isOwned = ownedSwordIds.includes(sword.id);
                const isEquipped = activeSword?.id === sword.id;
                const canAfford = beli >= sword.priceBeli;
                const meetsLevel = playerLevel >= sword.levelReq;

                return (
                  <div
                    key={sword.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isEquipped
                        ? 'bg-emerald-950/20 border-emerald-500/50'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center shrink-0">
                          {renderSwordIllustration(sword.id, sword.color)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{sword.name}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{ backgroundColor: `${sword.color}22`, color: sword.color }}
                            >
                              {sword.rarity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{sword.description}</p>
                          <div className="flex items-center gap-3 text-xs mt-2 font-mono">
                            <span className="text-sky-400">Dano Base: +{sword.damage}</span>
                            <span className="text-slate-400">Nível Req: {sword.levelReq}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isOwned ? (
                          isEquipped ? (
                            <button
                              onClick={() => {
                                onEquipSword(null);
                                sound.click();
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                            >
                              Desequipar
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onEquipSword(sword);
                                sound.slash();
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                            >
                              Equipar
                            </button>
                          )
                        ) : sword.id === 'sword_mihawk_dagger' ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-amber-400 block">
                              ✝️ Drop 0.5% (Mihawk)
                            </span>
                            <span className="inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300">
                              Derrote em 5 min
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-emerald-400 block tabular-nums">
                              ฿ {sword.priceBeli.toLocaleString()}
                            </span>
                            <button
                              onClick={() => {
                                onBuySword(sword);
                                sound.levelUp();
                              }}
                              disabled={!canAfford || !meetsLevel}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              Comprar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'haki' && (
            <div className="space-y-3">
              {HAKI_UPGRADES.map((upgrade) => {
                let isUnlocked = false;
                if (upgrade.id === 'buso_haki') isUnlocked = haki.busoHaki;
                if (upgrade.id === 'ken_haki') isUnlocked = haki.kenHaki;
                if (upgrade.id === 'geppo') isUnlocked = haki.geppo;
                if (upgrade.id === 'soru') isUnlocked = haki.soru;

                const canAfford = beli >= upgrade.priceBeli;

                return (
                  <div
                    key={upgrade.id}
                    className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-400">{upgrade.name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                          Tecla: {upgrade.keybind}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{upgrade.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      {isUnlocked ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded block">
                          Aprendido ✓
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-emerald-400 block tabular-nums">
                            ฿ {upgrade.priceBeli.toLocaleString()}
                          </span>
                          <button
                            onClick={() => {
                              onUnlockHaki(upgrade.id as 'buso_haki' | 'ken_haki' | 'geppo' | 'soru', upgrade.priceBeli);
                              sound.hakiToggle();
                            }}
                            disabled={!canAfford}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            Aprender
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
