import React from 'react';
import bgDark from '../assets/bg-dark.png';
import bgLight from '../assets/bg-light.jpg';

/**
 * Static image background for Éden Launcher.
 * Dark mode: grayscale artwork + light gray blur overlay.
 * Light mode: sepia artwork + light cream blur overlay.
 */
export default function EdenCanvas({ theme = 'dark' }) {
  const isLight = theme === 'light';

  return (
    <div className="eden-canvas" aria-hidden="true">
      {/* Base artwork */}
      <img
        src={isLight ? bgLight : bgDark}
        className="eden-bg-img"
        alt=""
        draggable={false}
      />
      {/* Blur + tint overlay */}
      <div className={`eden-blur-overlay ${isLight ? 'eden-blur-overlay--light' : 'eden-blur-overlay--dark'}`} />

      {/* Efeito TV de Tubo (CRT Effect) */}
      <div className="crt-overlay">
        <div className="crt-scanlines" />
        <div className="crt-scanline-bar" />
        <div className="crt-vignette" />
        <div className="crt-phosphor" />
        <div className="crt-flicker" />
      </div>
    </div>
  );
}

