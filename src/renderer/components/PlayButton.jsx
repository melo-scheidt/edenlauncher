import React from 'react';

// The hero "JOGAR" button — neon pulsing, gradient, hover glow.
export default function PlayButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`play-button ${disabled ? 'is-disabled' : ''}`}
    >
      <span className="play-button-bg" />
      <span className="play-button-shine" />
      <span className="play-button-content">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M5 3.5L18 11L5 18.5V3.5Z" fill="currentColor" />
        </svg>
        <span className="play-button-label">JOGAR</span>
      </span>
      <span className="play-button-sub">Éden RP · 1.21.5</span>
    </button>
  );
}
