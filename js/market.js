import { ALL_COMMODITIES } from './economy.js';
import { audio } from './audio.js';

export class Market {
  constructor(economy, inventoryOrGetter, getGoldCallback, setGoldCallback, showFloatingTextCallback, onSaleCallback) {
    this.economy = economy;
    this._getInventory = typeof inventoryOrGetter === 'function' ? inventoryOrGetter : () => inventoryOrGetter;
    this.getGold = getGoldCallback;
    this.setGold = setGoldCallback;
    this.showFloatingText = showFloatingTextCallback;
    this.onSale = onSaleCallback;
  }

  get inventory() {
    return this._getInventory();
  }

  updateMarketUI(activeEvent) {
    const currentGold = Math.max(0, Math.floor(Number(this.getGold()) || 0));
    const coinDisplay = document.getElementById('marketCoinDisplay');
    if (coinDisplay) coinDisplay.textContent = `$${currentGold}`;
    const playerGold = document.getElementById('playerGoldDisplay');
    if (playerGold) playerGold.textContent = `$${currentGold}`;

    // Update Event Banner
    const eventTitle = document.getElementById('marketEventTitle');
    const eventDesc = document.getElementById('marketEventDesc');
    const eventIcon = document.getElementById('marketEventIcon');
    if (activeEvent) {
      if (eventTitle) eventTitle.textContent = activeEvent.title;
      if (eventDesc) eventDesc.textContent = activeEvent.desc;
      if (eventIcon) eventIcon.textContent = activeEvent.icon;
    }

    // Update Market Hourly Time Remaining in Town Bazaar
    const timeInfo = this.economy.getTimeRemaining();
    const marketTimerEl = document.getElementById('marketCountdownLarge');
    const marketProgressEl = document.getElementById('marketCountdownProgress');

    if (marketTimerEl) marketTimerEl.textContent = timeInfo.formatted;
    if (marketProgressEl) marketProgressEl.style.width = `${timeInfo.percentRemaining}%`;

    // Update physical exchange stall list for ALL commodities (crops + eggs + milk)
    Object.keys(ALL_COMMODITIES).forEach((itemId) => {
      const stockEl = document.getElementById(`stock-${itemId}`);
      const priceEl = document.getElementById(`price-${itemId}`);
      const costEl = document.getElementById(`market-seedcost-${itemId}`);
      const marginEl = document.getElementById(`market-margin-${itemId}`);
      const badgeEl = document.getElementById(`trend-badge-${itemId}`);

      const qty = this.inventory[itemId] || 0;
      const price = this.economy.getPrice(itemId);
      const cost = this.economy.getCost(itemId);
      const profitMargin = price - cost;
      const trend = this.economy.getTrend(itemId);
      const costTrend = this.economy.getCostTrend(itemId);

      if (stockEl) stockEl.textContent = qty;

      if (itemId === 'eggs') {
        const grainFeedCost = this.economy.getCost('chickenFeed');
        if (priceEl) priceEl.textContent = `$${price}`;
        if (costEl) costEl.textContent = `$${grainFeedCost}`;
        const netMargin = price - grainFeedCost;
        if (marginEl) {
          marginEl.textContent = `+$${netMargin}`;
          marginEl.className = netMargin > 20 ? 'text-emerald-300 font-bold' : 'text-amber-200';
        }
      } else if (itemId === 'milk') {
        const hayFeedCost = this.economy.getCost('cowFeed');
        if (priceEl) priceEl.textContent = `$${price}`;
        if (costEl) costEl.textContent = `$${hayFeedCost}`;
        const netMargin = price - hayFeedCost;
        if (marginEl) {
          marginEl.textContent = `+$${netMargin}`;
          marginEl.className = netMargin > 20 ? 'text-emerald-300 font-bold' : 'text-amber-200';
        }
      } else if (itemId === 'chickenFeed' || itemId === 'cowFeed') {
        const feedCost = this.economy.getCost(itemId);
        if (priceEl) priceEl.textContent = `$${feedCost}`;
      } else {
        if (priceEl) priceEl.textContent = `$${price}`;
        if (costEl) costEl.textContent = `$${cost}`;
        if (marginEl) {
          marginEl.textContent = `+$${profitMargin}`;
          marginEl.className = profitMargin > 20 ? 'text-emerald-300 font-bold' : 'text-amber-200';
        }
      }

      if (badgeEl) {
        if (costTrend === 'sale') {
          badgeEl.className = 'text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-pixel shadow animate-pulse';
          badgeEl.textContent = 'COST SALE!';
        } else if (trend === 'up') {
          badgeEl.className = 'text-[9px] bg-emerald-700 text-emerald-100 px-1.5 py-0.5 rounded font-pixel';
          badgeEl.textContent = '+High Spot';
        } else if (trend === 'down') {
          badgeEl.className = 'text-[9px] bg-rose-800 text-rose-100 px-1.5 py-0.5 rounded font-pixel';
          badgeEl.textContent = '-Low Spot';
        } else {
          badgeEl.className = 'text-[9px] bg-stone-700 text-stone-200 px-1.5 py-0.5 rounded font-pixel';
          badgeEl.textContent = 'Stable';
        }
      }
    });

    // Update dynamic feed button text costs
    const btnChickenFeed = document.getElementById('btn-buy-chickenFeed');
    if (btnChickenFeed) {
      const cost = this.economy.getCost('chickenFeed');
      btnChickenFeed.textContent = `BUY GRAIN FEED ($${cost})`;
    }
    const btnCowFeed = document.getElementById('btn-buy-cowFeed');
    if (btnCowFeed) {
      const cost = this.economy.getCost('cowFeed');
      btnCowFeed.textContent = `BUY HAY FEED ($${cost})`;
    }
  }

