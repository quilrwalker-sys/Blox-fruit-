import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Island, PlayerStats } from '../types/game';
import { sound } from '../utils/audio';

interface ClanMember {
  id: string;
  name: string;
  level: number;
  role: string;
}

interface Clan {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  leaderName: string;
  members: ClanMember[];
  totalXp: number;
  level: number;
  controlledIslandId?: string;
  treasuryBeli: number;
}

interface ClanModalProps {
  stats: PlayerStats;
  clans: Clan[];
  currentIsland: Island;
  allIslands: Island[];
  userClan: Clan | null;
  onCreateClan: (name: string, tag: string) => void;
  onJoinClan: (clanId: string) => void;
  onWarIsland: (islandId: string, clanId: string, clanName: string, clanTag: string) => void;
  islandDominance: { [islandId: string]: { clanId?: string; clanName?: string; clanTag?: string; faction?: string } };
  onClose: () => void;
}

export const ClanModal: React.FC<ClanModalProps> = ({
  stats,
  clans,
  currentIsland,
  allIslands,
  userClan,
  onCreateClan,
  onJoinClan,
  onWarIsland,
  islandDominance,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'clans' | 'war' | 'perks'>('clans');
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClanName.trim() || !newClanTag.trim()) return;
    sound.legendaryWin();
    onCreateClan(newClanName.trim(), newClanTag.trim());
    setNewClanName('');
    setNewClanTag('');
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-3xl bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-2xl shadow-amber-500/20 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏴‍☠️</span>
            <div>
              <h2 className="text-xl font-black text-amber-400 tracking-wide">Sistema de Clãs & Guerra de Ilhas</h2>
              <p className="text-xs text-slate-400">Junte-se a um clã, ganhe bônus de XP coletivos e conquiste territórios!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('clans')}
            className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'clans'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚔️ Clãs Ativos ({clans.length})
          </button>
          <button
            onClick={() => setActiveTab('war')}
            className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'war'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🗺️ Domínio de Ilhas & Guerras
          </button>
          <button
            onClick={() => setActiveTab('perks')}
            className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'perks'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Bônus Coletivos do Clã
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'clans' && (
            <div className="space-y-6">
              {userClan ? (
                <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-lg shadow">
                        [{userClan.tag}]
                      </span>
                      <h3 className="text-lg font-bold text-white">{userClan.name}</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300">Nível {userClan.level} do Clã</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800 mb-4">
                    <div>
                      <span className="text-slate-400 block">Líder:</span>
                      <span className="font-bold text-white">{userClan.leaderName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Membros:</span>
                      <span className="font-bold text-white">{userClan.members.length} Jogadores</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">XP Coletivo:</span>
                      <span className="font-bold text-amber-400 font-mono">{(userClan.totalXp || 0).toLocaleString()} XP</span>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2">Membros do Clã:</h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {userClan.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-900/80 border border-slate-800 text-xs">
                        <span className="font-medium text-white">{m.name} (Lv.{m.level})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.role === 'Leader' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300'}`}>
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-4">
                  <p className="text-sm text-slate-300">Você ainda não faz parte de nenhum clã. Crie o seu próprio ou junte-se a um clã existente para ganhar bônus de XP coletivos!</p>
                  {!creating ? (
                    <button
                      onClick={() => setCreating(true)}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg cursor-pointer transition-transform active:scale-95"
                    >
                      🛡️ Criar Novo Clã (10.000 ฿)
                    </button>
                  ) : (
                    <form onSubmit={handleCreateSubmit} className="max-w-md mx-auto space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-bold text-amber-400">Configurar Novo Clã</h4>
                      <input
                        type="text"
                        placeholder="Nome do Clã (ex: Ouroboros)"
                        value={newClanName}
                        onChange={(e) => setNewClanName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        maxLength={25}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Sigla / Tag (ex: GOLD)"
                        value={newClanTag}
                        onChange={(e) => setNewClanTag(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono uppercase"
                        maxLength={5}
                        required
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Confirmar Criação
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreating(false)}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Clan List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Clãs Registrados no Servidor</h4>
                <div className="grid grid-cols-1 gap-3">
                  {clans.map((clan) => {
                    const isMyClan = userClan?.id === clan.id;
                    return (
                      <div key={clan.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 font-black text-xs rounded-lg border border-amber-500/40 font-mono">
                            [{clan.tag}]
                          </span>
                          <div>
                            <h5 className="font-bold text-sm text-white">{clan.name}</h5>
                            <p className="text-xs text-slate-400">Líder: {clan.leaderName} · {clan.members.length} Membros · Nível {clan.level}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-semibold text-amber-300">{(clan.totalXp || 0).toLocaleString()} XP</span>
                          {!isMyClan && !userClan && (
                            <button
                              onClick={() => {
                                sound.questComplete();
                                onJoinClan(clan.id);
                              }}
                              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Entrar no Clã
                            </button>
                          )}
                          {isMyClan && (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
                              Seu Clã
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'war' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-900 to-red-950/40 border border-red-500/40">
                <h4 className="text-sm font-bold text-red-400 mb-1">🗺️ Guerras de Domínio de Ilhas</h4>
                <p className="text-xs text-slate-300">Conquiste ilhas com o seu clã para receber domínios territoriais e bônus passivos de Beli e XP em toda a região!</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {allIslands.map((island) => {
                  const dominance = islandDominance[island.id];
                  const isControlledByMyClan = Boolean(userClan && dominance?.clanId === userClan.id);

                  return (
                    <div key={island.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: island.themeColor }} />
                          <h5 className="font-bold text-sm text-white">{island.name}</h5>
                          <span className="text-xs font-mono text-slate-400">({island.recommendedLevel})</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Domínio Atual:{' '}
                          {dominance?.clanTag ? (
                            <span className="text-amber-400 font-bold">[{dominance.clanTag}] {dominance.clanName}</span>
                          ) : (
                            <span className="text-slate-500">Território Neutro / Livre</span>
                          )}
                        </p>
                      </div>
                      <div>
                        {userClan ? (
                          <button
                            disabled={isControlledByMyClan}
                            onClick={() => {
                              sound.legendaryWin();
                              onWarIsland(island.id, userClan.id, userClan.name, userClan.tag);
                            }}
                            className={`px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-transform active:scale-95 ${
                              isControlledByMyClan
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60'
                            }`}
                          >
                            {isControlledByMyClan ? 'Domínio Garantido 🛡️' : '⚔️ Conquistar Ilha'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Entre em um clã para participar</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'perks' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-sm font-bold text-amber-400 mb-2">⚡ Vantagens de Bônus Coletivos</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Quanto mais membros ativos e XP coletivo seu clã possuir, maiores serão os bônus passivos concedidos a todos os integrantes:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <span>✨</span>
                    <span>Bônus de XP Coletivo</span>
                  </div>
                  <p className="text-xs text-slate-400">Até +50% de EXP extra ao derrotar inimigos e completar missões com o clã.</p>
                  <div className="text-xs font-mono font-bold text-emerald-400">Ativo: +{(userClan ? userClan.level * 5 : 0)}% XP</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <span>💰</span>
                    <span>Tesouro Compartilhado</span>
                  </div>
                  <p className="text-xs text-slate-400">Bônus de +25% de Beli coletado nas ilhas sob domínio do clã.</p>
                  <div className="text-xs font-mono font-bold text-amber-300">Status: {userClan?.controlledIslandId ? 'Conectado a Território' : 'Nenhum território dominado'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
