import React, { useState, useEffect } from 'react';
import { BloxFruit, PlayerStats } from '../types/game';
import { sound } from '../utils/audio';
import {
  getFragmentShopState,
  rotateFragmentShopStock,
  markFragmentShopSlotPurchased,
  ShopItemSlot,
} from '../utils/fragmentShopManager';

interface FragmentShopModalProps {
  stats: PlayerStats;
  activeFruit: BloxFruit | null;
  onBuyFruitWithFrags: (fruit: BloxFruit, fragCost: number, autoEquip: boolean) => void;
  onClose: () => void;
}

export const FragmentShopModal: React.FC<FragmentShopModalProps> = ({
  stats,
  activeFruit,
  onBuyFruitWithFrags,
  onClose,
}) => {
  const [shopSlots, setShopSlots] = useState<ShopItemSlot[]>(() => getFragmentShopState().slots);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const state = getFragmentShopState();
    return Math.max(0, Math.ceil((state.nextRestockTimestamp - Date.now()) / 1000));
  });

  // Keep countdown in sync with wall clock timestamp
  useEffect(() => {
    const updateTick = () => {
      const now = Date.now();
      const state = getFragmentShopState();
      const diff = Math.max(0, Math.ceil((state.nextRestockTimestamp - now) / 1000));

      if (diff <= 0) {
        const rotated = rotateFragmentShopStock();
        setShopSlots(rotated.slots);
        setSecondsRemaining(60);
        sound.spinTick();
      } else {
        setShopSlots(state.slots);
        setSecondsRemaining(diff);
      }
    };

    updateTick();
    const interval = setInterval(updateTick, 1000);

    const handleUpdate = () => {
      setShopSlots(getFragmentShopState().slots);
    };
    window.addEventListener('admin_shop_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('admin_shop_updated', handleUpdate);
    };
  }, []);

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'Incompreendido':
        return 'text-cyan-300 font-black border border-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded shadow-lg shadow-cyan-500/30 animate-pulse';
      case 'Mítica':
        return 'text-rose-400 font-bold bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded';
      case 'Lendária':
        return 'text-amber-400 font-bold bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded';
      case 'Épica':
        return 'text-purple-400 font-bold bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded';
      case 'Rara':
        return 'text-sky-400 font-semibold bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 rounded';
      case 'Incomum':
        return 'text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded';
      default:
        return 'text-slate-400 font-medium bg-slate-800 border border-slate-700 px-2 py-0.5 rounded';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-950 border-2 border-purple-500/70 rounded-2xl shadow-2xl shadow-purple-950/60 p-6 text-white my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-500/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🟣</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-purple-300">
                  Santuário das Sombras (Loja de Frutas por Frags)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                  🌎 ESTOQUE GLOBAL SINCRONIZADO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Estoque 100% idêntico e sincronizado em tempo real para todos os jogadores do mundo!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="text-slate-400 hover:text-white text-xl p-1 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Currency & Rotation Timer Strip */}
        <div className="my-3.5 p-3.5 bg-purple-950/40 rounded-xl border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-purple-400/50 shadow-md shrink-0">
              <img
                src="/src/assets/images/fragment_dealer_npc_1792592748484.jpg"
                alt="Mercador dos Fragmentos"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Seu Saldo de Fragmentos:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-purple-400 tabular-nums">
                  🟣 {(stats.fragments || 0).toLocaleString()} Frags
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end">
            <span className="text-xs text-slate-400">Atualização do Estoque em:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-purple-300 font-mono">⏱</span>
              <span className="text-lg font-mono font-bold text-amber-400 tabular-nums bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">O estoque muda a cada 1 minuto</span>
          </div>
        </div>

        {/* How to get Frags info box */}
        <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 mb-3 shrink-0">
          <span className="text-sm">💡</span>
          <span>
            <strong>Como conseguir Fragmentos:</strong> Derrote os <strong>Chefes (Bosses)</strong>{' '}
            das ilhas! Cada Chefe tem chance garantida de dropar <strong>5 Frags</strong> ou a sorte
            rara de um drop de <strong>100 Frags</strong>.
          </span>
        </div>

        {/* Current Stock Grid (4 slots) */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          {shopSlots.map((slot, index) => {
            if (!slot.isAvailable || !slot.fruit) {
              return (
                <div
                  key={index}
                  className="p-5 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2 opacity-60"
                >
                  <span className="text-2xl">{slot.isPurchased ? '✅' : '🔒'}</span>
                  <h4 className="text-sm font-bold text-slate-400">
                    Slot {index + 1}: {slot.fruit ? slot.fruit.portugueseName : index === 3 ? 'Fruta Mítica / Incompreendido' : 'Fruta Lendária'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {slot.isPurchased ? 'VOCÊ JÁ COMPROU ESTA FRUTA NESTA ROTAÇÃO' : 'ESGOTADO NESTA ROTAÇÃO'}
                  </p>
                  <span className="text-[10px] text-purple-400 font-mono">
                    Aguarde a próxima rotação de 1 minuto para nova chance!
                  </span>
                </div>
              );
            }

            const fruit = slot.fruit;
            const canAfford = (stats.fragments || 0) >= slot.fragCost;
            const isCurrent = activeFruit?.id === fruit.id;
            const isLeviathan = fruit.rarity === 'Incompreendido';

            return (
              <div
                key={index}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isLeviathan
                    ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/50 shadow-xl shadow-cyan-950/60'
                    : isCurrent
                    ? 'bg-slate-900 border-amber-500/80 ring-1 ring-amber-500/40'
                    : 'bg-slate-900/70 border-purple-500/30 hover:border-purple-500/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4
                        className="text-base font-black tracking-tight"
                        style={{ color: fruit.iconColor }}
                      >
                        {fruit.portugueseName}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={getRarityBadge(fruit.rarity)}>
                          {fruit.rarity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {fruit.category}
                        </span>
                      </div>
                    </div>

                    {fruit.image && (
                      <img
                        src={fruit.image}
                        alt={fruit.name}
                        className="w-12 h-12 rounded-lg object-cover border border-purple-400/50 shrink-0"
                      />
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                    {fruit.description}
                  </p>

                  <div className="text-[10px] text-slate-500 font-mono mt-1.5">
                    Habilidades: {fruit.skills.map((s) => `[${s.key}] ${s.name}`).join(' · ')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Preço de Fragmentos:</span>
                    <span className="text-sm font-black text-purple-400 font-mono tabular-nums">
                      🟣 {slot.fragCost.toLocaleString()} Frags
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onBuyFruitWithFrags(fruit, slot.fragCost, true);
                        sound.legendaryWin();
                        const updated = markFragmentShopSlotPurchased(index);
                        setShopSlots([...updated.slots]);
                      }}
                      disabled={!canAfford}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                      title="Comer e Equipar Imediatamente"
                    >
                      Comprar & Comer
                    </button>
                    <button
                      onClick={() => {
                        onBuyFruitWithFrags(fruit, slot.fragCost, false);
                        sound.click();
                        const updated = markFragmentShopSlotPurchased(index);
                        setShopSlots([...updated.slots]);
                      }}
                      disabled={!canAfford}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Guardar no Baú de Frutas"
                    >
                      + Baú
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-purple-500/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Dica: Derrote o Chefe da Ilha repetidamente para acumular fragmentos e comprar as frutas mais raras!
          </span>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
          >
            Fechar Loja
          </button>
        </div>
      </div>
    </div>
  );
};
