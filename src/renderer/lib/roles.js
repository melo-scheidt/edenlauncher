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
  return ROLES[roleId] || ROLES[DEFAULT_ROLE];
}