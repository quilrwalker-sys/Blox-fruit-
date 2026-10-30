import React, { useState } from 'react';
import { PlayerStats } from '../types/game';
import { sound } from '../utils/audio';

interface StatsModalProps {
  stats: PlayerStats;
  masteryUses: { melee: number; sword: number; fruit: number };
  onAllocatePoints: (category: 'melee' | 'defense' | 'sword' | 'bloxFruit', amount: number) => void;
  onResetStats: () => void;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  masteryUses,
  onAllocatePoints,
  onResetStats,
  onClose,
}) => {
  const [pointStep, setPointStep] = useState<number>(1);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  const categories: Array<{
    key: 'melee' | 'defense' | 'sword' | 'bloxFruit';
    name: string;
    description: string;
    current: number;
    color: string;
    bonusLabel: string;
  }> = [
    {
      key: 'melee',
      name: 'Combate Físico (Melee)',
      description: 'Aumenta o dano dos seus socos e expande a barra de Energia máxima.',
      current: stats.melee,
      color: 'text-amber-400',
      bonusLabel: `+${stats.melee * 5} Energia Máx · +${(stats.melee * 2.5).toFixed(1)} Dano Soco`,
    },
    {
      key: 'defense',
      name: 'Defesa (Vida)',
      description: 'Aumenta consideravelmente sua pontuação máxima de Vida e sobrevivência.',
      current: stats.defense,
      color: 'text-emerald-400',
      bonusLabel: `+${stats.defense * 15} Vida Máx`,
    },
    {
      key: 'sword',
      name: 'Espada (Sword)',
      description: 'Aumenta o poder destrutivo de cortes e habilidades de espadas.',
      current: stats.sword,
      color: 'text-sky-400',
      bonusLabel: `+${(stats.sword * 2.8).toFixed(1)} Dano de Espadas`,
    },
    {
      key: 'bloxFruit',
      name: 'Fruta Blox (Fruit)',
      description: 'Amplifica massivamente o dano de todas as magias elementais da sua fruta.',
      current: stats.bloxFruit,
      color: 'text-purple-400',
      bonusLabel: `+${(stats.bloxFruit * 3.5).toFixed(1)} Dano de Fruta`,
    },
  ];

  const handleAdd = (cat: 'melee' | 'defense' | 'sword' | 'bloxFruit') => {
    if (stats.statPoints <= 0) return;
    const amount = Math.min(stats.statPoints, pointStep);
    onAllocatePoints(cat, amount);
    sound.punch();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sound.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
    >
      <div className="w-full max-w-lg max-h-[88vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 text-white flex flex-col overflow-hidden">
        {/* Header (Always visible at top) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-amber-400">
              Distribuição de Atributos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ganhe 3 pontos a cada nível para fortalecer seu estilo de combate.
            </p>
          </div>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-base flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-3">
          {/* Available Points & Step selector */}
          <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">Pontos Disponíveis:</span>
              <span className="text-2xl font-bold text-amber-400 tabular-nums">
                {stats.statPoints}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="text-xs text-slate-400 mr-1">Quantidade:</span>
              {[1, 5, 20].map((step) => (
                <button
                  key={step}
                  onClick={() => {
                    sound.click();
                    setPointStep(step);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    pointStep === step
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  +{step}
                </button>
              ))}
              <button
                onClick={() => {
                  sound.click();
                  setPointStep(Math.max(1, stats.statPoints));
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  pointStep >= stats.statPoints && stats.statPoints > 0
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Máx
              </button>
            </div>
          </div>

          {/* Categories list */}
          <div className="space-y-2.5">
            {categories.map((cat) => (
              <div
                key={cat.key}
                className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/80 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${cat.color}`}>{cat.name}</span>
                    <span className="text-xs font-semibold text-slate-300 tabular-nums">
                      Lv. {cat.current}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{cat.description}</div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-mono">{cat.bonusLabel}</div>
                </div>

                <button
                  onClick={() => handleAdd(cat.key)}
                  disabled={stats.statPoints <= 0}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer whitespace-nowrap shadow-sm shrink-0"
                >
                  + Adicionar
                </button>
              </div>
            ))}
          </div>

          {/* Mastery Progression Section */}
          <div className="pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">
              Maestria de Combate (+1% Dano a cada 100 usos)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Melee', type: 'melee', color: 'text-amber-400' },
                { label: 'Espada', type: 'sword', color: 'text-sky-400' },
                { label: 'Fruta', type: 'fruit', color: 'text-purple-400' },
              ].map((m) => {
                const uses = masteryUses[m.type as 'melee' | 'sword' | 'fruit'] || 0;
                const bonusPct = Math.floor(uses / 100);
                return (
                  <div
                    key={m.type}
                    className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col items-center text-center"
                  >
                    <span className={`text-xs font-bold ${m.color}`}>{m.label}</span>
                    <span className="text-xs text-white font-mono mt-1">{uses} Usos</span>
                    <span className="text-[10px] text-emerald-400 font-mono mt-0.5">+{bonusPct}% Dano</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer (Always visible at bottom) */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onResetStats();
                  setConfirmReset(false);
                  sound.click();
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
              >
                Confirmar Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                sound.click();
                setConfirmReset(true);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Redefinir Atributos (Grátis)
            </button>
          )}

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
