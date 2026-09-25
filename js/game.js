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
const farm = new Farm(state.plots, player, (x, y, text, color) => ui.showFloatingText(x, y, text, color));
const economy = new Economy(state.prices, state.costs, state.lastHourKey);
// Check if hour changed while offline/closed
if (economy.checkHourChange(state.activeEvent, state.weather)) {
  state.prices = economy.getPrices();
  state.costs = economy.getCosts();
  state.lastHourKey = economy.lastHourKey;
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
updateUpgradeButtonsUI();

// Register Service Worker for Offline PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
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
    window.interactWith('farmhouse');
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

      farm.renderPlot(plotIdx);
      ui.updateBarnDisplays(state.inventory, state.barnCapacity);
      audio.playHarvest();
      ui.showFloatingText(targetX + 30, targetY, `+1 ${crop.toUpperCase()} 🧺`, '#fde047');
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
      ui.showFloatingText(targetX + 30, targetY, `${plot.crop.toUpperCase()}: ${Math.round(plot.progress)}% (${secsLeft}s left)`, '#facc15');
    });
  }
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
      player.moveTo(45, 120, 'Inspecting Well...', () => {
        audio.playCoin();
        ui.showFloatingText(55, 110, '💧 Fresh Water Boost!', '#60a5fa');
        // Boost growing plots: accelerates timer and progress in lockstep
        state.plots.forEach((p, idx) => {
          if (p.state === 'growing') {
            const totalTime = p.totalTime || cropConfigs[p.crop]?.time || 12;
            const boostSecs = totalTime * 0.25;
            p.timer = Math.max(0, p.timer - boostSecs);
            p.progress = Math.min(100, Math.max(0, ((totalTime - p.timer) / totalTime) * 100));
            if (p.timer <= 0) {
              p.state = 'mature';
              p.progress = 100;
              p.timer = 0;
            }
            farm.renderPlot(idx);
          }
        });
        storage.save(state);
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

// 8. Farmhouse Upgrades
window.buyPlotUpgrade = function (plotId) {
  const cost = plotId === 5 ? 150 : 250;
  if (state.gold < cost) {
    audio.playError();
    ui.showFloatingText(180, 200, `Need $${cost}!`, '#f87171');
    return;
  }

  state.gold -= cost;
  state.plots[plotId] = { id: plotId, state: 'empty', crop: null, progress: 0, timer: 0 };
  state.upgrades.unlockedPlots = Math.max(state.upgrades.unlockedPlots, plotId + 1);

  farm.renderPlot(plotId);
  ui.updateGoldDisplays(state.gold);
  updateUpgradeButtonsUI();
  ui.closeModal('farmhouseModal');
  audio.playUpgrade();
  ui.showFloatingText(200, 350, `Plot #${plotId + 1} Cleared for Planting! 🌾`, '#34d399');
  storage.save(state);
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
  const wellBadge = document.getElementById('waterStockPct');
  if (wellBadge) wellBadge.textContent = '100%';
  ui.updateGoldDisplays(state.gold);
  updateUpgradeButtonsUI();
  ui.closeModal('farmhouseModal');
  audio.playUpgrade();
  ui.showFloatingText(50, 100, 'Irrigation System Online! 💧', '#38bdf8');
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

  // Town bell chime
  audio.playBell();

  // Floating notification and character speech
  ui.showFloatingText(
    Math.max(20, window.innerWidth / 2 - 120),
    80,
    '🔔 Hourly Price Change: New Crop Prices!',
    '#facc15'
  );
  player.speak('New hourly crop prices are here!');

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
    audio.playBell();
    ui.showFloatingText(
      Math.max(20, window.innerWidth / 2 - 120),
      80,
      '🔔 New Hourly Prices Are In!',
      '#facc15'
    );
    player.speak('Prices changed for the new hour!');
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
