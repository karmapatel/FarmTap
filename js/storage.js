// Local Persistence using localStorage with graceful fallback
const STORAGE_KEY = 'ticker_tape_crops_save_v1';

export const VALID_CROPS = ['wheat', 'corn', 'tomato', 'potato', 'rice', 'sugarcane'];

export function sanitizeInventory(targetInv) {
  if (!targetInv || typeof targetInv !== 'object') {
    return {
      wheat: 0,
      corn: 0,
      tomato: 0,
      potato: 0,
      rice: 0,
      sugarcane: 0
    };
  }

  // Purge any keys not in VALID_CROPS
  Object.keys(targetInv).forEach((key) => {
    if (!VALID_CROPS.includes(key)) {
      delete targetInv[key];
    } else {
      const val = Number(targetInv[key]);
      targetInv[key] = Number.isFinite(val) && val > 0 ? Math.floor(val) : 0;
    }
  });

  // Ensure all valid crops are defined
  VALID_CROPS.forEach((crop) => {
    if (targetInv[crop] === undefined || targetInv[crop] === null) {
      targetInv[crop] = 0;
    }
  });

  return targetInv;
}

export const defaultState = {
  gold: 1240,
  weather: 'sunny', // 'sunny', 'heavy_rain', 'drought', 'festival'
  barnCapacity: 30,
  activeTargetPlot: null,
  muted: false,
  inventory: {
    wheat: 6,
    corn: 4,
    tomato: 3,
    potato: 1,
    rice: 0,
    sugarcane: 0
  },
  prices: {
    wheat: 32,
    corn: 47,
    tomato: 49,
    potato: 10,
    rice: 32,
    sugarcane: 65
  },
  costs: {
    wheat: 6,
    corn: 12,
    tomato: 18,
    potato: 5,
    rice: 14,
    sugarcane: 25
  },
  lastHourKey: null,
  plots: [
    { id: 0, state: 'mature', crop: 'wheat', progress: 100, timer: 0 },
    { id: 1, state: 'mature', crop: 'corn', progress: 100, timer: 0 },
    { id: 2, state: 'mature', crop: 'tomato', progress: 100, timer: 0 },
    { id: 3, state: 'empty', crop: null, progress: 0, timer: 0 },
    { id: 4, state: 'mature', crop: 'potato', progress: 100, timer: 0 },
    { id: 5, state: 'locked', crop: null, progress: 0, timer: 0 }
  ],
  upgrades: {
    unlockedPlots: 5, // plot 0, 1, 2, 3, 4 are unlocked, 5 is locked
    fastTractor: false,
    autoIrrigation: false
  },
  activeEvent: {
    id: 'festival',
    title: 'FESTIVAL DEMAND',
    icon: '🎉',
    desc: 'Town buyers are paying +35% bonus for fresh Tomato & Wheat!'
  }
};

export const storage = {
  save(state) {
    try {
      state.inventory = sanitizeInventory(state.inventory);
      const dataToSave = {
        gold: state.gold,
        weather: state.weather,
        barnCapacity: state.barnCapacity,
        muted: state.muted,
        inventory: state.inventory,
        prices: state.prices,
        costs: state.costs,
        marketHour: state.marketHour,
        marketDay: state.marketDay,
        cycleStartTime: state.cycleStartTime,
        plots: state.plots,
        upgrades: state.upgrades,
        activeEvent: state.activeEvent,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const plots = Array.isArray(parsed.plots) && parsed.plots.length === 6 ? parsed.plots : defaultState.plots;

        // Ensure all growing plots have synchronized timer and progress
        plots.forEach((p) => {
          if (p.state === 'growing' && p.crop) {
            const cropTimes = { wheat: 10, corn: 16, tomato: 22, potato: 8, rice: 14, sugarcane: 30 };
            const total = p.totalTime || cropTimes[p.crop] || 12;
            p.totalTime = total;
            if (p.timer === undefined || p.timer === null) {
              p.timer = Math.round(total * (1 - (p.progress || 0) / 100));
            }
            if (p.timer <= 0) {
              p.state = 'mature';
              p.progress = 100;
              p.timer = 0;
            } else {
              p.progress = Math.min(100, Math.max(0, ((total - p.timer) / total) * 100));
            }
          }
        });

        // Clean and sanitize inventory so no ghost or null keys persist, and 0s are preserved
        const cleanInv = sanitizeInventory(parsed.inventory !== undefined ? parsed.inventory : defaultState.inventory);

        // Deep merge with defaults so new fields are never undefined
        return {
          ...defaultState,
          ...parsed,
          inventory: cleanInv,
          prices: { ...defaultState.prices, ...(parsed.prices || {}) },
          costs: { ...defaultState.costs, ...(parsed.costs || {}) },
          upgrades: { ...defaultState.upgrades, ...(parsed.upgrades || {}) },
          plots
        };
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(defaultState));
  },

  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    return JSON.parse(JSON.stringify(defaultState));
  }
};
