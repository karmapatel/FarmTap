// Animal System V1 Definitions, Sprites, Roaming & Production Logic

export const ANIMAL_CONFIGS = {
  chicken: {
    id: 'chicken',
    name: 'Chicken',
    icon: '🐔',
    product: 'eggs',
    productName: 'Fresh Eggs',
    productIcon: '🥚',
    cost: 800,
    maxCapacity: 4,
    plural: 'Hens',
    housingType: 'coop',
    housingName: 'Chicken Coop',
    feedType: 'chickenFeed',
    feedName: 'Grain Feed',
    feedCost: 30,
    feedMeals: 5,
    basePrice: 45,
    productionHours: 1, // 1 hour per production cycle
    productionAmount: 5, // 5 eggs per hour when well-fed
    maxUncollected: 30,
    desc: 'Hens produce 5 fresh eggs every hour when fed grain feed.'
  },
  cow: {
    id: 'cow',
    name: 'Dairy Cow',
    icon: '🐄',
    product: 'milk',
    productName: 'Fresh Milk',
    productIcon: '🥛',
    cost: 2000,
    maxCapacity: 3,
    plural: 'Cows',
    housingType: 'livestockBarn',
    housingName: 'Livestock Barn',
    feedType: 'cowFeed',
    feedName: 'Hay Feed',
    feedCost: 60,
    feedMeals: 5,
    basePrice: 130,
    productionHours: 2, // 2 hours per production cycle
    productionAmount: 5, // 5 litres every 2 hours when well-fed
    maxUncollected: 20,
    desc: 'High-yield dairy cows produce 5 litres of fresh milk every 2 hours when fed hay.'
  }
};

export const HOUSING_CONFIGS = {
  coop: {
    id: 'coop',
    name: 'Chicken Coop',
    icon: '🛖',
    cost: 1200,
    capacity: 4,
    animalType: 'chicken',
    bounds: { minX: 86, maxX: 140, minY: 36, maxY: 95 },
    desc: 'Cozy wooden coop with nesting boxes and fenced roaming pen for up to 4 chickens.'
  },
  livestockBarn: {
    id: 'livestockBarn',
    name: 'Livestock Barn',
    icon: '🏚️',
    cost: 3000,
    capacity: 3,
    animalType: 'cow',
    bounds: { minX: 135, maxX: 415, minY: 40, maxY: 185 },
    desc: 'Spacious animal shelter with feeding troughs and fenced pasture for up to 3 dairy cows.'
  }
};

export const FEED_CONFIGS = {
  chicken: {
    id: 'chickenFeed',
    name: 'Grain Feed',
    basePrice: 30,
    minPrice: 15,
    maxPrice: 60,
    baseCost: 30,
    minCost: 15,
    maxCost: 60,
    unitsPerPurchase: 5
  },
  cow: {
    id: 'cowFeed',
    name: 'Hay Feed',
    basePrice: 60,
    minPrice: 30,
    maxPrice: 110,
    baseCost: 60,
    minCost: 30,
    maxCost: 110,
    unitsPerPurchase: 5
  }
};

export const PRODUCT_CONFIGS = {
  eggs: {
    id: 'eggs',
    name: 'Fresh Eggs',
    icon: '🥚',
    basePrice: 45,
    minPrice: 20,
    maxPrice: 85,
    baseCost: 15,
    minCost: 8,
    maxCost: 25,
    buyer: 'Baker Dan',
    desc: 'Farm-fresh organic eggs in high demand at town bakeries.'
  },
  milk: {
    id: 'milk',
    name: 'Fresh Milk',
    icon: '🥛',
    basePrice: 130,
    minPrice: 100,
    maxPrice: 220,
    baseCost: 35,
    minCost: 20,
    maxCost: 60,
    buyer: 'Grocer Rosa',
    desc: 'Rich creamy dairy milk sought after by local grocers and creameries (Always > $100).'
  }
};

/* ==========================================================================
   2D ANIMAL SPRITE SVG GENERATORS (Interactive & Animated)
   ========================================================================== */