  sell(itemId, amount) {
    const currentStock = Math.max(0, Math.floor(Number(this.inventory[itemId]) || 0));
    const qtyToSell = amount === 'all' ? currentStock : 1;

    if (qtyToSell <= 0 || currentStock <= 0) {
      audio.playError();
      this.showFloatingText(200, 320, `No ${itemId.toUpperCase()} in Barn!`, '#f87171');
      return;
    }

    const unitPrice = this.economy.getPrice(itemId);
    const totalEarned = qtyToSell * unitPrice;

    this.inventory[itemId] = Math.max(0, currentStock - qtyToSell);
    this.setGold(this.getGold() + totalEarned);

    // Audio & Visuals
    audio.playCoin();
    this.showFloatingText(210, 270, `+$${totalEarned} Sold ${qtyToSell} ${itemId.toUpperCase()}! 💰`, '#34d399');

    // Notify economy of sales volume to adjust supply/demand
    this.economy.recordSale(itemId, qtyToSell);

    // Refresh market stall stocks immediately
    this.updateMarketUI();

    if (this.onSale) {
      this.onSale(itemId, qtyToSell, totalEarned);
    }
  }

  sellAllCrops() {
    let grandTotalEarned = 0;
    let totalItemsSold = 0;

    Object.keys(ALL_COMMODITIES).forEach((itemId) => {
      const stock = Math.max(0, Math.floor(Number(this.inventory[itemId]) || 0));
      if (stock > 0) {
        const unitPrice = this.economy.getPrice(itemId);
        const earned = stock * unitPrice;
        grandTotalEarned += earned;
        totalItemsSold += stock;
        this.inventory[itemId] = 0;
        this.economy.recordSale(itemId, stock);
      }
    });

    if (totalItemsSold <= 0) {
      audio.playError();
      this.showFloatingText(200, 320, 'Barn is already empty!', '#f87171');
      return;
    }

    this.setGold(this.getGold() + grandTotalEarned);
    audio.playCoin();
    this.showFloatingText(210, 270, `+$${grandTotalEarned} Sold ALL ${totalItemsSold} Items! 💰`, '#34d399');

    this.updateMarketUI();

    if (this.onSale) {
      this.onSale('all', totalItemsSold, grandTotalEarned);
    }
  }

  highlightBuyer(itemId) {
    const cfg = ALL_COMMODITIES[itemId] || ALL_COMMODITIES.wheat;
    audio.playStep();
    this.showFloatingText(180, 220, `${cfg.buyer} wants fresh ${cfg.name}!`, '#fde047');
  }
}
