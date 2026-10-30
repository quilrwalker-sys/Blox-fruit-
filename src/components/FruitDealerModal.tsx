import React, { useState, useMemo, useEffect } from 'react';
import { BLOX_FRUITS } from '../data/gameData';
import { BloxFruit, FruitCategory, FruitRarity } from '../types/game';
import { sound } from '../utils/audio';
import {
  getAdminGlobalMarketConfig,
  getCustomShopOverrides,
  getEffectiveBloxFruits,
  setAdminGlobalMarketConfig,
} from '../utils/adminShopManager';

interface FruitDealerModalProps {
  beli: number;
  playerLevel: number;
  activeFruit: BloxFruit | null;
  storedFruits: BloxFruit[];
  onSpinFruit: (fruit: BloxFruit, cost: number) => void;
  onEatFruit: (fruit: BloxFruit) => void;
  onStoreFruit: (fruit: BloxFruit) => void;
  onDropStoredFruit: (index: number) => void;
  onDropActiveFruit?: () => void;
  onClose: () => void;
}

export const FruitDealerModal: React.FC<FruitDealerModalProps> = ({
  beli,
  playerLevel,
  activeFruit,
  storedFruits,
  onSpinFruit,
  onEatFruit,
  onStoreFruit,
  onDropStoredFruit,
  onDropActiveFruit,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'dealer' | 'active' | 'inventory' | 'catalog'>('dealer');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinFruitPreview, setSpinFruitPreview] = useState<BloxFruit | null>(null);
  const [wonFruit, setWonFruit] = useState<BloxFruit | null>(null);
  const [reelFruits, setReelFruits] = useState<BloxFruit[]>([]);
  const [reelKey, setReelKey] = useState(0);
  const [reelOffset, setReelOffset] = useState(0);

  // In-game confirmation modal state for throwing away a fruit (replaces native browser window.confirm)
  const [discardTarget, setDiscardTarget] = useState<{
    type: 'stored' | 'won' | 'active';
    fruit: BloxFruit;
    index?: number;
  } | null>(null);

  // Filters for catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('Todas');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const [updateTick, setUpdateTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setUpdateTick((t) => t + 1);
    window.addEventListener('admin_shop_updated', handleUpdate);
    return () => window.removeEventListener('admin_shop_updated', handleUpdate);
  }, []);

  const effectiveFruits = useMemo(() => getEffectiveBloxFruits(), [updateTick]);
  const marketConfig = useMemo(() => getAdminGlobalMarketConfig(), [updateTick]);
  const customOverrides = useMemo(() => getCustomShopOverrides(), [updateTick]);

  // Spin cost calculation with Admin Override & Global Discount support
  const baseSpinCost = Math.max(15000, 15000 + playerLevel * 350);
  const discountFactor = Math.max(0, Math.min(1, (100 - (marketConfig.globalDiscountPercent || 0)) / 100));
  const spinCost =
    marketConfig.gachaSpinCostOverride !== null
      ? Math.max(0, Math.round(marketConfig.gachaSpinCostOverride * discountFactor))
      : Math.max(0, Math.round(baseSpinCost * discountFactor));

  const startSpin = () => {
    if (beli < spinCost || isSpinning) return;

    setIsSpinning(true);
    setWonFruit(null);
    setReelOffset(0);

    // Helper to pick fruit based on chance weight (f.chance)
    const selectWeightedFruit = (pool: BloxFruit[]): BloxFruit => {
      if (!pool || pool.length === 0) return effectiveFruits[0] || BLOX_FRUITS[0];
      const totalWeight = pool.reduce((sum, f) => sum + Math.max(0.0001, f.chance !== undefined ? f.chance : 1.0), 0);
      let randWeight = Math.random() * totalWeight;
      for (const f of pool) {
        const w = Math.max(0.0001, f.chance !== undefined ? f.chance : 1.0);
        if (randWeight <= w) return f;
        randWeight -= w;
      }
      return pool[0];
    };

    const luckMult = Math.max(1, marketConfig.gachaLuckMultiplier || 1);
    const guaranteedFruit = marketConfig.guaranteedNextSpinFruitId
      ? effectiveFruits.find((f) => f.id === marketConfig.guaranteedNextSpinFruitId)
      : null;

    // Weighted roll (0 - 100)
    const rand = Math.random() * 100;
    let selected: BloxFruit;

    if (guaranteedFruit) {
      selected = guaranteedFruit;
      // Consume one-shot guaranteed spin after locking target
      setAdminGlobalMarketConfig({ guaranteedNextSpinFruitId: null });
    } else if (rand < 0.0001 * luckMult) {
      const leviathanPool = effectiveFruits.filter((f) => f.rarity === 'Incompreendido');
      selected = selectWeightedFruit(leviathanPool);
    } else if (rand < 0.7 * luckMult) {
      // Mítica
      const mythicals = effectiveFruits.filter((f) => f.rarity === 'Mítica');
      selected = selectWeightedFruit(mythicals);
    } else if (rand < 3.5 * luckMult) {
      // Lendária
      const legendaries = effectiveFruits.filter((f) => f.rarity === 'Lendária');
      selected = selectWeightedFruit(legendaries);
    } else if (rand < 10.0 * Math.min(4, luckMult)) {
      // Épica
      const epics = effectiveFruits.filter((f) => f.rarity === 'Épica');
      selected = selectWeightedFruit(epics);
    } else if (rand < 24.0 * Math.min(2.5, luckMult)) {
      // Rara
      const rares = effectiveFruits.filter((f) => f.rarity === 'Rara');
      selected = selectWeightedFruit(rares);
    } else if (rand < 52.0) {
      // Incomum
      const uncommons = effectiveFruits.filter((f) => f.rarity === 'Incomum');
      selected = selectWeightedFruit(uncommons);
    } else {
      // Comum
      const commons = effectiveFruits.filter((f) => f.rarity === 'Comum');
      selected = selectWeightedFruit(commons);
    }

    // Build reel array (30 items, winning item at index 24)
    const winningIndex = 24;
    const generatedReel: BloxFruit[] = [];
    for (let i = 0; i < 30; i++) {
      if (i === winningIndex) {
        generatedReel.push(selected);
      } else {
        generatedReel.push(effectiveFruits[Math.floor(Math.random() * effectiveFruits.length)]);
      }
    }
    setReelFruits(generatedReel);
    setReelKey((prev) => prev + 1);

    // Sound ticks during spin
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      sound.spinTick();
      if (tickCount >= 22) {
        clearInterval(tickInterval);
      }
    }, 140);

    // Trigger smooth CSS animation on next tick
    setTimeout(() => {
      setReelOffset(-2640);
    }, 50);

    setTimeout(() => {
      setIsSpinning(false);
      setWonFruit(selected);

      if (selected.rarity === 'Incompreendido' || selected.rarity === 'Mítica' || selected.rarity === 'Lendária') {
        sound.legendaryWin();
      } else {
        sound.levelUp();
      }

      onSpinFruit(selected, spinCost);
    }, 3250);
  };

  const getRarityBadge = (rarity: FruitRarity) => {
    switch (rarity) {
      case 'Incompreendido':
        return 'text-cyan-300 font-black animate-pulse border border-cyan-400/80 bg-cyan-950/80 px-2 py-0.5 rounded shadow-lg shadow-cyan-500/20';
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

  const getCategoryBadge = (category: FruitCategory) => {
    switch (category) {
      case 'Elemental':
        return 'text-amber-300 bg-amber-950/40 border border-amber-500/30';
      case 'Zoan':
        return 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/30';
      default:
        return 'text-sky-300 bg-sky-950/40 border border-sky-500/30';
    }
  };

  const filteredFruits = useMemo(() => {
    return effectiveFruits.filter((fruit) => {
      if (fruit.hiddenInCatalog && !customOverrides[fruit.id]?.forceDealerStock) return false;
      const matchesSearch =
        fruit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fruit.portugueseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fruit.element.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = selectedRarity === 'Todas' || fruit.rarity === selectedRarity;
      const matchesCategory = selectedCategory === 'Todas' || fruit.category === selectedCategory;
      return matchesSearch && matchesRarity && matchesCategory;
    });
  }, [effectiveFruits, customOverrides, searchQuery, selectedRarity, selectedCategory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-amber-400">
              Vendedor de Frutas Blox (Gacha & Catálogo)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Role frutas lendárias e míticas ou inspecione todas as 38+ frutas oficiais do Blox Fruits.
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

        {/* Tab selection */}
        <div className="flex items-center gap-1 my-3 p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              sound.click();
              setActiveTab('dealer');
            }}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'dealer'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Girar Fruta (Gacha)
          </button>
          <button
            onClick={() => {
              sound.click();
              setActiveTab('active');
            }}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'active'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fruta Equipada
          </button>
          <button
            onClick={() => {
              sound.click();
              setActiveTab('inventory');
            }}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Baú de Frutas ({storedFruits.length})
          </button>
          <button
            onClick={() => {
              sound.click();
              setActiveTab('catalog');
            }}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Catálogo ({BLOX_FRUITS.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: DEALER GACHA */}
          {activeTab === 'dealer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-800">
                  <img
                    src="/src/assets/images/blox_fruit_dealer_1792589312738.jpg"
                    alt="Vendedor de Frutas Blox"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-semibold text-slate-200">
                      Mercador do Porto Blox
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-full space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Roleta do Mercador</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Compre uma fruta misteriosa do mar! As chances variam de Comum até a
                      impossível raridade <strong>Incompreendido</strong>.
                    </p>

                    <div className="mt-3 p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Custo da Roleta:</span>
                        <span className="font-bold text-emerald-400 tabular-nums">
                          ฿ {spinCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Seu Saldo:</span>
                        <span className="font-bold text-amber-400 tabular-nums">
                          ฿ {beli.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500">
                      Chances: Comum (48%) · Incomum (28%) · Rara (14%) · Épica (6.5%) · Lendária (2.8%) · Mítica (0.7%) · Incompreendido (0.0001%)
                    </div>
                  </div>

                  <button
                    onClick={startSpin}
                    disabled={beli < spinCost || isSpinning}
                    className="w-full py-3 text-sm font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    {isSpinning ? 'Girando Roleta...' : `Girar Fruta (฿ ${spinCost.toLocaleString()})`}
                  </button>
                </div>
              </div>

              {/* Spin Roller Display */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-4">
                <div className="text-xs text-slate-400">
                  {isSpinning ? 'Girando Roleta de Frutas do Mar...' : wonFruit ? 'Parabéns! Você obteve na roleta:' : 'Pressione "Girar Fruta" para iniciar a roleta misteriosa!'}
                </div>

                {/* Roulette Slot Strip Viewport */}
                <div className="relative w-full max-w-lg mx-auto h-36 bg-slate-900 rounded-xl border-2 border-amber-500/50 overflow-hidden shadow-2xl flex items-center">
                  {/* Center Target Indicator Pointer / Golden Glow Frame */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-amber-400 z-20 shadow-[0_0_16px_#fbbf24] pointer-events-none flex flex-col justify-between items-center py-1">
                    <div className="w-3.5 h-3.5 bg-amber-400 rotate-45 -top-1.5 absolute shadow-lg border border-amber-200"></div>
                    <div className="w-3.5 h-3.5 bg-amber-400 rotate-45 -bottom-1.5 absolute shadow-lg border border-amber-200"></div>
                  </div>

                  {/* Sliding Track */}
                  <div
                    key={reelKey}
                    className="flex items-center gap-3 px-4 transition-all duration-[3250ms] ease-[cubic-bezier(0.12,0.82,0.22,1)]"
                    style={{
                      transform: `translateX(${reelOffset}px)`,
                    }}
                  >
                    {(reelFruits.length > 0 ? reelFruits : BLOX_FRUITS.slice(0, 30)).map((fruit, idx) => (
                      <div
                        key={idx}
                        className={`w-24 h-28 shrink-0 bg-slate-950/90 rounded-lg border p-2 flex flex-col items-center justify-center relative shadow-md transition-transform ${
                          idx === 24 && wonFruit && !isSpinning ? 'scale-105 border-amber-400 shadow-amber-500/30' : 'border-slate-800'
                        }`}
                        style={{ borderColor: idx === 24 && wonFruit && !isSpinning ? '#fbbf24' : fruit.iconColor + '55' }}
                      >
                        {fruit.image ? (
                          <img
                            src={fruit.image}
                            alt={fruit.name}
                            className="w-12 h-12 object-cover rounded-md mb-1.5 shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-slate-900 overflow-hidden relative mb-1.5 flex items-center justify-center border border-slate-700 shadow-inner">
                            <img
                              src="/src/assets/images/glowing_devil_fruits_1792589312701.jpg"
                              alt="Devil Fruit"
                              className="absolute inset-0 w-full h-full object-cover opacity-70"
                            />
                            <span className="relative z-10 text-lg drop-shadow-md" style={{ color: fruit.iconColor || '#fbbf24' }}>
                              🍎
                            </span>
                          </div>
                        )}
                        <span className="text-[11px] font-bold truncate w-full text-center" style={{ color: fruit.iconColor }}>
                          {fruit.portugueseName}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-tight mt-0.5">
                          {fruit.rarity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {wonFruit && !isSpinning && (() => {
                  const alreadyInStorage = storedFruits.some((f) => f.id === wonFruit.id);
                  return (
                    <div className="space-y-3 animate-fadeIn pt-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className={getRarityBadge(wonFruit.rarity)}>
                          {wonFruit.rarity}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${getCategoryBadge(wonFruit.category)}`}>
                          Tipo: {wonFruit.category}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                            alreadyInStorage
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          No Baú: {alreadyInStorage ? '1/1 (CHEIO)' : '0/1'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 max-w-md mx-auto">
                        {wonFruit.description}
                      </p>

                      {alreadyInStorage && (
                        <div className="max-w-md mx-auto p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg">
                          <span className="text-base shrink-0">🚫</span>
                          <span>
                            Você já tem <strong>1x {wonFruit.portugueseName}</strong> guardada! Só é permitido guardar <strong>1 fruta igual</strong> no Baú.
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2.5 flex-wrap pt-2">
                        <button
                          onClick={() => {
                            onEatFruit(wonFruit);
                            sound.levelUp();
                            setWonFruit(null);
                          }}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                        >
                          🍽️ Comer Fruta Agora
                        </button>
                        <button
                          onClick={() => {
                            if (alreadyInStorage) {
                              sound.punch();
                              return;
                            }
                            onStoreFruit(wonFruit);
                            sound.click();
                            setWonFruit(null);
                          }}
                          disabled={alreadyInStorage}
                          title={
                            alreadyInStorage
                              ? `Você já possui 1x ${wonFruit.portugueseName} no baú (Limite: 1)`
                              : 'Guardar fruta no baú'
                          }
                          className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
                            alreadyInStorage
                              ? 'bg-slate-900 text-slate-500 border-rose-500/40 opacity-60 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                          }`}
                        >
                          {alreadyInStorage ? '🚫 Já Possui no Baú (Máx: 1)' : '🎒 Guardar no Baú (0/1)'}
                        </button>
                        <button
                          onClick={() => {
                            sound.click();
                            setDiscardTarget({ type: 'won', fruit: wonFruit });
                          }}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer"
                        >
                          🗑️ Jogar Fora
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE FRUIT */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {activeFruit ? (
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className="text-2xl font-black tracking-tight"
                          style={{ color: activeFruit.iconColor }}
                        >
                          {activeFruit.portugueseName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={getRarityBadge(activeFruit.rarity)}>
                          {activeFruit.rarity}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${getCategoryBadge(activeFruit.category)}`}>
                          Tipo: {activeFruit.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2">{activeFruit.description}</p>
                      {activeFruit.passive && (
                        <div className="text-xs text-emerald-400 mt-1.5 bg-emerald-950/30 p-2 rounded border border-emerald-500/30">
                          Passiva: {activeFruit.passive}
                        </div>
                      )}
                    </div>

                    {activeFruit.image && (
                      <div className="w-24 h-24 rounded-xl overflow-hidden border border-cyan-500/50 shadow-lg shrink-0">
                        <img
                          src={activeFruit.image}
                          alt={activeFruit.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Skills Moveset */}
                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-xs font-semibold text-slate-400 block mb-2">
                      Golpes de Combate (Atalhos no Teclado):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeFruit.skills.map((skill) => (
                        <div
                          key={skill.key}
                          className="p-3 bg-slate-900 rounded-lg border border-slate-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400">
                              [{skill.key}] {skill.name}
                            </span>
                            <span className="text-[10px] text-sky-400 font-mono">
                              {skill.energyCost} EN
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{skill.description}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
                            <span>Recarga: {skill.cooldown}s</span>
                            <span>Mult. Dano: {skill.damageMultiplier}x</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discard / Remove Active Fruit Button */}
                  {onDropActiveFruit && (
                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-[11px] text-slate-400">
                        Deseja abandonar os poderes desta fruta e jogá-la fora?
                      </span>
                      <button
                        onClick={() => {
                          sound.click();
                          setDiscardTarget({ type: 'active', fruit: activeFruit });
                        }}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🗑️</span>
                        <span>Jogar Fora Fruta Equipada</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <span className="text-sm text-slate-400 block mb-2">
                    Você ainda não comeu nenhuma Fruta Blox!
                  </span>
                  <p className="text-xs text-slate-500 mb-4">
                    Gire na roleta do mercador ou escolha uma fruta guardada no seu baú.
                  </p>
                  <button
                    onClick={() => setActiveTab('dealer')}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Girar Fruta Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-3">
              <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <span>🎒 Capacidade do Baú: <strong>Máximo de 1 unidade de cada fruta</strong></span>
                <span className="font-mono text-amber-400 font-bold">1/1 por Fruta</span>
              </div>
              {storedFruits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {storedFruits.map((fruit, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-base font-bold"
                            style={{ color: fruit.iconColor }}
                          >
                            {fruit.portugueseName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                              1/1
                            </span>
                            <span className={getRarityBadge(fruit.rarity)}>
                              {fruit.rarity}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {fruit.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                        <button
                          onClick={() => {
                            onEatFruit(fruit);
                            onDropStoredFruit(idx);
                            sound.levelUp();
                          }}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                        >
                          Comer
                        </button>
                        <button
                          onClick={() => {
                            sound.click();
                            setDiscardTarget({ type: 'stored', fruit, index: idx });
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>Jogar Fora</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <span className="text-sm text-slate-400 block mb-1">
                    Seu baú de frutas está vazio.
                  </span>
                  <p className="text-xs text-slate-500">
                    Quando girar frutas na roleta, você poderá guardá-las aqui para trocar depois!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMPLETE CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-3">
              {/* Search and Filters */}
              <div className="space-y-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <input
                  type="text"
                  placeholder="Buscar fruta por nome ou poder (ex: Buddha, Light, Leviathan, Mochi)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Raridade:</span>
                    <select
                      value={selectedRarity}
                      onChange={(e) => setSelectedRarity(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    >
                      {['Todas', 'Comum', 'Incomum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Incompreendido'].map(
                        (r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Tipo:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    >
                      {['Todas', 'Natural', 'Elemental', 'Zoan'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-[11px] text-slate-500 ml-auto font-mono">
                    {filteredFruits.length} frutas encontradas
                  </span>
                </div>
              </div>

              {/* Grid of All Fruits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredFruits.map((fruit) => {
                  const isDealerInStock = Boolean(customOverrides[fruit.id]?.forceDealerStock);
                  const alreadyInChest = storedFruits.some((f) => f.id === fruit.id);
                  const canAffordDirect = beli >= fruit.priceBeli;

                  return (
                    <div
                      key={`dealer_catalog_${fruit.id}`}
                      className={`p-3.5 bg-slate-950/60 rounded-xl border transition-all flex flex-col justify-between ${
                        fruit.rarity === 'Incompreendido'
                          ? 'border-cyan-500/80 shadow-md shadow-cyan-500/20'
                          : isDealerInStock
                          ? 'border-emerald-500/60 bg-emerald-950/15'
                          : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: fruit.iconColor }}>
                                {fruit.portugueseName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={getRarityBadge(fruit.rarity)}>
                                {fruit.rarity}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getCategoryBadge(fruit.category)}`}>
                                {fruit.category}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums">
                                ฿ {fruit.priceBeli.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {fruit.image && (
                            <img
                              src={fruit.image}
                              alt={fruit.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover border border-cyan-500/40 shrink-0"
                            />
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-2">{fruit.description}</p>
                        <div className="text-[10px] text-slate-500 mt-2 font-mono">
                          Golpes: {fruit.skills.map((s) => `[${s.key}] ${s.name}`).join(' · ')}
                        </div>
                      </div>

                      {isDealerInStock && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-emerald-300">
                            Em estoque direto
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (!canAffordDirect) {
                                  sound.punch();
                                  return;
                                }
                                onSpinFruit(fruit, fruit.priceBeli);
                                onEatFruit(fruit);
                                sound.legendaryWin();
                              }}
                              disabled={!canAffordDirect}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              Comprar & Comer
                            </button>
                            <button
                              onClick={() => {
                                if (!canAffordDirect || alreadyInChest) {
                                  sound.punch();
                                  return;
                                }
                                onSpinFruit(fruit, fruit.priceBeli);
                                onStoreFruit(fruit);
                                sound.click();
                              }}
                              disabled={!canAffordDirect || alreadyInChest}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              {alreadyInChest ? 'Baú (1/1)' : '+ Baú'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
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

        {/* Custom In-Game Confirmation Modal for Throwing Away a Fruit */}
        {discardTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-slate-950 border-2 border-rose-500/80 rounded-2xl shadow-[0_0_40px_rgba(244,63,94,0.35)] p-5 text-white space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-2xl shrink-0">
                  🗑️
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-400">
                    Jogar Fruta Fora no Mar?
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Confirmação do Inventário Blox Fruits
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span
                    className="text-sm font-black block"
                    style={{ color: discardTarget.fruit.iconColor }}
                  >
                    {discardTarget.fruit.portugueseName}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {discardTarget.type === 'stored'
                      ? 'Guardada no seu Baú de Frutas'
                      : discardTarget.type === 'active'
                      ? 'Atualmente equipada no seu personagem'
                      : 'Obtida agora na Roleta do Mercador'}
                  </span>
                </div>
                <span className={getRarityBadge(discardTarget.fruit.rarity)}>
                  {discardTarget.fruit.rarity}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Tem certeza que deseja jogar a{' '}
                <strong style={{ color: discardTarget.fruit.iconColor }}>
                  {discardTarget.fruit.portugueseName}
                </strong>{' '}
                fora? Ela afundará no oceano e será perdida permanentemente!
              </p>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  onClick={() => {
                    sound.click();
                    setDiscardTarget(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    sound.punch();
                    if (discardTarget.type === 'stored' && discardTarget.index !== undefined) {
                      onDropStoredFruit(discardTarget.index);
                    } else if (discardTarget.type === 'won') {
                      setWonFruit(null);
                    } else if (discardTarget.type === 'active') {
                      onDropActiveFruit?.();
                    }
                    setDiscardTarget(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-900/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🗑️</span>
                  <span>Sim, Jogar Fora</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
