import { renderChickenSprite, renderCowSprite, HOUSING_CONFIGS } from './animals.js';

// UI Manager for Modals, Ticker Tape, Overlays, and PWA Install Prompts
export class UIManager {
  constructor() {
    this.deferredPrompt = null;
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    this.isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    this.currentScale = 1;
    this.setupViewportScaling();
    this.setupInstallPrompt();
    this.setupNetworkStatus();
    this.setupPullToRefresh();
  }

  // Calculate and update the dynamic scale factor so worldStage fits horizontally and scrolls smoothly
  setupViewportScaling() {
    const updateScale = () => {
      const stage = document.getElementById('worldStage');
      const stageContainer = document.getElementById('worldStageContainer');
      const topHud = document.getElementById('topHudOverlay');
      if (!stage) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Reserve space for top HUD
      const hudHeight = topHud ? topHud.offsetHeight : 86;
      document.documentElement.style.setProperty('--hud-height', `${hudHeight}px`);

      // On mobile / narrow screens, scale worldStage by width so it fits horizontally with side padding
      const availableWidth = viewportWidth * 0.96;
      const scaleByWidth = availableWidth / 500;

      let targetScale = scaleByWidth;
      // On desktop / wide displays, if screen is very tall, fit gracefully
      if (viewportWidth > 640) {
        const availableHeight = Math.max(300, viewportHeight - hudHeight - 40);
        const scaleByHeight = availableHeight / 1040;
        targetScale = Math.min(scaleByWidth, Math.max(0.70, scaleByHeight));
      }

      this.currentScale = Math.max(0.55, Math.min(1.25, targetScale));
      stage.style.setProperty('--stage-scale', this.currentScale.toFixed(3));

      // Set container height so the user can smoothly drag/scroll up and down across the entire farm
      if (stageContainer) {
        const scaledHeight = Math.round(1040 * this.currentScale);
        stageContainer.style.height = `${scaledHeight + hudHeight + 50}px`;
      }
    };

    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    updateScale();
    requestAnimationFrame(updateScale);
    setTimeout(updateScale, 150);
  }

