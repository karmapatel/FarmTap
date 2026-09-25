import { audio } from './audio.js';
import { storage } from './storage.js';
import { cropConfigs } from './crops.js';
import { Player } from './player.js';
import { Farm } from './farm.js';
import { Economy } from './economy.js';
import { Market } from './market.js';
import { EventSystem } from './events.js';
import { UIManager } from './ui.js';

// Initialize Game State from IndexedDB
const state = await storage.load();

// Request PWA Persistent Storage to prevent eviction
storage.requestPersistentStorage();

// Lifecycle autosave on app minimize / backgrounding / close
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    storage.save(state);
  }
});
window.addEventListener('pagehide', () => {
  storage.save(state);
});
window.addEventListener('beforeunload', () => {
  storage.save(state);
});

// Initialize Subsystems
const ui = new UIManager();
const player = new Player('playerCharacter', 'playerSpriteInner', 'playerSpeechBubble');

// Ensure wellWater and plot moisture are present on state
if (state.wellWater === undefined || state.wellWater === null) {
  let fallbackWater = 100;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('farmtap_well_water');
      if (stored !== null && stored !== undefined && stored !== '') {
        const num = Number(stored);
        if (Number.isFinite(num)) fallbackWater = Math.max(0, Math.min(100, Math.round(num)));
      }
    } catch (_) {}
  }
  state.wellWater = fallbackWater;
} else {
  state.wellWater = Math.max(0, Math.min(100, Math.round(Number(state.wellWater))));
}

// Hourly Water Cycle Helper using the existing hourly clock
export function applyHourlyWaterCycle(gameState, hoursCount = 1) {
  if (hoursCount <= 0) return;
  // Every real/in-game hour: field moisture -10 (min 0)
  gameState.plots.forEach((p) => {
    if (p.state !== 'locked') {
      const cur = p.moisture !== undefined ? p.moisture : 60;
      p.moisture = Math.max(0, cur - 10 * hoursCount);
    }
  });

  // Well regenerates +10 water every real/in-game hour, capped at 100
  const curWell = gameState.wellWater !== undefined ? gameState.wellWater : 100;
  gameState.wellWater = Math.min(100, curWell + 10 * hoursCount);
}

const farm = new Farm(state.plots, player, (x, y, text, color) => ui.showFloatingText(x, y, text, color));
const economy = new Economy(state.prices, state.costs, state.lastHourKey);
state.lastHourKey = economy.lastHourKey;

// Check if hour changed while offline/closed (using existing hourly clock)
const nowTimestamp = Date.now();
if (economy.checkHourChange(state.activeEvent, state.weather)) {
  state.prices = economy.getPrices();
  state.costs = economy.getCosts();
  state.lastHourKey = economy.lastHourKey;

  // Calculate elapsed hours while closed
  let hoursPassed = 1;
  if (state.lastHourlyUpdateTimestamp) {
    hoursPassed = Math.max(1, Math.floor((nowTimestamp - state.lastHourlyUpdateTimestamp) / 3600000));
  }
  applyHourlyWaterCycle(state, hoursPassed);
  state.lastHourlyUpdateTimestamp = nowTimestamp;
  storage.save(state);
} else if (!state.lastHourlyUpdateTimestamp) {
  state.lastHourlyUpdateTimestamp = nowTimestamp;
  storage.save(state);
}

const events = new EventSystem(state.weather, state.activeEvent);

const market = new Market(
  economy,
  () => state.inventory,
  () => state.gold,
  (newGold) => {
    state.gold = newGold;
    ui.updateGoldDisplays(state.gold);
    storage.save(state);
  },
  (x, y, text, color) => ui.showFloatingText(x, y, text, color),
  (cropId, qty, earned) => {
    ui.updateBarnDisplays(state.inventory, state.barnCapacity);
    ui.updateTicker(economy.renderTickerHTML());
    storage.save(state);
  }
);

// Apply saved mute preference
audio.setMuted(state.muted);
updateMuteIcon();

// Apply tractor speed boost if already owned
if (state.upgrades.fastTractor) {
  player.setTractorBoost(true);
}

