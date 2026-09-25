import { cropConfigs, renderCropPlantSprites } from './crops.js';
import { audio } from './audio.js';

export class Farm {
  constructor(plotsState, player, showFloatingTextCallback) {
    this.plots = plotsState;
    this.player = player;
    this.showFloatingText = showFloatingTextCallback;
  }

  getPlots() {
    return this.plots;
  }

  // Render individual plot DOM element
  renderPlot(plotIdx) {
    const plot = this.plots[plotIdx];
    const el = document.getElementById(`plot-${plotIdx}`);
    if (!el) return;

    const badge = el.querySelector('.crop-badge');
    const status = el.querySelector('.crop-status');
    const plantsStage = el.querySelector('.crop-plants-stage');
    const progBar = el.querySelector('.crop-prog-bar');
    const pulseRing = el.querySelector('.pulse-ring');
    const moistureRow = el.querySelector('.plot-moisture-row');
    const moistureText = el.querySelector('.plot-moisture-text');
    const moistureBar = el.querySelector('.moisture-bar');
    const btnWater = el.querySelector('.btn-water-plot');

    // Default moisture to 60 if not yet set
    if (plot.moisture === undefined || plot.moisture === null) {
      plot.moisture = 60;
    } else {
      plot.moisture = Math.max(0, Math.min(100, Math.round(Number(plot.moisture))));
    }

    if (plot.state === 'locked') {
      el.className = 'crop-plot relative bg-[#3d230e]/70 border-2 border-dashed border-amber-600/60 rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-300 transition-all group min-h-[92px]';
      el.style.borderColor = '';
      el.classList.remove('soil-moist', 'soil-moderate', 'soil-dry', 'soil-parched');
      if (moistureRow) moistureRow.classList.add('hidden');
      if (moistureBar && moistureBar.parentElement) moistureBar.parentElement.classList.add('hidden');
      if (plantsStage) {
        delete plantsStage.dataset.stageToken;
        plantsStage.innerHTML = `
          <div class="flex flex-col items-center justify-center my-0.5 h-10 text-center">
            <span class="text-base leading-none mb-0.5">🔒</span>
            <span class="text-[9px] font-bold text-amber-300 leading-tight">Unlock Field #6</span>
            <span class="text-[8px] font-pixel text-yellow-300 font-bold">$2,000 Coins</span>
          </div>
        `;
      }
      if (badge) {
        badge.textContent = 'FIELD #6';
        badge.style.color = '';
      }
      if (status) {
        status.className = 'crop-status text-amber-300 font-bold text-[8px] font-pixel';
        status.textContent = '$2,000';
      }
      if (progBar) progBar.style.width = '0%';
      if (pulseRing) pulseRing.classList.add('hidden');
      return;
    }

    // Active unlocked plot: show moisture controls
    if (moistureRow) moistureRow.classList.remove('hidden');
    if (moistureBar && moistureBar.parentElement) moistureBar.parentElement.classList.remove('hidden');

    // Update soil moisture appearance
    el.classList.remove('soil-moist', 'soil-moderate', 'soil-dry', 'soil-parched');
    if (plot.moisture >= 60) {
      el.classList.add('soil-moist');
    } else if (plot.moisture >= 30) {
      el.classList.add('soil-moderate');
    } else if (plot.moisture >= 1) {
      el.classList.add('soil-dry');
    } else {
      el.classList.add('soil-parched');
    }

    // Update moisture text and bar
    if (moistureText) {
      if (plot.moisture === 0) {
        moistureText.className = 'plot-moisture-text text-rose-300 font-bold animate-pulse';
        moistureText.textContent = '0% DRY!';
      } else if (plot.moisture < 30) {
        moistureText.className = 'plot-moisture-text text-orange-400 font-bold';
        moistureText.textContent = `${plot.moisture}%`;
      } else if (plot.moisture < 60) {
        moistureText.className = 'plot-moisture-text text-amber-300 font-bold';
        moistureText.textContent = `${plot.moisture}%`;
      } else {
        moistureText.className = 'plot-moisture-text text-cyan-300 font-bold';
        moistureText.textContent = `${plot.moisture}%`;
      }
    }

    if (moistureBar) {
      moistureBar.style.width = `${plot.moisture}%`;
      if (plot.moisture === 0) {
        moistureBar.className = 'moisture-bar bg-rose-500 h-full';
      } else if (plot.moisture < 30) {
        moistureBar.className = 'moisture-bar bg-orange-500 h-full';
      } else if (plot.moisture < 60) {
        moistureBar.className = 'moisture-bar bg-amber-400 h-full';
      } else {
        moistureBar.className = 'moisture-bar bg-sky-400 h-full';
      }
    }

    if (btnWater) {
      if (plot.moisture >= 100) {
        btnWater.className = 'btn-water-plot bg-stone-700/80 text-stone-400 font-bold px-1.5 py-0.5 rounded text-[7px] cursor-default border border-stone-600';
        btnWater.textContent = 'FULL';
        btnWater.disabled = true;
      } else {
        btnWater.className = 'btn-water-plot btn-tactile bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold px-1.5 py-0.5 rounded text-[7px] border border-sky-300 shadow-sm';
        btnWater.textContent = 'WATER';
        btnWater.disabled = false;
      }
    }

    if (plot.state === 'empty') {
      el.className = `crop-plot relative border-2 border-dashed border-amber-600/70 rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-400 transition-all group min-h-[92px] ${plot.moisture >= 60 ? 'soil-moist' : plot.moisture >= 30 ? 'soil-moderate' : plot.moisture >= 1 ? 'soil-dry' : 'soil-parched'}`;
      el.style.borderColor = '';
      if (badge) {
        badge.textContent = 'TILLED SOIL';
        badge.style.color = '';
      }
      if (status) {
        status.className = 'crop-status text-amber-200 text-[8px]';
        status.textContent = 'EMPTY';
      }
      if (plantsStage) {
        delete plantsStage.dataset.stageToken;
        plantsStage.innerHTML = `
          <div class="flex flex-col items-center justify-center my-0.5 h-9">
            <div class="w-7 h-7 rounded-full bg-amber-900/80 border border-dashed border-amber-400 flex items-center justify-center text-amber-200 group-hover:scale-110 transition-transform shadow">
              <span class="text-xs font-black">+</span>
            </div>
            <span class="text-[8px] font-bold text-amber-300 mt-0.5">TAP TO PLANT</span>
          </div>
        `;
      }
      if (progBar) {
        progBar.style.width = '0%';
        progBar.className = 'crop-prog-bar bg-stone-500 h-full';
      }
      if (pulseRing) pulseRing.classList.add('hidden');
    } else if (plot.state === 'growing') {
      el.className = `crop-plot relative border-2 rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-300 transition-all group min-h-[92px] ${plot.moisture >= 60 ? 'soil-moist' : plot.moisture >= 30 ? 'soil-moderate' : plot.moisture >= 1 ? 'soil-dry' : 'soil-parched'}`;
      const cfg = cropConfigs[plot.crop] || cropConfigs.wheat;
      el.style.borderColor = cfg.color || '#d97706';
      if (badge) {
        badge.textContent = `${cfg.icon} ${cfg.name.toUpperCase()}`;
        badge.style.color = cfg.color || '#facc15';
      }
      if (status) {
        if (plot.moisture === 0) {
          status.className = 'crop-status text-rose-400 font-pixel text-[8px] animate-pulse';
          status.innerHTML = 'STOPPED (DRY)';
        } else if (plot.moisture < 30) {
          status.className = 'crop-status text-orange-300 text-[8px] font-pixel';
          status.innerHTML = `<span class="crop-timer">${Math.max(1, Math.ceil(plot.timer))}</span>s (V.Slow)`;
        } else if (plot.moisture < 60) {
          status.className = 'crop-status text-amber-300 text-[8px] font-pixel';
          status.innerHTML = `<span class="crop-timer">${Math.max(1, Math.ceil(plot.timer))}</span>s (Slow)`;
        } else {
          status.className = 'crop-status text-amber-300 text-[8px] font-pixel';
          status.innerHTML = `<span class="crop-timer">${Math.max(1, Math.ceil(plot.timer))}</span>s`;
        }
      }
      if (plantsStage) {
        const pct = Math.min(100, Math.max(0, plot.progress));
        const stageKey = pct >= 100 ? 'full' :
                         pct >= 75 ? 'maturing' :
                         pct >= 50 ? 'medium' :
                         pct >= 25 ? 'small' : 'sprout';
        const stageToken = `${plot.crop}-${stageKey}`;
        if (plantsStage.dataset.stageToken !== stageToken) {
          plantsStage.innerHTML = renderCropPlantSprites(plot.crop, plot.progress);
          plantsStage.dataset.stageToken = stageToken;
        }
      }
      if (progBar) {
        progBar.style.width = `${Math.min(100, Math.max(0, plot.progress))}%`;
        progBar.className = 'crop-prog-bar bg-amber-500 h-full';
      }
      if (pulseRing) pulseRing.classList.add('hidden');
    } else if (plot.state === 'mature' || plot.state === 'harvesting') {
      el.className = `crop-plot relative border-2 border-emerald-400 rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-400 transition-all group min-h-[92px] ${plot.moisture >= 60 ? 'soil-moist' : plot.moisture >= 30 ? 'soil-moderate' : plot.moisture >= 1 ? 'soil-dry' : 'soil-parched'}`;
      el.style.borderColor = '';
      const cfg = cropConfigs[plot.crop] || cropConfigs.wheat;
      if (badge) {
        badge.textContent = `${cfg.icon} ${cfg.name.toUpperCase()}`;
        badge.style.color = cfg.color || '#34d399';
      }
      if (status) {
        status.className = 'crop-status text-emerald-400 font-pixel text-[8px] animate-pulse';
        status.textContent = plot.state === 'harvesting' ? 'HARVEST...' : 'READY!';
      }
      if (plantsStage) {
        const stageToken = `${plot.crop}-mature-${plot.state}`;
        if (plantsStage.dataset.stageToken !== stageToken) {
          plantsStage.innerHTML = renderCropPlantSprites(plot.crop, 100);
          plantsStage.dataset.stageToken = stageToken;
        }
      }
      if (progBar) {
        progBar.style.width = '100%';
        progBar.className = 'crop-prog-bar bg-emerald-500 h-full';
      }
      if (pulseRing) {
        if (plot.state === 'harvesting') {
          pulseRing.classList.add('hidden');
        } else {
          pulseRing.classList.remove('hidden');
        }
      }
    }
  }

