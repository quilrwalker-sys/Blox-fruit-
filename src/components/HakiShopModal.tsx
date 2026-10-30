import React, { useState, useEffect } from 'react';
import { HakiColor, PlayerStats } from '../types/game';
import { HAKI_COLORS } from '../data/hakiColors';
import { sound } from '../utils/audio';

interface HakiShopModalProps {
  stats: PlayerStats;
  activeHakiColorId?: string;
  unlockedHakiColorIds: string[];
  onBuyHakiColor: (color: HakiColor) => void;
  onEquipHakiColor: (colorId: string) => void;
  onClose: () => void;
}

export const HakiShopModal: React.FC<HakiShopModalProps> = ({
  stats,
  activeHakiColorId,
  unlockedHakiColorIds,
  onBuyHakiColor,
  onEquipHakiColor,
  onClose,
}) => {
  const [selectedRarityFilter, setSelectedRarityFilter] = useState<string>('Todas');
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPulseTick((t) => t + 1), 60);
    return () => clearInterval(interval);
  }, []);

  const publicHakiColors = HAKI_COLORS.filter((c) => !c.adminOnly);
  const filteredColors = publicHakiColors.filter((c) => {
    if (selectedRarityFilter === 'Todas') return true;
    return c.rarity === selectedRarityFilter;
  });

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'Mítica':
        return 'bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 text-white border-cyan-300 shadow-lg shadow-blue-900/50 animate-pulse';
      case 'Lendária':
        return 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-400 shadow-md shadow-red-950/60';
      case 'Rara':
        return 'bg-purple-600/30 text-purple-300 border-purple-500/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-4xl bg-slate-950 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-2xl shadow-inner shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-amber-400">
                  Loja de Cores & Hakis Comprados
                </h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Coleção ({unlockedHakiColorIds.filter((id) => publicHakiColors.some((c) => c.id === id)).length}/{publicHakiColors.length})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Compre qualquer cor de aura de Busoshoku Haki permanentemente com Beli e Fragmentos!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Currency & Rarity Filter Bar */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 font-bold text-emerald-400 tabular-nums bg-slate-950 px-3 py-1 rounded-lg border border-emerald-500/30">
              <span>฿</span>
              <span>{stats.beli.toLocaleString()} Beli</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-purple-300 tabular-nums bg-slate-950 px-3 py-1 rounded-lg border border-purple-500/30">
              <span>🟣</span>
              <span>{(stats.fragments || 0).toLocaleString()} Frags</span>
            </div>
          </div>

          {/* Rarity filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['Todas', 'Comum', 'Rara', 'Lendária', 'Mítica'].map((rarity) => (
              <button
                key={rarity}
                onClick={() => {
                  sound.click();
                  setSelectedRarityFilter(rarity);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  selectedRarityFilter === rarity
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {rarity}
              </button>
            ))}
          </div>
        </div>

        {/* Color Catalog Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredColors.map((color) => {
            const isOwned = unlockedHakiColorIds.includes(color.id);
            const isActive = activeHakiColorId === color.id;
            const canAfford =
              stats.beli >= color.priceBeli && (stats.fragments || 0) >= color.priceFragments;

            return (
              <div
                key={color.id}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border flex flex-col justify-between relative overflow-hidden transition-all hover:scale-[1.01]"
                style={{
                  borderColor: isOwned ? color.primaryColor : `${color.primaryColor}55`,
                  boxShadow: isActive ? `0 0 20px ${color.primaryColor}55` : 'none',
                }}
              >
                {/* Background Glow */}
                <div
                  className="absolute -right-12 -top-12 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-15"
                  style={{ backgroundColor: color.primaryColor }}
                />

                <div className="flex items-start gap-4 relative z-10">
                  {/* Orb Preview */}
                  <div
                    className="w-16 h-16 rounded-2xl relative flex items-center justify-center border-2 shrink-0 shadow-lg"
                    style={{
                      borderColor: color.primaryColor,
                      backgroundColor: color.darkColor,
                      boxShadow: `0 0 ${15 + Math.sin(pulseTick * 0.2) * 5}px ${color.primaryColor}`,
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-2xl border border-dashed opacity-60"
                      style={{
                        borderColor: color.secondaryColor,
                        transform: `rotate(${pulseTick * 2}deg)`,
                      }}
                    />
                    <span className="text-xl">⚔️</span>
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getRarityBadgeStyle(
                          color.rarity
                        )}`}
                      >
                        {color.rarity}
                      </span>
                      {isOwned && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                          ✓ JÁ POSSUI
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse">
                          ★ EQUIPADO
                        </span>
                      )}
                    </div>

                    <h3
                      className="text-base font-black tracking-tight truncate"
                      style={{ color: color.secondaryColor }}
                    >
                      {color.name}
                    </h3>

                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {color.description}
                    </p>
                  </div>
                </div>

                {/* Price & Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">฿</span>
                      <span
                        className={`font-mono font-bold ${
                          stats.beli >= color.priceBeli ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {color.priceBeli.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400 font-bold">🟣</span>
                      <span
                        className={`font-mono font-bold ${
                          (stats.fragments || 0) >= color.priceFragments
                            ? 'text-purple-400'
                            : 'text-red-400'
                        }`}
                      >
                        {color.priceFragments.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isOwned ? (
                    isActive ? (
                      <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs">
                        Equipado
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          sound.hakiToggle();
                          onEquipHakiColor(color.id);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                      >
                        ⚡ Equipar
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          onBuyHakiColor(color);
                          sound.legendaryWin();
                        } else {
                          sound.punch();
                        }
                      }}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer ${
                        canAfford
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 hover:scale-105 active:scale-95'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                      }`}
                    >
                      🔮 Comprar Cor
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400">
          💡 Todas as cores compradas ficam salvas permanentemente e podem ser alternadas a qualquer momento!
        </div>
      </div>
    </div>
  );
};
