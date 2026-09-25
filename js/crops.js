// Crop Definitions and Visual Sprites
export const cropConfigs = {
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    cost: 6,
    baseCost: 6,
    minCost: 3,
    maxCost: 10,
    time: 10,
    basePrice: 32,
    minPrice: 14,
    maxPrice: 55,
    icon: '🌾',
    color: '#facc15',
    buyer: 'Baker Dan',
    desc: 'Golden grain staple for rustic town bakeries.'
  },
  corn: {
    id: 'corn',
    name: 'Corn',
    cost: 12,
    baseCost: 12,
    minCost: 7,
    maxCost: 18,
    time: 16,
    basePrice: 47,
    minPrice: 20,
    maxPrice: 75,
    icon: '🌽',
    color: '#eab308',
    buyer: 'Grocer Rosa',
    desc: 'Sweet golden cobs popular with town grocers.'
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    cost: 18,
    baseCost: 18,
    minCost: 11,
    maxCost: 27,
    time: 22,
    basePrice: 49,
    minPrice: 24,
    maxPrice: 90,
    icon: '🍅',
    color: '#ef4444',
    buyer: 'Grocer Rosa',
    desc: 'Juicy heirloom tomatoes that fetch high chef prices.'
  },
  potato: {
    id: 'potato',
    name: 'Potato',
    cost: 5,
    baseCost: 5,
    minCost: 2,
    maxCost: 9,
    time: 8,
    basePrice: 10,
    minPrice: 6,
    maxPrice: 28,
    icon: '🥔',
    color: '#d97706',
    buyer: 'Captain Pete',
    desc: 'Fast-growing hardy tubers for maritime export.'
  },
  rice: {
    id: 'rice',
    name: 'Rice',
    cost: 14,
    baseCost: 14,
    minCost: 8,
    maxCost: 22,
    time: 14,
    basePrice: 32,
    minPrice: 16,
    maxPrice: 58,
    icon: '🍚',
    color: '#f8fafc',
    buyer: 'Captain Pete',
    desc: 'Versatile paddy crop with strong overseas demand.'
  },
  sugarcane: {
    id: 'sugarcane',
    name: 'Sugar Cane',
    cost: 25,
    baseCost: 25,
    minCost: 15,
    maxCost: 38,
    time: 30,
    basePrice: 65,
    minPrice: 35,
    maxPrice: 120,
    icon: '🎋',
    color: '#10b981',
    buyer: 'Baker Dan',
    desc: 'Tall sweet tropical cane stalks with high juice yield.'
  }
};

export const CROP_GROWTH_STAGES = {
  wheat: {
    animClass: 'anim-wheat',
    readyClass: 'ready-wheat',
    color: '#eab308',
    sprout: { icons: ['🌾', '🌱'], label: 'Wheat Sprout' },
    small: { icons: ['🌿', '🌾'], label: 'Green Blades' },
    medium: { icons: ['🌾', '🌿'], label: 'Grain Stalk' },
    maturing: { icons: ['🌾', '🌾'], label: 'Golden Sheaf' },
    full: { icons: ['🌾', '✨', '🌾'], label: 'Ripe Wheat' }
  },
  corn: {
    animClass: 'anim-corn',
    readyClass: 'ready-corn',
    color: '#facc15',
    sprout: { icons: ['🌱', '🪴'], label: 'Corn Seedling' },
    small: { icons: ['🌿', '🌽'], label: 'Leafy Stalk' },
    medium: { icons: ['🌽', '🌿'], label: 'Silk Tassels' },
    maturing: { icons: ['🌽', '🌽'], label: 'Sweet Cobs' },
    full: { icons: ['🌽', '✨', '🌽'], label: 'Golden Corn' }
  },
  tomato: {
    animClass: 'anim-tomato',
    readyClass: 'ready-tomato',
    color: '#ef4444',
    sprout: { icons: ['🌱', '🍃'], label: 'Vine Sprout' },
    small: { icons: ['🌿', '☘️'], label: 'Tomato Vine' },
    medium: { icons: ['🌼', '🌿'], label: 'Yellow Flowers' },
    maturing: { icons: ['🍅', '🌿'], label: 'Reddening Fruit' },
    full: { icons: ['🍅', '✨', '🍅'], label: 'Juicy Tomatoes' }
  },
  potato: {
    animClass: 'anim-potato',
    readyClass: 'ready-potato',
    color: '#ca8a04',
    sprout: { icons: ['🥔', '🌱'], label: 'Tuber Eye' },
    small: { icons: ['☘️', '🌿'], label: 'Potato Bush' },
    medium: { icons: ['🌸', '🌿'], label: 'Flowering Bush' },
    maturing: { icons: ['🥔', '☘️'], label: 'Soil Mound' },
    full: { icons: ['🥔', '✨', '🥔'], label: 'Russet Harvest' }
  },
  rice: {
    animClass: 'anim-rice',
    readyClass: 'ready-rice',
    color: '#06b6d4',
    sprout: { icons: ['🌱', '💧'], label: 'Water Shoot' },
    small: { icons: ['🌿', '🌾'], label: 'Paddy Blade' },
    medium: { icons: ['🌾', '💧'], label: 'Paddy Grass' },
    maturing: { icons: ['🌾', '🍚'], label: 'Bowing Grain' },
    full: { icons: ['🍚', '✨', '🌾'], label: 'Pearl Rice' }
  },
  sugarcane: {
    animClass: 'anim-sugarcane',
    readyClass: 'ready-sugarcane',
    color: '#10b981',
    sprout: { icons: ['🌱', '🎋'], label: 'Cane Sprout' },
    small: { icons: ['🎋', '🌱'], label: 'Young Reed' },
    medium: { icons: ['🎋', '🌿'], label: 'Tropical Cane' },
    maturing: { icons: ['🎋', '🎋'], label: 'Sweet Reeds' },
    full: { icons: ['🎋', '✨', '🎋'], label: 'Cane Harvest' }
  }
};

