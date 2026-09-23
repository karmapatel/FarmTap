// Weather & Dynamic Market Events System
export const weatherTypes = ['sunny', 'heavy_rain', 'drought', 'festival'];

export const marketEventsList = [
  {
    id: 'festival',
    title: 'FESTIVAL DEMAND',
    icon: '🎉',
    desc: 'Town buyers are paying +35% bonus for fresh Tomato & Wheat!'
  },
  {
    id: 'drought',
    title: 'HEATWAVE DROUGHT',
    icon: '☀️',
    desc: 'Water scarce across the county! Commodity spot prices rising +25%.'
  },
  {
    id: 'heavy_rain',
    title: 'BUMPER MONSOON',
    icon: '🌧️',
    desc: 'Heavy rain moistens fields! Fast crop growth, prices slightly lower.'
  },
  {
    id: 'cargo',
    title: 'ROYAL CARGO SHIP',
    icon: '🚢',
    desc: 'Harbor captain Pete is offering premium rates on bulk Potato & Rice!'
  },
  {
    id: 'baker',
    title: "BAKER'S SHORTAGE",
    icon: '🥖',
    desc: "Baker Dan's flour silos run dry! Wheat and Sugar Cane prices surged!"
  }
];

export class EventSystem {
  constructor(initialWeather = 'sunny', initialEvent = null) {
    this.currentWeather = initialWeather;
    this.currentEvent = initialEvent || marketEventsList[0];
    this.weatherIdx = weatherTypes.indexOf(this.currentWeather);
    if (this.weatherIdx < 0) this.weatherIdx = 0;
  }

  getWeather() {
    return this.currentWeather;
  }

  getEvent() {
    return this.currentEvent;
  }

  cycleWeather() {
    this.weatherIdx = (this.weatherIdx + 1) % weatherTypes.length;
    this.currentWeather = weatherTypes[this.weatherIdx];
    this.applyWeatherToDOM();
    return this.currentWeather;
  }

  cycleEvent() {
    const nextIdx = (marketEventsList.findIndex(e => e.id === this.currentEvent.id) + 1) % marketEventsList.length;
    this.currentEvent = marketEventsList[nextIdx];
    return this.currentEvent;
  }

  applyWeatherToDOM() {
    const filter = document.getElementById('weatherFilter');
    const rainContainer = document.getElementById('rainContainer');
    const iconDisplay = document.getElementById('weatherIconDisplay');
    const textDisplay = document.getElementById('weatherTextDisplay');

    if (!filter || !rainContainer) return;

    rainContainer.classList.add('hidden');
    rainContainer.innerHTML = '';
    filter.className = 'absolute inset-0 z-30 pointer-events-none transition-all duration-1000';

    if (this.currentWeather === 'heavy_rain') {
      if (iconDisplay) iconDisplay.textContent = '🌧️';
      if (textDisplay) textDisplay.textContent = 'Heavy Rain';
      filter.style.backgroundColor = 'rgba(20, 50, 70, 0.35)';
      rainContainer.classList.remove('hidden');

      // Spawn rain drops
      for (let i = 0; i < 35; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.top = `${Math.random() * -30}px`;
        drop.style.animationDelay = `${Math.random() * 0.45}s`;
        rainContainer.appendChild(drop);
      }
    } else if (this.currentWeather === 'drought') {
      if (iconDisplay) iconDisplay.textContent = '☀️';
      if (textDisplay) textDisplay.textContent = 'Drought';
      filter.style.backgroundColor = 'rgba(220, 110, 20, 0.22)';
    } else if (this.currentWeather === 'festival') {
      if (iconDisplay) iconDisplay.textContent = '🎉';
      if (textDisplay) textDisplay.textContent = 'Harvest Gala';
      filter.style.backgroundColor = 'rgba(255, 220, 90, 0.15)';
    } else {
      if (iconDisplay) iconDisplay.textContent = '☀️';
      if (textDisplay) textDisplay.textContent = 'Sunny Day';
      filter.style.backgroundColor = 'transparent';
    }
  }
}
