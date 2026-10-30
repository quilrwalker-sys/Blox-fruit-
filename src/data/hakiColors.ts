import { HakiColor } from '../types/game';

export const HAKI_COLORS: HakiColor[] = [
  // --- COMUM (Preço acessível mas alto em Beli e Frags) ---
  {
    id: 'haki_obsidian_black',
    name: 'Preto Obsidiana',
    rarity: 'Comum',
    primaryColor: '#27272a',
    secondaryColor: '#52525b',
    darkColor: '#09090b',
    priceBeli: 1500000,
    priceFragments: 1500,
    spawnWeight: 20,
    description: 'A tonalidade clássica de endurecimento de Busoshoku. Armadura metálica de obsidiana impenetrável.',
    auraVisualDescription: 'Reflexos metálicos escuros e faíscas de carvão vegetal endurecido.',
    specialEffect: 'standard',
  },
  {
    id: 'haki_pure_white',
    name: 'Branco Neve Puro',
    rarity: 'Comum',
    primaryColor: '#f8fafc',
    secondaryColor: '#ffffff',
    darkColor: '#1e293b',
    priceBeli: 1500000,
    priceFragments: 1500,
    spawnWeight: 20,
    description: 'Uma aura pura e imaculada como a neve do topo de Drum Island.',
    auraVisualDescription: 'Anéis brancos celestiais e faíscas incandescentes prateadas.',
    specialEffect: 'standard',
  },
  {
    id: 'haki_sunset_orange',
    name: 'Laranja Pôr do Sol',
    rarity: 'Comum',
    primaryColor: '#ea580c',
    secondaryColor: '#fb923c',
    darkColor: '#431407',
    priceBeli: 1800000,
    priceFragments: 1800,
    spawnWeight: 18,
    description: 'Chamas ardentes que imitam o calor abrasador do crepúsculo de Alabasta.',
    auraVisualDescription: 'Aura incandescente em tons âmbar e partículas solares crepitantes.',
    specialEffect: 'standard',
  },

  // --- RARA (Cores ricas e brilhantes) ---
  {
    id: 'haki_amethyst_purple',
    name: 'Roxo Ametista Imperial',
    rarity: 'Rara',
    primaryColor: '#9333ea',
    secondaryColor: '#c084fc',
    darkColor: '#3b0764',
    priceBeli: 2800000,
    priceFragments: 2800,
    spawnWeight: 14,
    description: 'A cor tradicional dos grandes comandantes dos mares do Novo Mundo.',
    auraVisualDescription: 'Pulsos violeta intensos com relâmpagos púrpuras de choque espiritual.',
    specialEffect: 'standard',
  },
  {
    id: 'haki_golden_emperor',
    name: 'Dourado Imperador',
    rarity: 'Rara',
    primaryColor: '#eab308',
    secondaryColor: '#fef08a',
    darkColor: '#422006',
    priceBeli: 3200000,
    priceFragments: 3200,
    spawnWeight: 12,
    description: 'A aura dourada reluzente reservada aos futuros Reis dos Piratas.',
    auraVisualDescription: 'Aura cintilante em ouro puro com partículas divinas radiantes.',
    specialEffect: 'standard',
  },
  {
    id: 'haki_sakura_pink',
    name: 'Rosa Flor de Cerejeira',
    rarity: 'Rara',
    primaryColor: '#ec4899',
    secondaryColor: '#f472b6',
    darkColor: '#500724',
    priceBeli: 2600000,
    priceFragments: 2600,
    spawnWeight: 12,
    description: 'Inspirada nas pétalas de cerejeira do Reino de Wano. Suave à vista, letal no impacto.',
    auraVisualDescription: 'Pétalas rosadas flutuantes e faíscas magenta de alta pressão.',
    specialEffect: 'standard',
  },

  // --- LENDÁRIA (CORES RARÍSSIMAS SOLICITADAS) ---
  {
    id: 'haki_blood_red',
    name: 'Vermelho Sangue',
    rarity: 'Lendária',
    primaryColor: '#dc2626',
    secondaryColor: '#f87171',
    darkColor: '#450a0a',
    priceBeli: 5000000,
    priceFragments: 5000,
    spawnWeight: 5, // Muito Rara
    description: 'Forjada na fúria implacável dos mares carmesins. Uma das cores mais cobiçadas e temidas do oceano.',
    auraVisualDescription: 'Relâmpagos escarlates sangrentos, tendões de Haki carmesim e fumaça vermelha pulsante.',
    specialEffect: 'blood',
  },
  {
    id: 'haki_kitsune_blue',
    name: 'Azul Kitsune',
    rarity: 'Lendária',
    primaryColor: '#06b6d4',
    secondaryColor: '#67e8f9',
    darkColor: '#083344',
    priceBeli: 5000000,
    priceFragments: 5000,
    spawnWeight: 5, // Muito Rara
    description: 'Manifestação da raposa espiritual Kitsune ancestral. Chamas celestes de frio místico.',
    auraVisualDescription: 'Fogo-fátuo azul ciano etéreo e névoa espiritual de nove caudas ao redor do guerreiro.',
    specialEffect: 'kitsune',
  },
  {
    id: 'haki_dark_blade_green',
    name: 'Verde Dark Blade',
    rarity: 'Lendária',
    primaryColor: '#10b981',
    secondaryColor: '#6ee7b7',
    darkColor: '#022c22',
    priceBeli: 5500000,
    priceFragments: 5500,
    spawnWeight: 5, // Muito Rara
    description: 'A ressonância espiritual exata da Kokuto Yoru. Cortes esmeraldas que dividem montanhas inteiras.',
    auraVisualDescription: 'Aura laminada verde esmeralda com resíduos cortantes e faíscas afiadas da lâmina negra.',
    specialEffect: 'darkblade',
  },

  // --- MÍTICA (ULTRA-RARA EXTREMA SOLICITADA) ---
  {
    id: 'haki_leviathan_navy',
    name: 'Azul Marinho Leviathan',
    rarity: 'Mítica',
    primaryColor: '#1d4ed8',
    secondaryColor: '#60a5fa',
    darkColor: '#09132c',
    priceBeli: 10000000,
    priceFragments: 10000,
    spawnWeight: 2, // ULTRA RARO MESMO (~2% de chance na rotação do NPC)
    description: 'A cor de Haki mais rara e misteriosa de todo o universo. Extraída do coração do Leviatã Abissal nas fossas mais profundas do oceano.',
    auraVisualDescription: 'Ondas bioluminescentes abissais, relâmpagos azul-marinho profundo e espirais do dragão marinho primordial.',
    specialEffect: 'leviathan',
  },

  // --- INCOMPREENDIDO (MESMO NÍVEL DA FRUTA DO LEVIATHAN - EXCLUSIVO PAINEL ADM) ---
  {
    id: 'haki_rainbow_prismatic',
    name: 'Haki de Cor Colorida',
    rarity: 'Incompreendido',
    primaryColor: '#ec4899',
    secondaryColor: '#38bdf8',
    darkColor: '#31104b',
    priceBeli: 0,
    priceFragments: 0,
    spawnWeight: 0, // Nunca aparece no NPC
    adminOnly: true,
    description: 'O Haki de Cor Colorida de nível Incompreendido (mesmo nível da Fruta do Leviathan). Por enquanto não pode ser desbloqueado de forma alguma — exclusivo do Painel ADM.',
    auraVisualDescription: 'Aura Prismática Colorida em mutação contínua por todas as cores do arco-íris e relâmpagos multicolores.',
    specialEffect: 'rainbow',
  },
];

/**
 * Retorna uma cor de Haki pelo seu ID, ou o padrão 'haki_amethyst_purple' se não encontrada.
 */
export function getHakiColorById(id?: string): HakiColor {
  if (!id) return HAKI_COLORS[3]; // default Roxo Ametista
  const found = HAKI_COLORS.find((c) => c.id === id);
  return found || HAKI_COLORS[3];
}

/**
 * Sorteia uma cor de Haki com base nos pesos de raridade para a rotação de 15 minutos do NPC.
 * Nunca sorteia cores exclusivas de ADM (adminOnly).
 */
export function rollRandomHakiColor(): HakiColor {
  const pool = HAKI_COLORS.filter((c) => !c.adminOnly && c.spawnWeight > 0);
  const totalWeight = pool.reduce((acc, c) => acc + c.spawnWeight, 0);
  let random = Math.random() * totalWeight;
  for (const color of pool) {
    if (random < color.spawnWeight) {
      return color;
    }
    random -= color.spawnWeight;
  }
  return pool[0];
}
