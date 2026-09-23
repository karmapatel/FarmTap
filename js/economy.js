import { cropConfigs } from './crops.js';

export class Economy {
  constructor(initialPrices = null, initialCosts = null, lastHourKey = null) {
    this.prices = initialPrices ? { ...initialPrices } : {};
    this.costs = initialCosts ? { ...initialCosts } : {};
    this.priceTrends = {};
    this.costTrends = {};
    this.lastHourKey = lastHourKey || this.getCurrentHourKey();

    // Initialize selling prices and seed purchasing costs
    Object.keys(cropConfigs).forEach((cropId) => {
      const cfg = cropConfigs[cropId];
      if (!this.prices[cropId]) {
        this.prices[cropId] = cfg.basePrice;
      }
      if (!this.costs[cropId]) {
        this.costs[cropId] = cfg.baseCost;
      }
      this.priceTrends[cropId] = 'stable';
      this.costTrends[cropId] = 'normal';
    });
  }

  getCurrentHourKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  }

  getPrices() {
    return { ...this.prices };
  }

  getPrice(cropId) {
    return this.prices[cropId] || cropConfigs[cropId]?.basePrice || 20;
  }

  getCosts() {
    return { ...this.costs };
  }

  getCost(cropId) {
    return this.costs[cropId] || cropConfigs[cropId]?.baseCost || 6;
  }

  getTrend(cropId) {
    return this.priceTrends[cropId] || 'stable';
  }

  getCostTrend(cropId) {
    return this.costTrends[cropId] || 'normal';
  }

  // Time remaining until the next hour (e.g. 54m 20s)
  getTimeRemaining() {
    const now = new Date();
    const minutesLeft = 59 - now.getMinutes();
    const secondsLeft = 59 - now.getSeconds();
    const totalSecondsLeft = minutesLeft * 60 + secondsLeft;
    const formatted = `${minutesLeft}m ${String(secondsLeft).padStart(2, '0')}s`;
    const percentRemaining = (totalSecondsLeft / 3600) * 100;

    return {
      minutes: minutesLeft,
      seconds: secondsLeft,
      totalSecondsLeft,
      formatted,
      percentRemaining
    };
  }

  // Check if real hour has rolled over
  checkHourChange(activeEvent, weather) {
    const currentKey = this.getCurrentHourKey();
    if (currentKey !== this.lastHourKey) {
      this.lastHourKey = currentKey;
      this.updateHourlyPrices(activeEvent, weather);
      return true;
    }
    return false;
  }

  // Update prices and costs for all crops every hour
  updateHourlyPrices(activeEvent, weather) {
    this.lastHourKey = this.getCurrentHourKey();

    Object.keys(cropConfigs).forEach((cropId) => {
      const cfg = cropConfigs[cropId];
      const oldPrice = this.prices[cropId];
      const oldCost = this.costs[cropId];

      // Dynamic price changes for all crops
      let priceChange = (Math.random() * 8 - 4);
      const priceDiffFromBase = cfg.basePrice - oldPrice;
      priceChange += priceDiffFromBase * 0.15; // Mean reversion

      // Dynamic seed cost changes
      let costChange = (Math.random() * 4 - 2);
      const costDiffFromBase = cfg.baseCost - oldCost;
      costChange += costDiffFromBase * 0.15;

      if (weather === 'drought') {
        priceChange += Math.random() * 3 + 1;
        if (cropId === 'rice' || cropId === 'tomato') {
          costChange += Math.random() * 2 + 1;
        }
      } else if (weather === 'heavy_rain') {
        costChange -= Math.random() * 2 + 1;
        priceChange -= Math.random() * 2;
      } else if (weather === 'festival') {
        if (cropId === 'wheat' || cropId === 'tomato' || cropId === 'sugarcane') {
          priceChange += Math.random() * 4 + 2;
        }
      }

      if (activeEvent) {
        if (activeEvent.id === 'festival') {
          if (cropId === 'tomato' || cropId === 'wheat') priceChange += 3;
          costChange -= 1;
        } else if (activeEvent.id === 'baker' && (cropId === 'wheat' || cropId === 'sugarcane')) {
          priceChange += 4;
          costChange += 2;
        } else if (activeEvent.id === 'cargo' && (cropId === 'potato' || cropId === 'rice')) {
          priceChange += 5;
        }
      }

      // Enforce price bounds
      let newPrice = Math.round(oldPrice + priceChange);
      newPrice = Math.max(cfg.minPrice, Math.min(cfg.maxPrice, newPrice));

      if (newPrice > oldPrice) {
        this.priceTrends[cropId] = 'up';
      } else if (newPrice < oldPrice) {
        this.priceTrends[cropId] = 'down';
      } else {
        this.priceTrends[cropId] = 'stable';
      }
      this.prices[cropId] = newPrice;

      // Enforce seed cost bounds
      let newCost = Math.round(oldCost + costChange);
      newCost = Math.max(cfg.minCost, Math.min(cfg.maxCost, newCost));

      if (newCost < cfg.baseCost) {
        this.costTrends[cropId] = 'sale';
      } else if (newCost > cfg.baseCost) {
        this.costTrends[cropId] = 'high';
      } else {
        this.costTrends[cropId] = 'normal';
      }
      this.costs[cropId] = newCost;
    });
  }

  // Large sales depress local spot price slightly
  recordSale(cropId, quantity) {
    if (quantity > 3) {
      const drop = Math.min(5, Math.floor(quantity / 4));
      const cfg = cropConfigs[cropId];
      if (cfg) {
        this.prices[cropId] = Math.max(cfg.minPrice, this.prices[cropId] - drop);
      }
    }
  }

  // Generate HTML for streaming ticker tape
  renderTickerHTML() {
    const timeInfo = this.getTimeRemaining();

    const timerBadge = `
      <span class="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold mr-2 font-pixel text-[9px]">
        <span>⏱️ NEXT PRICE CHANGE:</span>
        <span class="ticker-countdown text-yellow-300 font-bold">${timeInfo.formatted}</span>
      </span>
    `;

    const cropItems = Object.keys(cropConfigs).map((cropId) => {
      const cfg = cropConfigs[cropId];
      const price = this.prices[cropId];
      const cost = this.costs[cropId];
      const trend = this.priceTrends[cropId];
      const costTrend = this.costTrends[cropId];

      let trendClass = 'text-amber-200';
      let trendIcon = '';
      if (trend === 'up') {
        trendClass = 'text-emerald-400 font-bold';
        trendIcon = '▲';
      } else if (trend === 'down') {
        trendClass = 'text-rose-400 font-bold';
        trendIcon = '▼';
      }

      let costBadge = '';
      if (costTrend === 'sale') {
        costBadge = `<span class="text-[8px] bg-emerald-800 text-emerald-200 px-1 rounded font-sans">Seed: $${cost} (Sale)</span>`;
      } else {
        costBadge = `<span class="text-[8px] text-stone-400 font-sans">Seed: $${cost}</span>`;
      }

      return `
        <span class="inline-flex items-center gap-1.5 px-3">
          <span>${cfg.icon}</span>
          <span class="font-bold text-amber-100">${cfg.name.toUpperCase()}</span>
          <strong class="${trendClass}">$${price} ${trendIcon}</strong>
          ${costBadge}
        </span>
      `;
    }).join(' • ');

    return `${timerBadge} • ${cropItems} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; `;
  }
}
