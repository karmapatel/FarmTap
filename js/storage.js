import { processLivestockHourlyCycle } from './animals.js';

// Persistent Storage using IndexedDB (with PWA persistent storage request & legacy migration)

const DB_NAME = 'farmtap_idb_v1';
const DB_VERSION = 1;
const STORE_NAME = 'farm_saves';
const SAVE_KEY = 'player_state';

export const VALID_CROPS = ['wheat', 'corn', 'tomato', 'potato', 'rice', 'sugarcane', 'eggs', 'milk'];

export function sanitizeInventory(targetInv) {
  if (!targetInv || typeof targetInv !== 'object') {
    return {
      wheat: 0,
      corn: 0,
      tomato: 0,
      potato: 0,
      rice: 0,
      sugarcane: 0,
      eggs: 0,
      milk: 0
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

  // Ensure all valid items are defined
  VALID_CROPS.forEach((crop) => {
    if (targetInv[crop] === undefined || targetInv[crop] === null) {
      targetInv[crop] = 0;
    }
  });

  return targetInv;
}

export const defaultState = {
  gold: 1000,
  weather: 'sunny', // 'sunny', 'heavy_rain', 'drought', 'festival'
  barnCapacity: 30,
  activeTargetPlot: null,
  muted: false,
  inventory: {
    wheat: 0,
    corn: 0,
    tomato: 0,
    potato: 0,
    rice: 0,
    sugarcane: 0,
    eggs: 0,
    milk: 0
  },
  prices: {
    wheat: 32,
    corn: 47,
    tomato: 49,
    potato: 10,
    rice: 32,
    sugarcane: 65,
    eggs: 45,
    milk: 80
  },
  costs: {
    wheat: 6,
    corn: 12,
    tomato: 18,
    potato: 5,
    rice: 14,
    sugarcane: 25,
    eggs: 15,
    milk: 25
  },
  housing: {
    coop: { owned: true, capacity: 4 },
    livestockBarn: { owned: false, capacity: 3 }
  },
  animals: {
    chickens: [],
    cows: []
  },
  feedInventory: {
    chickenFeed: 0,
    cowFeed: 0
  },
  lastHourKey: null,
  wellWater: 100,
  lastHourlyUpdateTimestamp: null,
  plots: [
    { id: 0, state: 'empty', crop: null, progress: 0, timer: 0, moisture: 60 },
    { id: 1, state: 'empty', crop: null, progress: 0, timer: 0, moisture: 60 },
    { id: 2, state: 'empty', crop: null, progress: 0, timer: 0, moisture: 60 },
    { id: 3, state: 'empty', crop: null, progress: 0, timer: 0, moisture: 60 },
    { id: 4, state: 'empty', crop: null, progress: 0, timer: 0, moisture: 60 },
    { id: 5, state: 'locked', crop: null, progress: 0, timer: 0, moisture: 60 }
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

// IndexedDB Helper
let idbPromise = null;

function openDatabase() {
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB failed to open:', event.target.error);
      reject(event.target.error);
    };
  });

  return idbPromise;
}

async function idbGet(key) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('idbGet error:', e);
    return null;
  }
}

async function idbSet(key, value) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('idbSet error:', e);
    return false;
  }
}

async function idbClear() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('idbClear error:', e);
    return false;
  }
}

export async function requestPersistentStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log(`PWA Persistent storage granted: ${granted}`);
      } else {
        console.log('PWA Storage is already persistent');
      }
    } catch (e) {
      console.warn('Could not request persistent storage:', e);
    }
  }
}

// In-memory cache of state for rapid access
let cachedState = null;