// Initial UI Rendering
events.applyWeatherToDOM();
farm.renderAllPlots();
ui.updateGoldDisplays(state.gold);
ui.updateBarnDisplays(state.inventory, state.barnCapacity);
ui.updateClockAndCountdown(economy.getTimeRemaining());
ui.updateSeedModalCards(economy.getCosts(), cropConfigs);
ui.updateTicker(economy.renderTickerHTML());
ui.updateWellDisplay(state.wellWater);
updateUpgradeButtonsUI();

// Register Service Worker for Offline PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.update().catch(() => {});
        console.log('FarmTap SW registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}

/* ==========================================================================
   GLOBAL INTERACTION HANDLERS & WINDOW BINDINGS
   ========================================================================== */

// 1. Walking around farm ground
const farmGround = document.getElementById('farmGround');
if (farmGround) {
  farmGround.addEventListener('click', (e) => {
    const stage = document.getElementById('worldStage');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const scale = rect.width / 500;
    const stageX = (e.clientX - rect.left) / scale;
    const stageY = (e.clientY - rect.top) / scale;
    player.moveTo(stageX - 24, stageY - 45, 'Walking...');
    ui.showFloatingText(stageX, stageY, '👣 Walk', '#fde047');
  });
}

export function getBarnTotalCount(inventory) {
  const validCrops = ['wheat', 'corn', 'tomato', 'potato', 'rice', 'sugarcane'];
  return validCrops.reduce((sum, cropId) => {
    const val = Number(inventory && inventory[cropId]);
    return sum + (Number.isFinite(val) && val > 0 ? Math.floor(val) : 0);
  }, 0);
}

// 2. Plot Interaction
window.onPlotClick = function (plotIdx) {
  const plot = state.plots[plotIdx];
  if (!plot) return;

  const targetX = 145 + (plotIdx % 2) * 85;
  const targetY = 320 + Math.floor(plotIdx / 2) * 85;

  if (plot.state === 'locked') {
    window.promptUnlockPlot(plotIdx);
    return;
  }

  if (plot.state === 'harvesting') {
    // Already in progress, prevent duplicate tap
    return;
  }

  if (plot.state === 'mature') {
    const crop = plot.crop;
    if (!crop || !cropConfigs[crop]) {
      // Clean up corrupt plot
      plot.state = 'empty';
      plot.crop = null;
      farm.renderPlot(plotIdx);
      storage.save(state);
      return;
    }

    // Check barn capacity before harvesting
    const totalStored = getBarnTotalCount(state.inventory);
    if (totalStored >= state.barnCapacity) {
      audio.playError();
      ui.showFloatingText(targetX, targetY - 20, 'Barn is Full! Sell at Market', '#f87171');
      player.speak('Barn is Full!');
      return;
    }

    // Mark plot as harvesting immediately so rapid clicking cannot trigger a duplicate harvest
    plot.state = 'harvesting';
    farm.renderPlot(plotIdx);

    player.moveTo(targetX, targetY, `Harvesting ${crop}!`, () => {
      // Re-verify crop validity
      if (crop && cropConfigs[crop]) {
        state.inventory[crop] = (Math.max(0, Math.floor(Number(state.inventory[crop]) || 0))) + 1;
      }
      
      plot.state = 'empty';
      plot.crop = null;
      plot.progress = 0;
      plot.timer = 0;
      plot.totalTime = 0;
      // Harvesting a crop: field moisture -5
      plot.moisture = Math.max(0, (plot.moisture !== undefined ? plot.moisture : 60) - 5);

      farm.renderPlot(plotIdx);
      ui.updateBarnDisplays(state.inventory, state.barnCapacity);
      audio.playHarvest();
      ui.showFloatingText(targetX + 30, targetY, `+1 ${crop.toUpperCase()} 🧺 (-5% Moisture)`, '#fde047');
      storage.save(state);
    });
  } else if (plot.state === 'empty') {
    state.activeTargetPlot = plotIdx;
    player.moveTo(targetX, targetY, 'Preparing Soil...', () => {
      ui.updateSeedModalCards(economy.getCosts(), cropConfigs);
      ui.updateClockAndCountdown(economy.getTimeRemaining());
      ui.openModal('seedModal');
    });
  } else if (plot.state === 'growing') {
    player.moveTo(targetX, targetY, `Inspecting ${plot.crop}`, () => {
      audio.playStep();
      const secsLeft = Math.max(1, Math.ceil(plot.timer));
      const m = plot.moisture !== undefined ? plot.moisture : 60;
      const mLabel = m >= 60 ? 'Good' : m >= 30 ? 'Slow' : m >= 1 ? 'Very Slow' : 'Paused';
      ui.showFloatingText(targetX + 30, targetY, `${plot.crop.toUpperCase()}: ${Math.round(plot.progress)}% | 💧 ${m}% (${mLabel})`, '#facc15');
    });
  }
};

// 2b. Visual Watering Animation & Function
function triggerWateringAnimation(plotIdx, targetX, targetY) {
  const stage = document.getElementById('worldStage');
  if (!stage) return;

  // 1. Water splash expanding ripple on plot
  const plotEl = document.getElementById(`plot-${plotIdx}`);
  if (plotEl) {
    const splash = document.createElement('div');
    splash.className = 'water-splash-ring';
    plotEl.appendChild(splash);
    setTimeout(() => splash.remove(), 900);
  }

  // 2. Parabolic flying water droplets from Well (x=50, y=110) to Target Plot
  const wellX = 50;
  const wellY = 110;
  const deltaX = targetX - wellX;
  const deltaY = targetY - wellY;

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const drop = document.createElement('div');
      drop.className = 'water-flying-droplet text-sm filter drop-shadow select-none';
      drop.textContent = i % 2 === 0 ? '💧' : '💦';
      drop.style.left = `${wellX + (Math.random() * 12 - 6)}px`;
      drop.style.top = `${wellY + (Math.random() * 12 - 6)}px`;
      drop.style.setProperty('--fly-x', `${deltaX + (Math.random() * 16 - 8)}px`);
      drop.style.setProperty('--fly-y', `${deltaY + (Math.random() * 16 - 8)}px`);
      stage.appendChild(drop);
      setTimeout(() => drop.remove(), 700);
    }, i * 60);
  }
}

