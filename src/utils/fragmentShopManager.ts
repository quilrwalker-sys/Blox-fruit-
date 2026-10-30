import { BloxFruit } from '../types/game';
import {
  getAdminGlobalMarketConfig,
  getCustomShopOverrides,
  getEffectiveBloxFruits,
} from './adminShopManager';

export interface ShopItemSlot {
  fruit: BloxFruit | null;
  fragCost: number;
  isAvailable: boolean;
  stockCount: number;
  isPurchased?: boolean;
}

export interface FragmentShopState {
  currentPeriod: number;
  nextRestockTimestamp: number;
  slots: ShopItemSlot[];
}

const STORAGE_KEY_PURCHASES = 'blox_fruits_frag_shop_purchases_v3';
export const ROTATION_DURATION_MS = 60 * 1000; // 1 minute per global restock

// Mulberry32 Deterministic PRNG for 100% synchronized global seed randoms
function createPRNG(seed: number) {
  let s = seed ^ 0xdeadbeef;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDefaultFragCostForRarity(rarity: string): number {
  switch (rarity) {
    case 'Incompreendido':
      return 80000;
    case 'Mítica':
      return 45000;
    case 'Lendária':
      return 18000;
    case 'Épica':
      return 7000;
    case 'Rara':
      return 3500;
    case 'Incomum':
      return 1500;
    default:
      return 800;
  }
}

// Generate 4 slots deterministically based on global period index
export function generateFragmentShopSlots(periodSeed: number): ShopItemSlot[] {
  const rng = createPRNG(periodSeed);
  const effectiveFruits = getEffectiveBloxFruits();
  const overrides = getCustomShopOverrides();
  const market = getAdminGlobalMarketConfig();
  const discountFactor = Math.max(0, Math.min(1, (100 - (market.globalDiscountPercent || 0)) / 100));

  // Helper to resolve custom frag cost with global discount
  const resolveFragCost = (fruit: BloxFruit, defaultCost?: number) => {
    const custom = overrides[fruit.id];
    const baseCost =
      custom && custom.fragCost !== undefined
        ? custom.fragCost
        : defaultCost !== undefined
        ? defaultCost
        : getDefaultFragCostForRarity(fruit.rarity);
    return Math.max(0, Math.round(baseCost * discountFactor));
  };

  // Slot 1: Common / Uncommon (always in stock)
  const lowTier = effectiveFruits.filter((f) => f.rarity === 'Comum' || f.rarity === 'Incomum');
  const f1Index = Math.floor(rng() * lowTier.length);
  const f1 = lowTier[f1Index] || effectiveFruits[0];
  const cost1 = resolveFragCost(f1);

  // Slot 2: Rare / Epic (always in stock)
  const midTier = effectiveFruits.filter((f) => f.rarity === 'Rara' || f.rarity === 'Épica');
  const f2Index = Math.floor(rng() * midTier.length);
  const f2 = midTier[f2Index] || effectiveFruits[1];
  const cost2 = resolveFragCost(f2);

  // Slot 3: Legendary or Admin Forced Frag Stock
  const forcedFragIds = Object.keys(overrides).filter((id) => overrides[id].forceFragStock);
  const hasLegendary = rng() < 0.15;
  let s3: ShopItemSlot;

  if (forcedFragIds.length > 1) {
    const forcedFruit3 = effectiveFruits.find((f) => f.id === forcedFragIds[1]);
    if (forcedFruit3) {
      s3 = {
        fruit: forcedFruit3,
        fragCost: resolveFragCost(forcedFruit3),
        isAvailable: true,
        stockCount: 1,
        isPurchased: false,
      };
    } else {
      s3 = { fruit: null, fragCost: 0, isAvailable: false, stockCount: 0, isPurchased: false };
    }
  } else if (hasLegendary) {
    const legendaries = effectiveFruits.filter((f) => f.rarity === 'Lendária');
    const f3Index = Math.floor(rng() * legendaries.length);
    const f3 = legendaries[f3Index] || effectiveFruits[2];
    s3 = {
      fruit: f3,
      fragCost: resolveFragCost(f3),
      isAvailable: true,
      stockCount: 1,
      isPurchased: false,
    };
  } else {
    s3 = {
      fruit: null,
      fragCost: 0,
      isAvailable: false,
      stockCount: 0,
      isPurchased: false,
    };
  }

  // Slot 4: Mythical / Leviathan or Admin Forced Frag Stock
  const rollSpecial = rng();
  let s4: ShopItemSlot;

  if (forcedFragIds.length > 0) {
    const forcedFruit4 = effectiveFruits.find((f) => f.id === forcedFragIds[0]);
    if (forcedFruit4) {
      s4 = {
        fruit: forcedFruit4,
        fragCost: resolveFragCost(forcedFruit4),
        isAvailable: true,
        stockCount: 1,
        isPurchased: false,
      };
    } else {
      s4 = { fruit: null, fragCost: 0, isAvailable: false, stockCount: 0, isPurchased: false };
    }
  } else if (rollSpecial < 0.001) {
    // LEVIATHAN IN STOCK! Super jackpot
    const leviathan = effectiveFruits.find((f) => f.id === 'fruit_leviathan')!;
    s4 = {
      fruit: leviathan,
      fragCost: resolveFragCost(leviathan, 80000),
      isAvailable: true,
      stockCount: 1,
      isPurchased: false,
    };
  } else if (rollSpecial < 0.035) {
    // Mythical in stock (3.5% chance)
    const mythicals = effectiveFruits.filter((f) => f.rarity === 'Mítica');
    const f4Index = Math.floor(rng() * mythicals.length);
    const f4 = mythicals[f4Index] || effectiveFruits[3];
    s4 = {
      fruit: f4,
      fragCost: resolveFragCost(f4, 45000),
      isAvailable: true,
      stockCount: 1,
      isPurchased: false,
    };
  } else {
    s4 = {
      fruit: null,
      fragCost: 0,
      isAvailable: false,
      stockCount: 0,
      isPurchased: false,
    };
  }

  const baseSlots: ShopItemSlot[] = [
    { fruit: f1, fragCost: cost1, isAvailable: true, stockCount: 1, isPurchased: false },
    { fruit: f2, fragCost: cost2, isAvailable: true, stockCount: 1, isPurchased: false },
    s3,
    s4,
  ];

  // Apply explicit per-slot overrides if configured by Admin
  return baseSlots.map((slot, idx) => {
    const slotOverrideId = market.fragShopSlotOverrides?.[idx];
    if (slotOverrideId) {
      const targetFruit = effectiveFruits.find((f) => f.id === slotOverrideId);
      if (targetFruit) {
        return {
          fruit: targetFruit,
          fragCost: resolveFragCost(targetFruit),
          isAvailable: true,
          stockCount: 1,
          isPurchased: false,
        };
      }
    }
    return slot;
  });
}

// Get player local purchases for current global period
function getPurchasedSlotsForPeriod(period: number): boolean[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PURCHASES}_${period}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return [false, false, false, false];
}

