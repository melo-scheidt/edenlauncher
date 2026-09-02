// Mock data used by the launcher UI during Phase 1.
// Will be replaced by real API calls in later phases.

export const REQUIRED_MODS = [
  {
    id: 'forge',
    name: 'Minecraft Forge',
    version: '1.21.5-55.1.0',
    description: 'Loader oficial requerido pelo modpack Éden RP.',
    sha: 'b3f1...91ac',
  },
  {
    id: 'customnpcs',
    name: 'CustomNPCs',
    version: '1.21.5-1.4.5',
    description: 'NPCs e missões para a economia roleplay do servidor.',
    sha: 'e7a2...4b80',
  },
  {
    id: 'flansmod',
    name: 'Flan\'s Mod',
    version: '5.10.4',
    description: 'Veículos, armas e equipamentos do universo Éden.',
    sha: '2c4f...d811',
  },
  {
    id: 'voicechat',
    name: 'Simple Voice Chat',
    version: '2.5.16',
    description: 'Voice chat proximal obrigatório para imersão RP.',
    sha: '88a0...37e2',
  },
  {
    id: 'mrcrayfish',
    name: 'MrCrayfish\'s Furniture',
    version: '7.0.0',
    description: 'Mobília urbana usada nas construções dos cenários.',
    sha: 'ff10...90c3',
  },
  {
    id: 'jei',
    name: 'JEI - Just Enough Items',
    version: '15.2.0.27',
    description: 'Visualizador oficial de itens e receitas do modpack.',
    sha: '4521...aabb',
  },
  {
    id: 'iris',
    name: 'Oculus (Iris Forge)',
    version: '1.7.0',
    description: 'Carregador de shaders integrado ao modpack.',
    sha: '9933...0099',
  },
  {
    id: 'biomesoplenty',
    name: 'Biomes O\' Plenty',
    version: '18.0.0.598',
    description: 'Conjunto de biomas usados no mapa Éden City.',
    sha: '12ee...77ce',
  },
];

export const OPTIONAL_MODS = [
  {
    id: 'optifabric',
    name: 'Embeddium (Sodium Forge)',
    version: '0.3.18',
    description: 'Otimizações de renderização (recomendado em PCs médios).',
    defaultEnabled: true,
  },
  {
    id: 'minimap',
    name: 'Xaero\'s Minimap',
    version: '23.9.6',
    description: 'Minimapa configurável e leve.',
    defaultEnabled: true,
  },
  {
    id: 'inventorytweaks',
    name: 'Inventory Profiles Next',
    version: '1.10.7',
    description: 'Organização rápida de inventário e baús.',
    defaultEnabled: false,
  },
  {
    id: 'dynamiclights',
    name: 'Dynamic Lights',
    version: '1.7.1',
    description: 'Tochas e itens iluminam o ambiente ao serem segurados.',
    defaultEnabled: true,
  },
  {
    id: 'shoulder',
    name: 'Shoulder Surfing Reloaded',
    version: '3.2.5',
    description: 'Câmera por cima do ombro (estilo TPS).',
    defaultEnabled: false,
  },
];

export const SHADERS = [
  {
    id: 'complementary',
    name: 'Complementary Reimagined',
    author: 'EminGT',
    tag: 'Cinemático',
    accent: '#FF1744',
  },
  {
    id: 'bsl',
    name: 'BSL Shaders',
    author: 'CaptTatsu',
    tag: 'Equilibrado',
    accent: '#9C27B0',
  },
  {
    id: 'sildurs',
    name: 'Sildur\'s Vibrant',
    author: 'Sildur',
    tag: 'Vibrante',
    accent: '#00E5FF',
  },
];

export const NEWS = [
  {
    id: 'n1',
    date: '2026-04-28',
    title: 'Éden City — Atualização 1.4.2',
    summary:
      'Nova zona "Setor Magenta", facção Voidline e 12 novos veículos urbanos disponíveis.',
    tag: 'Update',
  },
  {
    id: 'n2',
    date: '2026-04-22',
    title: 'Evento RP: Corrida da Nebulosa',
    summary:
      'Inscrições abertas para a corrida noturna no Distrito Neon. Premiação em créditos NBL.',
    tag: 'Evento',
  },
  {
    id: 'n3',
    date: '2026-04-15',
    title: 'Manutenção programada',
    summary:
      'Servidor offline para manutenção dia 06/05 às 03:00 BRT. Tempo estimado: 45 minutos.',
    tag: 'Aviso',
  },
];

export const SUPPORT_LINKS = [
  {
    id: 'discord',
    label: 'Discord oficial',
    url: 'https://discord.gg/XE5SsTurP5',
    description: 'Comunidade, suporte ao vivo e canais de RP.',
    color: '#5865F2',
  },
  {
    id: 'website',
    label: 'Website',
    url: 'https://eden.net',
    description: 'Notícias, ranking e loja oficial do servidor.',
    color: '#9C27B0',
  },
  {
    id: 'faq',
    label: 'FAQ & Tutoriais',
    url: 'https://eden.net/faq',
    description: 'Guias rápidos para resolver problemas comuns.',
    color: '#00E5FF',
  },
];

// Simulated server status — in real life, fetched from an API.
export function fakeServerStatus() {
  const online = Math.random() > 0.05; // 95% online
  const players = online ? 30 + Math.floor(Math.random() * 70) : 0;
  return {
    online,
    players,
    maxPlayers: 100,
    host: 'jogar.eden.net',
    motd: 'Éden MC·RP — Bem-vindo, runner.',
    ping: 18 + Math.floor(Math.random() * 25),
  };
}