  renderAllPlots() {
    this.plots.forEach((_, idx) => this.renderPlot(idx));
  }

  // Growth tick called by game loop (ticks every second)
  tickGrowth(weather, autoIrrigation, deltaSeconds = 1) {
    let anyChanged = false;

    // Environmental / equipment speed multipliers
    let speedFactor = 1.0;
    if (autoIrrigation) speedFactor += 0.25; // Irrigation speeds up ripening by 25%
    if (weather === 'heavy_rain') speedFactor += 0.25; // Rain speeds up ripening by 25%
    if (weather === 'drought') speedFactor -= 0.20; // Drought slows down ripening by 20%

    this.plots.forEach((p, idx) => {
      if (p.state === 'growing') {
        const cfg = cropConfigs[p.crop] || cropConfigs.wheat;
        const totalTime = p.totalTime || cfg.time || 12;

        // Moisture growth speed rules:
        // 60-100: normal (1.0)
        // 30-59: slower (0.5)
        // 1-29: very slow (0.2)
        // 0: growth stops (0.0)
        const m = p.moisture !== undefined ? p.moisture : 60;
        let moistureFactor = 1.0;
        if (m >= 60) {
          moistureFactor = 1.0;
        } else if (m >= 30) {
          moistureFactor = 0.5;
        } else if (m >= 1) {
          moistureFactor = 0.2;
        } else {
          moistureFactor = 0.0;
        }

        // Only advance timer if crop is not parched (moisture > 0)
        if (moistureFactor > 0) {
          const timeElapsed = deltaSeconds * speedFactor * moistureFactor;
          p.timer = Math.max(0, p.timer - timeElapsed);

          // Progress percentage is ALWAYS strictly locked to the remaining timer!
          p.progress = Math.min(100, Math.max(0, ((totalTime - p.timer) / totalTime) * 100));

          // Crop only matures when the timer has fully reached 0 and progress is 100%
          if (p.timer <= 0) {
            p.state = 'mature';
            p.progress = 100;
            p.timer = 0;
            this.showFloatingText(
              175 + (idx % 2) * 80,
              320 + Math.floor(idx / 2) * 85,
              `${(p.crop || 'Crop').toUpperCase()} Ready! 🌾`,
              '#34d399'
            );
            audio.playHarvest();
          }
          anyChanged = true;
        }
        this.renderPlot(idx);
      }
    });
    return anyChanged;
  }
}
