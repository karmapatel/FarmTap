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
    icon: '🍬',
    color: '#ec4899',
    buyer: 'Baker Dan',
    desc: 'Premium confectionary sweetener for town treats.'
  }
};

export function renderCropPlantSprites(cropId, progress) {
  const cfg = cropConfigs[cropId] || cropConfigs.wheat;
  const icon = cfg.icon;

  if (progress >= 100) {
    // Mature stage: 2 large swaying plants with glow
    return `
      <div class="plant-stalk flex items-end justify-center w-full gap-2 wind-sway">
        <span class="text-2xl filter drop-shadow">${icon}</span>
        <span class="text-2xl filter drop-shadow">${icon}</span>
      </div>
    `;
  } else if (progress >= 50) {
    // Mid growth: 1 young crop + small sprout
    return `
      <div class="plant-stalk flex items-end justify-center w-full gap-2 wind-sway">
        <span class="text-xl filter drop-shadow">${icon}</span>
        <span class="text-sm">🌿</span>
      </div>
    `;
  } else {
    // Early sprout stage
    return `
      <div class="plant-stalk flex items-end justify-center w-full gap-2">
        <span class="text-base animate-pulse">🌱</span>
        <span class="text-xs">🌱</span>
      </div>
    `;
  }
}