export function renderChickenSprite(chicken, isEating = false) {
  const hungerPct = chicken.hunger !== undefined ? chicken.hunger : 100;
  const carePct = chicken.care !== undefined ? chicken.care : 100;
  const isHungry = hungerPct < 30;

  return `
    <div class="chicken-sprite-container relative select-none pointer-events-auto cursor-pointer group" style="width: 32px; height: 32px;" title="${chicken.name || 'Chicken'} (Hunger: ${hungerPct}%, Care: ${carePct}%)">
      <!-- Shadow -->
      <div class="absolute bottom-0 left-1 w-6 h-2 bg-black/30 rounded-full filter blur-[1px]"></div>
      
      <!-- SVG Body -->
      <svg viewBox="0 0 32 32" class="w-full h-full drop-shadow ${isEating ? 'animate-bounce' : 'chicken-peck-anim'} group-hover:scale-110 transition-transform">
        <!-- Comb -->
        <path d="M 16 4 Q 18 1 20 4 Q 22 2 24 5" fill="#ef4444" stroke="#991b1b" stroke-width="0.8"></path>

        <!-- Tail feathers -->
        <path d="M 6 12 Q 2 8 4 16 Q 1 14 5 18" fill="#facc15" stroke="#ca8a04" stroke-width="0.8"></path>

        <!-- Body -->
        <ellipse cx="16" cy="18" rx="10" ry="8" fill="${isHungry ? '#fef08a' : '#fde047'}" stroke="#ca8a04" stroke-width="1.2"></ellipse>
        
        <!-- Wing -->
        <path d="M 12 16 Q 8 20 15 22 Z" fill="#eab308" stroke="#a16207" stroke-width="0.8"></path>

        <!-- Head -->
        <circle cx="21" cy="11" r="5.5" fill="${isHungry ? '#fef08a' : '#fde047'}" stroke="#ca8a04" stroke-width="1"></circle>

        <!-- Beak -->
        <polygon points="26,10 30,12 26,14" fill="#f97316" stroke="#c2410c" stroke-width="0.6"></polygon>
        
        <!-- Wattle -->
        <ellipse cx="25" cy="15" rx="1.5" ry="2.5" fill="#ef4444"></ellipse>

        <!-- Eye -->
        <circle cx="22" cy="10" r="1" fill="#1e293b"></circle>

        <!-- Legs -->
        <line x1="14" y1="25" x2="13" y2="30" stroke="#f97316" stroke-width="1.5" stroke-linecap="round"></line>
        <line x1="18" y1="25" x2="19" y2="30" stroke="#f97316" stroke-width="1.5" stroke-linecap="round"></line>
      </svg>

      <!-- Status Indicator Bubble -->
      ${isHungry ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-900 text-amber-200 text-[7px] font-bold px-1 rounded-full border border-amber-400 animate-pulse">🌾 Hungry</div>' : ''}
    </div>
  `;
}

