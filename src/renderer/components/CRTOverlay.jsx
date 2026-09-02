import React from 'react';
import '../styles/crt.css';

/**
 * CRTOverlay — efeito visual de TV de tubo (CRT) sobre toda a aplicação.
 * Camadas:
 *   1. scanlines  — linhas horizontais espaçadas
 *   2. noise      — pixel noise animado via SVG filter
 *   3. vignette   — escurecimento radial nas bordas
 *   4. glitch     — micro-glitch de cor ocasional
 *   5. flicker    — pisca sutil de opacidade
 */
export default function CRTOverlay() {
  return (
    <div className="crt-overlay" aria-hidden="true">
      {/* SVG filter for noise/grain */}
      <svg className="crt-noise-svg" xmlns="http://www.w3.org/2000/svg">
        <filter id="crt-noise-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <rect width="100%" height="100%" filter="url(#crt-noise-filter)" opacity="0.035" />
      </svg>

      {/* Scanlines layer */}
      <div className="crt-scanlines" />

      {/* Vignette layer */}
      <div className="crt-vignette" />

      {/* RGB aberration / glitch bar */}
      <div className="crt-glitch-bar" />

      {/* Screen flicker (subtle opacity pulse) */}
      <div className="crt-flicker" />
    </div>
  );
}