// Watering a field consumes 20 well water and adds 25 field moisture (capped at 100)
window.waterPlot = function (plotIdx, triggeredFromWell = false) {
  const plot = state.plots[plotIdx];
  if (!plot || plot.state === 'locked') return;

  const currentWell = state.wellWater !== undefined ? state.wellWater : 100;
  if (currentWell < 20) {
    audio.playError();
    ui.showFloatingText(55, 110, `Well is Low! (${currentWell}/100💧, need 20)`, '#f87171');
    player.speak(`Our well only has ${currentWell} water! Needs 20 water to hydrate a field.`);
    return;
  }

  const currentMoisture = plot.moisture !== undefined ? plot.moisture : 60;
  if (currentMoisture >= 100) {
    audio.playStep();
    const targetX = 145 + (plotIdx % 2) * 85;
    const targetY = 320 + Math.floor(plotIdx / 2) * 85;
    ui.showFloatingText(targetX + 25, targetY, `Field #${plotIdx + 1} is fully moist (100%)!`, '#60a5fa');
    return;
  }

  // Consume 20 well water, add 25 field moisture (capped at 100)
  state.wellWater = Math.max(0, currentWell - 20);
  plot.moisture = Math.min(100, currentMoisture + 25);

  const targetX = 145 + (plotIdx % 2) * 85;
  const targetY = 320 + Math.floor(plotIdx / 2) * 85;

  // Sound and visual animation
  audio.playWaterSplash();
  triggerWateringAnimation(plotIdx, targetX, targetY);

  ui.showFloatingText(targetX + 30, targetY - 10, `+25% Moisture! 💧 (Now ${plot.moisture}%)`, '#38bdf8');
  ui.showFloatingText(55, 110, `-20 Well Water 🪣 (${state.wellWater}/100 left)`, '#93c5fd');

  if (!triggeredFromWell) {
    player.moveTo(targetX, targetY, `Watering Field #${plotIdx + 1}...`, () => {
      player.speak(`Watered Field #${plotIdx + 1}! (${plot.moisture}% moisture)`);
    });
  } else {
    player.speak(`Pumping water to Field #${plotIdx + 1}! (${plot.moisture}% moisture)`);
  }

  farm.renderPlot(plotIdx);
  ui.updateWellDisplay(state.wellWater);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('farmtap_well_water', String(state.wellWater));
    } catch (_) {}
  }
  storage.save(state);
};