export function renderCowSprite(cow, isEating = false) {
  const hungerPct = cow.hunger !== undefined ? cow.hunger : 100;
  const carePct = cow.care !== undefined ? cow.care : 100;
  const isHungry = hungerPct < 30;

  return `
    <div class="cow-sprite-container relative select-none pointer-events-auto cursor-pointer group" style="width: 48px; height: 42px;" title="${cow.name || 'Dairy Cow'} (Hunger: ${hungerPct}%, Care: ${carePct}%)">
      <!-- Shadow -->
      <div class="absolute bottom-0 left-1.5 w-10 h-3 bg-black/30 rounded-full filter blur-[1px]"></div>

      <!-- SVG Body -->
      <svg viewBox="0 0 48 42" class="w-full h-full drop-shadow ${isEating ? 'animate-pulse' : 'cow-sway-anim'} group-hover:scale-105 transition-transform">
        <!-- Legs -->
        <rect x="10" y="28" width="4" height="11" fill="#f8fafc" stroke="#334155" stroke-width="1" rx="1"></rect>
        <rect x="18" y="28" width="4" height="11" fill="#0f172a" stroke="#334155" stroke-width="1" rx="1"></rect>
        <rect x="28" y="28" width="4" height="11" fill="#f8fafc" stroke="#334155" stroke-width="1" rx="1"></rect>
        <rect x="36" y="28" width="4" height="11" fill="#0f172a" stroke="#334155" stroke-width="1" rx="1"></rect>

        <!-- Udder -->
        <ellipse cx="24" cy="28" rx="4" ry="3" fill="#fbcfe8" stroke="#f472b6" stroke-width="0.8"></ellipse>

        <!-- Main Body -->
        <rect x="8" y="12" width="32" height="18" rx="6" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"></rect>

        <!-- Black Spots -->
        <path d="M 12 12 Q 16 18 20 13 Q 18 22 10 20 Z" fill="#0f172a"></path>
        <path d="M 28 14 Q 34 16 32 24 Q 24 22 28 14 Z" fill="#0f172a"></path>

        <!-- Tail -->
        <path d="M 8 16 Q 4 18 5 25" stroke="#1e293b" stroke-width="1.5" fill="none" class="cow-tail-anim"></path>
        <circle cx="5" cy="26" r="1.5" fill="#0f172a"></circle>

        <!-- Head -->
        <rect x="32" y="8" width="14" height="14" rx="4" fill="#f8fafc" stroke="#1e293b" stroke-width="1.2"></rect>
        <path d="M 32 8 Q 36 12 40 8 Z" fill="#0f172a"></path>

        <!-- Snout -->
        <rect x="38" y="14" width="9" height="7" rx="2.5" fill="#fbcfe8" stroke="#f472b6" stroke-width="0.8"></rect>
        <circle cx="41" cy="17.5" r="0.8" fill="#9d174d"></circle>
        <circle cx="44" cy="17.5" r="0.8" fill="#9d174d"></circle>

        <!-- Horns -->
        <path d="M 34 8 Q 32 4 30 6" stroke="#cbd5e1" stroke-width="1.5" fill="none"></path>
        <path d="M 38 8 Q 38 4 36 6" stroke="#cbd5e1" stroke-width="1.5" fill="none"></path>

        <!-- Ear -->
        <ellipse cx="33" cy="11" rx="2" ry="1.2" fill="#f8fafc" stroke="#1e293b" stroke-width="0.8"></ellipse>

        <!-- Eye -->
        <circle cx="36" cy="12" r="1" fill="#1e293b"></circle>
      </svg>

      <!-- Status Indicator Bubble -->
      ${isHungry ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-900 text-amber-200 text-[7px] font-bold px-1 rounded-full border border-amber-400 animate-pulse">🌾 Hungry</div>' : ''}
    </div>
  `;
}

/* ==========================================================================
   ANIMAL REAL-TIME PRODUCTION & CARE CALCULATIONS
   ========================================================================== */

