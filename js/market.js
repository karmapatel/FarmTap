import { cropConfigs } from './crops.js';
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
    const coinDisplay = document.getElementById('marketCoinDisplay');
    if (coinDisplay) coinDisplay.textContent = `$${this.getGold()}`;

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

    // Update physical exchange stall list
    Object.keys(cropConfigs).forEach((cropId) => {
      const stockEl = document.getElementById(`stock-${cropId}`);
      const priceEl = document.getElementById(`price-${cropId}`);
      const costEl = document.getElementById(`market-seedcost-${cropId}`);
      const marginEl = document.getElementById(`market-margin-${cropId}`);
      const badgeEl = document.getElementById(`trend-badge-${cropId}`);

      const qty = this.inventory[cropId] || 0;
      const price = this.economy.getPrice(cropId);
      const cost = this.economy.getCost(cropId);
      const profitMargin = price - cost;
      const trend = this.economy.getTrend(cropId);
      const costTrend = this.economy.getCostTrend(cropId);

      if (stockEl) stockEl.textContent = qty;
      if (priceEl) priceEl.textContent = `$${price}`;
      if (costEl) costEl.textContent = `$${cost}`;
      if (marginEl) {
        marginEl.textContent = `+$${profitMargin}`;
        marginEl.className = profitMargin > 20 ? 'text-emerald-300 font-bold' : 'text-amber-200';
      }

      if (badgeEl) {
        if (costTrend === 'sale') {
          badgeEl.className = 'text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-pixel shadow animate-pulse';
          badgeEl.textContent = 'SEED SALE!';
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
  }

  sell(cropId, amount) {
    const currentStock = Math.max(0, Math.floor(Number(this.inventory[cropId]) || 0));
    const qtyToSell = amount === 'all' ? currentStock : 1;

    if (qtyToSell <= 0 || currentStock <= 0) {
      audio.playError();
      this.showFloatingText(200, 320, `No ${cropId.toUpperCase()} in Barn!`, '#f87171');
      return;
    }

    const unitPrice = this.economy.getPrice(cropId);
    const totalEarned = qtyToSell * unitPrice;

    this.inventory[cropId] = Math.max(0, currentStock - qtyToSell);
    this.setGold(this.getGold() + totalEarned);

    // Audio & Visuals
    audio.playCoin();
    this.showFloatingText(210, 270, `+$${totalEarned} Sold ${qtyToSell} ${cropId.toUpperCase()}! 💰`, '#34d399');

    // Notify economy of sales volume to adjust supply/demand
    this.economy.recordSale(cropId, qtyToSell);

    // Refresh market stall stocks immediately
    this.updateMarketUI();

    if (this.onSale) {
      this.onSale(cropId, qtyToSell, totalEarned);
    }
  }

  sellAllCrops() {
    let grandTotalEarned = 0;
    let totalCropsSold = 0;

    Object.keys(cropConfigs).forEach((cropId) => {
      const stock = Math.max(0, Math.floor(Number(this.inventory[cropId]) || 0));
      if (stock > 0) {
        const unitPrice = this.economy.getPrice(cropId);
        const earned = stock * unitPrice;
        grandTotalEarned += earned;
        totalCropsSold += stock;
        this.inventory[cropId] = 0;
        this.economy.recordSale(cropId, stock);
      }
    });

    if (totalCropsSold <= 0) {
      audio.playError();
      this.showFloatingText(200, 320, 'Barn is already empty!', '#f87171');
      return;
    }

    this.setGold(this.getGold() + grandTotalEarned);
    audio.playCoin();
    this.showFloatingText(210, 270, `+$${grandTotalEarned} Sold ALL ${totalCropsSold} Crops! 💰`, '#34d399');

    this.updateMarketUI();

    if (this.onSale) {
      this.onSale('all', totalCropsSold, grandTotalEarned);
    }
  }

  highlightBuyer(cropId) {
    const cfg = cropConfigs[cropId] || cropConfigs.wheat;
    audio.playStep();
    this.showFloatingText(180, 220, `${cfg.buyer} wants fresh ${cfg.name}!`, '#fde047');
  }
}