// 3. Planting selected crop (Dynamic Cost Pricing)
window.plantSelectedCrop = function (cropType) {
  ui.closeModal('seedModal');
  const plotIdx = state.activeTargetPlot;
  if (plotIdx === null) return;

  const cfg = cropConfigs[cropType];
  if (!cfg) return;

  const dynamicCost = economy.getCost(cropType);

  if (state.gold < dynamicCost) {
    audio.playError();
    ui.showFloatingText(180, 320, 'Not enough Gold!', '#f87171');
    return;
  }

  state.gold -= dynamicCost;
  ui.updateGoldDisplays(state.gold);

  const plot = state.plots[plotIdx];
  plot.state = 'growing';
  plot.crop = cropType;
  plot.totalTime = cfg.time;
  plot.timer = cfg.time;
  plot.progress = 0;
  // Note: plot.moisture is permanently preserved and NOT reset!

  farm.renderPlot(plotIdx);
  audio.playPlant();
  ui.showFloatingText(180, 320, `-$${dynamicCost} Planted ${cfg.name}! 🌱`, '#34d399');
  storage.save(state);
};

// 4. World Objects Interaction
window.interactWith = function (type) {
  switch (type) {
    case 'farmhouse':
      player.moveTo(160, 150, 'Visiting House...', () => {
        ui.openModal('farmhouseModal');
      });
      break;
    case 'barn':
      player.moveTo(80, 380, 'Checking Barn...', () => {
        ui.updateBarnDisplays(state.inventory, state.barnCapacity);
        ui.openModal('barnModal');
      });
      break;
    case 'tractor':
      player.moveTo(50, 460, 'Tuning Tractor!', () => {
        audio.playTractor();
        ui.showFloatingText(70, 470, '🚜 Tractor Engine Ready!', '#34d399');
      });
      break;
    case 'watertank':
      player.moveTo(45, 120, 'At the Well...', () => {
        const currentWell = state.wellWater !== undefined ? state.wellWater : 100;

        // Check if well has enough water
        if (currentWell < 20) {
          audio.playError();
          ui.showFloatingText(55, 110, `Well is Low! (${currentWell}/100💧)`, '#f87171');
          player.speak(`The well only has ${currentWell} water. It recovers +10 water every hour.`);
          return;
        }

        // Find the driest unlocked field to water
        const unlockedPlots = state.plots
          .map((p, idx) => ({ plot: p, idx }))
          .filter(item => item.plot && item.plot.state !== 'locked');

        if (unlockedPlots.length === 0) return;

        // Sort by moisture ascending (lowest moisture first)
        unlockedPlots.sort((a, b) => (a.plot.moisture ?? 60) - (b.plot.moisture ?? 60));
        const driest = unlockedPlots[0];
        const driestMoisture = driest.plot.moisture ?? 60;

        if (driestMoisture >= 100) {
          audio.playStep();
          ui.showFloatingText(55, 110, `All Fields Moist! (${currentWell}/100💧)`, '#38bdf8');
          player.speak(`All fields are fully saturated at 100% moisture! Well water: ${currentWell}/100.`);
          return;
        }

        // Water the driest field
        window.waterPlot(driest.idx, true);
      });
      break;
  }
};