export function renderCropPlantSprites(cropId, progress) {
  const cfg = cropConfigs[cropId] || cropConfigs.wheat;
  const stages = CROP_GROWTH_STAGES[cropId] || {
    animClass: 'anim-wheat',
    readyClass: 'ready-wheat',
    color: '#eab308',
    sprout: { icons: ['🌱', cfg.icon], label: `${cfg.name} Sprout` },
    small: { icons: ['🌿', cfg.icon], label: 'Small Plant' },
    medium: { icons: ['🌿', cfg.icon], label: 'Growing' },
    maturing: { icons: [cfg.icon, '🌿'], label: 'Maturing' },
    full: { icons: [cfg.icon, '✨', cfg.icon], label: 'Full Plant' }
  };

  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  if (pct >= 100) {
    // Stage 5: Full Plant / Mature (100%) - Ready for harvest with crop-specific animation & celebration
    const s = stages.full;
    return `
      <div class="plant-stage-wrapper flex flex-col items-center justify-center w-full h-full select-none">
        <div class="plant-stalk flex items-end justify-center w-full gap-1 h-6 ${stages.animClass} ${stages.readyClass}">
          <span class="text-2xl filter drop-shadow">${s.icons[0]}</span>
          <span class="text-xs text-yellow-300 animate-pulse">✨</span>
          <span class="text-2xl filter drop-shadow">${s.icons[2] || s.icons[0]}</span>
        </div>
        <span class="text-[8px] font-bold text-emerald-400 font-pixel tracking-tight leading-none mt-1">${s.label}</span>
      </div>
    `;
  } else if (pct >= 75) {
    // Stage 4: Maturing Plant (75% - 99%) - Ripening crop with distinct crop animation
    const s = stages.maturing;
    return `
      <div class="plant-stage-wrapper flex flex-col items-center justify-center w-full h-full select-none">
        <div class="plant-stalk flex items-end justify-center w-full gap-1.5 h-6 ${stages.animClass}">
          <span class="text-xl filter drop-shadow">${s.icons[0]}</span>
          <span class="text-base filter drop-shadow">${s.icons[1]}</span>
        </div>
        <span class="text-[8px] font-bold uppercase tracking-tight leading-none mt-1" style="color: ${stages.color}">${s.label}</span>
      </div>
    `;
  } else if (pct >= 50) {
    // Stage 3: Growing Plant (50% - 74%) - Foliage and flowers with distinct crop animation
    const s = stages.medium;
    return `
      <div class="plant-stage-wrapper flex flex-col items-center justify-center w-full h-full select-none">
        <div class="plant-stalk flex items-end justify-center w-full gap-1.5 h-6 ${stages.animClass}">
          <span class="text-xl filter drop-shadow">${s.icons[0]}</span>
          <span class="text-base filter drop-shadow">${s.icons[1]}</span>
        </div>
        <span class="text-[8px] font-bold text-yellow-300 uppercase tracking-tight leading-none mt-1">${s.label}</span>
      </div>
    `;
  } else if (pct >= 25) {
    // Stage 2: Small Plant (25% - 49%) - Young shoot with distinct crop animation
    const s = stages.small;
    return `
      <div class="plant-stage-wrapper flex flex-col items-center justify-center w-full h-full select-none">
        <div class="plant-stalk flex items-end justify-center w-full gap-1.5 h-6 ${stages.animClass}">
          <span class="text-lg filter drop-shadow">${s.icons[0]}</span>
          <span class="text-sm filter drop-shadow">${s.icons[1]}</span>
        </div>
        <span class="text-[8px] font-bold text-lime-300 uppercase tracking-tight leading-none mt-1">${s.label}</span>
      </div>
    `;
  } else {
    // Stage 1: Sprout (0% - 24%) - Emerging seedling with distinct crop seedling icons & animation
    const s = stages.sprout;
    return `
      <div class="plant-stage-wrapper flex flex-col items-center justify-center w-full h-full select-none">
        <div class="plant-stalk flex items-end justify-center gap-1.5 h-6 ${stages.animClass}">
          <span class="text-base filter drop-shadow" title="${s.label}">${s.icons[0]}</span>
          <span class="text-xs text-stone-200 filter drop-shadow">${s.icons[1]}</span>
        </div>
        <span class="text-[8px] font-bold text-emerald-300 uppercase tracking-tight leading-none mt-1">${s.label}</span>
      </div>
    `;
  }
}