  showFloatingText(x, y, text, color = '#fde047') {
    let screenX = x;
    let screenY = y;
    const marketScene = document.getElementById('marketScene');
    const isMarketVisible = marketScene && !marketScene.classList.contains('hidden');

    if (isMarketVisible) {
      screenX = window.innerWidth / 2 - 70;
      screenY = 170;
    } else {
      const stage = document.getElementById('worldStage');
      if (stage && x <= 500 && y <= 1100) {
        const rect = stage.getBoundingClientRect();
        const scale = rect.width / 500;
        screenX = rect.left + x * scale;
        screenY = rect.top + y * scale;
      }
    }

    const el = document.createElement('div');
    el.className = 'fixed z-[9999] font-bold text-xs sm:text-sm float-feedback drop-shadow-lg pointer-events-none select-none font-brand bg-black/70 px-2.5 py-1 rounded-full border border-amber-400/80';
    el.style.left = `${Math.max(10, Math.min(window.innerWidth - 180, screenX))}px`;
    el.style.top = `${Math.max(40, screenY)}px`;
    el.style.color = color;
    el.textContent = text;
    
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden-modal');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden-modal');
    }
  }

  updateGoldDisplays(gold) {
    const safeGold = Math.max(0, Math.floor(Number(gold) || 0));
    const mainDisp = document.getElementById('playerGoldDisplay');
    const marketDisp = document.getElementById('marketCoinDisplay');
    const coopGoldDisp = document.getElementById('modalCoopPlayerGold');
    const barnGoldDisp = document.getElementById('modalBarnPlayerGold');
    const plotBalanceDisp = document.getElementById('modalPlotBalance');
    if (mainDisp) mainDisp.textContent = `$${safeGold}`;
    if (marketDisp) marketDisp.textContent = `$${safeGold}`;
    if (coopGoldDisp) coopGoldDisp.textContent = `$${safeGold}`;
    if (barnGoldDisp) barnGoldDisp.textContent = `$${safeGold}`;
    if (plotBalanceDisp) plotBalanceDisp.textContent = `$${safeGold}`;
  }

  updateWellDisplay(wellWater) {
    const safeWater = Math.max(0, Math.min(100, Math.round(Number(wellWater) || 0)));
    const stockEl = document.getElementById('waterStockPct');
    if (stockEl) {
      stockEl.textContent = `${safeWater}%`;
    }
    const wellBadge = stockEl ? stockEl.closest('div') : null;
    if (wellBadge) {
      if (safeWater < 20) {
        wellBadge.className = 'absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-950 border border-amber-400 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-amber-200 shadow animate-pulse';
        wellBadge.innerHTML = `💧 WELL (<span id="waterStockPct">${safeWater}%</span> LOW)`;
      } else {
        wellBadge.className = 'absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-950 border border-blue-400 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-blue-200 shadow';
        wellBadge.innerHTML = `💧 WELL (<span id="waterStockPct">${safeWater}%</span>)`;
      }
    }
    const bar = document.getElementById('waterLevelBar');
    if (bar) {
      const maxH = 13;
      const h = Math.max(1, (safeWater / 100) * maxH);
      const y = 30 + (maxH - h);
      bar.setAttribute('height', h.toFixed(1));
      bar.setAttribute('y', y.toFixed(1));
      bar.setAttribute('fill', safeWater < 20 ? '#f87171' : '#60a5fa');
    }
  }

  // Update Price Change Countdown Displays
  updateClockAndCountdown(timeInfo) {
    const headerCountdownEl = document.getElementById('headerPriceCountdown');
    const seedModalTimerEl = document.getElementById('seedModalTimer');
    const marketTimerEl = document.getElementById('marketCountdownLarge');
    const marketProgressEl = document.getElementById('marketCountdownProgress');

    if (headerCountdownEl) {
      headerCountdownEl.textContent = timeInfo.formatted;
    }
    if (seedModalTimerEl) {
      seedModalTimerEl.textContent = timeInfo.formatted;
    }
    if (marketTimerEl) {
      marketTimerEl.textContent = timeInfo.formatted;
    }
    if (marketProgressEl) {
      marketProgressEl.style.width = `${timeInfo.percentRemaining}%`;
    }

    // Update countdown timers in the marquee without resetting the animation
    const tickerCountdowns = document.querySelectorAll('.ticker-countdown');
    tickerCountdowns.forEach((el) => {
      if (el.textContent !== timeInfo.formatted) {
        el.textContent = timeInfo.formatted;
      }
    });
  }

  // Update Seed Selector Cards with Dynamic Costs and Discount Badges
  updateSeedModalCards(costs, cropConfigs) {
    Object.keys(cropConfigs).forEach((cropId) => {
      const cfg = cropConfigs[cropId];
      const cost = costs[cropId] || cfg.baseCost;
      const costEl = document.getElementById(`seed-cost-${cropId}`);
      const badgeEl = document.getElementById(`seed-badge-${cropId}`);

      if (costEl) {
        costEl.textContent = `Cost $${cost}`;
      }

      if (badgeEl) {
        const diff = cost - cfg.baseCost;
        if (diff < 0) {
          const pct = Math.round((Math.abs(diff) / cfg.baseCost) * 100);
          badgeEl.className = 'text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse';
          badgeEl.textContent = `-${pct}% SALE`;
        } else if (diff > 0) {
          const pct = Math.round((diff / cfg.baseCost) * 100);
          badgeEl.className = 'text-[8px] bg-amber-700 text-amber-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider';
          badgeEl.textContent = `+${pct}% HIGH`;
        } else {
          badgeEl.className = 'text-[8px] bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider';
          badgeEl.textContent = 'NORMAL';
        }
      }
    });
  }

  updateBarnDisplays(inventory, capacity) {
    const validItems = ['wheat', 'corn', 'tomato', 'potato', 'rice', 'sugarcane', 'eggs', 'milk'];

    // Purge any invalid or ghost keys from the inventory object
    if (inventory && typeof inventory === 'object') {
      Object.keys(inventory).forEach((key) => {
        if (!validItems.includes(key)) {
          delete inventory[key];
        } else {
          const num = Number(inventory[key]);
          inventory[key] = Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
        }
      });
    }

    const totalCount = validItems.reduce((sum, itemId) => {
      const val = inventory ? inventory[itemId] : 0;
      return sum + (val > 0 ? val : 0);
    }, 0);

    const stockNum = document.getElementById('barnStockNum');
    const capNum = document.getElementById('barnCapNum');
    if (stockNum) stockNum.textContent = totalCount;
    if (capNum) capNum.textContent = capacity;

    const headerCount = document.getElementById('headerBarnCount');
    const headerCap = document.getElementById('headerBarnCap');
    if (headerCount) headerCount.textContent = totalCount;
    if (headerCap) headerCap.textContent = capacity;

    const modalCount = document.getElementById('modalBarnCount');
    const modalCap = document.getElementById('modalBarnCap');
    if (modalCount) modalCount.textContent = totalCount;
    if (modalCap) modalCap.textContent = capacity;

    validItems.forEach((itemId) => {
      const invEl = document.getElementById(`barnInv-${itemId}`);
      if (invEl) invEl.textContent = (inventory && inventory[itemId]) ? inventory[itemId] : 0;
    });

    // Update physical crate stack count next to Barn
    const cratesCluster = document.getElementById('barnCratesCluster');
    if (cratesCluster) {
      let crateIcons = [];
      if (inventory && inventory.wheat > 0) crateIcons.push('🌾');
      if (inventory && inventory.corn > 0) crateIcons.push('🌽');
      if (inventory && inventory.tomato > 0) crateIcons.push('🍅');
      if (inventory && inventory.potato > 0) crateIcons.push('🥔');
      if (inventory && inventory.rice > 0) crateIcons.push('🍚');
      if (inventory && inventory.sugarcane > 0) crateIcons.push('🎋');
      if (inventory && inventory.eggs > 0) crateIcons.push('🥚');
      if (inventory && inventory.milk > 0) crateIcons.push('🥛');

      cratesCluster.innerHTML = crateIcons.slice(0, 5).map(ic => 
        `<div class="w-5 h-5 bg-amber-800 border border-amber-950 rounded-sm shadow text-[10px] flex items-center justify-center">${ic}</div>`
      ).join('');
    }
  }

  updateTicker(htmlContent) {
    const track1 = document.getElementById('tickerPart1');
    const track2 = document.getElementById('tickerPart2');

    if (track1 && track2) {
      if (track1.innerHTML !== htmlContent) {
        track1.innerHTML = htmlContent;
        track2.innerHTML = htmlContent;
      }
    } else {
      const tickerInner = document.getElementById('tickerContent');
      if (tickerInner) {
        tickerInner.innerHTML = `
          <div id="tickerMarqueeTrack" class="ticker-track">
            <div id="tickerPart1" class="ticker-content">${htmlContent}</div>
            <div id="tickerPart2" class="ticker-content" aria-hidden="true">${htmlContent}</div>
          </div>
        `;
      }
    }

    const topHud = document.getElementById('topHudOverlay');
    if (topHud && topHud.offsetHeight > 0) {
      document.documentElement.style.setProperty('--hud-height', `${topHud.offsetHeight}px`);
    }
  }

  updateLivestockUI(state) {
    if (!state) return;

    const housing = state.housing || { coop: { owned: false }, livestockBarn: { owned: false } };
    const animals = state.animals || { chickens: [], cows: [] };
    const feed = state.feedInventory || { chickenFeed: 0, cowFeed: 0 };

    // 1. CHICKEN COOP
    const coopStatusText = document.getElementById('coopStatusText');
    const coopRoamPen = document.getElementById('coopRoamPen');
    const eggCollectBadge = document.getElementById('eggCollectBadge');
    const eggCountText = document.getElementById('eggCountText');
    const coopUnownedPanel = document.getElementById('coopUnownedPanel');
    const coopOwnedPanel = document.getElementById('coopOwnedPanel');

    const totalChickens = Array.isArray(animals.chickens) ? animals.chickens.length : 0;
    const totalEggs = Array.isArray(animals.chickens) ? animals.chickens.reduce((sum, c) => sum + (c.uncollected || 0), 0) : 0;

    if (housing.coop && housing.coop.owned) {
      if (coopStatusText) coopStatusText.textContent = `(${totalChickens}/4 Hens)`;
      if (coopUnownedPanel) coopUnownedPanel.classList.add('hidden');
      if (coopOwnedPanel) coopOwnedPanel.classList.remove('hidden');

      if (totalEggs > 0 && eggCollectBadge && eggCountText) {
        eggCountText.textContent = `${totalEggs} EGG${totalEggs > 1 ? 'S' : ''}`;
        eggCollectBadge.classList.remove('hidden');
      } else if (eggCollectBadge) {
        eggCollectBadge.classList.add('hidden');
      }

      // Render roaming chicken sprites
      if (coopRoamPen) {
        let chickensHTML = '';
        animals.chickens.forEach((chicken, idx) => {
          // Spread coordinates within coop open roaming yard (never hidden by building)
          const defaultX = 90 + (idx % 2) * 35;
          const defaultY = 40 + Math.floor(idx / 2) * 32;

          chickensHTML += `
            <div id="chicken-anim-${idx}" class="absolute transition-all duration-1000 ease-in-out pointer-events-auto" style="left: ${defaultX}px; top: ${defaultY}px;" onclick="event.stopPropagation(); interactWith('coop');">
              ${renderChickenSprite(chicken)}
            </div>
          `;
        });
        coopRoamPen.innerHTML = chickensHTML;
      }
    } else {
      if (coopStatusText) coopStatusText.textContent = '(Build $1,200)';
      if (coopUnownedPanel) coopUnownedPanel.classList.remove('hidden');
      if (coopOwnedPanel) coopOwnedPanel.classList.add('hidden');
      if (eggCollectBadge) eggCollectBadge.classList.add('hidden');
      if (coopRoamPen) coopRoamPen.innerHTML = '';
    }

    // Update Coop Modal Stats
    const modalChickens = document.getElementById('modalCoopChickens');
    const modalGrainFeed = document.getElementById('modalGrainFeed');
    const modalEggs = document.getElementById('modalUncollectedEggs');
    const coopCareStatus = document.getElementById('coopCareStatus');

    if (modalChickens) modalChickens.textContent = `${totalChickens}/4`;
    if (modalGrainFeed) modalGrainFeed.textContent = `${feed.chickenFeed || 0} Meals`;
    if (modalEggs) modalEggs.textContent = `${totalEggs} Eggs`;

    if (coopCareStatus) {
      if (totalChickens === 0) {
        coopCareStatus.textContent = 'No Hens Owned';
        coopCareStatus.className = 'font-pixel text-[10px] text-amber-300';
      } else {
        const avgHunger = animals.chickens.reduce((sum, c) => sum + (c.hunger || 0), 0) / totalChickens;
        if (avgHunger < 30) {
          coopCareStatus.textContent = '🌾 Hungry (Needs Feed)';
          coopCareStatus.className = 'font-pixel text-[10px] text-rose-400 animate-pulse';
        } else {
          coopCareStatus.textContent = 'Happy & Well Fed';
          coopCareStatus.className = 'font-pixel text-[10px] text-emerald-400';
        }
      }
    }

    // 2. LIVESTOCK BARN & COWS
    const livestockStatusText = document.getElementById('livestockStatusText');
    const cowRoamPen = document.getElementById('cowRoamPen');
    const milkCollectBadge = document.getElementById('milkCollectBadge');
    const milkCountText = document.getElementById('milkCountText');
    const livestockUnownedPanel = document.getElementById('livestockUnownedPanel');
    const livestockOwnedPanel = document.getElementById('livestockOwnedPanel');

    const totalCows = Array.isArray(animals.cows) ? animals.cows.length : 0;
    const totalMilk = Array.isArray(animals.cows) ? animals.cows.reduce((sum, c) => sum + (c.uncollected || 0), 0) : 0;

    if (housing.livestockBarn && housing.livestockBarn.owned) {
      if (livestockStatusText) livestockStatusText.textContent = `(${totalCows}/3 Cows)`;
      if (livestockUnownedPanel) livestockUnownedPanel.classList.add('hidden');
      if (livestockOwnedPanel) livestockOwnedPanel.classList.remove('hidden');

      if (totalMilk > 0 && milkCollectBadge && milkCountText) {
        milkCountText.textContent = `${totalMilk} MILK`;
        milkCollectBadge.classList.remove('hidden');
      } else if (milkCollectBadge) {
        milkCollectBadge.classList.add('hidden');
      }

      // Render roaming cow sprites
      if (cowRoamPen) {
        let cowsHTML = '';
        animals.cows.forEach((cow, idx) => {
          const defaultX = 145 + (idx % 2) * 125;
          const defaultY = 50 + Math.floor(idx / 2) * 65;

          cowsHTML += `
            <div id="cow-anim-${idx}" class="absolute transition-all duration-1000 ease-in-out pointer-events-auto" style="left: ${defaultX}px; top: ${defaultY}px;" onclick="event.stopPropagation(); interactWith('livestockBarn');">
              ${renderCowSprite(cow)}
            </div>
          `;
        });
        cowRoamPen.innerHTML = cowsHTML;
      }
    } else {
      if (livestockStatusText) livestockStatusText.textContent = '(Build $3,000)';
      if (livestockUnownedPanel) livestockUnownedPanel.classList.remove('hidden');
      if (livestockOwnedPanel) livestockOwnedPanel.classList.add('hidden');
      if (milkCollectBadge) milkCollectBadge.classList.add('hidden');
      if (cowRoamPen) cowRoamPen.innerHTML = '';
    }

    // Update Livestock Barn Modal Stats
    const modalCows = document.getElementById('modalBarnCows');
    const modalHayFeed = document.getElementById('modalHayFeed');
    const modalMilk = document.getElementById('modalUncollectedMilk');
    const livestockCareStatus = document.getElementById('livestockCareStatus');

    if (modalCows) modalCows.textContent = `${totalCows}/3`;
    if (modalHayFeed) modalHayFeed.textContent = `${feed.cowFeed || 0} Meals`;
    if (modalMilk) modalMilk.textContent = `${totalMilk} Milk`;

    if (livestockCareStatus) {
      if (totalCows === 0) {
        livestockCareStatus.textContent = 'No Cows Owned';
        livestockCareStatus.className = 'font-pixel text-[10px] text-amber-300';
      } else {
        const avgHunger = animals.cows.reduce((sum, c) => sum + (c.hunger || 0), 0) / totalCows;
        if (avgHunger < 30) {
          livestockCareStatus.textContent = '🌾 Hungry (Needs Hay)';
          livestockCareStatus.className = 'font-pixel text-[10px] text-rose-400 animate-pulse';
        } else {
          livestockCareStatus.textContent = 'Happy & Well Fed';
          livestockCareStatus.className = 'font-pixel text-[10px] text-emerald-400';
        }
      }
    }

    // Market Buy Buttons disabled states check
    const btnCoop = document.getElementById('btnMarketBuyCoop');
    if (btnCoop && housing.coop && housing.coop.owned) {
      btnCoop.textContent = 'COOP BUILT ✓';
      btnCoop.disabled = true;
      btnCoop.className = 'btn-tactile mt-2 w-full bg-stone-700 text-stone-400 font-bold py-1.5 rounded-lg text-xs cursor-not-allowed border border-stone-600';
    }

    const btnChicken = document.getElementById('btnMarketBuyChicken');
    if (btnChicken) {
      if (totalChickens >= 4) {
        btnChicken.textContent = 'COOP FULL (4/4 HENS)';
        btnChicken.disabled = true;
        btnChicken.className = 'btn-tactile mt-2 w-full bg-stone-700 text-stone-400 font-bold py-1.5 rounded-lg text-xs cursor-not-allowed border border-stone-600';
      } else {
        btnChicken.textContent = `BUY HEN ($800) • (${totalChickens}/4)`;
        btnChicken.disabled = false;
        btnChicken.className = 'btn-tactile mt-2 w-full bg-yellow-600 hover:bg-yellow-500 text-amber-950 font-bold py-1.5 rounded-lg text-xs border border-yellow-300 shadow';
      }
    }

    const btnBarn = document.getElementById('btnMarketBuyLivestockBarn');
    if (btnBarn && housing.livestockBarn && housing.livestockBarn.owned) {
      btnBarn.textContent = 'BARN BUILT ✓';
      btnBarn.disabled = true;
      btnBarn.className = 'btn-tactile mt-2 w-full bg-stone-700 text-stone-400 font-bold py-1.5 rounded-lg text-xs cursor-not-allowed border border-stone-600';
    }

    const btnCow = document.getElementById('btnMarketBuyCow');
    if (btnCow) {
      if (totalCows >= 3) {
        btnCow.textContent = 'BARN FULL (3/3 COWS)';
        btnCow.disabled = true;
        btnCow.className = 'btn-tactile mt-2 w-full bg-stone-700 text-stone-400 font-bold py-1.5 rounded-lg text-xs cursor-not-allowed border border-stone-600';
      } else if (!housing.livestockBarn?.owned) {
        btnCow.textContent = 'BUY COW ($2,000) • REQUIRES BARN';
        btnCow.disabled = false;
      } else {
        btnCow.textContent = `BUY COW ($2,000) • (${totalCows}/3)`;
        btnCow.disabled = false;
        btnCow.className = 'btn-tactile mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded-lg text-xs border border-blue-300 shadow';
      }
    }
  }

  // PWA Install Handling
  setupInstallPrompt() {
    const installBtn = document.getElementById('btnInstallApp');

    if (this.isStandalone) {
      if (installBtn) installBtn.classList.add('hidden');
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBtn) installBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      if (installBtn) installBtn.classList.add('hidden');
      this.showFloatingText(window.innerWidth / 2 - 50, 100, '🎉 Game Installed!', '#34d399');
    });

    if (installBtn) {
      installBtn.addEventListener('click', () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          this.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              this.deferredPrompt = null;
              installBtn.classList.add('hidden');
            }
          });
        } else if (this.isIOS) {
          this.openModal('iosInstallModal');
        } else {
          // Ambient prompt for browsers that support menu install
          this.showFloatingText(window.innerWidth / 2 - 60, 100, 'Tap browser menu (⋮) -> Install', '#fde047');
        }
      });
    }
  }

  // Offline status indicator
  setupNetworkStatus() {
    const offlineBanner = document.getElementById('offlineBanner');
    const updateBanner = () => {
      if (!offlineBanner) return;
      if (!navigator.onLine) {
        offlineBanner.classList.remove('hidden');
      } else {
        offlineBanner.classList.add('hidden');
      }
    };

    window.addEventListener('online', updateBanner);
    window.addEventListener('offline', updateBanner);
    updateBanner();
  }

  // Pull-to-refresh handling (compatible with native browser gestures & standalone PWA)
  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isTracking = false;
    const indicator = document.getElementById('pullToRefreshIndicator');
    const ptrIcon = document.getElementById('ptrIcon');
    const ptrText = document.getElementById('ptrText');
    const threshold = 70;

    // Use strictly passive listeners so native gestures and scrolling are NEVER blocked or prevented
    window.addEventListener('touchstart', (e) => {
      // ONLY track if at the absolute top of the page (scrollTop <= 2)
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollTop <= 2 && e.touches.length === 1) {
        startY = e.touches[0].clientY;
        currentY = startY;
        isTracking = true;
      } else {
        isTracking = false;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isTracking || e.touches.length !== 1) return;
      currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;

      // If pulling UP (scrolling up the page or negative distance), cancel tracking immediately
      if (pullDistance <= 0) {
        isTracking = false;
        if (indicator) {
          indicator.classList.remove('opacity-100', 'translate-y-0');
          indicator.classList.add('opacity-0', '-translate-y-6', 'pointer-events-none');
        }
        return;
      }

      if (pullDistance > 25 && indicator) {
        indicator.classList.remove('opacity-0', '-translate-y-6', 'pointer-events-none');
        indicator.classList.add('opacity-100', 'translate-y-0');

        if (pullDistance >= threshold) {
          if (ptrIcon) ptrIcon.style.transform = 'rotate(180deg)';
          if (ptrText) ptrText.textContent = 'Release to refresh';
        } else {
          if (ptrIcon) ptrIcon.style.transform = 'rotate(0deg)';
          if (ptrText) ptrText.textContent = 'Pull down to refresh';
        }
      }
    }, { passive: true });

    const finishGesture = () => {
      if (!isTracking) return;
      const pullDistance = currentY - startY;
      isTracking = false;

      if (pullDistance >= threshold && indicator) {
        if (ptrText) ptrText.textContent = 'Refreshing FarmTap...';
        if (ptrIcon) {
          ptrIcon.textContent = '⟳';
          ptrIcon.classList.add('animate-spin');
        }
        setTimeout(() => {
          window.location.reload();
        }, 180);
      } else if (indicator) {
        indicator.classList.remove('opacity-100', 'translate-y-0');
        indicator.classList.add('opacity-0', '-translate-y-6', 'pointer-events-none');
        if (ptrIcon) ptrIcon.style.transform = 'rotate(0deg)';
        if (ptrText) ptrText.textContent = 'Pull down to refresh';
      }
      startY = 0;
      currentY = 0;
    };

    window.addEventListener('touchend', finishGesture, { passive: true });
    window.addEventListener('touchcancel', finishGesture, { passive: true });
  }
}