export function processLivestockHourlyCycle(state, hoursPassed = 1) {
  if (hoursPassed <= 0) return;

  const housing = state.housing || {};
  const animals = state.animals || { chickens: [], cows: [] };

  // Process Chickens
  if (housing.coop && housing.coop.owned && Array.isArray(animals.chickens)) {
    animals.chickens.forEach((chicken) => {
      if (chicken.hunger === undefined) chicken.hunger = 100;
      if (chicken.care === undefined) chicken.care = 100;
      if (chicken.uncollected === undefined) chicken.uncollected = 0;

      // Decrease hunger by 33.33 per hour (takes exactly 3 hours from 100 to 0)
      chicken.hunger = Math.max(0, chicken.hunger - (100 / 3) * hoursPassed);

      // Decreased care if hungry
      if (chicken.hunger < 30) {
        chicken.care = Math.max(10, chicken.care - 10 * hoursPassed);
      }

      // Production logic: if hunger >= 20, produce 5 eggs per hour
      if (chicken.hunger >= 20) {
        const potential = (ANIMAL_CONFIGS.chicken.productionAmount || 5) * hoursPassed;
        if (potential > 0) {
          chicken.uncollected = Math.min(
            ANIMAL_CONFIGS.chicken.maxUncollected,
            (chicken.uncollected || 0) + potential
          );
        }
      }
    });
  }

  // Process Cows
  if (housing.livestockBarn && housing.livestockBarn.owned && Array.isArray(animals.cows)) {
    animals.cows.forEach((cow) => {
      if (cow.hunger === undefined) cow.hunger = 100;
      if (cow.care === undefined) cow.care = 100;
      if (cow.uncollected === undefined) cow.uncollected = 0;

      // Decrease hunger by 33.33 per hour (takes exactly 3 hours from 100 to 0)
      cow.hunger = Math.max(0, cow.hunger - (100 / 3) * hoursPassed);

      // Decreased care if hungry
      if (cow.hunger < 30) {
        cow.care = Math.max(10, cow.care - 10 * hoursPassed);
      }

      // Production logic: produce 5 litres per 2 hours when hunger >= 20
      if (cow.hunger >= 20) {
        const cycles = Math.floor(hoursPassed / ANIMAL_CONFIGS.cow.productionHours);
        const potential = cycles * (ANIMAL_CONFIGS.cow.productionAmount || 5);
        if (potential > 0) {
          cow.uncollected = Math.min(
            ANIMAL_CONFIGS.cow.maxUncollected,
            (cow.uncollected || 0) + potential
          );
        }
      }
    });
  }
}

/* ==========================================================================
   ANIMAL ROAMING CONTROLLER (Smooth Natural Movement Inside Enclosure Bounds)
   ========================================================================== */

export class LivestockManager {
  constructor(state, showFloatingTextCallback, audioCallback) {
    this.state = state;
    this.showFloatingText = showFloatingTextCallback;
    this.audio = audioCallback;
    this.roamIntervals = [];
  }

  processHourlyCycle(hoursPassed = 1) {
    processLivestockHourlyCycle(this.state, hoursPassed);
  }

  tick(seconds = 1) {
    // Step animal positions inside enclosure bounds
    this.stepAnimalPositions();
  }

  initRoaming() {
    this.stopRoaming();

    // Start roaming updates every 3-5 seconds
    const interval = setInterval(() => {
      this.stepAnimalPositions();
    }, 3500);

    this.roamIntervals.push(interval);
  }

  stopRoaming() {
    this.roamIntervals.forEach(id => clearInterval(id));
    this.roamIntervals = [];
  }

  stepAnimalPositions() {
    const housing = this.state.housing;
    const animals = this.state.animals;

    if (!housing || !animals) return;

    // Move Chickens inside Coop Pen
    if (housing.coop && housing.coop.owned && Array.isArray(animals.chickens)) {
      const bounds = HOUSING_CONFIGS.coop.bounds;
      animals.chickens.forEach((c, idx) => {
        const el = document.getElementById(`chicken-anim-${idx}`);
        if (el) {
          const targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
          const targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
          const currentX = parseFloat(el.style.left) || targetX;
          
          el.style.left = `${targetX}px`;
          el.style.top = `${targetY}px`;
          el.style.transform = targetX < currentX ? 'scaleX(-1)' : 'scaleX(1)';
        }
      });
    }

    // Move Cows inside Livestock Barn Pen
    if (housing.livestockBarn && housing.livestockBarn.owned && Array.isArray(animals.cows)) {
      const bounds = HOUSING_CONFIGS.livestockBarn.bounds;
      animals.cows.forEach((c, idx) => {
        const el = document.getElementById(`cow-anim-${idx}`);
        if (el) {
          const targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
          const targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
          const currentX = parseFloat(el.style.left) || targetX;

          el.style.left = `${targetX}px`;
          el.style.top = `${targetY}px`;
          el.style.transform = targetX < currentX ? 'scaleX(-1)' : 'scaleX(1)';
        }
      });
    }
  }
}