// Save player local purchases for current global period
function savePurchasedSlotsForPeriod(period: number, purchases: boolean[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PURCHASES}_${period}`, JSON.stringify(purchases));
  } catch {
    // Ignore quota errors
  }
}

// Clear purchases for current period (Admin re-stock action)
export function clearFragmentShopPurchases() {
  const currentPeriod = Math.floor(Date.now() / ROTATION_DURATION_MS);
  savePurchasedSlotsForPeriod(currentPeriod, [false, false, false, false]);
  window.dispatchEvent(new CustomEvent('admin_shop_updated'));
}

// Get current globally synchronized Fragment Shop state
export function getFragmentShopState(): FragmentShopState {
  const now = Date.now();
  const currentPeriod = Math.floor(now / ROTATION_DURATION_MS);
  const periodStart = currentPeriod * ROTATION_DURATION_MS;
  const nextRestockTimestamp = periodStart + ROTATION_DURATION_MS;

  // Generate 100% deterministic global slots for this current period
  const rawSlots = generateFragmentShopSlots(currentPeriod);
  const purchasedFlags = getPurchasedSlotsForPeriod(currentPeriod);

  // Apply player's local purchase state for this period
  const slots: ShopItemSlot[] = rawSlots.map((slot, index) => {
    const isPurchased = purchasedFlags[index] || false;
    if (isPurchased) {
      return {
        ...slot,
        stockCount: 0,
        isAvailable: false,
        isPurchased: true,
      };
    }
    return slot;
  });

  return {
    currentPeriod,
    nextRestockTimestamp,
    slots,
  };
}

// Rotate stock (clears purchase locks & refreshes current deterministic period state)
export function rotateFragmentShopStock(): FragmentShopState {
  clearFragmentShopPurchases();
  return getFragmentShopState();
}

// Mark a slot as purchased locally for the current global period
export function markFragmentShopSlotPurchased(slotIndex: number): FragmentShopState {
  const state = getFragmentShopState();
  const purchases = getPurchasedSlotsForPeriod(state.currentPeriod);

  if (slotIndex >= 0 && slotIndex < 4) {
    purchases[slotIndex] = true;
    savePurchasedSlotsForPeriod(state.currentPeriod, purchases);
  }

  return getFragmentShopState();
}
