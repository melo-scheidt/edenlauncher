import React from 'react';
import edenIcon from '../assets/icon.png';

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
        <img
          src={edenIcon}
          alt="Éden"
          className="eden-crest-img"
          draggable={false}
        />
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