// 5. Travel between Farm and Town Market
window.switchScene = function (sceneName) {
  const marketScene = document.getElementById('marketScene');
  if (!marketScene) return;

  if (sceneName === 'market') {
    player.moveTo(310, 260, 'Walking to Market...', () => {
      marketScene.classList.remove('hidden');
      market.updateMarketUI(events.getEvent());
    });
  } else {
    marketScene.classList.add('hidden');
    player.moveTo(230, 310, 'Back at Farm!');
  }
};

// 6. Market Selling
window.sellCrop = function (cropId, amount) {
  market.sell(cropId, amount);
};

window.sellAllCrops = function () {
  market.sellAllCrops();
};

window.sellAllCropsFromBarn = function () {
  market.sellAllCrops();
  ui.updateBarnDisplays(state.inventory, state.barnCapacity);
};

window.highlightBuyer = function (cropId) {
  market.highlightBuyer(cropId);
};

// 7. Weather Cycle
window.cycleWeather = function () {
  const newWeather = events.cycleWeather();
  state.weather = newWeather;
  ui.showFloatingText(180, 80, `Weather: ${newWeather.replace('_', ' ').toUpperCase()}!`, '#93c5fd');
  audio.playStep();
  storage.save(state);
};

// 8. Field Unlocks & Farmhouse Upgrades
const UNLOCK_PLOT_COST = 2000;

window.promptUnlockPlot = function (plotIdx) {
  const targetX = 145 + (plotIdx % 2) * 85;
  const targetY = 320 + Math.floor(plotIdx / 2) * 85;

  player.moveTo(targetX, targetY, 'Examining Locked Field...', () => {
    const modal = document.getElementById('unlockPlotModal');
    const balEl = document.getElementById('unlockModalCurrentCoins');
    const msgEl = document.getElementById('unlockFieldMsg');
    const btnConfirm = document.getElementById('btnConfirmUnlockPlot');

    if (balEl) balEl.textContent = `$${state.gold}`;

    if (state.gold < UNLOCK_PLOT_COST) {
      if (msgEl) {
        msgEl.textContent = `You need $${UNLOCK_PLOT_COST - state.gold} more coins to unlock this field!`;
        msgEl.classList.remove('hidden');
      }
      if (btnConfirm) {
        btnConfirm.textContent = `Need $${UNLOCK_PLOT_COST} Coins`;
        btnConfirm.className = 'flex-1 bg-stone-700 text-stone-400 font-bold py-2 rounded-xl text-xs border border-stone-600 cursor-not-allowed';
        btnConfirm.disabled = true;
      }
    } else {
      if (msgEl) {
        msgEl.classList.add('hidden');
      }
      if (btnConfirm) {
        btnConfirm.textContent = `Unlock ($${UNLOCK_PLOT_COST})`;
        btnConfirm.className = 'btn-tactile flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs border border-emerald-400 shadow';
        btnConfirm.disabled = false;
      }
    }

    if (modal) {
      ui.openModal('unlockPlotModal');
    } else {
      window.confirmUnlockPlot(plotIdx);
    }
  });
};

window.confirmUnlockPlot = function (plotId) {
  const targetX = 145 + (plotId % 2) * 85;
  const targetY = 320 + Math.floor(plotId / 2) * 85;

  if (state.gold < UNLOCK_PLOT_COST) {
    audio.playError();
    ui.showFloatingText(targetX + 30, targetY, `Need $${UNLOCK_PLOT_COST} coins! (Have $${state.gold})`, '#f87171');
    player.speak(`I need ${UNLOCK_PLOT_COST} coins to unlock this field!`);
    return;
  }

  state.gold -= UNLOCK_PLOT_COST;
  state.plots[plotId] = { id: plotId, state: 'empty', crop: null, progress: 0, timer: 0, moisture: 60 };
  state.upgrades.unlockedPlots = Math.max(state.upgrades.unlockedPlots, plotId + 1);

  farm.renderPlot(plotId);
  ui.updateGoldDisplays(state.gold);
  updateUpgradeButtonsUI();
  ui.closeModal('unlockPlotModal');
  ui.closeModal('farmhouseModal');
  audio.playUpgrade();
  ui.showFloatingText(targetX + 30, targetY, `Plot #${plotId + 1} Cleared for Planting! 🌾 (60% Moisture)`, '#34d399');
  player.speak(`Field #${plotId + 1} is cleared and ready to plant!`);
  storage.save(state);
};

