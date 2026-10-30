import React, { useState, useEffect } from 'react';
import { BLOX_FRUITS, ISLANDS, SWORDS } from '../data/gameData';
import { HAKI_COLORS } from '../data/hakiColors';
import { BloxFruit, FruitCategory, FruitRarity, HakiSkills, Island, PlayerStats, Skill, Sword } from '../types/game';
import { sound } from '../utils/audio';
import {
  getCustomShopOverrides,
  setCustomShopOverride,
  setBatchCustomShopOverrides,
  clearSingleFruitOverride,
  resetCustomShopOverrides,
  getEffectiveBloxFruits,
  saveAdminCreatedFruit,
  deleteAdminCreatedFruit,
  getAdminCreatedFruits,
  getAdminGlobalMarketConfig,
  setAdminGlobalMarketConfig,
  AdminGlobalMarketConfig,
  CustomFruitOverride,
} from '../utils/adminShopManager';
import {
  getFragmentShopState,
  getDefaultFragCostForRarity,
  rotateFragmentShopStock,
  clearFragmentShopPurchases,
} from '../utils/fragmentShopManager';
import { ALL_BLOX_FRUITS } from '../data/fruitsData';

interface AdminModalProps {
  stats: PlayerStats;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  activeFruit: BloxFruit | null;
  onEquipFruit: (fruit: BloxFruit) => void;
  onStoreFruit: (fruit: BloxFruit) => void;
  activeSword: Sword | null;
  onUnlockAllSwords: () => void;
  onEquipSword: (sword: Sword) => void;
  haki: HakiSkills;
  onUnlockAllHakis: () => void;
  onTeleportIsland: (island: Island) => void;
  onRestoreHpEnergy: () => void;
  onTriggerInvasion?: () => void;
  onPreviewCinematic?: (skillName: string) => void;
  onSummonHakiNpc?: (islandId?: string, colorId?: string) => void;
  onUnlockAllHakiColors?: () => void;
  onForceObtainChalice?: () => void;
  activeHakiColorId?: string;
  unlockedHakiColorIds?: string[];
  onEquipHakiColor?: (colorId: string) => void;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  stats,
  onUpdateStats,
  activeFruit,
  onEquipFruit,
  onStoreFruit,
  activeSword,
  onUnlockAllSwords,
  onEquipSword,
  haki,
  onUnlockAllHakis,
  onTeleportIsland,
  onRestoreHpEnergy,
  onTriggerInvasion,
  onPreviewCinematic,
  onSummonHakiNpc,
  onUnlockAllHakiColors,
  onForceObtainChalice,
  activeHakiColorId,
  unlockedHakiColorIds = [],
  onEquipHakiColor,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'fruits' | 'levels_currency' | 'swords_haki' | 'islands' | 'shop_control'>('fruits');

  // Input states for Nível & Atributos
  const [customLevel, setCustomLevel] = useState<string>('');
  const [customBeli, setCustomBeli] = useState<string>('');
  const [customFrags, setCustomFrags] = useState<string>('');
  const [customStatPoints, setCustomStatPoints] = useState<string>('');

  // Search and filters for Fruits
  const [fruitSearch, setFruitSearch] = useState<string>('');
  const [fruitRarityFilter, setFruitRarityFilter] = useState<string>('Todas');

  // Shop Control Sub-tabs & Custom Fruit Creator State
  const [shopSubTab, setShopSubTab] = useState<'events' | 'sanctuary' | 'prices' | 'creator'>('events');
  const [shopSearch, setShopSearch] = useState<string>('');
  const [shopRarityFilter, setShopRarityFilter] = useState<string>('Todas');
  const [shopStockFilter, setShopStockFilter] = useState<'all' | 'dealer' | 'frags' | 'modified'>('all');
  const [editingOverrides, setEditingOverrides] = useState<Record<string, CustomFruitOverride>>(() => getCustomShopOverrides());
  const [adminCreatedFruits, setAdminCreatedFruits] = useState<BloxFruit[]>(() => getAdminCreatedFruits());
  const [marketConfig, setMarketConfig] = useState<AdminGlobalMarketConfig>(() => getAdminGlobalMarketConfig());
  const [fragShopSnapshot, setFragShopSnapshot] = useState(() => getFragmentShopState());
  const [customSpinCostInput, setCustomSpinCostInput] = useState<string>('');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // New Custom Fruit Form State
  const [newPtName, setNewPtName] = useState('Fruta do Trovão Negro');
  const [newEnName, setNewEnName] = useState('Dark Thunder Fruit');
  const [newCategory, setNewCategory] = useState<FruitCategory>('Elemental');
  const [newRarity, setNewRarity] = useState<FruitRarity>('Mítica');
  const [newElement, setNewElement] = useState('dark_lightning');
  const [newBeli, setNewBeli] = useState('3800000');
  const [newFrags, setNewFrags] = useState('50000');
  const [newColor, setNewColor] = useState('#a855f7');
  const [newDesc, setNewDesc] = useState('Relâmpagos negros apocalípticos que rasgam o tecido do espaço com explosões sônicas.');
  const [newPassive, setNewPassive] = useState('Corpo Elemental Logia + Dano Crítico Negro');
  const [newSkillZ, setNewSkillZ] = useState('Raio Negro Fulminante');
  const [newSkillX, setNewSkillX] = useState('Vórtice Elétrico Sombrio');
  const [newSkillC, setNewSkillC] = useState('Teleporte de Relâmpago');
  const [newSkillV, setNewSkillV] = useState('Ira do Deus do Trovão Negro');
  const [newPowerScale, setNewPowerScale] = useState<number>(1.2);

  useEffect(() => {
    const handleUpdate = () => {
      setEditingOverrides(getCustomShopOverrides());
      setAdminCreatedFruits(getAdminCreatedFruits());
      setMarketConfig(getAdminGlobalMarketConfig());
      setFragShopSnapshot(getFragmentShopState());
    };
    window.addEventListener('admin_shop_updated', handleUpdate);
    return () => window.removeEventListener('admin_shop_updated', handleUpdate);
  }, []);

  const showNotice = (msg: string) => {
    setAdminNotice(msg);
    setTimeout(() => setAdminNotice(null), 3500);
  };

  // Filtered fruits for Tab 1
  const filteredFruits = BLOX_FRUITS.filter((fruit) => {
    const matchesSearch =
      fruit.name.toLowerCase().includes(fruitSearch.toLowerCase()) ||
      fruit.portugueseName.toLowerCase().includes(fruitSearch.toLowerCase());
    const matchesRarity = fruitRarityFilter === 'Todas' || fruit.rarity === fruitRarityFilter;
    return matchesSearch && matchesRarity;
  });

