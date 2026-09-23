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
  }

  // Calculate and update the dynamic scale factor so worldStage and all game components fit within any screen
  setupViewportScaling() {
    const updateScale = () => {
      const stage = document.getElementById('worldStage');
      const stageContainer = document.getElementById('worldStageContainer');
      const topHud = document.getElementById('topHudOverlay');
      if (!stage) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Reserve space for top HUD (approx 75-105px depending on screen/ticker) plus comfortable breathing room
      const hudHeight = topHud ? topHud.offsetHeight : 80;
      if (stageContainer) {
        stageContainer.style.top = `${hudHeight}px`;
        stageContainer.style.bottom = '0px';
      }

      const availableWidth = viewportWidth * 0.96; // 2% padding on left/right
      const availableHeight = Math.max(260, viewportHeight - hudHeight - 16);

      // Canonical worldStage dimensions are 500w x 680h
      const scaleX = availableWidth / 500;
      const scaleY = availableHeight / 680;
      
      // Choose the smaller dimension to prevent ANY overflow, with a sensible clamp
      const targetScale = Math.min(scaleX, scaleY);
      this.currentScale = Math.max(0.40, Math.min(1.35, targetScale));

      stage.style.setProperty('--stage-scale', this.currentScale.toFixed(3));
    };

    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    // Call immediately and again after fonts/styles settle
    updateScale();
    requestAnimationFrame(updateScale);
    setTimeout(updateScale, 150);
  }

  showFloatingText(x, y, text, color = '#fde047') {
    let screenX = x;
    let screenY = y;
    const stage = document.getElementById('worldStage');
    if (stage && x <= 500 && y <= 700) {
      const rect = stage.getBoundingClientRect();
      const scale = rect.width / 500;
      screenX = rect.left + x * scale;
      screenY = rect.top + y * scale;
    }

    const el = document.createElement('div');
    el.className = 'absolute z-50 font-bold text-xs float-feedback drop-shadow-md pointer-events-none select-none font-brand';
    el.style.left = `${Math.max(10, Math.min(window.innerWidth - 120, screenX))}px`;
    el.style.top = `${Math.max(40, screenY)}px`;
    el.style.color = color;
    el.textContent = text;
    
    const container = document.getElementById('gameViewport');
    if (container) {
      container.appendChild(el);
      setTimeout(() => el.remove(), 1250);
    }
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
    const mainDisp = document.getElementById('playerGoldDisplay');
    const marketDisp = document.getElementById('marketCoinDisplay');
    if (mainDisp) mainDisp.textContent = `$${gold}`;
    if (marketDisp) marketDisp.textContent = `$${gold}`;
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
    const validCrops = ['wheat', 'corn', 'tomato', 'potato', 'rice', 'sugarcane'];

    // Purge any invalid or ghost keys (like null, undefined) from the inventory object in place
    if (inventory && typeof inventory === 'object') {
      Object.keys(inventory).forEach((key) => {
        if (!validCrops.includes(key)) {
          delete inventory[key];
        } else {
          const num = Number(inventory[key]);
          inventory[key] = Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
        }
      });
    }

    const totalCount = validCrops.reduce((sum, cropId) => {
      const val = inventory ? inventory[cropId] : 0;
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

    validCrops.forEach((cropId) => {
      const invEl = document.getElementById(`barnInv-${cropId}`);
      if (invEl) invEl.textContent = (inventory && inventory[cropId]) ? inventory[cropId] : 0;
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
      if (inventory && inventory.sugarcane > 0) crateIcons.push('🍬');

      cratesCluster.innerHTML = crateIcons.slice(0, 4).map(ic => 
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
      return;
    }

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
}
