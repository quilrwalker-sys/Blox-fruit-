import { BloxFruit } from '../types/game';
import { ALL_BLOX_FRUITS } from '../data/fruitsData';

export interface CustomFruitOverride {
  priceBeli?: number;
  fragCost?: number;
  forceDealerStock?: boolean;
  forceFragStock?: boolean;
  customChance?: number;
}

export interface AdminGlobalMarketConfig {
  globalDiscountPercent: number; // 0 to 100
  gachaSpinCostOverride: number | null; // null = default level-based formula
  gachaLuckMultiplier: number; // 1, 2, 5, 10, 50, 100
  guaranteedNextSpinFruitId: string | null; // If set, next Gacha spin 100% lands on this fruit
  fragShopSlotOverrides: (string | null)[]; // [slot1Id, slot2Id, slot3Id, slot4Id]
}

const STORAGE_KEY_CUSTOM_PRICES = 'blox_fruits_admin_custom_shop_v1';
const STORAGE_KEY_CUSTOM_FRUITS = 'blox_fruits_admin_custom_created_fruits_v1';
const STORAGE_KEY_GLOBAL_MARKET = 'blox_fruits_admin_global_market_v1';

const DEFAULT_GLOBAL_MARKET: AdminGlobalMarketConfig = {
  globalDiscountPercent: 0,
  gachaSpinCostOverride: null,
  gachaLuckMultiplier: 1,
  guaranteedNextSpinFruitId: null,
  fragShopSlotOverrides: [null, null, null, null],
};

// Get global market configuration
export function getAdminGlobalMarketConfig(): AdminGlobalMarketConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_GLOBAL_MARKET);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_GLOBAL_MARKET,
        ...parsed,
        fragShopSlotOverrides: Array.isArray(parsed.fragShopSlotOverrides)
          ? parsed.fragShopSlotOverrides
          : [null, null, null, null],
      };
    }
  } catch {
    // Fallback
  }
  return { ...DEFAULT_GLOBAL_MARKET };
}

// Update global market configuration
export function setAdminGlobalMarketConfig(partial: Partial<AdminGlobalMarketConfig>) {
  const current = getAdminGlobalMarketConfig();
  const updated: AdminGlobalMarketConfig = {
    ...current,
    ...partial,
  };
  try {
    localStorage.setItem(STORAGE_KEY_GLOBAL_MARKET, JSON.stringify(updated));
  } catch {
    // Ignore quota
  }
  notifyAndBroadcast();
}

// Get map of custom overrides per fruit ID
export function getCustomShopOverrides(): Record<string, CustomFruitOverride> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_PRICES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Fallback
  }
  return {};
}

// Save override for a fruit
export function setCustomShopOverride(fruitId: string, override: CustomFruitOverride) {
  const all = getCustomShopOverrides();
  all[fruitId] = {
    ...all[fruitId],
    ...override,
  };
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRICES, JSON.stringify(all));
  } catch {
    // Ignore quota
  }
  notifyAndBroadcast();
}

// Batch save overrides for multiple fruits at once
export function setBatchCustomShopOverrides(updates: Record<string, CustomFruitOverride>) {
  const all = getCustomShopOverrides();
  for (const [fruitId, override] of Object.entries(updates)) {
    all[fruitId] = {
      ...all[fruitId],
      ...override,
    };
  }
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRICES, JSON.stringify(all));
  } catch {
    // Ignore quota
  }
  notifyAndBroadcast();
}

// Reset a single fruit's override back to default
export function clearSingleFruitOverride(fruitId: string) {
  const all = getCustomShopOverrides();
  if (all[fruitId]) {
    delete all[fruitId];
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRICES, JSON.stringify(all));
    } catch {
      // Ignore
    }
    notifyAndBroadcast();
  }
}

// Reset all overrides and global market settings
export function resetCustomShopOverrides() {
  localStorage.removeItem(STORAGE_KEY_CUSTOM_PRICES);
  localStorage.removeItem(STORAGE_KEY_CUSTOM_FRUITS);
  localStorage.removeItem(STORAGE_KEY_GLOBAL_MARKET);
  notifyAndBroadcast();
}

// Get user-created custom fruits with strict deduplication
export function getAdminCreatedFruits(): BloxFruit[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_FRUITS);
    if (stored) {
      const parsed: BloxFruit[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const uniqueMap = new Map<string, BloxFruit>();
        for (const item of parsed) {
          if (item && item.id) {
            uniqueMap.set(item.id, item);
          }
        }
        return Array.from(uniqueMap.values());
      }
    }
  } catch {
    // Fallback
  }
  return [];
}

// Add a newly created or edited fruit from Admin
export function saveAdminCreatedFruit(newFruit: BloxFruit) {
  const current = getAdminCreatedFruits();
  const updated = [newFruit, ...current.filter((f) => f.id !== newFruit.id)];
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_FRUITS, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  notifyAndBroadcast();
}

// Delete a custom created fruit from Admin
export function deleteAdminCreatedFruit(fruitId: string) {
  const current = getAdminCreatedFruits();
  const updated = current.filter((f) => f.id !== fruitId);
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_FRUITS, JSON.stringify(updated));
  } catch {
    // Ignore
  }

  // Clear overrides for this fruit if any
  const overrides = getCustomShopOverrides();
  if (overrides[fruitId]) {
    delete overrides[fruitId];
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRICES, JSON.stringify(overrides));
    } catch {
      // Ignore
    }
  }

  notifyAndBroadcast();
}

// Sync shop state received from Server WebSocket
export function syncAdminShopFromServer(
  overrides: Record<string, CustomFruitOverride>,
  customFruits: BloxFruit[]
) {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRICES, JSON.stringify(overrides || {}));
    localStorage.setItem(STORAGE_KEY_CUSTOM_FRUITS, JSON.stringify(customFruits || []));
  } catch {
    // Ignore
  }
  window.dispatchEvent(new CustomEvent('admin_shop_updated'));
}

function notifyAndBroadcast() {
  window.dispatchEvent(new CustomEvent('admin_shop_updated'));
  window.dispatchEvent(
    new CustomEvent('broadcast_admin_shop_ws', {
      detail: {
        overrides: getCustomShopOverrides(),
        customFruits: getAdminCreatedFruits(),
      },
    })
  );
}

// Get effective Blox Fruits list with all Admin overrides and global discounts applied
export function getEffectiveBloxFruits(): BloxFruit[] {
  const overrides = getCustomShopOverrides();
  const created = getAdminCreatedFruits();
  const market = getAdminGlobalMarketConfig();
  const discountFactor = Math.max(0, Math.min(1, (100 - (market.globalDiscountPercent || 0)) / 100));

  // Deduplicate: Created fruits override base fruits if they share the same ID
  const fruitMap = new Map<string, BloxFruit>();

  for (const baseFruit of ALL_BLOX_FRUITS) {
    if (baseFruit && baseFruit.id) {
      fruitMap.set(baseFruit.id, baseFruit);
    }
  }

  for (const customFruit of created) {
    if (customFruit && customFruit.id) {
      fruitMap.set(customFruit.id, customFruit);
    }
  }

  const effectiveList = Array.from(fruitMap.values());

  return effectiveList.map((fruit) => {
    const custom = overrides[fruit.id];
    const baseBeli = custom?.priceBeli !== undefined ? custom.priceBeli : fruit.priceBeli;
    const discountedBeli = Math.max(0, Math.round(baseBeli * discountFactor));
    return {
      ...fruit,
      priceBeli: discountedBeli,
      chance: custom?.customChance !== undefined ? custom.customChance : fruit.chance,
    };
  });
}
