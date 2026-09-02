import React from 'react';

export default function EdenLogo({ size = 'medium', showBeta = true, showText = true, className = '' }) {
  const iconDimensions = {
    small: 32,
    medium: 44,
    large: 64,
    'icon-only': 38,
  }[size] || 44;

  return (
    <div className={`eden-logo-wrap eden-logo--${size} ${className}`}>
      {/* Icon Badge */}
      <div className="eden-crest-badge" style={{ width: iconDimensions, height: iconDimensions }}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="eden-crest-svg"
        >
          {/* Outer squircle */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="crest-outer-border"
          />
          {/* Inner Crest Graphic (heraldic beast / feline head) */}
          <path
            d="M13 15C13 15 15.5 12 24 12C32.5 12 35 15 35 15"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Ears / Crown Peaks */}
          <path
            d="M14 17L18 22M34 17L30 22"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Crown Center Gem / Peak */}
          <path
            d="M24 14V19"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Eyes */}
          <circle cx="19" cy="24" r="1.8" fill="currentColor" />
          <circle cx="29" cy="24" r="1.8" fill="currentColor" />
          {/* Nose & Snout */}
          <path
            d="M24 26.5L22 29H26L24 26.5Z"
            fill="currentColor"
          />
          <path
            d="M24 29V32.5M24 32.5C22 32.5 20.5 31.5 19 30M24 32.5C26 32.5 27.5 31.5 29 30"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Whisker / Jaw Accent Lines */}
          <path
            d="M14 28L17 29M34 28L31 29"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M15 32L18 32.5M33 32L30 32.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Chin */}
          <path
            d="M21 35.5C22.5 36.5 25.5 36.5 27 35.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Text brand + Beta pill */}
      {showText && (
        <div className="eden-brand-col">
          {showBeta && (
            <div className="eden-beta-tag-row">
              <span className="eden-beta-pill">BETA</span>
            </div>
          )}
          <div className="eden-brand-title">ÉDEN</div>
        </div>
      )}
    </div>
  );
}
