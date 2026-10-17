import { cropConfigs } from './crops.js';
import { PRODUCT_CONFIGS, FEED_CONFIGS } from './animals.js';

export const ALL_COMMODITIES = {
  ...cropConfigs,
  ...PRODUCT_CONFIGS,
  chickenFeed: {
    id: 'chickenFeed',
    name: 'Grain Feed',
    basePrice: 30,
    minPrice: 15,
    maxPrice: 60,
    baseCost: 30,
    minCost: 15,
    maxCost: 60
  },
  cowFeed: {
    id: 'cowFeed',
    name: 'Hay Feed',
    basePrice: 60,
    minPrice: 30,
    maxPrice: 110,
    baseCost: 60,
    minCost: 30,
    maxCost: 110
  }
};

export class Economy {
  constructor(initialPrices = null, initialCosts = null, lastHourKey = null, initialPriceHistory = null) {
    this.prices = initialPrices ? { ...initialPrices } : {};
    this.costs = initialCosts ? { ...initialCosts } : {};
    this.priceTrends = {};
    this.costTrends = {};
    this.lastHourKey = lastHourKey || this.getCurrentHourKey();
    this.priceHistory = initialPriceHistory ? { ...initialPriceHistory } : {};

    // Initialize selling prices and purchasing costs for crops and animal products
    Object.keys(ALL_COMMODITIES).forEach((itemId) => {
      const cfg = ALL_COMMODITIES[itemId];
      if (!this.prices[itemId]) {
        this.prices[itemId] = cfg.basePrice;
      }
      if (!this.costs[itemId]) {
        this.costs[itemId] = cfg.baseCost || 10;
      }
      this.priceTrends[itemId] = 'stable';
      this.costTrends[itemId] = 'normal';

      if (!this.priceHistory[itemId] || !Array.isArray(this.priceHistory[itemId]) || this.priceHistory[itemId].length === 0) {
        const history = [];
        const currentPrice = this.prices[itemId];
        const now = Date.now();
        for (let i = 7; i > 0; i--) {
          const jitter = Math.round((Math.random() * 6 - 3));
          const p = Math.max(cfg.minPrice, Math.min(cfg.maxPrice, currentPrice + jitter));
          const snapTime = now - i * 3600000;
          history.push({ timestamp: snapTime, hour: `-${i}h`, price: p });
        }
        history.push({ timestamp: now, hour: 'Now', price: currentPrice });
        this.priceHistory[itemId] = history;
      } else {
        const hist = this.priceHistory[itemId];
        if (hist.length > 0) {
          hist[hist.length - 1].price = this.prices[itemId];
          hist[hist.length - 1].hour = 'Now';
          if (!hist[hist.length - 1].timestamp) {
            hist[hist.length - 1].timestamp = Date.now();
          }
        }
      }
    });
  }

  getCurrentHourKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  }

  getPrices() {
    return { ...this.prices };
  }

  getPrice(itemId) {
    return this.prices[itemId] || ALL_COMMODITIES[itemId]?.basePrice || 20;
  }

  getCosts() {
    return { ...this.costs };
  }

  getCost(itemId) {
    return this.costs[itemId] || ALL_COMMODITIES[itemId]?.baseCost || 6;
  }

  getTrend(itemId) {
    return this.priceTrends[itemId] || 'stable';
  }

  getCostTrend(itemId) {
    return this.costTrends[itemId] || 'normal';
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

  // Update prices and costs for all crops & livestock products every hour
  updateHourlyPrices(activeEvent, weather) {
    this.lastHourKey = this.getCurrentHourKey();

    Object.keys(ALL_COMMODITIES).forEach((itemId) => {
      const cfg = ALL_COMMODITIES[itemId];
      const oldPrice = this.prices[itemId] || cfg.basePrice;
      const oldCost = this.costs[itemId] || cfg.baseCost || 10;

      // Dynamic price changes for all commodities
      let priceChange = (Math.random() * 8 - 4);
      const priceDiffFromBase = cfg.basePrice - oldPrice;
      priceChange += priceDiffFromBase * 0.15; // Mean reversion

      // Dynamic seed/feed cost changes
      let costChange = (Math.random() * 4 - 2);
      const costDiffFromBase = (cfg.baseCost || 10) - oldCost;
      costChange += costDiffFromBase * 0.15;

      if (weather === 'drought') {
        priceChange += Math.random() * 3 + 1;
        if (itemId === 'rice' || itemId === 'tomato' || itemId === 'milk') {
          costChange += Math.random() * 2 + 1;
        }
      } else if (weather === 'heavy_rain') {
        costChange -= Math.random() * 2 + 1;
        priceChange -= Math.random() * 2;
      } else if (weather === 'festival') {
        if (itemId === 'wheat' || itemId === 'tomato' || itemId === 'sugarcane' || itemId === 'eggs' || itemId === 'milk') {
          priceChange += Math.random() * 5 + 2;
        }
      }

      if (activeEvent) {
        if (activeEvent.id === 'festival') {
          if (itemId === 'tomato' || itemId === 'wheat' || itemId === 'eggs') priceChange += 4;
          costChange -= 1;
        } else if (activeEvent.id === 'baker' && (itemId === 'wheat' || itemId === 'sugarcane' || itemId === 'eggs' || itemId === 'milk')) {
          priceChange += 5;
          costChange += 2;
        } else if (activeEvent.id === 'cargo' && (itemId === 'potato' || itemId === 'rice' || itemId === 'milk')) {
          priceChange += 6;
        }
      }

      // Enforce price bounds
      let newPrice = Math.round(oldPrice + priceChange);
      newPrice = Math.max(cfg.minPrice, Math.min(cfg.maxPrice, newPrice));

      if (newPrice > oldPrice) {
        this.priceTrends[itemId] = 'up';
      } else if (newPrice < oldPrice) {
        this.priceTrends[itemId] = 'down';
      } else {
        this.priceTrends[itemId] = 'stable';
      }
      this.prices[itemId] = newPrice;

      // Update price history (keep last 8 hours)
      if (!this.priceHistory[itemId]) {
        this.priceHistory[itemId] = [];
      }
      const hist = this.priceHistory[itemId];
      const now = Date.now();
      hist.push({ timestamp: now, hour: 'Now', price: newPrice });
      if (hist.length > 8) {
        hist.shift();
      }
      hist.forEach((h, idx) => {
        const diff = hist.length - 1 - idx;
        h.hour = diff === 0 ? 'Now' : `-${diff}h`;
      });
      if (hist.length > 0) {
        hist[hist.length - 1].price = newPrice;
        hist[hist.length - 1].hour = 'Now';
        hist[hist.length - 1].timestamp = now;
      }
      this.priceHistory[itemId] = hist;

      // Enforce cost bounds
      let newCost = Math.round(oldCost + costChange);
      const minC = cfg.minCost || 2;
      const maxC = cfg.maxCost || 40;
      newCost = Math.max(minC, Math.min(maxC, newCost));

      if (newCost < (cfg.baseCost || 10)) {
        this.costTrends[itemId] = 'sale';
      } else if (newCost > (cfg.baseCost || 10)) {
        this.costTrends[itemId] = 'high';
      } else {
        this.costTrends[itemId] = 'normal';
      }
      this.costs[itemId] = newCost;
    });
  }

  getPriceHistory(itemId) {
    return this.priceHistory[itemId] || [];
  }

  // Large sales depress local spot price slightly
  recordSale(itemId, quantity) {
    if (quantity > 3) {
      const drop = Math.min(5, Math.floor(quantity / 4));
      const cfg = ALL_COMMODITIES[itemId];
      if (cfg && this.prices[itemId]) {
        this.prices[itemId] = Math.max(cfg.minPrice, this.prices[itemId] - drop);
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

    const commodityItems = Object.keys(ALL_COMMODITIES).map((itemId) => {
      const cfg = ALL_COMMODITIES[itemId];
      const price = this.prices[itemId] || cfg.basePrice;
      const cost = this.costs[itemId] || cfg.baseCost || 10;
      const trend = this.priceTrends[itemId];
      const costTrend = this.costTrends[itemId];

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
        costBadge = `<span class="text-[8px] bg-emerald-800 text-emerald-200 px-1 rounded font-sans">Cost: $${cost} (Sale)</span>`;
      } else {
        costBadge = `<span class="text-[8px] text-stone-400 font-sans">Cost: $${cost}</span>`;
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

    return `${timerBadge} • ${commodityItems} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; `;
  }
}
