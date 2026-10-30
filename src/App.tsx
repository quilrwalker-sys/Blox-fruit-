/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { ActionControls } from './components/ActionControls';
import { StatsModal } from './components/StatsModal';
import { FruitDealerModal } from './components/FruitDealerModal';
import { QuestModal } from './components/QuestModal';
import { ShopModal } from './components/ShopModal';
import { FragmentShopModal } from './components/FragmentShopModal';
import { IslandMapModal } from './components/IslandMapModal';
import { AdminModal } from './components/AdminModal';
import { AuthStartModal } from './components/AuthStartModal';
import { ClanModal } from './components/ClanModal';
import { MenuModal } from './components/MenuModal';
import { FruitTradeModal } from './components/FruitTradeModal';
import { HakiShopModal } from './components/HakiShopModal';
import { HakiColorNpcModal } from './components/HakiColorNpcModal';
import { Gear5HackModal, Gear5Settings } from './components/Gear5HackModal';
import { TripleDarkBladeCinematic3D } from './components/TripleDarkBladeCinematic3D';
import { LoadingScreenModal } from './components/LoadingScreenModal';
import { BLOX_FRUITS, ISLANDS, SWORDS } from './data/gameData';
import { HAKI_COLORS, getHakiColorById, rollRandomHakiColor } from './data/hakiColors';
import { syncAdminShopFromServer } from './utils/adminShopManager';
import {
  ActiveQuest,
  BloxFruit,
  ChaliceRitualButton,
  CharacterProfile,
  CombatArchetype,
  HakiColor,
  HakiSkills,
  Island,
  PlayerStats,
  QuestDefinition,
  RemotePlayer,
  Sword,
} from './types/game';
import { sound } from './utils/audio';

const STORAGE_KEY = 'blox_fruits_save_v1';

