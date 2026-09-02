import React from 'react';
import { getRole } from '../lib/roles.js';

export default function RoleTag({ role, size = 'sm' }) {
  const r = getRole(role);

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: 'var(--font-heading)',
    fontSize: size === 'lg' ? 10 : 8.5,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: r.color,
    background: r.bg,
    border: `1px solid ${r.border}`,
    padding: size === 'lg' ? '3px 8px' : '2px 6px',
    borderRadius: 5,
    whiteSpace: 'nowrap',
    lineHeight: 1,
  };

  return <span className="eden-role-tag" style={style}>{r.label}</span>;
}