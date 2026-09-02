// Tags de cargo dos usuários do launcher.
// Cada conta possui exatamente uma role.

export const ROLES = {
  player: {
    id: 'player',
    label: 'Player',
    color: '#9ca3af',
    bg: 'rgba(156, 163, 175, 0.14)',
    border: 'rgba(156, 163, 175, 0.4)',
  },
  cobre: {
    id: 'cobre',
    label: 'VIP Cobre',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.15)',
    border: 'rgba(217, 119, 6, 0.5)',
  },
  vip_cobre: {
    id: 'vip_cobre',
    label: 'VIP Cobre',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.15)',
    border: 'rgba(217, 119, 6, 0.5)',
  },
  ferro: {
    id: 'ferro',
    label: 'VIP Ferro',
    color: '#cbd5e1',
    bg: 'rgba(203, 213, 225, 0.15)',
    border: 'rgba(203, 213, 225, 0.5)',
  },
  vip_ferro: {
    id: 'vip_ferro',
    label: 'VIP Ferro',
    color: '#cbd5e1',
    bg: 'rgba(203, 213, 225, 0.15)',
    border: 'rgba(203, 213, 225, 0.5)',
  },
  diamante: {
    id: 'diamante',
    label: 'VIP Diamante',
    color: '#00f5d4',
    bg: 'rgba(0, 245, 212, 0.15)',
    border: 'rgba(0, 245, 212, 0.5)',
  },
  vip_diamante: {
    id: 'vip_diamante',
    label: 'VIP Diamante',
    color: '#00f5d4',
    bg: 'rgba(0, 245, 212, 0.15)',
    border: 'rgba(0, 245, 212, 0.5)',
  },
  rubi: {
    id: 'rubi',
    label: 'VIP Rubi',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.18)',
    border: 'rgba(244, 63, 94, 0.55)',
  },
  vip_rubi: {
    id: 'vip_rubi',
    label: 'VIP Rubi',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.18)',
    border: 'rgba(244, 63, 94, 0.55)',
  },
  vip: {
    id: 'vip',
    label: 'VIP',
    color: '#00f5d4',
    bg: 'rgba(0, 245, 212, 0.15)',
    border: 'rgba(0, 245, 212, 0.5)',
  },
  mod: {
    id: 'mod',
    label: 'Mod',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.14)',
    border: 'rgba(59, 130, 246, 0.45)',
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.45)',
  },
};

export const DEFAULT_ROLE = 'player';

export function getRole(roleId) {
  if (!roleId) return ROLES[DEFAULT_ROLE];
  const normalized = String(roleId).toLowerCase().trim();
  return ROLES[normalized] || ROLES[DEFAULT_ROLE];
}