import React from 'react';
import { ActiveQuest, Island, QuestDefinition } from '../types/game';
import { sound } from '../utils/audio';

interface QuestModalProps {
  currentIsland: Island;
  playerLevel: number;
  activeQuest: ActiveQuest | null;
  autoFarm?: boolean;
  onAcceptQuest: (quest: QuestDefinition) => void;
  onAbandonQuest: () => void;
  onClose: () => void;
}

export const QuestModal: React.FC<QuestModalProps> = ({
  currentIsland,
  playerLevel,
  activeQuest,
  autoFarm = false,
  onAcceptQuest,
  onAbandonQuest,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-amber-400">
                Quadro de Missões: {currentIsland.name}
              </h2>
              {autoFarm && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-500 text-slate-950 animate-pulse">
                  Auto-Farm Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Derrote inimigos da ilha para faturar EXP massivo e subir de nível rapidamente!
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

        {/* Auto Farm Banner Notice */}
        {autoFarm && (
          <div className="my-2.5 p-3 bg-emerald-950/80 border-2 border-emerald-500 rounded-xl flex items-center gap-3 shrink-0 shadow-lg shadow-emerald-950/50">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shrink-0">
              🤖
            </div>
            <div className="flex-1">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider block">
                Seleção de Missão para Auto-Farm
              </span>
              <p className="text-[11px] text-emerald-100/90 leading-tight mt-0.5">
                Escolha a missão desejada abaixo. O jogador irá caçar os alvos automaticamente e, <strong>assim que a missão for concluída, ela será reiniciada e pega novamente de forma 100% automática!</strong>
              </p>
            </div>
          </div>
        )}

        {/* Current Active Quest Notice */}
        {activeQuest && (
          <div className="my-2 p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 block">
                  Missão em Andamento: {activeQuest.title}
                </span>
                {autoFarm && (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                    Loop Ativo 🔄
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-300">
                Progresso: {activeQuest.currentCount} / {activeQuest.targetCount} derrotados
              </span>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Deseja cancelar esta missão atual?')) {
                  onAbandonQuest();
                  sound.click();
                }
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Quests list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
          {currentIsland.quests.map((quest) => {
            const meetsLevel = playerLevel >= quest.levelRequired;
            const isCurrent = activeQuest?.questId === quest.id;

            return (
              <div
                key={quest.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? autoFarm
                      ? 'bg-emerald-950/30 border-emerald-500/70 ring-1 ring-emerald-500/40'
                      : 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {quest.title}
                      {isCurrent && autoFarm && (
                        <span className="text-[10px] text-emerald-400 font-normal">
                          (Loop Automático)
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>Alvo: {quest.targetEnemyName}</span>
                      <span>·</span>
                      <span>Meta: {quest.targetCount}x</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs mt-2 font-mono">
                      <span className="text-sky-400">+{quest.expReward.toLocaleString()} EXP</span>
                      <span className="text-amber-400">+{quest.beliReward.toLocaleString()} ฿</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs block mb-2 font-semibold ${
                        meetsLevel ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      Nível Req: {quest.levelRequired}
                    </span>

                    {isCurrent ? (
                      <span className={`px-3 py-1.5 text-xs font-bold rounded-lg block text-center ${
                        autoFarm ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {autoFarm ? '🔄 Farmando em Loop' : 'Em Progresso'}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onAcceptQuest(quest);
                          sound.questComplete();
                          onClose();
                        }}
                        disabled={!meetsLevel}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md ${
                          autoFarm
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {autoFarm ? '🎯 Selecionar para Auto-Farm' : 'Aceitar Missão'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400">
            {autoFarm
              ? '🤖 Ao concluir a missão, o Auto-Farm renovará o contrato automaticamente.'
              : 'Dica: Ative o Auto-Farm para caçar e renovar missões em ciclo contínuo.'}
          </span>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer shrink-0 ml-2"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

