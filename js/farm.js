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

    if (plot.state === 'locked') {
      el.className = 'crop-plot relative bg-[#3d230e]/70 border-2 border-dashed border-amber-600/60 rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-300 transition-all group min-h-[92px]';
      if (plantsStage) {
        plantsStage.innerHTML = `
          <div class="flex flex-col items-center justify-center my-0.5 h-10 text-center">
            <span class="text-base leading-none mb-0.5">🔒</span>
            <span class="text-[9px] font-bold text-amber-300 leading-tight">Unlock Field #6</span>
            <span class="text-[8px] font-pixel text-yellow-300 font-bold">$2,000 Coins</span>
          </div>
        `;
      }
      if (badge) badge.textContent = 'FIELD #6';
      if (status) {
        status.className = 'crop-status text-amber-300 font-bold text-[8px] font-pixel';
        status.textContent = '$2,000';
      }
      if (progBar) progBar.style.width = '0%';
      if (pulseRing) pulseRing.classList.add('hidden');
      return;
    }

    if (plot.state === 'empty') {
      el.className = 'crop-plot relative bg-[#5e3818] border-2 border-dashed border-amber-600/70 rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-400 transition-all group min-h-[92px]';
      if (badge) badge.textContent = 'TILLED SOIL';
      if (status) {
        status.className = 'crop-status text-amber-200 text-[8px]';
        status.textContent = 'EMPTY';
      }
      if (plantsStage) {
        plantsStage.innerHTML = `
          <div class="flex flex-col items-center justify-center my-1 h-10">
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
      el.className = 'crop-plot relative bg-[#5e3818] border-2 border-[#41240c] rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-400 transition-all group min-h-[92px]';
      const cfg = cropConfigs[plot.crop] || cropConfigs.wheat;
      if (badge) badge.textContent = cfg.name.toUpperCase();
      if (status) {
        status.className = 'crop-status text-amber-300 text-[8px] font-pixel';
        status.innerHTML = `<span class="crop-timer">${Math.max(1, Math.ceil(plot.timer))}</span>s`;
      }
      if (plantsStage) {
        plantsStage.innerHTML = renderCropPlantSprites(plot.crop, plot.progress);
      }
      if (progBar) {
        progBar.style.width = `${Math.min(100, Math.max(0, plot.progress))}%`;
        progBar.className = 'crop-prog-bar bg-amber-500 h-full';
      }
      if (pulseRing) pulseRing.classList.add('hidden');
    } else if (plot.state === 'mature' || plot.state === 'harvesting') {
      el.className = 'crop-plot relative bg-[#5e3818] border-2 border-emerald-500 rounded-xl p-1.5 shadow-inner cursor-pointer hover:border-amber-400 transition-all group min-h-[92px]';
      const cfg = cropConfigs[plot.crop] || cropConfigs.wheat;
      if (badge) badge.textContent = cfg.name.toUpperCase();
      if (status) {
        status.className = 'crop-status text-emerald-400 font-pixel text-[8px] animate-pulse';
        status.textContent = plot.state === 'harvesting' ? 'HARVEST...' : 'READY!';
      }
      if (plantsStage) {
        plantsStage.innerHTML = renderCropPlantSprites(plot.crop, 100);
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

        // Decrement remaining seconds based on speed
        const timeElapsed = deltaSeconds * speedFactor;
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
        this.renderPlot(idx);
      }
    });
    return anyChanged;
  }
}