window.buyPlotUpgrade = function (plotId) {
  window.confirmUnlockPlot(plotId);
};

window.buyBarnUpgrade = function () {
  if (state.gold < 220) {
    audio.playError();
    ui.showFloatingText(180, 200, 'Need $220!', '#f87171');
    return;
  }

  state.gold -= 220;
  state.barnCapacity += 20;
  ui.updateGoldDisplays(state.gold);
  ui.updateBarnDisplays(state.inventory, state.barnCapacity);
  updateUpgradeButtonsUI();
  ui.closeModal('farmhouseModal');
  audio.playUpgrade();
  ui.showFloatingText(80, 380, `Barn Capacity Expanded to ${state.barnCapacity}! 📦`, '#34d399');
  storage.save(state);
};

window.buyWellUpgrade = function () {
  if (state.gold < 300) {
    audio.playError();
    ui.showFloatingText(180, 200, 'Need $300!', '#f87171');
    return;
  }

  state.gold -= 300;
  state.upgrades.autoIrrigation = true;
  state.wellWater = 100;
  ui.updateWellDisplay(state.wellWater);
  ui.updateGoldDisplays(state.gold);
  updateUpgradeButtonsUI();
  ui.closeModal('farmhouseModal');
  audio.playUpgrade();
  ui.showFloatingText(50, 100, 'Irrigation Online & Well Refilled! 💧', '#38bdf8');
  storage.save(state);
};

window.buyTractorUpgrade = function () {
  if (state.gold < 450) {
    audio.playError();
    ui.showFloatingText(180, 200, 'Need $450!', '#f87171');
    return;
  }

  state.gold -= 450;
  state.upgrades.fastTractor = true;
  player.setTractorBoost(true);
  ui.updateGoldDisplays(state.gold);
  updateUpgradeButtonsUI();
  ui.closeModal('farmhouseModal');
  audio.playUpgrade();
  ui.showFloatingText(60, 480, 'Tractor Turbo Tuned! 🚜💨', '#10b981');
  storage.save(state);
};

function updateUpgradeButtonsUI() {
  const btnPlot = document.getElementById('btnUpgradePlot');
  if (btnPlot) {
    if (state.plots[5] && state.plots[5].state !== 'locked') {
      btnPlot.disabled = true;
      btnPlot.textContent = 'OWNED';
      btnPlot.className = 'bg-stone-700 text-stone-300 font-bold text-xs px-3 py-1.5 rounded-lg';
    }
  }

  const btnWater = document.getElementById('btnUpgradeWater');
  if (btnWater) {
    if (state.upgrades.autoIrrigation) {
      btnWater.disabled = true;
      btnWater.textContent = 'INSTALLED';
      btnWater.className = 'bg-stone-700 text-stone-300 font-bold text-xs px-3 py-1.5 rounded-lg';
    }
  }

  const btnTractor = document.getElementById('btnUpgradeTractor');
  if (btnTractor) {
    if (state.upgrades.fastTractor) {
      btnTractor.disabled = true;
      btnTractor.textContent = 'TUNED';
      btnTractor.className = 'bg-stone-700 text-stone-300 font-bold text-xs px-3 py-1.5 rounded-lg';
    }
  }

  const unlockedCountEl = document.getElementById('unlockedPlotsCount');
  if (unlockedCountEl) {
    const activePlots = state.plots.filter(p => p.state !== 'locked').length;
    unlockedCountEl.textContent = activePlots;
  }
}

// 9. Sound toggle
window.toggleSound = function () {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  updateMuteIcon();
  storage.save(state);
};

function updateMuteIcon() {
  const icon = document.getElementById('soundIconDisplay');
  if (icon) {
    icon.textContent = state.muted ? '🔇' : '🔊';
  }
}

// 10. Modal controls
window.openModal = (id) => ui.openModal(id);
window.closeModal = (id) => ui.closeModal(id);

