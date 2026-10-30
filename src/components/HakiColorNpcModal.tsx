import React, { useState, useEffect } from 'react';
import { HakiColor, PlayerStats } from '../types/game';
import { HAKI_COLORS, getHakiColorById } from '../data/hakiColors';
import { sound } from '../utils/audio';

interface HakiColorNpcModalProps {
  currentOffer: HakiColor;
  timeRemainingSeconds: number;
  currentIslandName: string;
  stats: PlayerStats;
  activeHakiColorId?: string;
  unlockedHakiColorIds: string[];
  onBuyHakiColor: (color: HakiColor) => void;
  onEquipHakiColor: (colorId: string) => void;
  onClose: () => void;
}

export const HakiColorNpcModal: React.FC<HakiColorNpcModalProps> = ({
  currentOffer,
  timeRemainingSeconds,
  currentIslandName,
  stats,
  activeHakiColorId,
  unlockedHakiColorIds,
  onBuyHakiColor,
  onEquipHakiColor,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'offer' | 'collection'>('offer');

  // Format remaining seconds into MM:SS
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const publicHakiColors = HAKI_COLORS.filter((c) => !c.adminOnly);
  const publicUnlockedCount = unlockedHakiColorIds.filter((id) =>
    publicHakiColors.some((c) => c.id === id)
  ).length;

  const isOfferUnlocked = unlockedHakiColorIds.includes(currentOffer.id);
  const isOfferActive = activeHakiColorId === currentOffer.id;
  const canAfford =
    stats.beli >= currentOffer.priceBeli && (stats.fragments || 0) >= currentOffer.priceFragments;

  // Pulse animation tick for the live aura preview
  const [pulseTick, setPulseTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPulseTick((t) => t + 1), 60);
    return () => clearInterval(interval);
  }, []);

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
      <div
        className="w-full max-w-2xl bg-slate-950 border-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white transition-all"
        style={{
          borderColor: currentOffer.primaryColor,
          boxShadow: `0 0 35px ${currentOffer.primaryColor}33`,
        }}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border"
              style={{
                backgroundColor: `${currentOffer.primaryColor}22`,
                borderColor: currentOffer.primaryColor,
                boxShadow: `0 0 15px ${currentOffer.primaryColor}55`,
              }}
            >
              🧙‍♂️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  Mestre das Cores de Haki
                </h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Viajante dos Mares
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Localização atual: <strong className="text-sky-300">{currentIslandName}</strong> • Aparece a cada 15 minutos em qualquer ilha
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

        {/* 15-Minute Countdown Banner */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-slate-300">
              Próxima Rotação de Ilha & Cor:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-sm font-black px-3 py-0.5 rounded-md bg-slate-950 border border-amber-500/50 text-amber-400 tracking-wider">
              ⏱ {formattedTimer}
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Estoque: 1 Cor por ciclo)
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4">
          <button
            onClick={() => {
              sound.click();
              setActiveTab('offer');
            }}
            className={`py-2.5 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-colors cursor-pointer ${
              activeTab === 'offer'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            ✨ Cor Ofertada Agora
          </button>
          <button
            onClick={() => {
              sound.click();
              setActiveTab('collection');
            }}
            className={`py-2.5 px-4 text-xs font-black tracking-wider uppercase border-b-2 transition-colors cursor-pointer ${
              activeTab === 'collection'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🎨 Minhas Cores ({publicUnlockedCount}/{publicHakiColors.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'offer' ? (
            <div className="space-y-5">
              {/* Main Offering Card */}
              <div
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border relative overflow-hidden"
                style={{ borderColor: `${currentOffer.primaryColor}88` }}
              >
                {/* Background Ambient Glow */}
                <div
                  className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
                  style={{ backgroundColor: currentOffer.primaryColor }}
                />

                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                  {/* Live Animated Aura Orb / Character Preview */}
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full relative flex items-center justify-center border-2 shadow-2xl transition-all"
                      style={{
                        borderColor: currentOffer.primaryColor,
                        backgroundColor: currentOffer.darkColor,
                        boxShadow: `0 0 ${25 + Math.sin(pulseTick * 0.2) * 10}px ${currentOffer.primaryColor}`,
                      }}
                    >
                      {/* Outer pulsing energy ring */}
                      <div
                        className="absolute inset-0 rounded-full border-2 border-dashed opacity-75"
                        style={{
                          borderColor: currentOffer.secondaryColor,
                          transform: `scale(${1.15 + Math.sin(pulseTick * 0.15) * 0.08}) rotate(${pulseTick * 1.5}deg)`,
                        }}
                      />
                      {/* Secondary resonant ring */}
                      <div
                        className="absolute inset-0 rounded-full border border-solid opacity-50"
                        style={{
                          borderColor: currentOffer.primaryColor,
                          transform: `scale(${1.3 + Math.cos(pulseTick * 0.12) * 0.06})`,
                        }}
                      />
                      {/* Inner character silhouette */}
                      <div className="relative text-center">
                        <span className="text-3xl filter drop-shadow">⚔️</span>
                        <div
                          className="w-10 h-2 rounded-full mx-auto mt-1 blur-xs"
                          style={{ backgroundColor: currentOffer.primaryColor }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-2">
                      Prévia de Buso Haki
                    </span>
                  </div>

                  {/* Offer Info */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <span
                        className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${getRarityBadgeStyle(
                          currentOffer.rarity
                        )}`}
                      >
                        {currentOffer.rarity}
                      </span>
                      {currentOffer.rarity === 'Mítica' && (
                        <span className="text-[10px] font-black tracking-widest text-cyan-300 animate-pulse bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/50">
                          ★ ULTRA RARA (LEVIATHAN)
                        </span>
                      )}
                      {(currentOffer.id === 'haki_blood_red' ||
                        currentOffer.id === 'haki_kitsune_blue' ||
                        currentOffer.id === 'haki_dark_blade_green') && (
                        <span className="text-[10px] font-black tracking-widest text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-400/50">
                          ★ RARA DO VIAJANTE
                        </span>
                      )}
                    </div>

                    <h3
                      className="text-2xl font-black tracking-tight"
                      style={{ color: currentOffer.secondaryColor }}
                    >
                      {currentOffer.name}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentOffer.description}
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 font-mono">
                      <strong className="text-amber-400">Efeito Visual:</strong>{' '}
                      {currentOffer.auraVisualDescription}
                    </div>

                    {/* Price Tag */}
                    <div className="flex items-center justify-center sm:justify-start gap-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold text-sm">฿</span>
                        <span
                          className={`font-mono text-sm font-black ${
                            stats.beli >= currentOffer.priceBeli
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {currentOffer.priceBeli.toLocaleString()} Beli
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-400 font-bold text-sm">🟣</span>
                        <span
                          className={`font-mono text-sm font-black ${
                            (stats.fragments || 0) >= currentOffer.priceFragments
                              ? 'text-purple-400'
                              : 'text-red-400'
                          }`}
                        >
                          {currentOffer.priceFragments.toLocaleString()} Frags
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    Seu saldo: <span className="text-emerald-400 font-mono font-bold">฿ {stats.beli.toLocaleString()}</span> •{' '}
                    <span className="text-purple-400 font-mono font-bold">🟣 {(stats.fragments || 0).toLocaleString()}</span>
                  </div>

                  {isOfferUnlocked ? (
                    isOfferActive ? (
                      <div className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                        <span>✓</span>
                        <span>Cor Equipada no seu Buso Haki</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          onEquipHakiColor(currentOffer.id);
                          sound.hakiToggle();
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>⚡ Equipar {currentOffer.name}</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          onBuyHakiColor(currentOffer);
                          sound.legendaryWin();
                        } else {
                          sound.punch();
                        }
                      }}
                      disabled={!canAfford}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                        canAfford
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/50 hover:scale-105 active:scale-95'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                      }`}
                    >
                      <span>🔮 Desbloquear Cor Permanente</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Information Lore */}
              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <span>📜 Regras do Mestre de Haki:</span>
                </div>
                <p>
                  • O NPC viaja aleatoriamente entre todas as ilhas a cada <strong>15 minutos</strong> exatos, oferecendo apenas <strong>uma única cor por visita</strong>.
                </p>
                <p>
                  • As cores mais lendárias como <strong className="text-red-400">Vermelho Sangue</strong>, <strong className="text-cyan-400">Azul Kitsune</strong>, <strong className="text-emerald-400">Verde Dark Blade</strong> e a mítica <strong className="text-blue-400">Azul Marinho Leviathan</strong> possuem aparição raríssima e exigem grande investimento em Beli e Fragmentos.
                </p>
                <p>
                  • Uma vez comprada, a cor de Haki é sua para sempre e pode ser alternada a qualquer instante!
                </p>
              </div>
            </div>
          ) : (
            /* Collection Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Clique em qualquer cor adquirida para equipá-la em seu personagem:
                </span>
                <span className="text-xs font-mono text-amber-400">
                  {publicUnlockedCount} de {publicHakiColors.length} Desbloqueadas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {publicHakiColors.map((color) => {
                  const isUnlocked = unlockedHakiColorIds.includes(color.id);
                  const isActive = activeHakiColorId === color.id;

                  return (
                    <div
                      key={color.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isActive
                          ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-500/40 shadow-lg'
                          : isUnlocked
                          ? 'bg-slate-900/70 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-950/50 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Color swatch orb */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 shadow"
                          style={{
                            backgroundColor: isUnlocked ? color.darkColor : '#18181b',
                            borderColor: isUnlocked ? color.primaryColor : '#3f3f46',
                            boxShadow: isUnlocked ? `0 0 10px ${color.primaryColor}` : 'none',
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{
                              backgroundColor: isUnlocked ? color.secondaryColor : '#52525b',
                            }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-xs font-bold"
                              style={{ color: isUnlocked ? color.secondaryColor : '#94a3b8' }}
                            >
                              {color.name}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${getRarityBadgeStyle(
                                color.rarity
                              )}`}
                            >
                              {color.rarity}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block line-clamp-1 mt-0.5">
                            {isUnlocked ? color.auraVisualDescription : 'Bloqueado (Viajante de Haki)'}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isActive ? (
                          <span className="text-[11px] font-bold text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                            Equipado
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => {
                              onEquipHakiColor(color.id);
                              sound.hakiToggle();
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                          >
                            Equipar
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            🔒 Bloqueada
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