export default function App() {
  // Always show the start screen when opening/loading the game
  const [showAuthModal, setShowAuthModal] = useState<boolean>(true);
  const [loadingScreenMode, setLoadingScreenMode] = useState<'resume' | 'new' | null>(null);
  const hasExistingSave = !!localStorage.getItem(STORAGE_KEY);

  const handleStartGame = (
    character: CharacterProfile,
    starterFruit: BloxFruit,
    combatStyle: CombatArchetype
  ) => {
    setActiveFruit(starterFruit);
    setActiveWeaponType(combatStyle);

    const initialMelee = combatStyle === 'melee' ? 3 : 1;
    const initialSword = combatStyle === 'sword' ? 3 : 1;
    const initialBloxFruit = combatStyle === 'fruit' ? 3 : 1;
    const startingBeli = character.faction === 'Pirates' ? 15000 : 10000;
    const startingFrags = character.faction === 'Revolutionaries' ? 650 : 500;
    const startingBounty = character.faction === 'Marines' ? 1500 : 1000;

    const newStats: PlayerStats = {
      level: 1,
      exp: 0,
      expToNextLevel: 250,
      beli: startingBeli,
      fragments: startingFrags,
      bounty: startingBounty,
      statPoints: 3,
      melee: initialMelee,
      defense: 1,
      sword: initialSword,
      bloxFruit: initialBloxFruit,
      fruitMastery: 1,
      swordMastery: 1,
      character,
    };

    setStats(newStats);
    setStoredFruits([starterFruit]);
    const saveObj = {
      stats: newStats,
      activeFruitId: starterFruit.id,
      storedFruitIds: [starterFruit.id],
      ownedSwordIds: ['sword_katana'],
      activeSwordId: 'sword_katana',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveObj));
    setShowAuthModal(false);
    setLoadingScreenMode('new');
  };

  const handleUpdateCharacter = (newCharacter: CharacterProfile) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        character: newCharacter,
      };
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.stats = updated;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }
      return updated;
    });
    setShowAuthModal(false);
  };

  // 1. Core Player State
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.stats) {
          return {
            ...parsed.stats,
            fragments: parsed.stats.fragments ?? 0,
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return {
      level: 1,
      exp: 0,
      expToNextLevel: 250,
      beli: 10000,
      fragments: 500,
      bounty: 1000,
      statPoints: 3,
      melee: 1,
      defense: 1,
      sword: 1,
      bloxFruit: 1,
      fruitMastery: 1,
      swordMastery: 1,
      character: {
        name: 'Monkey D. Luffy',
        race: 'Humano',
        faction: 'Pirates',
        combatStyle: 'fruit',
        skinColor: '#fed7aa',
        hairStyle: 'spiky',
        hairColor: '#0f172a',
        accessory: 'straw_hat',
        outfitColor: 'red_vest',
        title: 'Capitão Destemido',
      },
    };
  });

  // Calculate dynamic maximums with Race Passives
  const isFishman = stats.character?.race === 'Fishman';
  const isSkypiean = stats.character?.race === 'Skypiean';
  const maxHp = Math.round((100 + stats.defense * 15) * (isFishman ? 1.15 : 1));
  const maxEnergy = Math.round((100 + stats.melee * 5) * (isSkypiean ? 1.20 : 1));

  const [playerHp, setPlayerHp] = useState<number>(maxHp);
  const [playerEnergy, setPlayerEnergy] = useState<number>(maxEnergy);

  // 2. Equipment & Arsenal
  const [activeFruit, setActiveFruit] = useState<BloxFruit | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeFruitId) {
          const found = BLOX_FRUITS.find((f) => f.id === parsed.activeFruitId);
          if (found) return found;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return BLOX_FRUITS.find((f) => f.id === 'fruit_bomb') || null;
  });

  const [storedFruits, setStoredFruits] = useState<BloxFruit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.storedFruitIds && Array.isArray(parsed.storedFruitIds)) {
          const uniqueIds = Array.from(new Set(parsed.storedFruitIds as string[]));
          return uniqueIds
            .map((id: string) => BLOX_FRUITS.find((f) => f.id === id))
            .filter(Boolean) as BloxFruit[];
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [activeSword, setActiveSword] = useState<Sword | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeSwordId) {
          const found = SWORDS.find((s) => s.id === parsed.activeSwordId);
          if (found) return found;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return SWORDS[0];
  });

  const [ownedSwordIds, setOwnedSwordIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.ownedSwordIds && Array.isArray(parsed.ownedSwordIds)) {
          return parsed.ownedSwordIds;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return ['sword_katana'];
  });

  const [activeWeaponType, setActiveWeaponType] = useState<'melee' | 'sword' | 'fruit'>('fruit');

  // 3. Current Island & Active Quest
  const [currentIsland, setCurrentIsland] = useState<Island>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentIslandId) {
          const found = ISLANDS.find((i) => i.id === parsed.currentIslandId);
          if (found) return found;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return ISLANDS[0];
  });

  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeQuest) {
          return parsed.activeQuest;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const q0 = ISLANDS[0].quests[0];
    return {
      questId: q0.id,
      title: q0.title,
      targetEnemyId: q0.targetEnemyId,
      targetEnemyName: q0.targetEnemyName,
      currentCount: 0,
      targetCount: q0.targetCount,
      expReward: q0.expReward,
      beliReward: q0.beliReward,
    };
  });

  // 4. Haki & Mobility Abilities
  const [haki, setHaki] = useState<HakiSkills>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.haki) {
          return {
            ...parsed.haki,
            busoHakiActive: false,
            kenHakiActive: false,
            activeHakiColorId: parsed.haki.activeHakiColorId || 'haki_amethyst_purple',
            unlockedHakiColorIds:
              Array.isArray(parsed.haki.unlockedHakiColorIds) && parsed.haki.unlockedHakiColorIds.length > 0
                ? parsed.haki.unlockedHakiColorIds
                : ['haki_amethyst_purple'],
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return {
      busoHaki: true,
      busoHakiActive: false,
      busoEnergy: 30,
      maxBusoEnergy: 30,
      kenHaki: true,
      kenHakiActive: false,
      kenEnergy: 5,
      maxKenEnergy: 5,
      geppo: false,
      soru: true,
      activeHakiColorId: 'haki_amethyst_purple',
      unlockedHakiColorIds: ['haki_amethyst_purple'],
    };
  });

  // Haki Energy & Duration Ticker (Buso = 30s max, Ken = 5s max)
  useEffect(() => {
    const interval = setInterval(() => {
      setHaki((prev) => {
        if (chaliceRitualActiveRef.current) {
          return {
            ...prev,
            busoEnergy: 30,
            maxBusoEnergy: 30,
            kenEnergy: 5,
            maxKenEnergy: 5,
          };
        }

        const maxB = prev.maxBusoEnergy || 30;
        const curB = prev.busoEnergy !== undefined ? prev.busoEnergy : maxB;
        const maxK = prev.maxKenEnergy || 5;
        const curK = prev.kenEnergy !== undefined ? prev.kenEnergy : maxK;

        let nextB = curB;
        let nextBActive = prev.busoHakiActive;
        if (prev.busoHakiActive) {
          nextB = Math.max(0, curB - 0.2);
          if (nextB <= 0) {
            nextBActive = false;
          }
        } else if (curB < maxB) {
          // Recharges from 0 to 30 in 45 seconds
          nextB = Math.min(maxB, curB + (maxB / 45) * 0.2);
        }

        let nextK = curK;
        let nextKActive = prev.kenHakiActive;
        if (prev.kenHakiActive) {
          nextK = Math.max(0, curK - 0.2);
          if (nextK <= 0) {
            nextKActive = false;
          }
        } else if (curK < maxK) {
          // Recharges from 0 to 5 in 30 seconds
          nextK = Math.min(maxK, curK + (maxK / 30) * 0.2);
        }

        if (nextB === curB && nextK === curK && nextBActive === prev.busoHakiActive && nextKActive === prev.kenHakiActive) {
          return prev;
        }

        return {
          ...prev,
          busoEnergy: nextB,
          maxBusoEnergy: maxB,
          busoHakiActive: nextBActive,
          kenEnergy: nextK,
          maxKenEnergy: maxK,
          kenHakiActive: nextKActive,
        };
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // 4b. Wandering Haki Colors Master NPC (Appears on random island every 15 minutes, selling 1 color at a time)
  const HAKI_NPC_STORAGE_KEY = 'blox_fruits_haki_npc_v1';
  const [hakiNpcState, setHakiNpcState] = useState<{
    islandId: string;
    colorId: string;
    spawnTimestamp: number;
  }>(() => {
    const now = Date.now();
    const saved = localStorage.getItem('blox_fruits_haki_npc_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const elapsed = Math.floor((now - parsed.spawnTimestamp) / 1000);
        if (elapsed < 900 && parsed.islandId && parsed.colorId) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const initialIsland = ISLANDS[Math.floor(Math.random() * ISLANDS.length)].id;
    const initialColor = rollRandomHakiColor().id;
    const initialObj = {
      islandId: initialIsland,
      colorId: initialColor,
      spawnTimestamp: now,
    };
    localStorage.setItem('blox_fruits_haki_npc_v1', JSON.stringify(initialObj));
    return initialObj;
  });

  const [hakiNpcTimeRemaining, setHakiNpcTimeRemaining] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - hakiNpcState.spawnTimestamp) / 1000);
    return Math.max(0, 900 - elapsed);
  });

  // 15-Minute Countdown & Rotation Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - hakiNpcState.spawnTimestamp) / 1000);
      const remaining = 900 - elapsed;
      if (remaining <= 0) {
        // Relocate NPC to new random island and roll new single color
        const nextIsland = ISLANDS[Math.floor(Math.random() * ISLANDS.length)];
        const nextColor = rollRandomHakiColor();
        const nextObj = {
          islandId: nextIsland.id,
          colorId: nextColor.id,
          spawnTimestamp: Date.now(),
        };
        setHakiNpcState(nextObj);
        setHakiNpcTimeRemaining(900);
        localStorage.setItem(HAKI_NPC_STORAGE_KEY, JSON.stringify(nextObj));

        setAutoQuestNotice(
          `⚡ O Mestre das Cores de Haki surgiu na Ilha ${nextIsland.name}! Vendendo: ${nextColor.name} por 15 minutos!`
        );
        sound.hakiToggle();
        setTimeout(() => setAutoQuestNotice(null), 9000);
      } else {
        setHakiNpcTimeRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hakiNpcState]);

  const hakiNpcOffer = getHakiColorById(hakiNpcState.colorId);
  const hakiNpcIslandObj = ISLANDS.find((i) => i.id === hakiNpcState.islandId) || currentIsland;

  // 4c. Sacred Chalice & Legendary Mihawk Summoning Ritual (15min cooldown, 2% drop, 30s 3-button Haki puzzle)
  const [chaliceCooldownEnd, setChaliceCooldownEnd] = useState<number>(() => {
    const saved = localStorage.getItem('blox_fruits_chalice_cd');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  });
  const [chaliceRitualActive, setChaliceRitualActive] = useState<boolean>(false);
  const chaliceRitualActiveRef = useRef(false);
  useEffect(() => {
    chaliceRitualActiveRef.current = chaliceRitualActive;
  }, [chaliceRitualActive]);

  const [chaliceRitualTimeLeft, setChaliceRitualTimeLeft] = useState<number>(30);
  const [chaliceButtons, setChaliceButtons] = useState<ChaliceRitualButton[]>([]);
  const [spawnMihawkTrigger, setSpawnMihawkTrigger] = useState<number | null>(null);

  // 30-Second Ritual Countdown Loop
  useEffect(() => {
    if (!chaliceRitualActive) return;
    const interval = setInterval(() => {
      setChaliceRitualTimeLeft((prev) => {
        if (prev <= 1) {
          setChaliceRitualActive(false);
          sound.punch();
          setAutoQuestNotice(
            '⌛ O TEMPO ACABOU (30s)! Os altares se apagarão e o Cálice Sagrado foi consumido. Tente novamente em 15 minutos.'
          );
          setTimeout(() => setAutoQuestNotice(null), 5000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [chaliceRitualActive]);

  // Attempt to Obtain Sacred Chalice (15 min cooldown, 2% success)
  const handleAttemptObtainChalice = useCallback(() => {
    const now = Date.now();
    if (now < chaliceCooldownEnd) {
      const remainingSec = Math.ceil((chaliceCooldownEnd - now) / 1000);
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      sound.punch();
      setAutoQuestNotice(
        `⏱️ Cooldown do Cálice Sagrado ativo! Aguarde ${m}m ${String(s).padStart(2, '0')}s para tentar novamente.`
      );
      setTimeout(() => setAutoQuestNotice(null), 3500);
      return;
    }

    // Set 15-minute cooldown
    const nextCd = now + 15 * 60 * 1000;
    setChaliceCooldownEnd(nextCd);
    localStorage.setItem('blox_fruits_chalice_cd', nextCd.toString());

    // 2% Chance check
    const isSuccess = Math.random() < 0.02;
    if (!isSuccess) {
      sound.punch();
      setAutoQuestNotice(
        '❌ A tentativa falhou (2% de Chance)! O Cálice Sagrado não apareceu. Tente novamente em 15 minutos.'
      );
      setTimeout(() => setAutoQuestNotice(null), 4500);
      return;
    }

    // 2% Success!
    sound.legendaryWin();
    setChaliceRitualActive(true);
    setChaliceRitualTimeLeft(30);

    setChaliceButtons([
      {
        id: 'btn_blood',
        x: 650,
        y: 750,
        requiredColorId: 'haki_blood_red',
        requiredColorName: 'Vermelho Sangue',
        colorHex: '#dc2626',
        secondaryColorHex: '#f87171',
        activated: false,
      },
      {
        id: 'btn_green',
        x: 1450,
        y: 650,
        requiredColorId: 'haki_dark_blade_green',
        requiredColorName: 'Verde Dark Blade',
        colorHex: '#10b981',
        secondaryColorHex: '#6ee7b7',
        activated: false,
      },
      {
        id: 'btn_kitsune',
        x: 1150,
        y: 1250,
        requiredColorId: 'haki_kitsune_blue',
        requiredColorName: 'Azul Kitsune',
        colorHex: '#06b6d4',
        secondaryColorHex: '#67e8f9',
        activated: false,
      },
    ]);

    setAutoQuestNotice(
      '🍷 CÁLICE SAGRADO OBTIDO! (2% CHANCE) 30 SEGUNDOS PARA ATIVAR OS 3 BOTAOS COM BUSO HAKI ATIVO NAS CORES EXIGIDAS!'
    );
    setTimeout(() => setAutoQuestNotice(null), 6000);
  }, [chaliceCooldownEnd]);

  // Activate Chalice Button
  const handleActivateChaliceButton = useCallback((buttonId: string) => {
    if (!chaliceRitualActiveRef.current) return;

    setChaliceButtons((prev) => {
      const targetBtn = prev.find((b) => b.id === buttonId);
      if (!targetBtn || targetBtn.activated) return prev;

      // Validate: Buso Haki MUST be active AND activeHakiColorId MUST equal requiredColorId
      if (!haki.busoHakiActive || haki.activeHakiColorId !== targetBtn.requiredColorId) {
        sound.punch();
        setAutoQuestNotice(
          `⚠️ BOTÃO RECUSADO! Exige Buso Haki ATIVO na cor "${targetBtn.requiredColorName}"!`
        );
        setTimeout(() => setAutoQuestNotice(null), 3500);
        return prev;
      }

      // Success! Activate this button
      sound.legendaryWin();
      const updated = prev.map((b) => (b.id === buttonId ? { ...b, activated: true } : b));
      const activatedCount = updated.filter((b) => b.activated).length;

      if (activatedCount === 3) {
        // RITUAL COMPLETE! SUMMON MIHAWK!
        setChaliceRitualActive(false);
        sound.invasionAlert();
        setAutoQuestNotice(
          '⚔️ INVOCAÇÃO LENDÁRIA CONCLUÍDA! Mihawk (Olhos de Gavião) surgiu na arena com a espada Kokuto Yoru!'
        );
        setTimeout(() => setAutoQuestNotice(null), 7000);
        setSpawnMihawkTrigger(Date.now());
      } else {
        setAutoQuestNotice(
          `⚡ BOTÃO ATIVADO COM SUCESSO! [${activatedCount}/3] Altares aceso(s)!`
        );
        setTimeout(() => setAutoQuestNotice(null), 3000);
      }

      return updated;
    });
  }, [haki]);

  // Admin Force Obtain Sacred Chalice
  const handleForceObtainChalice = useCallback(() => {
    sound.legendaryWin();
    setChaliceRitualActive(true);
    setChaliceRitualTimeLeft(30);

    setChaliceButtons([
      {
        id: 'btn_blood',
        x: 650,
        y: 750,
        requiredColorId: 'haki_blood_red',
        requiredColorName: 'Vermelho Sangue',
        colorHex: '#dc2626',
        secondaryColorHex: '#f87171',
        activated: false,
      },
      {
        id: 'btn_green',
        x: 1450,
        y: 650,
        requiredColorId: 'haki_dark_blade_green',
        requiredColorName: 'Verde Dark Blade',
        colorHex: '#10b981',
        secondaryColorHex: '#6ee7b7',
        activated: false,
      },
      {
        id: 'btn_kitsune',
        x: 1150,
        y: 1250,
        requiredColorId: 'haki_kitsune_blue',
        requiredColorName: 'Azul Kitsune',
        colorHex: '#06b6d4',
        secondaryColorHex: '#67e8f9',
        activated: false,
      },
    ]);

    setAutoQuestNotice(
      '🍷 [ADM] CÁLICE SAGRADO CONCEDIDO! 30 SEGUNDOS PARA ATIVAR OS 3 ALTARES COM BUSO HAKI ATIVO NAS CORES EXIGIDAS!'
    );
    setTimeout(() => setAutoQuestNotice(null), 6000);
  }, []);

  // 5. Combat Modes & UI Modals
  const [autoFarm, setAutoFarm] = useState<boolean>(false);
  const [masteryUses, setMasteryUses] = useState<{
    melee: number;
    sword: number;
    fruit: number;
  }>({
    melee: 0,
    sword: 0,
    fruit: 0,
  });

  const handleAddMasteryUse = useCallback((type: 'melee' | 'sword' | 'fruit') => {
    setMasteryUses((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }));
  }, []);

  const [activeModal, setActiveModal] = useState<
    'stats' | 'quests' | 'fruits' | 'fragShop' | 'shop' | 'map' | 'admin' | 'clan' | 'menu' | 'hakiNpc' | 'hakiShop' | null
  >(null);
  const [cinematicSkill, setCinematicSkill] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [levelUpNotice, setLevelUpNotice] = useState<number | null>(null);
  const [autoQuestNotice, setAutoQuestNotice] = useState<string | null>(null);

  // Multiplayer & Clan State
  const [clans, setClans] = useState<any[]>([]);
  const [userClan, setUserClan] = useState<any | null>(null);
  const myPlayerIdRef = useRef<string>(
    `plr_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`
  );
  const otherPlayersRef = useRef<RemotePlayer[]>([]);
  const [islandDominance, setIslandDominance] = useState<{ [id: string]: any }>({});
  const [combo, setCombo] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    return window.innerWidth < 768 || (isMobileUA && window.innerWidth < 920);
  });

  useEffect(() => {
    const handleResize = () => {
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(window.innerWidth < 768 || (isMobileUA && window.innerWidth < 920));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const wsRef = useRef<WebSocket | null>(null);

  // Easter Egg Check: Luffy Name + Luffy Skin/Accessory/Outfit + Rubber Fruit
  const isLuffyName = (stats.character?.name?.toLowerCase() || '').includes('luffy');
  const isLuffySkin =
    stats.character?.accessory === 'straw_hat' ||
    stats.character?.outfitColor === 'red_vest' ||
    isLuffyName;
  const isRubberFruit =
    activeFruit?.id === 'fruit_rubber' ||
    activeFruit?.element === 'rubber' ||
    (activeFruit?.name?.toLowerCase() || '').includes('rubber') ||
    (activeFruit?.portugueseName?.toLowerCase() || '').includes('borracha');
  const isGear5Unlocked = isLuffyName && isLuffySkin && isRubberFruit;

  const [gear5Settings, setGear5Settings] = useState<Gear5Settings>(() => {
    const saved = localStorage.getItem('blox_fruits_gear5_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      active: false,
      godMode: true,
      speedMultiplier: 2.5,
      damageMultiplier: 20,
      infiniteEnergy: true,
      oneHitKill: false,
    };
  });

  const handleUpdateGear5Settings = (newSettings: Gear5Settings) => {
    setGear5Settings(newSettings);
    localStorage.setItem('blox_fruits_gear5_v1', JSON.stringify(newSettings));
  };

  const [showGear5HackModal, setShowGear5HackModal] = useState<boolean>(false);
  const [bajrangGunTrigger, setBajrangGunTrigger] = useState<number | null>(null);

  const handleTriggerBajrangGun = () => {
    setBajrangGunTrigger(Date.now());
    sound.fireBoom();
    setAutoQuestNotice('☀️ BAJRANG GUN! O punho divino do Sol aniquilou todos os inimigos da ilha!');
    setTimeout(() => setAutoQuestNotice(null), 4000);
  };

  // Haki Colors Purchasing, Equipping & Admin Actions
  const handleBuyHakiColor = (color: HakiColor) => {
    if (stats.beli < color.priceBeli || (stats.fragments || 0) < color.priceFragments) {
      sound.punch();
      return;
    }

    setStats((prev) => {
      const updated = {
        ...prev,
        beli: prev.beli - color.priceBeli,
        fragments: (prev.fragments || 0) - color.priceFragments,
      };
      return updated;
    });

    setHaki((prev) => {
      const currentUnlocked = prev.unlockedHakiColorIds || [];
      const updatedUnlocked = currentUnlocked.includes(color.id)
        ? currentUnlocked
        : [...currentUnlocked, color.id];
      const updated = {
        ...prev,
        activeHakiColorId: color.id,
        unlockedHakiColorIds: updatedUnlocked,
      };

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.haki = updated;
          parsed.stats = {
            ...parsed.stats,
            beli: stats.beli - color.priceBeli,
            fragments: (stats.fragments || 0) - color.priceFragments,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }
      return updated;
    });

    sound.legendaryWin();
    setAutoQuestNotice(`🎉 Desbloqueado permanentemente: Cor de Haki ${color.name}!`);
    setTimeout(() => setAutoQuestNotice(null), 6000);
  };

  const handleEquipHakiColor = (colorId: string) => {
    const colorObj = getHakiColorById(colorId);
    setHaki((prev) => {
      const prevUnlocked = prev.unlockedHakiColorIds || [];
      const updatedUnlocked =
        colorObj.adminOnly || prevUnlocked.includes(colorId)
          ? prevUnlocked
          : [...prevUnlocked, colorId];
      const updated = {
        ...prev,
        activeHakiColorId: colorId,
        unlockedHakiColorIds: updatedUnlocked,
        busoHaki: true,
        busoHakiActive: true,
      };
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.haki = updated;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }
      return updated;
    });
  };

  const handleForceSummonHakiNpc = (islandId?: string, colorId?: string) => {
    const targetIsland = islandId || currentIsland.id;
    const targetColor = colorId || rollRandomHakiColor().id;
    const newState = {
      islandId: targetIsland,
      colorId: targetColor,
      spawnTimestamp: Date.now(),
    };
    setHakiNpcState(newState);
    setHakiNpcTimeRemaining(900);
    localStorage.setItem(HAKI_NPC_STORAGE_KEY, JSON.stringify(newState));

    const islandObj = ISLANDS.find((i) => i.id === targetIsland);
    const colorObj = getHakiColorById(targetColor);
    setAutoQuestNotice(
      `⚡ [ADM] Mestre do Haki invocado na Ilha ${islandObj?.name || targetIsland} com a cor ${colorObj.name} por 15 minutos!`
    );
    sound.legendaryWin();
    setTimeout(() => setAutoQuestNotice(null), 6000);
  };

  const handleUnlockAllHakiColors = () => {
    const allIds = HAKI_COLORS.filter((c) => !c.adminOnly).map((c) => c.id);
    setHaki((prev) => {
      const updated = {
        ...prev,
        unlockedHakiColorIds: allIds,
      };
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.haki = updated;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }
      return updated;
    });
    setAutoQuestNotice('✨ Todas as Cores de Haki normais foram desbloqueadas!');
    sound.legendaryWin();
    setTimeout(() => setAutoQuestNotice(null), 5000);
  };

  // Multiplayer Fruit Trade State
  const [activeTrade, setActiveTrade] = useState<{
    partnerId: string;
    partnerName: string;
    isBot?: boolean;
  } | null>(null);
  const [tradeInvite, setTradeInvite] = useState<{
    fromId: string;
    fromName: string;
  } | null>(null);
  const [partnerOfferedFruit, setPartnerOfferedFruit] = useState<BloxFruit | null>(null);
  const [partnerTradeLocked, setPartnerTradeLocked] = useState<boolean>(false);
  const [partnerTradeConfirmed, setPartnerTradeConfirmed] = useState<boolean>(false);
  const [partnerOwnedFruitIds, setPartnerOwnedFruitIds] = useState<string[]>([]);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch {
      return;
    }

    ws.onerror = () => {
      // Ignore transient WebSocket errors
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        player: {
          id: myPlayerIdRef.current,
          name: stats.character?.name || 'Pirata',
          x: 600,
          y: 950,
          level: stats.level,
          faction: stats.character?.faction || 'Pirates',
          race: stats.character?.race || 'Human',
          clanTag: userClan?.tag,
          hp: maxHp,
          maxHp: maxHp,
          facingAngle: 0,
          busoActive: haki.busoHakiActive,
          kenActive: haki.kenHakiActive,
          hakiColorId: haki.activeHakiColorId || 'haki_amethyst_purple',
          character: stats.character,
          activeWeaponType,
          activeSwordId: activeSword?.id || null,
          activeFruitId: activeFruit?.id || null,
          gear5Active: !!gear5Settings.active,
          islandId: currentIsland.id,
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'players_update') {
          const myId = myPlayerIdRef.current;
          otherPlayersRef.current = (data.players || []).filter(
            (p: RemotePlayer) => p && p.id !== myId
          );
        } else if (data.type === 'clans_update') {
          setClans(data.clans);
          if (userClan) {
            const updated = data.clans.find((c: any) => c.id === userClan.id);
            if (updated) setUserClan(updated);
          }
        } else if (data.type === 'islands_dominance_update') {
          setIslandDominance(data.dominance);
        } else if (data.type === 'clan_created' || data.type === 'clan_joined') {
          setUserClan(data.clan);
        } else if (data.type === 'chat_announcement') {
          setAutoQuestNotice(data.message);
          setTimeout(() => setAutoQuestNotice(null), 5000);
        } else if (data.type === 'trade_requested') {
          if (data.fromId === myPlayerIdRef.current) return;
          sound.levelUp();
          setTradeInvite({
            fromId: data.fromId,
            fromName: data.fromName,
          });
        } else if (data.type === 'trade_started') {
          sound.click();
          setTradeInvite(null);
          setActiveTrade({
            partnerId: data.partnerId,
            partnerName: data.partnerName,
            isBot: false,
          });
          setPartnerOfferedFruit(null);
          setPartnerTradeLocked(false);
          setPartnerTradeConfirmed(false);
          setPartnerOwnedFruitIds([]);
        } else if (data.type === 'trade_partner_updated') {
          setPartnerOfferedFruit(data.fruit);
          setPartnerTradeLocked(data.locked);
          setPartnerTradeConfirmed(data.confirmed);
          if (Array.isArray(data.ownedFruitIds)) {
            setPartnerOwnedFruitIds(data.ownedFruitIds);
          }
        } else if (data.type === 'trade_completed') {
          sound.levelUp();
          if (data.receivedFruit) {
            setStoredFruits((prev) =>
              prev.some((f) => f.id === data.receivedFruit.id)
                ? prev
                : [...prev, data.receivedFruit]
            );
          }
          setActiveTrade(null);
          setAutoQuestNotice(`🎉 Troca concluída! Você recebeu: ${data.receivedFruit?.portugueseName || 'Fruta'}!`);
          setTimeout(() => setAutoQuestNotice(null), 5000);
        } else if (data.type === 'trade_cancelled') {
          sound.slash();
          setActiveTrade(null);
          setAutoQuestNotice('❌ A troca de fruta foi cancelada pelo parceiro.');
          setTimeout(() => setAutoQuestNotice(null), 4000);
        } else if (data.type === 'admin_shop_sync') {
          syncAdminShopFromServer(data.overrides, data.customFruits);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    const handleBroadcastWs = (e: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'admin_update_shop',
          overrides: e.detail.overrides,
          customFruits: e.detail.customFruits,
        }));
      }
    };

    window.addEventListener('broadcast_admin_shop_ws', handleBroadcastWs);

    return () => {
      window.removeEventListener('broadcast_admin_shop_ws', handleBroadcastWs);
      ws.close();
    };
  }, []);

  // Immediately broadcast profile, character appearance, Haki color, weapon & island changes to other players
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'update_profile',
          name: stats.character?.name || 'Pirata',
          level: stats.level,
          character: stats.character,
          busoActive: haki.busoHakiActive,
          kenActive: haki.kenHakiActive,
          hakiColorId: haki.activeHakiColorId || 'haki_amethyst_purple',
          activeWeaponType,
          activeSwordId: activeSword?.id || null,
          activeFruitId: activeFruit?.id || null,
          gear5Active: !!gear5Settings.active,
          islandId: currentIsland.id,
          clanTag: userClan?.tag,
        })
      );
    }
  }, [
    stats.character,
    stats.level,
    haki.busoHakiActive,
    haki.kenHakiActive,
    haki.activeHakiColorId,
    activeWeaponType,
    activeSword?.id,
    activeFruit?.id,
    gear5Settings.active,
    currentIsland.id,
    userClan?.tag,
  ]);

  // Track last sent network packet to enforce 10Hz rate-limiting & dead-band delta compression
  const lastBroadcastPacketRef = useRef<{
    time: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    facingAngle: number;
    hp: number;
    maxHp: number;
    level: number;
    busoActive: boolean;
    isAttacking: boolean;
    buddhaActive: boolean;
    islandId: string;
  }>({
    time: 0,
    x: -9999,
    y: -9999,
    vx: 0,
    vy: 0,
    facingAngle: 0,
    hp: 0,
    maxHp: 0,
    level: 1,
    busoActive: false,
    isAttacking: false,
    buddhaActive: false,
    islandId: '',
  });

  const handlePlayerMove = useCallback(
    (
      x: number,
      y: number,
      facingAngle: number,
      hp: number,
      maxHpVal: number,
      level: number,
      busoActive: boolean,
      isAttacking?: boolean,
      buddhaActive?: boolean,
      vx: number = 0,
      vy: number = 0
    ) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const now = Date.now();
      const prev = lastBroadcastPacketRef.current;
      const distMoved = Math.hypot(x - prev.x, y - prev.y);
      const angleDiff = Math.abs(
        ((facingAngle - prev.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      );
      const wasMoving = Math.hypot(prev.vx, prev.vy) > 0.05;
      const isNowMoving = Math.hypot(vx, vy) > 0.05;
      const justStopped = wasMoving && !isNowMoving;
      const stateChanged =
        busoActive !== prev.busoActive ||
        !!isAttacking !== prev.isAttacking ||
        !!buddhaActive !== prev.buddhaActive ||
        currentIsland.id !== prev.islandId ||
        hp !== prev.hp ||
        level !== prev.level ||
        distMoved > 120; // Instant teleport / dash sync

      // Rate-limit continuous movement broadcasts to 10Hz (every 100ms) for busy servers
      const BROADCAST_INTERVAL_MS = 100;
      if (!stateChanged && !justStopped && now - prev.time < BROADCAST_INTERVAL_MS) {
        return;
      }

      // Dead-band delta filter: skip sending if position & rotation barely changed
      if (!stateChanged && !justStopped && distMoved < 1.8 && angleDiff < 0.08) {
        return;
      }

      lastBroadcastPacketRef.current = {
        time: now,
        x,
        y,
        vx,
        vy,
        facingAngle,
        hp,
        maxHp: maxHpVal,
        level,
        busoActive,
        isAttacking: !!isAttacking,
        buddhaActive: !!buddhaActive,
        islandId: currentIsland.id,
      };

      // Send compact movement packet (static profile/appearance is synced separately via update_profile)
      wsRef.current.send(
        JSON.stringify({
          type: 'move',
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          vx: Math.round(vx * 100) / 100,
          vy: Math.round(vy * 100) / 100,
          facingAngle: Math.round(facingAngle * 100) / 100,
          hp,
          maxHp: maxHpVal,
          level,
          busoActive,
          isAttacking: !!isAttacking,
          buddhaActive: !!buddhaActive,
          islandId: currentIsland.id,
        })
      );
    },
    [currentIsland.id]
  );

  const handleCreateClan = (name: string, tag: string) => {
    if (stats.beli < 10000) {
      setAutoQuestNotice('฿ Beli insuficiente para criar um clã (Custo: 10.000 ฿)!');
      setTimeout(() => setAutoQuestNotice(null), 3000);
      return;
    }
    setStats((s) => ({ ...s, beli: s.beli - 10000 }));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'create_clan',
        name,
        tag,
        playerName: stats.character?.name || 'Pirata',
        playerLevel: stats.level,
      }));
    }
  };

  const handleJoinClan = (clanId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_clan',
        clanId,
        playerName: stats.character?.name || 'Pirata',
        playerLevel: stats.level,
      }));
    }
  };

  const handleWarIsland = (islandId: string, clanId: string, clanName: string, clanTag: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'war_island',
        islandId,
        clanId,
        clanName,
        clanTag,
      }));
    }
  };

  // Trade Initiator & Handlers
  const handleInitiateTrade = useCallback((partnerId: string, partnerName: string) => {
    if (partnerId === myPlayerIdRef.current) return;
    sound.click();
    const targetPlayer = otherPlayersRef.current.find((p) => p.id === partnerId);
    const isBotTarget =
      targetPlayer?.isBot ||
      partnerId.startsWith('bot_') ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN;

    if (isBotTarget) {
      setActiveTrade({
        partnerId,
        partnerName,
        isBot: true,
      });
      setPartnerOfferedFruit(null);
      setPartnerTradeLocked(false);
      setPartnerTradeConfirmed(false);
      setPartnerOwnedFruitIds([]);
      setAutoQuestNotice(`🔄 Mesa de troca iniciada com ${partnerName}!`);
      setTimeout(() => setAutoQuestNotice(null), 3000);
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'trade_request',
          targetId: partnerId,
          fromName: stats.character?.name || 'Pirata',
        })
      );
      setAutoQuestNotice(`🔄 Convite de troca de fruta enviado para ${partnerName}...`);
      setTimeout(() => setAutoQuestNotice(null), 4000);
    }
  }, [stats.character?.name]);

  const handleAcceptTradeInvite = () => {
    if (!tradeInvite) return;
    sound.click();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'trade_accept',
          targetId: tradeInvite.fromId,
        })
      );
    }
    setTradeInvite(null);
  };

  const handleDeclineTradeInvite = () => {
    sound.click();
    setTradeInvite(null);
  };

  const handleUpdateMyTradeOffer = useCallback((fruit: BloxFruit | null, locked: boolean, confirmed: boolean) => {
    if (activeTrade && !activeTrade.isBot && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const myOwnedIds = Array.from(
        new Set([
          ...storedFruits.map((f) => f.id),
          ...(activeFruit ? [activeFruit.id] : []),
        ])
      );
      wsRef.current.send(
        JSON.stringify({
          type: 'trade_update_offer',
          partnerId: activeTrade.partnerId,
          fruit,
          locked,
          confirmed,
          ownedFruitIds: myOwnedIds,
        })
      );
    }
  }, [activeTrade, storedFruits, activeFruit]);

  const handleCompleteTrade = useCallback((
    myOfferedFruit: BloxFruit | null,
    partnerReceivedFruit: BloxFruit | null
  ) => {
    if (myOfferedFruit) {
      setStoredFruits((prev) => {
        const idx = prev.findIndex((f) => f.id === myOfferedFruit.id);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      });
      setActiveFruit((currentActive) => (currentActive?.id === myOfferedFruit.id ? null : currentActive));
    }

    if (partnerReceivedFruit) {
      setStoredFruits((prev) =>
        prev.some((f) => f.id === partnerReceivedFruit.id)
          ? prev
          : [...prev, partnerReceivedFruit]
      );
    }

    if (activeTrade && !activeTrade.isBot && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'trade_confirm',
          partnerId: activeTrade.partnerId,
          myFruit: myOfferedFruit,
          partnerFruit: partnerReceivedFruit,
        })
      );
    }

    sound.levelUp();
    setActiveTrade(null);
    setAutoQuestNotice(
      `🎉 Troca de Fruta concluída! ${partnerReceivedFruit ? `Você obteve: ${partnerReceivedFruit.portugueseName}!` : ''}`
    );
    setTimeout(() => setAutoQuestNotice(null), 5000);
  }, [activeTrade]);

  const handleCloseTrade = useCallback(() => {
    if (activeTrade && !activeTrade.isBot && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'trade_cancel',
          partnerId: activeTrade.partnerId,
        })
      );
    }
    setActiveTrade(null);
  }, [activeTrade]);



  // Island Invasion Event State (Triggers every 15 minutes = 900 seconds)
  const [invasionTimeLeft, setInvasionTimeLeft] = useState<number>(() => {
    const saved = localStorage.getItem('bloxfruits_invasion_timer');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 900) return parsed;
    }
    return 900;
  });
  const [invasionActive, setInvasionActive] = useState<boolean>(false);
  const [invasionNotice, setInvasionNotice] = useState<string | null>(null);

  // 15-Minute Island Invasion Event Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setInvasionTimeLeft((prev) => {
        if (invasionActive) {
          return 900;
        }
        if (prev <= 1) {
          sound.invasionAlert();
          setInvasionActive(true);
          setInvasionNotice('🚨 INVASÃO DE ILHA INICIADA! DERROTE O IMPERADOR DO ABISMO!');
          setTimeout(() => setInvasionNotice(null), 6000);
          return 900;
        }
        const next = prev - 1;
        localStorage.setItem('bloxfruits_invasion_timer', next.toString());
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [invasionActive]);

  const handleTriggerInvasion = useCallback(() => {
    sound.invasionAlert();
    setInvasionActive(true);
    setInvasionTimeLeft(900);
    setInvasionNotice('🚨 INVASÃO DE ILHA INVOCADA! O IMPERADOR DO ABISMO CHEGOU!');
    setTimeout(() => setInvasionNotice(null), 5000);
  }, []);

  const handleInvasionBossDefeated = useCallback(
    (frags: number, _exp: number, _beli: number, bossDefId?: string) => {
      if (bossDefId === 'enemy_mihawk') {
        // 0.5% chance to drop 'Adaga do Mihawk (Cruz Kogatana)' permanently into player's inventory
        const droppedCrossDagger = Math.random() < 0.005;
        if (droppedCrossDagger) {
          const daggerObj = SWORDS.find((s) => s.id === 'sword_mihawk_dagger');
          setOwnedSwordIds((prev) =>
            prev.includes('sword_mihawk_dagger') ? prev : [...prev, 'sword_mihawk_dagger']
          );
          if (daggerObj) {
            setActiveSword(daggerObj);
            setActiveWeaponType('sword');
          }
          sound.legendaryWin();
          setInvasionNotice(
            `✝️ DROP MÍTICO DE 0.5% OBTIDO! Você ganhou a "Adaga do Mihawk (Cruz Kogatana)" permanentemente no seu inventário! (+${frags.toLocaleString()} Frags 🟣)`
          );
          setTimeout(() => setInvasionNotice(null), 9000);
        } else {
          setInvasionNotice(
            `⚔️ MIHAWK DERROTADO DENTRO DOS 5 MINUTOS! +${frags.toLocaleString()} Frags 🟣 (Adaga do Mihawk 0.5%: Não caiu desta vez)`
          );
          setTimeout(() => setInvasionNotice(null), 6500);
        }
        return;
      }

      setInvasionActive(false);
      setInvasionTimeLeft(900);
      localStorage.setItem('bloxfruits_invasion_timer', '900');
      setInvasionNotice(`🎉 CHEFÃO DA INVASÃO DERROTADO! +${frags.toLocaleString()} Fragmentos Raros ganhos! 🟣`);
      setTimeout(() => setInvasionNotice(null), 6000);
    },
    []
  );

  const autoFarmRef = useRef(autoFarm);
  useEffect(() => {
    autoFarmRef.current = autoFarm;
  }, [autoFarm]);

  // Action Triggers for Canvas
  const [triggerAttackAction, setTriggerAttackAction] = useState<number | null>(null);
  const [triggerDashAction, setTriggerDashAction] = useState<number | null>(null);
  const [triggerSkillAction, setTriggerSkillAction] = useState<{
    key: 'Z' | 'X' | 'C' | 'V';
    timestamp: number;
  } | null>(null);

  // Keep HP and Energy clamped to maximums when stats increase
  useEffect(() => {
    setPlayerHp((prev) => Math.min(prev, maxHp));
    setPlayerEnergy((prev) => Math.min(prev, maxEnergy));
  }, [maxHp, maxEnergy]);

  // Passive HP and Energy Regeneration Loop
  useEffect(() => {
    const regenInterval = setInterval(() => {
      setPlayerHp((prev) => Math.min(maxHp, prev + Math.max(2, Math.round(maxHp * 0.03))));
      setPlayerEnergy((prev) =>
        Math.min(maxEnergy, prev + Math.max(5, Math.round(maxEnergy * 0.06)))
      );
    }, 1000);

    return () => clearInterval(regenInterval);
  }, [maxHp, maxEnergy]);

  // Keyboard shortcuts: Haki [J], Ken Haki [E], Escape to close modals, and Secret Admin Menu [Alt + =]
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        return;
      }

      // Secret Admin Shortcut: Alt + = (or Alt + Equal / Numpad)
      if (
        e.altKey &&
        (e.key === '=' ||
          e.code === 'Equal' ||
          e.code === 'NumpadEqual' ||
          e.key === '+' ||
          e.keyCode === 187 ||
          e.keyCode === 61 ||
          e.which === 187)
      ) {
        e.preventDefault();
        sound.legendaryWin();
        setActiveModal((prev) => (prev === 'admin' ? null : 'admin'));
        return;
      }

      if (e.key.toLowerCase() === 'j') {
        if (haki.busoHaki) {
          sound.hakiToggle();
          setHaki((h) => ({ ...h, busoHakiActive: !h.busoHakiActive }));
        }
      } else if (e.key.toLowerCase() === 'e') {
        if (haki.kenHaki) {
          sound.hakiToggle();
          setHaki((h) => ({ ...h, kenHakiActive: !h.kenHakiActive }));
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [haki]);

  // Save progress to LocalStorage
  useEffect(() => {
    const data = {
      stats,
      activeFruitId: activeFruit?.id,
      storedFruitIds: storedFruits.map((f) => f.id),
      activeSwordId: activeSword?.id,
      ownedSwordIds,
      haki,
      currentIslandId: currentIsland.id,
      activeQuest,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [stats, activeFruit, storedFruits, activeSword, ownedSwordIds, haki, currentIsland, activeQuest]);

  // Experience, Currency and Fragments handler
  const handleGainExpAndBeli = useCallback(
    (expGained: number, beliGained: number, enemyDefId: string, droppedFrags: number = 0) => {
      setStats((prev) => {
        let newExp = prev.exp + expGained;
        let newLevel = prev.level;
        let newExpToNext = prev.expToNextLevel;
        let newStatPoints = prev.statPoints;
        let newBeli = prev.beli + beliGained;
        let newBounty =
          enemyDefId === 'treasure_chest'
            ? prev.bounty
            : prev.bounty + Math.round(beliGained * 0.4);
        let newFrags = (prev.fragments || 0) + droppedFrags;

        let leveledUp = false;

        // Level Up Loop (supports multi-level up on big boss kills)
        while (newExp >= newExpToNext) {
          newExp -= newExpToNext;
          newLevel += 1;
          newStatPoints += 3; // 3 attribute points per level
          newExpToNext = Math.round(newExpToNext * 1.25 + 50);
          leveledUp = true;
        }

        if (leveledUp) {
          sound.levelUp();
          setLevelUpNotice(newLevel);
          setTimeout(() => setLevelUpNotice(null), 3000);
        }

        return {
          ...prev,
          level: newLevel,
          exp: newExp,
          expToNextLevel: newExpToNext,
          statPoints: newStatPoints,
          beli: newBeli,
          bounty: newBounty,
          fragments: newFrags,
        };
      });

      // Update active quest progress
      setActiveQuest((prev) => {
        if (!prev) return null;
        if (prev.targetEnemyId === enemyDefId) {
          const nextCount = prev.currentCount + 1;
          if (nextCount >= prev.targetCount) {
            // Quest complete! Reward bonus
            sound.questComplete();
            setStats((s) => ({
              ...s,
              exp: s.exp + prev.expReward,
              beli: s.beli + prev.beliReward,
              bounty: s.bounty + Math.round(prev.beliReward * 0.8),
            }));

            // Check if Auto-Farm is active: automatically renew quest!
            if (autoFarmRef.current) {
              setAutoQuestNotice(
                `🎉 Missão "${prev.title}" concluída! (+${prev.expReward.toLocaleString()} EXP | +${prev.beliReward.toLocaleString()} ฿). 🤖 Auto-Farm pegou a missão novamente!`
              );
              setTimeout(() => setAutoQuestNotice(null), 4500);
              return {
                ...prev,
                currentCount: 0,
              };
            }

            setAutoQuestNotice(
              `🎉 Missão "${prev.title}" concluída! (+${prev.expReward.toLocaleString()} EXP | +${prev.beliReward.toLocaleString()} ฿)`
            );
            setTimeout(() => setAutoQuestNotice(null), 3500);
            return null; // completed without auto-farm
          }
          return { ...prev, currentCount: nextCount };
        }
        return prev;
      });
    },
    []
  );

  const [respawnTrigger, setRespawnTrigger] = useState<number>(0);

  // Player Damage handler
  const handlePlayerDamage = useCallback(
    (damage: number) => {
      // Gear 5 God Mode Invincibility Hack
      if (gear5Settings.active && gear5Settings.godMode) {
        return;
      }

      // Cyborg Race perk: -10% damage taken
      const finalDmg = stats.character?.race === 'Cyborg' ? Math.round(damage * 0.9) : damage;
      setPlayerHp((prev) => {
        const nextHp = prev - finalDmg;
        if (nextHp <= 0) {
          // Player died: lose Bounty and respawn at the Quest Giver area
          sound.punch();
          setRespawnTrigger(Date.now());
          setPlayerEnergy(maxEnergy);
          setStats((s) => {
            const bountyLoss =
              s.bounty > 0 ? Math.min(s.bounty, Math.max(250, Math.round(s.bounty * 0.05))) : 0;
            const nextBounty = Math.max(0, s.bounty - bountyLoss);
            setAutoQuestNotice(
              bountyLoss > 0
                ? `💀 Você morreu! Perdeu $${bountyLoss.toLocaleString()} de Recompensa e renasceu na Área de Missões!`
                : `💀 Você morreu e renasceu na Área de Missões!`
            );
            setTimeout(() => setAutoQuestNotice(null), 5000);
            return {
              ...s,
              bounty: nextBounty,
            };
          });
          return maxHp;
        }
        return nextHp;
      });
    },
    [maxHp, maxEnergy, stats.character?.race, gear5Settings.active, gear5Settings.godMode]
  );

  // Energy consumption check
  const handleConsumeEnergy = useCallback(
    (amount: number): boolean => {
      // Gear 5 Infinite Energy Hack
      if (gear5Settings.active && gear5Settings.infiniteEnergy) {
        return true;
      }
      if (playerEnergy < amount) return false;
      setPlayerEnergy((prev) => Math.max(0, prev - amount));
      return true;
    },
    [playerEnergy, gear5Settings.active, gear5Settings.infiniteEnergy]
  );

  // Attribute allocation
  const handleAllocatePoints = (
    category: 'melee' | 'defense' | 'sword' | 'bloxFruit',
    amount: number
  ) => {
    setStats((prev) => {
      if (prev.statPoints < amount) return prev;
      return {
        ...prev,
        [category]: prev[category] + amount,
        statPoints: prev.statPoints - amount,
      };
    });
  };

  // Reset attributes
  const handleResetStats = () => {
    setStats((prev) => {
      const totalRefund = prev.melee - 1 + (prev.defense - 1) + (prev.sword - 1) + (prev.bloxFruit - 1);
      return {
        ...prev,
        melee: 1,
        defense: 1,
        sword: 1,
        bloxFruit: 1,
        statPoints: prev.statPoints + totalRefund,
      };
    });
  };

  // Sound toggle
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    sound.setEnabled(nextVal);
  };

  // Start background music on first user gesture
  useEffect(() => {
    const startAudioOnGesture = () => {
      sound.startBgm();
    };
    window.addEventListener('click', startAudioOnGesture);
    window.addEventListener('touchstart', startAudioOnGesture);
    window.addEventListener('keydown', startAudioOnGesture);
    return () => {
      window.removeEventListener('click', startAudioOnGesture);
      window.removeEventListener('touchstart', startAudioOnGesture);
      window.removeEventListener('keydown', startAudioOnGesture);
    };
  }, []);

  // Buy fruit with fragments handler
  const handleBuyFruitWithFrags = (fruit: BloxFruit, fragCost: number, autoEquip: boolean) => {
    sound.legendaryWin();
    setStats((s) => ({
      ...s,
      fragments: Math.max(0, (s.fragments || 0) - fragCost),
    }));

    if (autoEquip) {
      setActiveFruit(fruit);
      setActiveWeaponType('fruit');
    } else {
      setStoredFruits((prev) => [...prev, fruit]);
    }
  };

  return (
    <div className="w-full h-dvh max-h-dvh bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans overflow-hidden">
      {/* 1. TOP HUD */}
      <HUD
        stats={stats}
        playerHp={playerHp}
        maxHp={maxHp}
        playerEnergy={playerEnergy}
        maxEnergy={maxEnergy}
        activeQuest={activeQuest}
        invasionTimeLeft={invasionTimeLeft}
        invasionActive={invasionActive}
        onOpenModal={setActiveModal}
        onTriggerInvasion={handleTriggerInvasion}
        onOpenStartScreen={() => setShowAuthModal(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        masteryUses={masteryUses}
        isMobile={isMobile}
      />

      {/* 2. MAIN BATTLEGROUND VIEW */}
      <main className="relative flex-1 min-h-0 flex flex-col items-center justify-center p-1 sm:p-2 w-full max-w-6xl mx-auto overflow-hidden">
        {/* Level Up Celebration Banner */}
        {levelUpNotice && (
          <div className="absolute top-4 z-40 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-base sm:text-2xl px-5 py-2 rounded-xl shadow-2xl shadow-amber-500/30 animate-bounce flex items-center gap-2 border border-yellow-200">
            <span>✨</span>
            <span>SUBIU DE NÍVEL! NÍVEL {levelUpNotice} (+3 Pontos)</span>
            <span>✨</span>
          </div>
        )}

        {/* Auto Farm Quest Toast / Renewal Notice */}
        {autoQuestNotice && (
          <div className="absolute top-16 sm:top-4 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xl shadow-emerald-950/60 flex items-center gap-2 border border-emerald-300/40 animate-fadeIn">
            <span>🤖</span>
            <span>{autoQuestNotice}</span>
          </div>
        )}

        {/* Island Invasion Banner / Notice */}
        {invasionNotice && (
          <div className="absolute top-16 sm:top-4 z-40 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-2xl shadow-red-950/80 flex items-center gap-2 border border-red-300 animate-bounce">
            <span>🚨</span>
            <span>{invasionNotice}</span>
          </div>
        )}

        {/* Current Quest Floating Widget (Top Left) */}
        {activeQuest ? (
          <div
            onClick={() => setActiveModal('quests')}
            className={`absolute top-3 left-3 z-30 hidden sm:flex items-center gap-2.5 bg-slate-900/95 backdrop-blur border px-3 py-1.5 rounded-lg shadow-lg cursor-pointer transition-all hover:scale-105 ${
              autoFarm ? 'border-emerald-500/70 shadow-emerald-500/20' : 'border-amber-500/40'
            }`}
            title="Clique para abrir o Quadro de Missões"
          >
            <span className="text-amber-400 font-bold text-xs">Missão:</span>
            <span className="text-xs text-white font-medium">{activeQuest.title}</span>
            <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
              [{activeQuest.currentCount}/{activeQuest.targetCount}]
            </span>
            {autoFarm && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                <span>Auto</span>
                <span>🔄</span>
              </span>
            )}
          </div>
        ) : autoFarm ? (
          <button
            onClick={() => setActiveModal('quests')}
            className="absolute top-3 left-3 z-30 hidden sm:flex items-center gap-2 bg-emerald-950/95 border-2 border-emerald-500 px-3 py-1.5 rounded-lg shadow-lg text-xs font-bold text-emerald-300 animate-pulse cursor-pointer hover:bg-emerald-900 transition-all"
          >
            <span>🤖 Auto-Farm Ativo:</span>
            <span className="underline">Selecione uma missão!</span>
          </button>
        ) : null}

        {/* Current Island Title Watermark / Kicker (Top Right) */}
        <div className="absolute top-3 right-3 z-30 hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>Ilha:</span>
          <span className="font-semibold text-white">{currentIsland.name}</span>
          <span className="text-sky-400 font-mono">({currentIsland.recommendedLevel})</span>
        </div>

        {/* Wandering Haki Colors Master Indicator Pill (Top Left, below Quest widget on desktop, top-3 on mobile) */}
        <button
          onClick={() => {
            sound.click();
            setActiveModal('hakiNpc');
          }}
          className={`absolute top-3 left-3 sm:top-14 sm:left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border shadow-lg transition-all cursor-pointer backdrop-blur-md max-w-[210px] ${
            hakiNpcState.islandId === currentIsland.id
              ? 'bg-gradient-to-r from-purple-950/90 to-slate-900/90 border-amber-400 text-amber-300 ring-2 ring-amber-500/40 animate-pulse'
              : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Clique para falar com o Mestre das Cores de Haki"
        >
          <span className="text-sm sm:text-base">🧙‍♂️</span>
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-400 truncate">
                Mestre do Haki
              </span>
              {hakiNpcState.islandId === currentIsland.id ? (
                <span className="text-[8px] font-black bg-emerald-500 text-slate-950 px-1 rounded-full whitespace-nowrap">
                  AQUI!
                </span>
              ) : (
                <span className="text-[8px] font-mono text-sky-400 truncate">
                  {hakiNpcIslandObj.name.split(' ')[0]}
                </span>
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-slate-300 truncate">
              {hakiNpcOffer.name.split(' ')[0]} • ⏱ {Math.floor(hakiNpcTimeRemaining / 60)}:
              {String(hakiNpcTimeRemaining % 60).padStart(2, '0')}
            </div>
          </div>
        </button>

        {/* Combo Counter Badge */}
        {combo > 1 && (
          <div className="absolute top-16 right-4 sm:top-16 sm:right-4 z-40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-2xl shadow-amber-500/50 animate-bounce flex items-center gap-2 border border-yellow-200">
            <span className="text-xl">⚡</span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] tracking-widest font-black uppercase text-slate-900">COMBO</span>
              <span className="text-2xl font-black tabular-nums">{combo}X</span>
            </div>
          </div>
        )}

        {/* The Action RPG Canvas */}
        <GameCanvas
          stats={stats}
          currentIsland={currentIsland}
          activeFruit={activeFruit}
          activeSword={activeSword}
          haki={haki}
          activeQuest={activeQuest}
          autoFarm={autoFarm}
          onGainExpAndBeli={handleGainExpAndBeli}
          onPlayerDamage={handlePlayerDamage}
          playerHp={playerHp}
          maxHp={maxHp}
          playerEnergy={playerEnergy}
          maxEnergy={maxEnergy}
          onConsumeEnergy={handleConsumeEnergy}
          activeWeaponType={activeWeaponType}
          masteryUses={masteryUses}
          onAddMasteryUse={handleAddMasteryUse}
          onOpenQuestModal={() => setActiveModal('quests')}
          onOpenFragmentShop={() => setActiveModal('fragShop')}
          triggerSkillAction={triggerSkillAction}
          triggerAttackAction={triggerAttackAction}
          triggerDashAction={triggerDashAction}
          invasionActive={invasionActive}
          onInvasionBossDefeated={handleInvasionBossDefeated}
          otherPlayersRef={otherPlayersRef}
          myPlayerId={myPlayerIdRef.current}
          onPlayerMove={handlePlayerMove}
          onComboChange={setCombo}
          isMobile={isMobile}
          onInitiateTrade={handleInitiateTrade}
          gear5Settings={gear5Settings}
          bajrangGunTrigger={bajrangGunTrigger}
          onTriggerTripleBladeCinematic={(skillName) => setCinematicSkill(skillName)}
          hakiNpcSpawnedOnThisIsland={hakiNpcState.islandId === currentIsland.id}
          hakiNpcOffer={hakiNpcOffer}
          onOpenHakiNpc={() => setActiveModal('hakiNpc')}
          chaliceCooldownEnd={chaliceCooldownEnd}
          chaliceRitualActive={chaliceRitualActive}
          chaliceRitualTimeLeft={chaliceRitualTimeLeft}
          chaliceButtons={chaliceButtons}
          onAttemptObtainChalice={handleAttemptObtainChalice}
          onActivateChaliceButton={handleActivateChaliceButton}
          onEquipHakiColor={handleEquipHakiColor}
          onOpenHakiShop={() => setActiveModal('hakiShop')}
          spawnMihawkTrigger={spawnMihawkTrigger}
          onOpenAdminModal={() => setActiveModal('admin')}
          respawnTrigger={respawnTrigger}
        />

        {/* Easter Egg Gear 5: Sun God Nika Floating Transformation Button */}
        {isGear5Unlocked && (
          <button
            onClick={() => {
              sound.click();
              setShowGear5HackModal(true);
            }}
            className={`absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 px-3.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-2xl flex items-center gap-2.5 border-2 transition-all cursor-pointer ${
              gear5Settings.active
                ? 'bg-gradient-to-r from-yellow-300 via-amber-200 to-white text-slate-950 border-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.85)] animate-pulse'
                : 'bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-500 text-white border-yellow-300 hover:scale-105 shadow-yellow-500/50'
            }`}
            title="Easter Egg Desbloqueado! Configurações de Hack Gear 5"
          >
            <span className="text-xl sm:text-2xl animate-spin" style={{ animationDuration: '4s' }}>
              ☀️
            </span>
            <div className="flex flex-col text-left leading-tight">
              <span className="font-extrabold tracking-wider text-[9px] uppercase text-amber-950">
                {gear5Settings.active ? 'TRANSFORMADO ☀️' : 'EASTER EGG NIKA'}
              </span>
              <span className="font-black text-xs sm:text-sm drop-shadow">
                {gear5Settings.active ? 'GEAR 5 HACK' : 'TRANSFORMAR G5'}
              </span>
            </div>
          </button>
        )}

        {/* Multiplayer Fruit Trade Invitation Toast */}
        {tradeInvite && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 border-2 border-cyan-400 rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(6,182,212,0.6)] flex items-center gap-4 animate-bounce">
            <span className="text-2xl animate-spin" style={{ animationDuration: '6s' }}>🔄</span>
            <div>
              <div className="text-[10px] text-cyan-300 font-black uppercase tracking-wider">Convite de Troca</div>
              <div className="text-xs sm:text-sm font-black text-white">
                <span className="text-yellow-400">{tradeInvite.fromName}</span> quer trocar Frutas!
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAcceptTradeInvite}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                ✓ Aceitar
              </button>
              <button
                onClick={handleDeclineTradeInvite}
                className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-transform active:scale-95 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. BOTTOM BATTLE ACTION CONTROLS */}
      <ActionControls
        activeWeaponType={activeWeaponType}
        onChangeWeapon={setActiveWeaponType}
        activeFruit={activeFruit}
        activeSword={activeSword}
        haki={haki}
        onToggleBusoHaki={() => {
          const maxB = haki.maxBusoEnergy || 30;
          const curB = haki.busoEnergy ?? maxB;
          if (!haki.busoHakiActive && curB < maxB) {
            sound.punch();
            setAutoQuestNotice(`⚠️ Buso Haki em recarga (${Math.ceil(curB)}/${maxB}s)! Sem poder ativar no meio da recarga.`);
            setTimeout(() => setAutoQuestNotice(null), 2500);
            return;
          }
          sound.hakiToggle();
          setHaki((h) => ({ ...h, busoHakiActive: !h.busoHakiActive }));
        }}
        onToggleKenHaki={() => {
          const maxK = haki.maxKenEnergy || 5;
          const curK = haki.kenEnergy ?? maxK;
          if (!haki.kenHakiActive && curK < maxK) {
            sound.punch();
            setAutoQuestNotice(`⚠️ Ken Haki em recarga (${curK.toFixed(1)}/${maxK}s)! Sem poder ativar no meio da recarga.`);
            setTimeout(() => setAutoQuestNotice(null), 2500);
            return;
          }
          sound.hakiToggle();
          setHaki((h) => ({ ...h, kenHakiActive: !h.kenHakiActive }));
        }}
        autoFarm={autoFarm}
        onToggleAutoFarm={() => {
          sound.click();
          setAutoFarm((prev) => {
            const next = !prev;
            if (next) {
              setActiveModal('quests');
              setAutoQuestNotice('🤖 Auto-Farm Ativado! Selecione a missão desejada para caçar em loop contínuo.');
              setTimeout(() => setAutoQuestNotice(null), 4000);
            } else {
              setAutoQuestNotice('Auto-Farm desativado.');
              setTimeout(() => setAutoQuestNotice(null), 2500);
            }
            return next;
          });
        }}
        onTriggerAttack={() => setTriggerAttackAction(Date.now())}
        onTriggerDash={() => setTriggerDashAction(Date.now())}
        onTriggerSkill={(key) => setTriggerSkillAction({ key, timestamp: Date.now() })}
        isMobile={isMobile}
      />



      {/* 4. MODALS */}
      {activeModal === 'menu' && (
        <MenuModal
          onOpenModal={setActiveModal}
          onOpenStartScreen={() => setShowAuthModal(true)}
          onOpenTrade={() => handleInitiateTrade('bot_trader', 'Trafalgar Law (Trader)')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'stats' && (
        <StatsModal
          stats={stats}
          masteryUses={masteryUses}
          onAllocatePoints={handleAllocatePoints}
          onResetStats={handleResetStats}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'clan' && (
        <ClanModal
          stats={stats}
          clans={clans}
          currentIsland={currentIsland}
          allIslands={ISLANDS}
          userClan={userClan}
          onCreateClan={handleCreateClan}
          onJoinClan={handleJoinClan}
          onWarIsland={handleWarIsland}
          islandDominance={islandDominance}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'fruits' && (
        <FruitDealerModal
          beli={stats.beli}
          playerLevel={stats.level}
          activeFruit={activeFruit}
          storedFruits={storedFruits}
          onSpinFruit={(_fruit, cost) => {
            setStats((s) => ({ ...s, beli: s.beli - cost }));
          }}
          onEatFruit={(fruit) => {
            setActiveFruit(fruit);
            setActiveWeaponType('fruit');
          }}
          onStoreFruit={(fruit) => {
            if (storedFruits.some((f) => f.id === fruit.id)) {
              sound.punch();
              setAutoQuestNotice(`🚫 Você já possui 1x ${fruit.portugueseName} no Baú (Limite: 1 por fruta)!`);
              setTimeout(() => setAutoQuestNotice(null), 3500);
              return;
            }
            setStoredFruits((prev) => (prev.some((f) => f.id === fruit.id) ? prev : [...prev, fruit]));
            setAutoQuestNotice(`🎒 ${fruit.portugueseName} guardada no Baú (1/1)!`);
            setTimeout(() => setAutoQuestNotice(null), 3500);
          }}
          onDropStoredFruit={(index) => {
            const dropped = storedFruits[index];
            setStoredFruits((prev) => prev.filter((_, i) => i !== index));
            if (dropped) {
              setAutoQuestNotice(`🌊 Você jogou a ${dropped.portugueseName} fora no mar!`);
              setTimeout(() => setAutoQuestNotice(null), 3500);
            }
          }}
          onDropActiveFruit={() => {
            if (activeFruit) {
              const droppedName = activeFruit.portugueseName;
              setActiveFruit(null);
              if (activeWeaponType === 'fruit') {
                setActiveWeaponType('melee');
              }
              setAutoQuestNotice(`🌊 Você removeu e jogou fora a ${droppedName}!`);
              setTimeout(() => setAutoQuestNotice(null), 3500);
            }
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'fragShop' && (
        <FragmentShopModal
          stats={stats}
          activeFruit={activeFruit}
          onBuyFruitWithFrags={handleBuyFruitWithFrags}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'quests' && (
        <QuestModal
          currentIsland={currentIsland}
          playerLevel={stats.level}
          activeQuest={activeQuest}
          autoFarm={autoFarm}
          onAcceptQuest={(q: QuestDefinition) => {
            setActiveQuest({
              questId: q.id,
              title: q.title,
              targetEnemyId: q.targetEnemyId,
              targetEnemyName: q.targetEnemyName,
              currentCount: 0,
              targetCount: q.targetCount,
              expReward: q.expReward,
              beliReward: q.beliReward,
            });
            if (autoFarm) {
              setAutoQuestNotice(`🤖 Missão "${q.title}" selecionada para Auto-Farm! Será renovada automaticamente.`);
              setTimeout(() => setAutoQuestNotice(null), 4000);
            }
          }}
          onAbandonQuest={() => setActiveQuest(null)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'shop' && (
        <ShopModal
          beli={stats.beli}
          playerLevel={stats.level}
          ownedSwordIds={ownedSwordIds}
          activeSword={activeSword}
          haki={haki}
          onBuySword={(sword) => {
            setStats((s) => ({ ...s, beli: s.beli - sword.priceBeli }));
            setOwnedSwordIds((prev) => [...prev, sword.id]);
            setActiveSword(sword);
            setActiveWeaponType('sword');
          }}
          onEquipSword={(sword) => {
            setActiveSword(sword);
            if (sword) setActiveWeaponType('sword');
            else if (activeWeaponType === 'sword') setActiveWeaponType('melee');
          }}
          onUnlockHaki={(hakiId, cost) => {
            setStats((s) => ({ ...s, beli: s.beli - cost }));
            if (hakiId === 'buso_haki') setHaki((h) => ({ ...h, busoHaki: true, busoHakiActive: true }));
            if (hakiId === 'ken_haki') setHaki((h) => ({ ...h, kenHaki: true }));
            if (hakiId === 'geppo') setHaki((h) => ({ ...h, geppo: true }));
            if (hakiId === 'soru') setHaki((h) => ({ ...h, soru: true }));
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'map' && (
        <IslandMapModal
          currentIsland={currentIsland}
          playerLevel={stats.level}
          onTravelToIsland={(island) => {
            setCurrentIsland(island);
            // Default select the first quest on new island
            if (island.quests.length > 0) {
              const q = island.quests[0];
              if (stats.level >= q.levelRequired) {
                setActiveQuest({
                  questId: q.id,
                  title: q.title,
                  targetEnemyId: q.targetEnemyId,
                  targetEnemyName: q.targetEnemyName,
                  currentCount: 0,
                  targetCount: q.targetCount,
                  expReward: q.expReward,
                  beliReward: q.beliReward,
                });
              }
            }
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'admin' && (
        <AdminModal
          stats={stats}
          onUpdateStats={setStats}
          activeFruit={activeFruit}
          onEquipFruit={(fruit) => {
            setActiveFruit(fruit);
            setActiveWeaponType('fruit');
          }}
          onStoreFruit={(fruit) => {
            if (storedFruits.some((f) => f.id === fruit.id)) {
              setAutoQuestNotice(`🚫 Você já possui 1x ${fruit.portugueseName} no Baú (Máx: 1)!`);
              setTimeout(() => setAutoQuestNotice(null), 3500);
              return;
            }
            setStoredFruits((prev) => (prev.some((f) => f.id === fruit.id) ? prev : [...prev, fruit]));
          }}
          activeSword={activeSword}
          onUnlockAllSwords={() => {
            const allSwordIds = SWORDS.map((s) => s.id);
            setOwnedSwordIds(allSwordIds);
            const yoru = SWORDS.find((s) => s.id === 'sword_yoru') || SWORDS[0];
            setActiveSword(yoru);
            setActiveWeaponType('sword');
          }}
          onEquipSword={(sword) => {
            setActiveSword(sword);
            setActiveWeaponType('sword');
            if (!ownedSwordIds.includes(sword.id)) {
              setOwnedSwordIds((prev) => [...prev, sword.id]);
            }
          }}
          haki={haki}
          onUnlockAllHakis={() => {
            setHaki({
              busoHaki: true,
              busoHakiActive: true,
              kenHaki: true,
              kenHakiActive: true,
              geppo: true,
              soru: true,
            });
          }}
          onTeleportIsland={(island) => {
            setCurrentIsland(island);
          }}
          onRestoreHpEnergy={() => {
            setPlayerHp(maxHp);
            setPlayerEnergy(maxEnergy);
          }}
          onTriggerInvasion={handleTriggerInvasion}
          onSummonHakiNpc={handleForceSummonHakiNpc}
          onUnlockAllHakiColors={handleUnlockAllHakiColors}
          onForceObtainChalice={handleForceObtainChalice}
          activeHakiColorId={haki.activeHakiColorId}
          unlockedHakiColorIds={haki.unlockedHakiColorIds || ['haki_amethyst_purple']}
          onEquipHakiColor={handleEquipHakiColor}
          onPreviewCinematic={(skillName) => setCinematicSkill(skillName)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Fruit Trade Dual-Slot Modal */}
      {activeTrade && (
        <FruitTradeModal
          partnerId={activeTrade.partnerId}
          partnerName={activeTrade.partnerName}
          myStoredFruits={storedFruits}
          myActiveFruit={activeFruit}
          partnerOfferedFruit={partnerOfferedFruit}
          partnerLocked={partnerTradeLocked}
          partnerConfirmed={partnerTradeConfirmed}
          partnerOwnedFruitIds={partnerOwnedFruitIds}
          onUpdateMyOffer={handleUpdateMyTradeOffer}
          onCompleteTrade={handleCompleteTrade}
          onClose={handleCloseTrade}
          isBot={activeTrade.isBot}
        />
      )}

      {/* Haki Colors Shop Modal */}
      {activeModal === 'hakiShop' && (
        <HakiShopModal
          stats={stats}
          activeHakiColorId={haki.activeHakiColorId}
          unlockedHakiColorIds={haki.unlockedHakiColorIds || ['haki_amethyst_purple']}
          onBuyHakiColor={handleBuyHakiColor}
          onEquipHakiColor={handleEquipHakiColor}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Wandering Haki Master NPC Modal */}
      {activeModal === 'hakiNpc' && (
        <HakiColorNpcModal
          currentOffer={hakiNpcOffer}
          timeRemainingSeconds={hakiNpcTimeRemaining}
          currentIslandName={hakiNpcIslandObj.name}
          stats={stats}
          activeHakiColorId={haki.activeHakiColorId}
          unlockedHakiColorIds={haki.unlockedHakiColorIds || ['haki_amethyst_purple']}
          onBuyHakiColor={handleBuyHakiColor}
          onEquipHakiColor={handleEquipHakiColor}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Secret Gear 5 Sun God Nika Hack Panel Modal */}
      {showGear5HackModal && (
        <Gear5HackModal
          settings={gear5Settings}
          onUpdateSettings={handleUpdateGear5Settings}
          onTriggerBajrangGun={handleTriggerBajrangGun}
          onClose={() => setShowGear5HackModal(false)}
        />
      )}

      {showAuthModal && (
        <AuthStartModal
          hasExistingSave={hasExistingSave}
          existingProfile={{
            stats,
            activeFruitName: activeFruit?.portugueseName,
          }}
          onResumeGame={() => {
            setShowAuthModal(false);
            setLoadingScreenMode('resume');
          }}
          onStartGame={handleStartGame}
        />
      )}

      {loadingScreenMode && (
        <LoadingScreenModal
          stats={stats}
          activeFruitName={activeFruit?.portugueseName}
          mode={loadingScreenMode}
          durationSeconds={12}
          onComplete={() => setLoadingScreenMode(null)}
        />
      )}

      {/* 3D 4K CINEMATIC OVERLAY FOR TRIPLE DARK BLADE */}
      {cinematicSkill && (
        <TripleDarkBladeCinematic3D
          character={stats.character}
          skillName={cinematicSkill}
          onComplete={() => setCinematicSkill(null)}
        />
      )}
    </div>
  );
}