// 11. Reset game state
window.resetGameState = async function () {
  if (confirm('Start a fresh season? Progress will be reset.')) {
    await storage.reset();
    window.location.reload();
  }
};

// 12. Update prices for all crops every hour (or manual refresh button)
window.triggerHourlyPriceShift = function () {
  economy.updateHourlyPrices(events.getEvent(), state.weather);
  state.prices = economy.getPrices();
  state.costs = economy.getCosts();
  state.lastHourKey = economy.lastHourKey;
  state.lastHourlyUpdateTimestamp = Date.now();

  // Hourly water cycle: each field -10 moisture, well +10 water
  applyHourlyWaterCycle(state, 1);
  farm.renderAllPlots();
  ui.updateWellDisplay(state.wellWater);

  // Town bell chime
  audio.playBell();

  // Floating notification and character speech
  ui.showFloatingText(
    Math.max(20, window.innerWidth / 2 - 120),
    80,
    '🔔 Hourly Shift: Well +10💧 | Fields -10% Moisture',
    '#38bdf8'
  );
  player.speak('New hour! Well recovered +10 water, fields lost 10% moisture.');

  const timeInfo = economy.getTimeRemaining();
  ui.updateClockAndCountdown(timeInfo);
  ui.updateSeedModalCards(state.costs, cropConfigs);
  ui.updateTicker(economy.renderTickerHTML());

  const marketScene = document.getElementById('marketScene');
  if (marketScene && !marketScene.classList.contains('hidden')) {
    market.updateMarketUI(events.getEvent());
  }

  storage.save(state);
};

/* ==========================================================================
   COUNTDOWN & HOURLY PRICE CHANGE RUNNER
   ========================================================================== */
setInterval(() => {
  // Check if real clock rolled over to a new hour
  const hourChanged = economy.checkHourChange(events.getEvent(), state.weather);

  if (hourChanged) {
    state.prices = economy.getPrices();
    state.costs = economy.getCosts();
    state.lastHourKey = economy.lastHourKey;
    state.lastHourlyUpdateTimestamp = Date.now();

    // Hourly water cycle: each field -10 moisture, well +10 water
    applyHourlyWaterCycle(state, 1);
    farm.renderAllPlots();
    ui.updateWellDisplay(state.wellWater);

    audio.playBell();
    ui.showFloatingText(
      Math.max(20, window.innerWidth / 2 - 120),
      80,
      '🔔 Hourly Shift: Well +10💧 | Fields -10% Moisture',
      '#38bdf8'
    );
    player.speak('A new hour has arrived! Well gained +10 water, fields lost 10% moisture.');
    ui.updateSeedModalCards(state.costs, cropConfigs);
    ui.updateTicker(economy.renderTickerHTML());
    storage.save(state);
  }

  // Live update countdown displays in header, seed modal, market screen, and ticker smoothly
  const timeInfo = economy.getTimeRemaining();
  ui.updateClockAndCountdown(timeInfo);

  const marketScene = document.getElementById('marketScene');
  if (marketScene && !marketScene.classList.contains('hidden')) {
    market.updateMarketUI(events.getEvent());
  }
}, 1000);

/* ==========================================================================
   GAME SIMULATION LOOP (Ticks every 1 second)
   ========================================================================== */
setInterval(() => {
  // Advance crop growth smoothly by 1 second
  const anyChanged = farm.tickGrowth(state.weather, state.upgrades.autoIrrigation, 1);

  // Save state if crop stages changed
  if (anyChanged) {
    storage.save(state);
  }
}, 1000);

// Cycle dynamic market events every 60 seconds
setInterval(() => {
  const newEvent = events.cycleEvent();
  state.activeEvent = newEvent;
  ui.showFloatingText(window.innerWidth / 2 - 80, 80, `${newEvent.icon} Event: ${newEvent.title}!`, '#f472b6');
  storage.save(state);
}, 60000);

// Auto-save every 8 seconds
setInterval(() => {
  storage.save(state);
}, 8000);
