import React from 'react';

// Top header with the Éden brand on the left and a small player pill
// preview on the right (mirrors what's edited in HomeTab).
export default function Header({ profile }) {
  const initials = (profile.nickname || 'N').slice(0, 1).toUpperCase();
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">N</div>
        <div className="brand-text">
          <h1 className="eden-gradient-text">ÉDEN&nbsp;MC·RP</h1>
          <small>LAUNCHER · PHASE 1</small>
        </div>
      </div>

      <div className="header-right">
        <span className="eden-chip" style={{ borderColor: 'rgba(0,229,255,0.5)', color: 'var(--eden-cyan)' }}>
          ● Modo Offline
        </span>
        <div className="player-pill">
          <div className="avatar-mini">{initials}</div>
          <div>
            <div className="nick">{profile.nickname}</div>
            <div className="uuid">{profile.uuid.slice(0, 8)}…{profile.uuid.slice(-4)}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
