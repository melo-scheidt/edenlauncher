import React, { useEffect, useRef } from 'react';

export default function PlayerHead({ skinUrl, nickname = 'Steve', size = 34, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const renderMinotarFallback = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `https://minotar.net/helm/${nickname}/${size}.png`;
      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
      };
    };

    if (!skinUrl) {
      renderMinotarFallback();
      return;
    }

    // If skinUrl is already a minotar helm image (e.g. helm URL), draw directly
    if (skinUrl.includes('minotar.net/helm') || skinUrl.includes('minotar.net/bust') || skinUrl.includes('minotar.net/avatar')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = skinUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
      };
      img.onerror = renderMinotarFallback;
      return;
    }

    // Otherwise, parse Minecraft skin PNG (64x64 or 64x32) by slicing head + hat layer
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = skinUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      // Base face (x:8, y:8, w:8, h:8)
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);
      // Hat / Outer layer (x:40, y:8, w:8, h:8)
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
    };
    img.onerror = renderMinotarFallback;
  }, [skinUrl, nickname, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`player-head-canvas ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        imageRendering: 'pixelated',
        borderRadius: 'inherit',
        display: 'block',
      }}
    />
  );
}