  const getRarityBadgeStyle = (rarity: FruitRarity) => {
    switch (rarity) {
      case 'Mítica':
        return 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-rose-600 text-white border-fuchsia-400 shadow-md shadow-fuchsia-950/80 animate-pulse';
      case 'Lendária':
        return 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-400 shadow-md shadow-red-950/60';
      case 'Épica':
        return 'bg-purple-900/80 text-purple-200 border-purple-500/60';
      case 'Rara':
        return 'bg-sky-900/80 text-sky-200 border-sky-500/60';
      case 'Incomum':
        return 'bg-emerald-900/80 text-emerald-200 border-emerald-500/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fadeIn">
      <div className="bg-slate-950 border-2 border-amber-500/80 rounded-2xl p-5 sm:p-6 max-w-5xl w-full shadow-2xl text-white space-y-4 relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">👑</span>
            <div>
              <h2 className="text-lg font-black text-amber-400 tracking-wide flex items-center gap-2">
                PAINEL SUPREMO DO ADMINISTRADOR
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 uppercase">
                  ADM v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Controle total de Nível, Recursos, Frutas Blox, Cores de Haki, Espadas e Lojas.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Global Admin Stats Bar & Quick Actions */}
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap font-mono">
            <span className="text-amber-400 font-bold">
              Lv. <span className="text-white">{stats.level}</span>
            </span>
            <span className="text-emerald-400 font-bold">
              ฿ <span className="text-white">{stats.beli.toLocaleString()}</span>
            </span>
            <span className="text-purple-400 font-bold">
              🟣 <span className="text-white">{(stats.fragments || 0).toLocaleString()}</span>
            </span>
            <span className="text-sky-400 font-bold">
              Pts: <span className="text-white">{stats.statPoints}</span>
            </span>
            {activeFruit && (
              <span className="text-fuchsia-300 font-bold bg-fuchsia-950/60 px-2 py-0.5 rounded border border-fuchsia-500/30">
                🔮 {activeFruit.portugueseName}
              </span>
            )}
            {activeSword && (
              <span className="text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                ⚔️ {activeSword.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onRestoreHpEnergy();
                sound.legendaryWin();
                showNotice('✨ HP e Energia restaurados para 100%!');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shadow"
            >
              <span>💚</span>
              <span>Cura Total 100%</span>
            </button>

            {onTriggerInvasion && (
              <button
                onClick={() => {
                  onTriggerInvasion();
                  sound.fireBoom();
                  showNotice('🚨 Chefão de Invasão invocado na ilha atual!');
                }}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shadow animate-pulse"
              >
                <span>🚨</span>
                <span>Invasão de Chefão</span>
              </button>
            )}

            {onPreviewCinematic && (
              <button
                onClick={() => {
                  onPreviewCinematic('corte_triplo_divino');
                  sound.legendaryWin();
                }}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shadow"
              >
                <span>🎬</span>
                <span>Cena 3D 4K</span>
              </button>
            )}
          </div>
        </div>

        {adminNotice && (
          <div className="p-2.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold rounded-xl text-center animate-fadeIn shrink-0">
            {adminNotice}
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
          {[
            { id: 'fruits', label: '🔮 Frutas Blox' },
            { id: 'levels_currency', label: '⚡ Nível & Atributos' },
            { id: 'swords_haki', label: '⚔️ Espadas, Hakis & Cores' },
            { id: 'islands', label: '🗺️ Teleporte Ilhas' },
            { id: 'shop_control', label: '🛒 Controle de Lojas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sound.click();
                setActiveTab(tab.id as any);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: FRUTAS BLOX (COMPLETO) */}
          {activeTab === 'fruits' && (
            <div className="space-y-3">
              {/* Search & Rarity Filters */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="🔍 Buscar fruta por nome (ex: Kitsune, Buddha, Dough)..."
                  value={fruitSearch}
                  onChange={(e) => setFruitSearch(e.target.value)}
                  className="w-full sm:w-72 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />

                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                  {['Todas', 'Comum', 'Incomum', 'Rara', 'Épica', 'Lendária', 'Mítica'].map((rarity) => (
                    <button
                      key={rarity}
                      onClick={() => setFruitRarityFilter(rarity)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        fruitRarityFilter === rarity
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {rarity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fruits Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFruits.map((fruit) => {
                  const isEquipped = activeFruit?.id === fruit.id;
                  return (
                    <div
                      key={fruit.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                        isEquipped
                          ? 'bg-gradient-to-br from-fuchsia-950/60 to-slate-900 border-fuchsia-500 ring-2 ring-fuchsia-500/40 shadow-lg shadow-fuchsia-950/50'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <h4 className="text-xs font-black text-white">{fruit.portugueseName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">{fruit.name}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getRarityBadgeStyle(fruit.rarity)}`}>
                            {fruit.rarity}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 leading-relaxed">{fruit.description}</p>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-2">
                          <span>฿ {fruit.priceBeli.toLocaleString()}</span>
                          <span>•</span>
                          <span className="text-sky-400">{fruit.category}</span>
                        </div>

                        {/* Skills preview tags */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {fruit.skills.map((sk) => (
                            <span
                              key={sk.key}
                              className="px-1.5 py-0.5 bg-slate-950 text-amber-300 border border-slate-800 rounded text-[9px] font-mono font-bold"
                              title={sk.description}
                            >
                              [{sk.key}] {sk.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        {isEquipped ? (
                          <span className="w-full text-center py-1.5 text-xs font-bold text-fuchsia-400 bg-fuchsia-950/60 border border-fuchsia-500/40 rounded-lg">
                            ✨ Fruta Equipada Atualmente
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                onEquipFruit(fruit);
                                sound.legendaryWin();
                                showNotice(`🔮 Fruta equipada: ${fruit.portugueseName}!`);
                              }}
                              className="flex-1 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-lg transition-all shadow cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>⚡</span>
                              <span>Comer / Equipar</span>
                            </button>

                            <button
                              onClick={() => {
                                onStoreFruit(fruit);
                                sound.click();
                                showNotice(`🎒 Fruta guardada no inventário: ${fruit.portugueseName}!`);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              title="Guardar fruta no inventário para trocas"
                            >
                              🎒 Guardar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: NÍVEL, ATRIBUTOS E RECURSOS */}
          {activeTab === 'levels_currency' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <span>⚡ Modificador Instantâneo de Nível e Moedas</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Level Controls */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">Nível do Personagem (Atual: Lv. {stats.level})</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Ex: 2550"
                        value={customLevel}
                        onChange={(e) => setCustomLevel(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(customLevel);
                          if (!isNaN(val) && val > 0) {
                            onUpdateStats((s) => ({ ...s, level: val, exp: 0, expToNextLevel: val * 100 }));
                            sound.levelUp();
                            showNotice(`⚡ Nível alterado para Lv. ${val}!`);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Definir
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        onClick={() => {
                          onUpdateStats((s) => ({ ...s, level: s.level + 100 }));
                          sound.levelUp();
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded cursor-pointer"
                      >
                        +100 Níveis
                      </button>

                      <button
                        onClick={() => {
                          onUpdateStats((s) => ({ ...s, level: 2550 }));
                          sound.levelUp();
                          showNotice('👑 Nível Máximo (Lv. 2550) atingido!');
                        }}
                        className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[11px] font-black rounded cursor-pointer"
                      >
                        Lv. MAX (2550)
                      </button>
                    </div>
                  </div>

                  {/* Beli Controls */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 block">Beli ฿ (Atual: ฿ {stats.beli.toLocaleString()})</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Ex: 50000000"
                        value={customBeli}
                        onChange={(e) => setCustomBeli(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(customBeli);
                          if (!isNaN(val) && val >= 0) {
                            onUpdateStats((s) => ({ ...s, beli: val }));
                            sound.legendaryWin();
                            showNotice(`฿ Beli alterado para ฿ ${val.toLocaleString()}!`);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Definir
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        onClick={() => {
                          onUpdateStats((s) => ({ ...s, beli: s.beli + 1000000 }));
                          sound.legendaryWin();
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold rounded cursor-pointer"
                      >
                        +฿ 1.000.000
                      </button>

                      <button
                        onClick={() => {
                          onUpdateStats((s) => ({ ...s, beli: s.beli + 50000000 }));
                          sound.legendaryWin();
                        }}
                        className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-black rounded cursor-pointer"
                      >
                        +฿ 50 MILHÕES
                      </button>
                    </div>
                  </div>

                  {/* Fragments Controls */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-purple-400 block">Fragmentos Raros 🟣 (Atual: {(stats.fragments || 0).toLocaleString()})</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Ex: 100000"
                        value={customFrags}
                        onChange={(e) => setCustomFrags(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(customFrags);
                          if (!isNaN(val) && val >= 0) {
                            onUpdateStats((s) => ({ ...s, fragments: val }));
                            sound.legendaryWin();
                            showNotice(`🟣 Fragmentos alterados para ${val.toLocaleString()}!`);
                          }
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Definir
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        onClick={() => {
                          onUpdateStats((s) => ({ ...s, fragments: (s.fragments || 0) + 10000 }));
                          sound.legendaryWin();
                        }}
                        className="px-2.5 py-1 bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-[11px] font-bold rounded cursor-pointer border border-purple-500/40"
                      >
                        +10.000 Frags
                      </button>
                    </div>
                  </div>

                  {/* Stat Points Controls */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-sky-400 block">Pontos de Atributo (Atual: {stats.statPoints})</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Ex: 3000"
                        value={customStatPoints}
                        onChange={(e) => setCustomStatPoints(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(customStatPoints);
                          if (!isNaN(val) && val >= 0) {
                            onUpdateStats((s) => ({ ...s, statPoints: val }));
                            sound.click();
                            showNotice(`Pontos de Atributo alterados para ${val}!`);
                          }
                        }}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Definir
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        onClick={() => {
                          onUpdateStats((s) => ({ ...s, statPoints: s.statPoints + 1000 }));
                          sound.click();
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold rounded cursor-pointer"
                      >
                        +1.000 Pontos
                      </button>

                      <button
                        onClick={() => {
                          onUpdateStats((s) => ({
                            ...s,
                            melee: 2550,
                            defense: 2550,
                            sword: 2550,
                            bloxFruit: 2550,
                          }));
                          sound.legendaryWin();
                          showNotice('⚡ Todos os 4 atributos (Soco, Defesa, Espada, Fruta) foram MAXILADOS para 2550!');
                        }}
                        className="px-2.5 py-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-[11px] font-black rounded cursor-pointer"
                      >
                        ⚡ MAXILAR TUDO (2550 pts)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ESPADAS, HAKIS & CORES DE AURA */}
          {activeTab === 'swords_haki' && (
            <div className="space-y-4">
              {/* Haki Colors Management & Selection */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-amber-400">🎨 Seleção & Gerenciamento de Cores de Haki (Aura)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Selecione qualquer cor de Haki para equipar instantaneamente ou convocar o Mestre do Haki para a sua ilha.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onForceObtainChalice && (
                      <button
                        onClick={() => {
                          onForceObtainChalice();
                          sound.legendaryWin();
                          showNotice('🍷 [ADM] CÁLICE SAGRADO OBTIDO! Ritual do Mihawk iniciado!');
                          onClose();
                        }}
                        className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 rounded-lg shadow-lg hover:scale-105 transition-all cursor-pointer border border-yellow-200 animate-pulse"
                      >
                        🍷 Pegar Cálice Sagrado ⚡
                      </button>
                    )}
                    {onSummonHakiNpc && (
                      <button
                        onClick={() => {
                          onSummonHakiNpc();
                          sound.legendaryWin();
                          showNotice('🧙‍♂️ Mestre das Cores de Haki convocado para a sua ilha atual!');
                        }}
                        className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg shadow transition-all cursor-pointer"
                      >
                        🧙‍♂️ Invocar Mestre na Ilha ⚡
                      </button>
                    )}
                    {onUnlockAllHakiColors && (
                      <button
                        onClick={() => {
                          onUnlockAllHakiColors();
                          sound.legendaryWin();
                          showNotice('✨ Todas as Cores de Haki foram desbloqueadas!');
                        }}
                        className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-red-600 via-purple-600 to-cyan-500 hover:opacity-90 text-white rounded-lg shadow transition-all cursor-pointer"
                      >
                        ✨ Desbloquear Todas
                      </button>
                    )}
                  </div>
                </div>

                {/* EXCLUSIVE ADMIN HAKI COLOR: HAKI DE COR COLORIDA (INCOMPREENDIDO) */}
                {(() => {
                  const rainbowHaki = HAKI_COLORS.find((hc) => hc.id === 'haki_rainbow_prismatic');
                  if (!rainbowHaki) return null;
                  const isRainbowActive = activeHakiColorId === rainbowHaki.id;
                  return (
                    <div className="p-4 rounded-xl border-2 border-pink-500/80 bg-gradient-to-r from-rose-950/80 via-purple-950/80 to-cyan-950/80 shadow-lg shadow-pink-950/40 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full border-2 border-white shrink-0 flex items-center justify-center shadow-lg animate-spin"
                            style={{
                              animationDuration: '5s',
                              background:
                                'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #10b981, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)',
                              boxShadow: '0 0 18px rgba(236, 72, 153, 0.8)',
                            }}
                          >
                            <div className="w-5 h-5 rounded-full bg-slate-950 border border-white/80 flex items-center justify-center text-[10px]">
                              🌈
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-gradient-to-r from-red-500 via-amber-500 to-cyan-500 text-white uppercase shadow">
                                🌈 NÍVEL: {rainbowHaki.rarity.toUpperCase()}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-pink-500/20 text-pink-300 border border-pink-400/50 uppercase">
                                🔒 EXCLUSIVO PAINEL ADM (SEM DESBLOQUEIO NORMAL)
                              </span>
                            </div>
                            <h4 className="text-sm font-black bg-gradient-to-r from-pink-300 via-yellow-200 to-cyan-300 bg-clip-text text-transparent mt-1">
                              {rainbowHaki.name} (Mesmo Nível da Fruta do Leviathan)
                            </h4>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                              {rainbowHaki.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isRainbowActive ? (
                            <span className="inline-block text-xs font-black text-amber-300 px-4 py-2 bg-amber-500/20 rounded-xl border border-amber-400/50 shadow">
                              ✓ Cor Colorida Ativa
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onEquipHakiColor?.(rainbowHaki.id);
                                sound.legendaryWin();
                                showNotice('🌈 [ADM] Haki de Cor Colorida (Nível Incompreendido) equipado!');
                              }}
                              className="px-4 py-2 text-xs font-black bg-gradient-to-r from-pink-600 via-amber-500 to-cyan-500 hover:opacity-95 text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-pink-900/50 border border-white/30"
                            >
                              🌈 Equipar Haki Colorido
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {HAKI_COLORS.map((hc) => {
                    const isActive = activeHakiColorId === hc.id;
                    const isRainbow = hc.specialEffect === 'rainbow' || hc.rarity === 'Incompreendido';

                    return (
                      <div
                        key={`admin_hc_${hc.id}`}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isActive
                            ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50'
                            : isRainbow
                            ? 'bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border-pink-500/60'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-full border-2 shrink-0 flex items-center justify-center shadow"
                            style={
                              isRainbow
                                ? {
                                    background:
                                      'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #06b6d4, #a855f7, #ec4899, #ef4444)',
                                    borderColor: '#ffffff',
                                    boxShadow: '0 0 14px #ec4899',
                                  }
                                : {
                                    backgroundColor: hc.darkColor,
                                    borderColor: hc.primaryColor,
                                    boxShadow: `0 0 12px ${hc.primaryColor}`,
                                  }
                            }
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: isRainbow ? '#ffffff' : hc.secondaryColor }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">{hc.name}</span>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                  isRainbow
                                    ? 'bg-gradient-to-r from-pink-600 via-amber-500 to-cyan-500 text-white font-black'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {hc.rarity}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {hc.adminOnly
                                ? '🔒 Somente ADM (Sem Missão Ainda)'
                                : `฿ ${hc.priceBeli.toLocaleString()} • 🟣 ${hc.priceFragments} Frags`}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isActive ? (
                            <span className="text-[10px] font-bold text-amber-400 px-3 py-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
                              Ativa
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onEquipHakiColor?.(hc.id);
                                sound.hakiToggle();
                                showNotice(`🎨 Cor de Haki equipada: ${hc.name}!`);
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-colors cursor-pointer shadow"
                            >
                              Equipar Cor
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Arsenal Unlock */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Desbloqueio Rápido de Arsenal</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Libere todas as espadas e todas as técnicas de Haki de uma vez só.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onUnlockAllSwords();
                      sound.legendaryWin();
                      showNotice('⚔️ Todas as Espadas do jogo foram liberadas!');
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                  >
                    Todas Espadas
                  </button>
                  <button
                    onClick={() => {
                      onUnlockAllHakis();
                      sound.hakiToggle();
                      showNotice('⚡ Todos os Hakis e habilidades de mobilidade liberados!');
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Todos Hakis
                  </button>
                </div>
              </div>

              {/* EXCLUSIVE ADMIN WEAPON: TRIPLE DARK BLADE */}
              {(() => {
                const tripleBlade = SWORDS.find((s) => s.id === 'sword_triple_dark_blade');
                if (!tripleBlade) return null;
                const isEquipped = activeSword?.id === tripleBlade.id;
                return (
                  <div className="p-4 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-black rounded-xl border-2 border-emerald-500/70 shadow-lg shadow-emerald-950/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                            👑 EXCLUSIVO ADM
                          </span>
                          <h3 className="text-sm font-black text-emerald-300">{tripleBlade.name}</h3>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{tripleBlade.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onEquipSword(tripleBlade);
                            sound.legendaryWin();
                            showNotice('👑 Arma Exclusiva ADM Equipada: Tripla Dark Blade (Yoru)!');
                          }}
                          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                            isEquipped
                              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                          }`}
                        >
                          {isEquipped ? '✓ Equipada' : 'Equipar Tripla Yoru'}
                        </button>

                        {onPreviewCinematic && (
                          <button
                            onClick={() => {
                              onPreviewCinematic('corte_triplo_divino');
                              sound.legendaryWin();
                            }}
                            className="px-3 py-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            🎬 Cena 3D 4K
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Swords List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block">Equipar Espadas do Jogo:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SWORDS.map((sword) => {
                    const isEquipped = activeSword?.id === sword.id;
                    return (
                      <div
                        key={sword.id}
                        className="p-3 rounded-xl border bg-slate-900/70 border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">{sword.name}</span>
                            <span className="text-[10px] font-mono px-1 rounded" style={{ color: sword.color }}>
                              {sword.rarity}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">Dano +{sword.damage}</span>
                        </div>
                        {isEquipped ? (
                          <span className="text-xs font-bold text-emerald-400">Equipada</span>
                        ) : (
                          <button
                            onClick={() => {
                              onEquipSword(sword);
                              sound.slash();
                              showNotice(`⚔️ Espada equipada: ${sword.name}!`);
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                          >
                            Equipar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TELEPORTE ILHAS */}
          {activeTab === 'islands' && (
            <div className="space-y-3">
              <span className="text-xs text-slate-400 block">
                Teleporte instantâneo de Administrador para qualquer ilha do mapa:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ISLANDS.map((island) => {
                  return (
                    <div
                      key={island.id}
                      className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: island.themeColor }} />
                          <h4 className="text-xs font-bold text-white">{island.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">{island.recommendedLevel}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{island.description}</p>
                      </div>

                      <button
                        onClick={() => {
                          onTeleportIsland(island);
                          sound.legendaryWin();
                          showNotice(`🌀 Teleportado instantaneamente para: ${island.name}!`);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow"
                      >
                        🌀 Teleportar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: CONTROLE DE LOJAS E ECONOMIA GLOBAL (REPAGINADO) */}
          {activeTab === 'shop_control' && (() => {
            const allEffectiveFruits = getEffectiveBloxFruits();
            const baseFruitMap = new Map<string, BloxFruit>();
            ALL_BLOX_FRUITS.forEach((f) => baseFruitMap.set(f.id, f));
            adminCreatedFruits.forEach((f) => baseFruitMap.set(f.id, f));

            const dealerStockCount = Object.values(editingOverrides).filter((o) => o.forceDealerStock).length;
            const fragStockCount =
              Object.values(editingOverrides).filter((o) => o.forceFragStock).length +
              (marketConfig.fragShopSlotOverrides || []).filter(Boolean).length;
            const modifiedPriceCount = Object.values(editingOverrides).filter(
              (o) => o.priceBeli !== undefined || o.fragCost !== undefined
            ).length;
            const guaranteedFruitObj = marketConfig.guaranteedNextSpinFruitId
              ? allEffectiveFruits.find((f) => f.id === marketConfig.guaranteedNextSpinFruitId)
              : null;

            return (
              <div className="space-y-4">
                {/* Top Executive Telemetry & Quick Reset Bar */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-amber-400 tracking-wide">
                        Central Executiva de Lojas, Gacha & Economia Global
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Gerencie descontos globais, sorte da roleta, vitrine de 4 slots do Santuário de Fragmentos, matriz de preços e criação de frutas.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => {
                          rotateFragmentShopStock();
                          setFragShopSnapshot(getFragmentShopState());
                          sound.spinTick();
                          showNotice('🔄 Estoque do Santuário de Fragmentos atualizado e compras liberadas!');
                        }}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Reabastecer Santuário
                      </button>

                      <button
                        onClick={() => {
                          resetCustomShopOverrides();
                          sound.click();
                          showNotice('🔄 Toda a economia, estoques e configurações de loja voltaram ao padrão original!');
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/80 text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Restaurar Padrão Original
                      </button>
                    </div>
                  </div>

                  {/* 4-Column Live Market KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Catálogo & Estoque Ativo</span>
                      <div className="text-base font-black text-white font-mono tabular-nums mt-0.5">
                        {allEffectiveFruits.length} Frutas
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                        {dealerStockCount} Vendedor · {fragStockCount} Santuário · {modifiedPriceCount} Editadas
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Desconto Global Ativo</span>
                      <div className="text-base font-black text-emerald-400 font-mono tabular-nums mt-0.5">
                        {marketConfig.globalDiscountPercent > 0
                          ? `-${marketConfig.globalDiscountPercent}% OFF`
                          : '0% (Preço Normal)'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {marketConfig.globalDiscountPercent === 100
                          ? 'Todas as lojas 100% gratuitas'
                          : 'Aplica em Beli, Frags e Gacha'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Calibragem da Roleta Gacha</span>
                      <div className="text-base font-black text-amber-400 font-mono tabular-nums mt-0.5">
                        Sorte {marketConfig.gachaLuckMultiplier}x
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                        Giro:{' '}
                        {marketConfig.gachaSpinCostOverride !== null
                          ? `฿ ${marketConfig.gachaSpinCostOverride.toLocaleString()}`
                          : 'Padrão por Nível'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Próximo Giro Garantido</span>
                      <div
                        className="text-sm font-black truncate mt-0.5"
                        style={{ color: guaranteedFruitObj ? guaranteedFruitObj.iconColor : '#94a3b8' }}
                      >
                        {guaranteedFruitObj ? guaranteedFruitObj.portugueseName : 'Aleatório Normal'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {guaranteedFruitObj ? '100% garantido no próximo giro' : 'Sem fruta travada na roleta'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Sub-Tab Segmented Navigation */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  {[
                    { id: 'events', label: '⚡ Eventos Globais & Roleta Gacha' },
                    { id: 'sanctuary', label: '🟣 Vitrine do Santuário (4 Slots)' },
                    { id: 'prices', label: `🏷️ Matriz de Preços (${allEffectiveFruits.length})` },
                    { id: 'creator', label: `✨ Laboratório de Frutas ADM (${adminCreatedFruits.length})` },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        sound.click();
                        setShopSubTab(st.id as any);
                      }}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        shopSubTab === st.id
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* =========================================================
                    SUB-TAB 1: EVENTOS GLOBAIS, PROMOÇÕES & ROLETA GACHA
                   ========================================================= */}
                {shopSubTab === 'events' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Card: Global Discounts & Bulk Stock Presets */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                          1. Promoções Globais & Desconto de Mercado
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Reduz instantaneamente os preços em Beli (฿), Fragmentos (🟣) e o custo de giro da roleta.
                        </p>
                      </div>

                      {/* Discount Slider & Display */}
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-semibold">Percentual de Desconto Global:</span>
                          <span className="font-mono font-black text-emerald-400 tabular-nums text-sm">
                            {marketConfig.globalDiscountPercent}% OFF
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={marketConfig.globalDiscountPercent}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setAdminGlobalMarketConfig({ globalDiscountPercent: val });
                          }}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          {[
                            { label: '0% Normal', val: 0 },
                            { label: '-25% OFF', val: 25 },
                            { label: '-50% Black', val: 50 },
                            { label: '-75% Mega', val: 75 },
                            { label: '100% Grátis', val: 100 },
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              onClick={() => {
                                setAdminGlobalMarketConfig({ globalDiscountPercent: preset.val });
                                sound.click();
                                showNotice(
                                  preset.val === 0
                                    ? 'Preços globais normalizados (0% de desconto).'
                                    : `🎉 Promoção Global de ${preset.val}% OFF ativada em todas as lojas!`
                                );
                              }}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                                marketConfig.globalDiscountPercent === preset.val
                                  ? 'bg-emerald-500 text-slate-950 font-black'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quick Bulk Stock Operations */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-xs font-bold text-slate-300 block">
                          Operações Rápidas de Estoque em Massa:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              const updates: Record<string, CustomFruitOverride> = {};
                              allEffectiveFruits.forEach((f) => {
                                updates[f.id] = { forceDealerStock: true, forceFragStock: true };
                              });
                              setBatchCustomShopOverrides(updates);
                              sound.legendaryWin();
                              showNotice('🛒 Todas as frutas foram liberadas para compra direta no Vendedor e Santuário!');
                            }}
                            className="p-2.5 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 rounded-lg text-left transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-bold text-emerald-300">Liberar Todas em Estoque</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Ativa compra direta para todas as {allEffectiveFruits.length} frutas
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              const updates: Record<string, CustomFruitOverride> = {};
                              allEffectiveFruits.forEach((f) => {
                                const isHighTier =
                                  f.rarity === 'Mítica' ||
                                  f.rarity === 'Lendária' ||
                                  f.rarity === 'Incompreendido';
                                updates[f.id] = {
                                  forceDealerStock: isHighTier,
                                  forceFragStock: isHighTier,
                                };
                              });
                              setBatchCustomShopOverrides(updates);
                              sound.legendaryWin();
                              showNotice('👑 Apenas frutas Lendárias, Míticas e Incompreendidas estão em estoque direto!');
                            }}
                            className="p-2.5 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 rounded-lg text-left transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-bold text-amber-300">Estoque Elite (Lendária+)</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Força apenas frutas Lendárias, Míticas e Leviathan
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              const updates: Record<string, CustomFruitOverride> = {};
                              allEffectiveFruits.forEach((f) => {
                                updates[f.id] = { priceBeli: 0, fragCost: 0 };
                              });
                              setBatchCustomShopOverrides(updates);
                              sound.legendaryWin();
                              showNotice('🎁 Preço de todas as frutas definido como 0 Beli e 0 Fragmentos!');
                            }}
                            className="p-2.5 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 rounded-lg text-left transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-bold text-purple-300">Zerar Todos os Preços</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Define Beli = 0 e Frags = 0 individualmente
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              const updates: Record<string, CustomFruitOverride> = {};
                              allEffectiveFruits.forEach((f) => {
                                updates[f.id] = { forceDealerStock: false, forceFragStock: false };
                              });
                              setBatchCustomShopOverrides(updates);
                              sound.click();
                              showNotice('🔒 Estoques forçados desativados. Rotação natural restaurada.');
                            }}
                            className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-bold text-slate-300">Desativar Estoques Forçados</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Retorna as lojas para a rotação normal
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: Gacha Roulette Calibrator & Guaranteed Next Spin */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide">
                          2. Calibrador da Roleta do Mercador (Gacha)
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Controle o multiplicador de sorte, custo do giro e escolha exatamente qual fruta cairá no próximo giro.
                        </p>
                      </div>

                      {/* Luck Multiplier Selector */}
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-semibold">Multiplicador de Sorte (Raras/Míticas):</span>
                          <span className="font-mono font-black text-amber-400 tabular-nums">
                            {marketConfig.gachaLuckMultiplier}x
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {[1, 2, 5, 10, 50, 100].map((mult) => (
                            <button
                              key={mult}
                              onClick={() => {
                                setAdminGlobalMarketConfig({ gachaLuckMultiplier: mult });
                                sound.click();
                                showNotice(`🍀 Sorte da Roleta Gacha ajustada para ${mult}x!`);
                              }}
                              className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                                marketConfig.gachaLuckMultiplier === mult
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              }`}
                            >
                              {mult}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gacha Spin Cost Override */}
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-semibold">Custo Fixo do Giro (Beli):</span>
                          <span className="font-mono font-bold text-emerald-400 tabular-nums">
                            {marketConfig.gachaSpinCostOverride !== null
                              ? `฿ ${marketConfig.gachaSpinCostOverride.toLocaleString()}`
                              : 'Automático por Nível'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setAdminGlobalMarketConfig({ gachaSpinCostOverride: null });
                              sound.click();
                              showNotice('Custo da roleta restaurado para o cálculo automático por nível.');
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                              marketConfig.gachaSpinCostOverride === null
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-900 text-slate-300 border border-slate-800'
                            }`}
                          >
                            Padrão
                          </button>
                          <button
                            onClick={() => {
                              setAdminGlobalMarketConfig({ gachaSpinCostOverride: 0 });
                              sound.click();
                              showNotice('🎁 Giros da Roleta agora são 100% GRÁTIS (฿ 0)!');
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                              marketConfig.gachaSpinCostOverride === 0
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-900 text-slate-300 border border-slate-800'
                            }`}
                          >
                            Grátis (฿ 0)
                          </button>
                          <button
                            onClick={() => {
                              setAdminGlobalMarketConfig({ gachaSpinCostOverride: 1000 });
                              sound.click();
                              showNotice('Custo da roleta fixado em ฿ 1.000!');
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                              marketConfig.gachaSpinCostOverride === 1000
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-900 text-slate-300 border border-slate-800'
                            }`}
                          >
                            ฿ 1.000
                          </button>
                          <div className="flex items-center gap-1 ml-auto">
                            <input
                              type="number"
                              placeholder="Valor ฿..."
                              value={customSpinCostInput}
                              onChange={(e) => setCustomSpinCostInput(e.target.value)}
                              className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                            <button
                              onClick={() => {
                                const val = parseInt(customSpinCostInput, 10);
                                if (!isNaN(val) && val >= 0) {
                                  setAdminGlobalMarketConfig({ gachaSpinCostOverride: val });
                                  sound.click();
                                  showNotice(`Custo da roleta definido para ฿ ${val.toLocaleString()}!`);
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded cursor-pointer"
                            >
                              Fixar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Guaranteed Next Spin Selector */}
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                        <label className="text-xs font-bold text-amber-300 block">
                          🎯 Garantir Fruta no Próximo Giro da Roleta (100% de Chance):
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={marketConfig.guaranteedNextSpinFruitId || ''}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              setAdminGlobalMarketConfig({ guaranteedNextSpinFruitId: val });
                              sound.click();
                              if (val) {
                                const found = allEffectiveFruits.find((f) => f.id === val);
                                showNotice(`🎯 Próximo giro da roleta travado em: ${found?.portugueseName}!`);
                              } else {
                                showNotice('Roleta destravada (giro aleatório normal).');
                              }
                            }}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="">🎲 Sorteio Aleatório Normal (Sem Garantia)</option>
                            {allEffectiveFruits.map((f) => (
                              <option key={f.id} value={f.id}>
                                [{f.rarity}] {f.portugueseName} ({f.name})
                              </option>
                            ))}
                          </select>
                          {marketConfig.guaranteedNextSpinFruitId && (
                            <button
                              onClick={() => {
                                setAdminGlobalMarketConfig({ guaranteedNextSpinFruitId: null });
                                sound.click();
                              }}
                              className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/40 cursor-pointer"
                            >
                              Limpar
                            </button>
                          )}
                        </div>

                        {/* One-Click Jackpot Fruit Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {[
                            { id: 'fruit_leviathan', label: '🐉 Leviathan' },
                            { id: 'fruit_kitsune', label: '🦊 Kitsune' },
                            { id: 'fruit_dragon', label: '🐲 Dragão' },
                            { id: 'fruit_dough', label: '🍩 Mochi' },
                            { id: 'fruit_buddha', label: '🧘 Buda' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setAdminGlobalMarketConfig({ guaranteedNextSpinFruitId: item.id });
                                sound.legendaryWin();
                                showNotice(`🎯 ${item.label} garantida no próximo giro da Roleta!`);
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                marketConfig.guaranteedNextSpinFruitId === item.id
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================
                    SUB-TAB 2: VITRINE DO SANTUÁRIO DE FRAGMENTOS (4 SLOTS)
                   ========================================================= */}
                {shopSubTab === 'sanctuary' && (
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-purple-300">
                          Gerenciador Ao Vivo dos 4 Slots do Santuário das Sombras (Fragmentos)
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Escolha exatamente qual fruta aparece em cada um dos 4 slots da Loja de Fragmentos ou libere slots já comprados.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            clearFragmentShopPurchases();
                            setFragShopSnapshot(getFragmentShopState());
                            sound.legendaryWin();
                            showNotice('🔓 Compras desta rotação resetadas! Todos os 4 slots estão disponíveis novamente.');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                        >
                          Liberar Slots Comprados
                        </button>
                        <button
                          onClick={() => {
                            setAdminGlobalMarketConfig({ fragShopSlotOverrides: [null, null, null, null] });
                            sound.click();
                            showNotice('Slots do Santuário retornados para o sorteio global automático.');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg border border-slate-700 cursor-pointer transition-colors"
                        >
                          Limpar Slots Fixos
                        </button>
                      </div>
                    </div>

                    {/* 4 Slots Live Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[0, 1, 2, 3].map((slotIdx) => {
                        const liveSlot = fragShopSnapshot.slots[slotIdx];
                        const currentOverrideId = marketConfig.fragShopSlotOverrides?.[slotIdx] || '';
                        const slotLabels = [
                          'Slot 1 · Comum / Incomum',
                          'Slot 2 · Rara / Épica',
                          'Slot 3 · Lendária',
                          'Slot 4 · Mítica / Incompreendido',
                        ];

                        return (
                          <div
                            key={slotIdx}
                            className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-purple-300">{slotLabels[slotIdx]}</span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {currentOverrideId ? 'Fixado pelo ADM' : 'Rotação Automática'}
                                </span>
                              </div>

                              {/* Current Active Fruit in Slot */}
                              {liveSlot && liveSlot.fruit ? (
                                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                                  <div>
                                    <div
                                      className="text-xs font-black"
                                      style={{ color: liveSlot.fruit.iconColor }}
                                    >
                                      {liveSlot.fruit.portugueseName}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                                      {liveSlot.fruit.rarity} · 🟣 {liveSlot.fragCost.toLocaleString()} Frags
                                    </div>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      liveSlot.isPurchased
                                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    }`}
                                  >
                                    {liveSlot.isPurchased ? 'Comprado' : 'Disponível'}
                                  </span>
                                </div>
                              ) : (
                                <div className="p-2.5 bg-slate-900/50 rounded-lg border border-slate-800/80 text-xs text-slate-500">
                                  Esgotado nesta rotação (fixe uma fruta abaixo para ativar imediatamente)
                                </div>
                              )}
                            </div>

                            {/* Slot Fruit Selector */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                              <label className="text-[11px] text-slate-400 block">
                                Escolher Fruta Fixa para o Slot {slotIdx + 1}:
                              </label>
                              <select
                                value={currentOverrideId}
                                onChange={(e) => {
                                  const nextVal = e.target.value || null;
                                  const nextSlots = [...(marketConfig.fragShopSlotOverrides || [null, null, null, null])];
                                  nextSlots[slotIdx] = nextVal;
                                  setAdminGlobalMarketConfig({ fragShopSlotOverrides: nextSlots });
                                  clearFragmentShopPurchases();
                                  sound.click();
                                  if (nextVal) {
                                    const f = allEffectiveFruits.find((item) => item.id === nextVal);
                                    showNotice(`🟣 ${f?.portugueseName} colocada no Slot ${slotIdx + 1} do Santuário!`);
                                  }
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                              >
                                <option value="">🔄 Automático da Rotação Global</option>
                                {allEffectiveFruits.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    [{f.rarity}] {f.portugueseName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Showcase Presets for All 4 Slots */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-slate-400 font-semibold">
                        Vitrines Prontas para os 4 Slots:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setAdminGlobalMarketConfig({
                              fragShopSlotOverrides: [
                                'fruit_buddha',
                                'fruit_dough',
                                'fruit_kitsune',
                                'fruit_leviathan',
                              ],
                            });
                            clearFragmentShopPurchases();
                            sound.legendaryWin();
                            showNotice('🟣 Vitrine Suprema ativada: Buda, Mochi, Kitsune e Leviathan nos 4 slots!');
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Vitrine Suprema (Buda + Mochi + Kitsune + Leviathan)
                        </button>
                        <button
                          onClick={() => {
                            setAdminGlobalMarketConfig({
                              fragShopSlotOverrides: [
                                'fruit_light',
                                'fruit_magma',
                                'fruit_ice',
                                'fruit_dark',
                              ],
                            });
                            clearFragmentShopPurchases();
                            sound.click();
                            showNotice('⚡ Vitrine Logia Elemental ativada nos 4 slots!');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 cursor-pointer transition-colors"
                        >
                          Vitrine Logia (Luz + Magma + Gelo + Escuridão)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================
                    SUB-TAB 3: MATRIZ INDIVIDUAL DE PREÇOS & ESTOQUE
                   ========================================================= */}
                {shopSubTab === 'prices' && (
                  <div className="space-y-3">
                    {/* Search, Rarity Filter & Stock Filter */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="🔍 Buscar fruta por nome em português ou inglês..."
                          value={shopSearch}
                          onChange={(e) => setShopSearch(e.target.value)}
                          className="w-full sm:w-72 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />

                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto overflow-x-auto">
                          {[
                            { id: 'all', label: 'Todas' },
                            { id: 'dealer', label: 'No Vendedor' },
                            { id: 'frags', label: 'No Santuário' },
                            { id: 'modified', label: 'Editadas' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setShopStockFilter(f.id as any)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                                shopStockFilter === f.id
                                  ? 'bg-slate-800 text-amber-400'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto">
                        {['Todas', 'Incompreendido', 'Mítica', 'Lendária', 'Épica', 'Rara', 'Incomum', 'Comum'].map(
                          (rarity) => (
                            <button
                              key={rarity}
                              onClick={() => setShopRarityFilter(rarity)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                                shopRarityFilter === rarity
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {rarity}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Fruit Price & Stock Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
                      {allEffectiveFruits
                        .filter((f) => {
                          const matchesName =
                            f.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
                            f.portugueseName.toLowerCase().includes(shopSearch.toLowerCase());
                          const matchesRarity =
                            shopRarityFilter === 'Todas' || f.rarity === shopRarityFilter;
                          const ov = editingOverrides[f.id] || {};
                          const matchesStock =
                            shopStockFilter === 'all' ||
                            (shopStockFilter === 'dealer' && ov.forceDealerStock) ||
                            (shopStockFilter === 'frags' && ov.forceFragStock) ||
                            (shopStockFilter === 'modified' &&
                              (ov.priceBeli !== undefined ||
                                ov.fragCost !== undefined ||
                                ov.forceDealerStock ||
                                ov.forceFragStock));
                          return matchesName && matchesRarity && matchesStock;
                        })
                        .map((fruit) => {
                          const override = editingOverrides[fruit.id] || {};
                          const baseFruit = baseFruitMap.get(fruit.id) || fruit;
                          const defaultFragCost = getDefaultFragCostForRarity(fruit.rarity);
                          const currentBeliInput =
                            override.priceBeli !== undefined ? override.priceBeli : baseFruit.priceBeli;
                          const currentFragInput =
                            override.fragCost !== undefined ? override.fragCost : defaultFragCost;
                          const isGuaranteedSpin = marketConfig.guaranteedNextSpinFruitId === fruit.id;

                          return (
                            <div
                              key={`shop_ctrl_${fruit.id}`}
                              className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 transition-colors hover:border-slate-700"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: fruit.iconColor }}
                                  />
                                  <div>
                                    <span className="text-xs font-black text-white block leading-tight">
                                      {fruit.portugueseName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {fruit.name} · {fruit.category}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getRarityBadgeStyle(
                                    fruit.rarity
                                  )}`}
                                >
                                  {fruit.rarity}
                                </span>
                              </div>

                              {/* Dual Price Inputs (Beli & Frags) */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-emerald-400 font-bold block mb-0.5">
                                    Preço Beli (฿)
                                  </label>
                                  <input
                                    type="number"
                                    value={currentBeliInput}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val >= 0) {
                                        setCustomShopOverride(fruit.id, { priceBeli: val });
                                      }
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono tabular-nums"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-purple-400 font-bold block mb-0.5">
                                    Custo Frags (🟣)
                                  </label>
                                  <input
                                    type="number"
                                    value={currentFragInput}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val >= 0) {
                                        setCustomShopOverride(fruit.id, { fragCost: val });
                                      }
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono tabular-nums"
                                  />
                                </div>
                              </div>

                              {/* Quick Price Presets Row */}
                              <div className="flex items-center justify-between gap-1.5 text-[10px]">
                                <span className="text-slate-500 font-mono">Ajuste rápido:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setCustomShopOverride(fruit.id, { priceBeli: 0, fragCost: 0 });
                                      sound.legendaryWin();
                                      showNotice(`🎁 ${fruit.portugueseName} definida como Grátis (0 ฿ / 0 🟣)!`);
                                    }}
                                    className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 font-bold cursor-pointer"
                                  >
                                    Grátis (0)
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCustomShopOverride(fruit.id, {
                                        priceBeli: Math.round(baseFruit.priceBeli * 0.5),
                                        fragCost: Math.round(defaultFragCost * 0.5),
                                      });
                                      sound.click();
                                      showNotice(`🏷️ ${fruit.portugueseName} com 50% de desconto!`);
                                    }}
                                    className="px-2 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/30 font-bold cursor-pointer"
                                  >
                                    -50%
                                  </button>
                                  <button
                                    onClick={() => {
                                      clearSingleFruitOverride(fruit.id);
                                      sound.click();
                                      showNotice(`Restaurado preço original de ${fruit.portugueseName}.`);
                                    }}
                                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-bold cursor-pointer"
                                  >
                                    Padrão
                                  </button>
                                </div>
                              </div>

                              {/* Stock Forcing & Guaranteed Roulette Toggles */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800/80">
                                <button
                                  onClick={() => {
                                    const next = !override.forceDealerStock;
                                    setCustomShopOverride(fruit.id, { forceDealerStock: next });
                                    sound.click();
                                    showNotice(
                                      next
                                        ? `🛒 ${fruit.portugueseName} liberada para compra direta no Vendedor!`
                                        : `Removido estoque direto de ${fruit.portugueseName}`
                                    );
                                  }}
                                  className={`py-1 px-2 text-[10px] font-bold rounded-md border transition-colors cursor-pointer truncate ${
                                    override.forceDealerStock
                                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {override.forceDealerStock ? '✓ Vendedor ON' : '🛒 Vendedor'}
                                </button>

                                <button
                                  onClick={() => {
                                    const next = !override.forceFragStock;
                                    setCustomShopOverride(fruit.id, { forceFragStock: next });
                                    sound.click();
                                    showNotice(
                                      next
                                        ? `🟣 ${fruit.portugueseName} forçada no Santuário de Frags!`
                                        : `Removido forçamento de Frags para ${fruit.portugueseName}`
                                    );
                                  }}
                                  className={`py-1 px-2 text-[10px] font-bold rounded-md border transition-colors cursor-pointer truncate ${
                                    override.forceFragStock
                                      ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {override.forceFragStock ? '✓ Frags ON' : '🟣 Santuário'}
                                </button>

                                <button
                                  onClick={() => {
                                    const nextId = isGuaranteedSpin ? null : fruit.id;
                                    setAdminGlobalMarketConfig({ guaranteedNextSpinFruitId: nextId });
                                    sound.legendaryWin();
                                    showNotice(
                                      nextId
                                        ? `🎯 ${fruit.portugueseName} garantida no próximo giro da Roleta!`
                                        : 'Garantia de giro removida.'
                                    );
                                  }}
                                  className={`py-1 px-2 text-[10px] font-bold rounded-md border transition-colors cursor-pointer truncate ${
                                    isGuaranteedSpin
                                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                                      : 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800'
                                  }`}
                                  title="Garantir esta fruta no próximo giro da roleta"
                                >
                                  {isGuaranteedSpin ? '🎯 Garantida!' : '🎯 Garantir Giro'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* =========================================================
                    SUB-TAB 4: LABORATÓRIO DE CRIAÇÃO & FRUTAS ADM
                   ========================================================= */}
                {shopSubTab === 'creator' && (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {/* Side-by-Side Creator Form + Live Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                      {/* Left 3 Columns: Fruit Forge Form */}
                      <div className="lg:col-span-3 p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="text-sm font-black text-amber-400">
                              Forja Criativa: Criar Fruta Blox Exclusiva
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              Personalize atributos, raridade, escala de dano e injete na loja e roleta.
                            </p>
                          </div>

                          {/* Quick Templates */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setNewPtName('Fruta do Sol Abissal');
                                setNewEnName('Abyssal Sun Fruit');
                                setNewCategory('Elemental');
                                setNewRarity('Incompreendido');
                                setNewElement('solar_abyss');
                                setNewBeli('15000000');
                                setNewFrags('80000');
                                setNewColor('#38bdf8');
                                setNewDesc('Chamas cósmicas azuis capazes de evaporar oceanos inteiros num piscar de olhos.');
                                setNewPassive('Imunidade Elemental Absoluta + Aura Solar Cósmica');
                                setNewSkillZ('Lança Solar Azul');
                                setNewSkillX('Supernova Abissal');
                                setNewSkillC('Voo na Velocidade da Luz');
                                setNewSkillV('Colapso Estelar Infinito');
                                setNewPowerScale(1.8);
                                sound.click();
                              }}
                              className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold cursor-pointer"
                            >
                              Preset: Incompreendido
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewPtName('Fruta da Fênix Carmesim');
                                setNewEnName('Crimson Phoenix Fruit');
                                setNewCategory('Zoan');
                                setNewRarity('Mítica');
                                setNewElement('crimson_flame');
                                setNewBeli('6500000');
                                setNewFrags('45000');
                                setNewColor('#f43f5e');
                                setNewDesc('Transforma o usuário em uma besta mítica imortal envolta em chamas regenerativas.');
                                setNewPassive('Asas Regenerativas + Dano Aéreo Dobrado');
                                setNewSkillZ('Garras de Fogo');
                                setNewSkillX('Chama Imortal');
                                setNewSkillC('Rasante Supersônico');
                                setNewSkillV('Renascimento das Cinzas');
                                setNewPowerScale(1.4);
                                sound.click();
                              }}
                              className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[10px] font-bold cursor-pointer"
                            >
                              Preset: Zoan Mítica
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Nome em Português
                            </label>
                            <input
                              type="text"
                              value={newPtName}
                              onChange={(e) => setNewPtName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Nome em Inglês
                            </label>
                            <input
                              type="text"
                              value={newEnName}
                              onChange={(e) => setNewEnName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Categoria
                            </label>
                            <select
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value as FruitCategory)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            >
                              <option value="Elemental">Elemental (Logia)</option>
                              <option value="Natural">Natural (Paramecia)</option>
                              <option value="Zoan">Zoan (Besta/Mítica)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Raridade Oficial
                            </label>
                            <select
                              value={newRarity}
                              onChange={(e) => setNewRarity(e.target.value as FruitRarity)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            >
                              <option value="Incompreendido">Incompreendido (Nível Leviathan)</option>
                              <option value="Mítica">Mítica</option>
                              <option value="Lendária">Lendária</option>
                              <option value="Épica">Épica</option>
                              <option value="Rara">Rara</option>
                              <option value="Incomum">Incomum</option>
                              <option value="Comum">Comum</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                              Preço em Beli (฿)
                            </label>
                            <input
                              type="number"
                              value={newBeli}
                              onChange={(e) => setNewBeli(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tabular-nums"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-purple-400 block mb-1">
                              Custo em Fragmentos (🟣)
                            </label>
                            <input
                              type="number"
                              value={newFrags}
                              onChange={(e) => setNewFrags(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tabular-nums"
                            />
                          </div>
                        </div>

                        {/* Aura Color & Damage Multiplier */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Cor da Aura & Partículas
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className="w-8 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                              />
                              <div className="flex items-center gap-1 flex-wrap">
                                {['#ef4444', '#a855f7', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#ffffff'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setNewColor(c)}
                                    className="w-5 h-5 rounded-full border border-slate-700 cursor-pointer"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-amber-300">Multiplicador de Poder:</span>
                              <span className="font-mono font-black text-white">{newPowerScale.toFixed(1)}x Dano</span>
                            </div>
                            <input
                              type="range"
                              min={0.8}
                              max={3.0}
                              step={0.1}
                              value={newPowerScale}
                              onChange={(e) => setNewPowerScale(parseFloat(e.target.value) || 1.0)}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Description & Passive */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Descrição
                            </label>
                            <input
                              type="text"
                              value={newDesc}
                              onChange={(e) => setNewDesc(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-amber-300 block mb-1">
                              Passiva Especial
                            </label>
                            <input
                              type="text"
                              value={newPassive}
                              onChange={(e) => setNewPassive(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>

                        {/* 4 Skills Inputs */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-amber-400 block mb-0.5">[Z] Disparo</span>
                            <input
                              type="text"
                              value={newSkillZ}
                              onChange={(e) => setNewSkillZ(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-amber-400 block mb-0.5">[X] Explosão Área</span>
                            <input
                              type="text"
                              value={newSkillX}
                              onChange={(e) => setNewSkillX(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-amber-400 block mb-0.5">[C] Investida / Voo</span>
                            <input
                              type="text"
                              value={newSkillC}
                              onChange={(e) => setNewSkillC(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-amber-400 block mb-0.5">[V] Despertar Supremo</span>
                            <input
                              type="text"
                              value={newSkillV}
                              onChange={(e) => setNewSkillV(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right 2 Columns: Live Interactive Preview & Create CTA */}
                      <div className="lg:col-span-2 p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Pré-Visualização em Tempo Real
                          </span>

                          <div
                            className="p-4 rounded-xl bg-slate-950 border-2 space-y-3"
                            style={{ borderColor: `${newColor}88` }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-black" style={{ color: newColor }}>
                                  {newPtName || 'Fruta Personalizada'}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {newEnName || 'Custom Fruit'} · {newCategory}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getRarityBadgeStyle(newRarity)}`}>
                                {newRarity}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              {newDesc || 'Sem descrição definida.'}
                            </p>

                            <div className="text-[11px] text-amber-300 font-semibold">
                              Passiva: {newPassive || 'Nenhuma'}
                            </div>

                            <div className="flex items-center justify-between text-xs font-mono tabular-nums pt-2 border-t border-slate-800">
                              <span className="text-emerald-400 font-bold">
                                ฿ {(parseInt(newBeli, 10) || 0).toLocaleString()}
                              </span>
                              <span className="text-purple-400 font-bold">
                                🟣 {(parseInt(newFrags, 10) || 0).toLocaleString()} Frags
                              </span>
                            </div>

                            <div className="space-y-1 pt-1">
                              {[
                                { k: 'Z', name: newSkillZ, mult: (4.5 * newPowerScale).toFixed(1) },
                                { k: 'X', name: newSkillX, mult: (6.5 * newPowerScale).toFixed(1) },
                                { k: 'C', name: newSkillC, mult: (5.0 * newPowerScale).toFixed(1) },
                                { k: 'V', name: newSkillV, mult: (11.5 * newPowerScale).toFixed(1) },
                              ].map((sk) => (
                                <div
                                  key={sk.k}
                                  className="flex items-center justify-between text-[10px] font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800"
                                >
                                  <span className="text-slate-200 truncate">
                                    <strong className="text-amber-400">[{sk.k}]</strong> {sk.name}
                                  </span>
                                  <span className="text-rose-400 font-bold tabular-nums">{sk.mult}x</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const createdId = `fruit_custom_${Date.now()}`;
                            const customFruit: BloxFruit = {
                              id: createdId,
                              name: newEnName.trim() || 'Custom Fruit',
                              portugueseName: newPtName.trim() || 'Fruta Personalizada',
                              category: newCategory,
                              rarity: newRarity,
                              element: newElement || 'energy',
                              priceBeli: parseInt(newBeli, 10) || 1000000,
                              chance: 1.0,
                              iconColor: newColor,
                              description: newDesc,
                              passive: newPassive,
                              skills: [
                                {
                                  key: 'Z',
                                  name: newSkillZ || 'Golpe 1',
                                  description: 'Disparo concentrado de energia.',
                                  masteryRequired: 1,
                                  damageMultiplier: Number((4.5 * newPowerScale).toFixed(1)),
                                  energyCost: 25,
                                  cooldown: 2.2,
                                  color: newColor,
                                  radius: 55,
                                  type: 'projectile',
                                },
                                {
                                  key: 'X',
                                  name: newSkillX || 'Golpe 2',
                                  description: 'Explosão em área massiva.',
                                  masteryRequired: 40,
                                  damageMultiplier: Number((6.5 * newPowerScale).toFixed(1)),
                                  energyCost: 50,
                                  cooldown: 4.8,
                                  color: newColor,
                                  radius: 95,
                                  type: 'aoe',
                                },
                                {
                                  key: 'C',
                                  name: newSkillC || 'Golpe 3',
                                  description: 'Investida rápida cortando o espaço.',
                                  masteryRequired: 75,
                                  damageMultiplier: Number((5.0 * newPowerScale).toFixed(1)),
                                  energyCost: 35,
                                  cooldown: 3.5,
                                  color: newColor,
                                  radius: 75,
                                  type: 'dash_attack',
                                },
                                {
                                  key: 'V',
                                  name: newSkillV || 'Supremo',
                                  description: 'Tempestade catastrófica de destruição.',
                                  masteryRequired: 150,
                                  damageMultiplier: Number((11.5 * newPowerScale).toFixed(1)),
                                  energyCost: 95,
                                  cooldown: 9.8,
                                  color: newColor,
                                  radius: 165,
                                  type: 'barrage',
                                },
                              ],
                            };

                            saveAdminCreatedFruit(customFruit);
                            setCustomShopOverride(customFruit.id, {
                              priceBeli: parseInt(newBeli, 10) || 1000000,
                              fragCost: parseInt(newFrags, 10) || 20000,
                              forceDealerStock: true,
                              forceFragStock: true,
                            });

                            setAdminCreatedFruits(getAdminCreatedFruits());
                            sound.legendaryWin();
                            showNotice(`✨ Fruta criada e injetada nas lojas: ${customFruit.portugueseName}!`);
                          }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
                        >
                          Criar & Injetar Fruta no Jogo Agora
                        </button>
                      </div>
                    </div>

                    {/* Created Custom Fruits List */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-white uppercase tracking-wide">
                          Frutas Criadas pelo Administrador ({adminCreatedFruits.length})
                        </h4>
                      </div>

                      {adminCreatedFruits.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">
                          Nenhuma fruta personalizada criada ainda. Use a Forja Criativa acima para criar sua primeira fruta!
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {adminCreatedFruits.map((fruit) => {
                            const isEquipped = activeFruit?.id === fruit.id;
                            return (
                              <div
                                key={fruit.id}
                                className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="text-xs font-black" style={{ color: fruit.iconColor }}>
                                        {fruit.portugueseName}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono block">
                                        {fruit.name} · ฿ {fruit.priceBeli.toLocaleString()}
                                      </span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getRarityBadgeStyle(fruit.rarity)}`}>
                                      {fruit.rarity}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-2">{fruit.description}</p>
                                </div>

                                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                                  <button
                                    onClick={() => {
                                      onEquipFruit(fruit);
                                      sound.legendaryWin();
                                      showNotice(`🔮 Fruta equipada: ${fruit.portugueseName}!`);
                                    }}
                                    disabled={isEquipped}
                                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg cursor-pointer"
                                  >
                                    {isEquipped ? 'Equipada' : 'Comer'}
                                  </button>

                                  <button
                                    onClick={() => {
                                      onStoreFruit(fruit);
                                      sound.click();
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg cursor-pointer"
                                  >
                                    + Baú
                                  </button>

                                  <button
                                    onClick={() => {
                                      setAdminGlobalMarketConfig({ guaranteedNextSpinFruitId: fruit.id });
                                      sound.legendaryWin();
                                      showNotice(`🎯 ${fruit.portugueseName} travada para o próximo giro da Roleta!`);
                                    }}
                                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-lg cursor-pointer"
                                    title="Garantir no próximo giro da roleta"
                                  >
                                    🎯 Giro
                                  </button>

                                  <button
                                    onClick={() => {
                                      deleteAdminCreatedFruit(fruit.id);
                                      setAdminCreatedFruits(getAdminCreatedFruits());
                                      sound.click();
                                      showNotice(`🗑️ Fruta removida: ${fruit.portugueseName}`);
                                    }}
                                    className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-lg border border-rose-500/40 cursor-pointer"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