export const storage = {
  requestPersistentStorage,

  async save(state) {
    try {
      state.inventory = sanitizeInventory(state.inventory);
      const safeWater = (state.wellWater !== undefined && state.wellWater !== null)
        ? Math.max(0, Math.min(100, Math.round(Number(state.wellWater))))
        : 100;

      const dataToSave = {
        gold: Math.max(0, Math.floor(Number(state.gold) || 0)),
        weather: state.weather,
        barnCapacity: state.barnCapacity,
        muted: state.muted,
        inventory: state.inventory,
        prices: state.prices,
        costs: state.costs,
        housing: state.housing || defaultState.housing,
        animals: state.animals || defaultState.animals,
        feedInventory: state.feedInventory || defaultState.feedInventory,
        lastHourKey: state.lastHourKey || null,
        wellWater: safeWater,
        lastHourlyUpdateTimestamp: state.lastHourlyUpdateTimestamp || null,
        marketHour: state.marketHour,
        marketDay: state.marketDay,
        cycleStartTime: state.cycleStartTime,
        plots: state.plots,
        upgrades: state.upgrades,
        activeEvent: state.activeEvent,
        priceHistory: state.priceHistory || {},
        timestamp: Date.now()
      };
      cachedState = dataToSave;

      // Synchronous localStorage write for instant resilience against immediate page reloads
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('farmtap_well_water', String(safeWater));
          const serialized = JSON.stringify(dataToSave);
          localStorage.setItem('ticker_tape_crops_save_v2', serialized);
          localStorage.setItem('ticker_tape_crops_save_v1', serialized);
        } catch (_) {}
      }
      await idbSet(SAVE_KEY, dataToSave);
    } catch (e) {
      console.warn('Failed to save state to IndexedDB:', e);
    }
  },

  async load() {
    try {
      // 1. Attempt to load from IndexedDB
      let saved = await idbGet(SAVE_KEY);

      // Dedicated well water check from localStorage
      let dedicatedWellWater = null;
      if (typeof localStorage !== 'undefined') {
        try {
          const rawWater = localStorage.getItem('farmtap_well_water');
          if (rawWater !== null && rawWater !== undefined && rawWater !== '') {
            const num = Number(rawWater);
            if (Number.isFinite(num)) {
              dedicatedWellWater = Math.max(0, Math.min(100, Math.round(num)));
            }
          }
        } catch (_) {}
      }

      // 2. Also check synchronous localStorage backup in case of recent reload or uncompleted async write
      if (typeof localStorage !== 'undefined') {
        try {
          const rawLocal = localStorage.getItem('ticker_tape_crops_save_v2') || localStorage.getItem('ticker_tape_crops_save_v1');
          if (rawLocal) {
            const parsedLocal = JSON.parse(rawLocal);
            // If localStorage is newer than IndexedDB save, prioritize localStorage
            if (!saved || (parsedLocal && parsedLocal.timestamp && (!saved.timestamp || parsedLocal.timestamp >= saved.timestamp))) {
              saved = parsedLocal;
            }
          }
        } catch (e) {
          console.warn('localStorage read error:', e);
        }
      }

      if (saved) {
        const parsed = saved;
        const plots = Array.isArray(parsed.plots) && parsed.plots.length === 6 ? parsed.plots : defaultState.plots;

        // Offline time recovery: simulate crop growth while app was closed
        const savedTime = Number(parsed.timestamp);
        const now = Date.now();
        const elapsedSeconds = Number.isFinite(savedTime) && savedTime > 0
          ? Math.max(0, Math.floor((now - savedTime) / 1000))
          : 0;

        const cropTimes = { wheat: 10, corn: 16, tomato: 22, potato: 8, rice: 14, sugarcane: 30 };

        plots.forEach((p) => {
          if (p.moisture === undefined || p.moisture === null) {
            p.moisture = 60;
          } else {
            p.moisture = Math.max(0, Math.min(100, Math.round(Number(p.moisture))));
          }

          if (p.state === 'growing' && p.crop) {
            const total = p.totalTime || cropTimes[p.crop] || 12;
            p.totalTime = total;
            let currentTimer = (p.timer !== undefined && p.timer !== null) ? p.timer : total;

            // Apply elapsed time while user was away
            if (elapsedSeconds > 0) {
              currentTimer = Math.max(0, currentTimer - elapsedSeconds);
            }

            p.timer = currentTimer;
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

        // Resilient well water resolution:
        // 1. Dedicated localStorage key takes first priority (immune to schema/migration drops)
        // 2. Saved/parsed wellWater takes second priority
        // 3. Defaults to 100 only if never previously set
        let loadedWellWater = 100;
        if (dedicatedWellWater !== null) {
          loadedWellWater = dedicatedWellWater;
        } else if (parsed && parsed.wellWater !== undefined && parsed.wellWater !== null) {
          loadedWellWater = Math.max(0, Math.min(100, Math.round(Number(parsed.wellWater))));
        }

        let loadedGold = Math.max(0, Math.floor(Number(parsed.gold !== undefined ? parsed.gold : defaultState.gold) || 0));
        // Ensure player account has at least $1000
        if (loadedGold < 1000) {
          loadedGold = 1000;
        }

        // Deep merge with defaults so new fields are never undefined
        const mergedState = {
          ...defaultState,
          ...parsed,
          gold: loadedGold,
          wellWater: loadedWellWater,
          housing: { 
            ...defaultState.housing, 
            ...(parsed.housing || {}),
            coop: { owned: true, capacity: 4 } // Starter coop is always ready for hens
          },
          animals: {
            chickens: chickensList,
            cows: Array.isArray(parsed.animals?.cows) ? parsed.animals.cows : []
          },
          feedInventory: { ...defaultState.feedInventory, ...(parsed.feedInventory || {}) },
          lastHourKey: parsed.lastHourKey || null,
          lastHourlyUpdateTimestamp: parsed.lastHourlyUpdateTimestamp || null,
          inventory: cleanInv,
          prices: { ...defaultState.prices, ...(parsed.prices || {}) },
          costs: { ...defaultState.costs, ...(parsed.costs || {}) },
          priceHistory: parsed.priceHistory || {},
          upgrades: { ...defaultState.upgrades, ...(parsed.upgrades || {}) },
          plots
        };

        // Offline livestock production recovery
        if (elapsedSeconds >= 3600) {
          const hoursPassed = Math.floor(elapsedSeconds / 3600);
          processLivestockHourlyCycle(mergedState, hoursPassed);
        }

        cachedState = mergedState;
        // Save the updated state with new timestamp
        this.save(mergedState);
        return mergedState;
      }
    } catch (e) {
      console.warn('Failed to load from IndexedDB:', e);
    }

    // Fresh game state for new users (500 gold, no crops planted, plots 0-4 empty, 5 locked)
    const fresh = JSON.parse(JSON.stringify(defaultState));
    cachedState = fresh;
    this.save(fresh);
    return fresh;
  },

  async reset() {
    try {
      await idbClear();
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('farmtap_well_water');
        localStorage.removeItem('ticker_tape_crops_save_v2');
        localStorage.removeItem('ticker_tape_crops_save_v1');
      }
    } catch (e) {
      console.warn('Reset error:', e);
    }
    const fresh = JSON.parse(JSON.stringify(defaultState));
    cachedState = fresh;
    await idbSet(SAVE_KEY, fresh);
    return fresh;
  }
};
