import React from 'react';
import { ISLANDS } from '../data/gameData';
import { Island } from '../types/game';
import { sound } from '../utils/audio';

interface IslandMapModalProps {
  currentIsland: Island;
  playerLevel: number;
  onTravelToIsland: (island: Island) => void;
  onClose: () => void;
}

export const IslandMapModal: React.FC<IslandMapModalProps> = ({
  currentIsland,
  playerLevel,
  onTravelToIsland,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-white max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-amber-400">
              Mapa do Primeiro Mar (Grand Line)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Navegue entre as ilhas lendárias. Cada ilha possui novos inimigos, chefes e missões de
              alto nível!
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

        {/* Islands Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 pr-1">
          {ISLANDS.map((island) => {
            const isCurrent = currentIsland.id === island.id;
            const meetsLevel = playerLevel >= island.minLevel;

            return (
              <div
                key={island.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{island.name}</span>
                    <span
                      className={`text-[11px] font-bold ${
                        meetsLevel ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {island.recommendedLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{island.description}</p>

                  <div className="text-[11px] text-slate-500 mt-2">
                    Inimigos: {island.enemies.map((e) => e.name).join(' · ')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {meetsLevel ? 'Requisito atingido' : `Requer Nível ${island.minLevel}`}
                  </span>

                  {isCurrent ? (
                    <span className="px-3 py-1 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Você está aqui
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onTravelToIsland(island);
                        sound.dash();
                        onClose();
                      }}
                      disabled={!meetsLevel}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Zarpar Barco
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
