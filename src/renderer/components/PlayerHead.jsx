import React, { useEffect, useRef } from 'react';

export default function PlayerHead({ skinUrl, nickname = 'Steve', size = 34, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    if ('mozImageSmoothingEnabled' in ctx) ctx.mozImageSmoothingEnabled = false;
    if ('webkitImageSmoothingEnabled' in ctx) ctx.webkitImageSmoothingEnabled = false;

    let isMounted = true;

    const renderMinotarFallback = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `https://minotar.net/helm/${encodeURIComponent(nickname || 'Steve')}/${size}.png`;
      img.onload = () => {
        if (!isMounted) return;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
      };
    };

    if (!skinUrl) {
      renderMinotarFallback();
      return () => {
        isMounted = false;
      };
    }

    // Direct render for URLs that already return a 2D avatar/head/helm image
    const isPreRenderedHead =
      skinUrl.includes('minotar.net/helm') ||
      skinUrl.includes('minotar.net/avatar') ||
      skinUrl.includes('minotar.net/bust') ||
      skinUrl.includes('crafatar.com/avatars') ||
      skinUrl.includes('crafatar.com/renders/head') ||
      skinUrl.includes('mc-heads.net/avatar') ||
      skinUrl.includes('mc-heads.net/head') ||
      skinUrl.includes('visage.surgeplay.com/face') ||
      skinUrl.includes('visage.surgeplay.com/bust') ||
      skinUrl.includes('visage.surgeplay.com/head') ||
      skinUrl.includes('crafthead.net/helm') ||
      skinUrl.includes('crafthead.net/avatar') ||
      skinUrl.includes('crafthead.net/cube');

    if (isPreRenderedHead) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = skinUrl;
      img.onload = () => {
        if (!isMounted) return;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
      };
      img.onerror = renderMinotarFallback;
      return () => {
        isMounted = false;
      };
    }

    // Parse Minecraft skin PNG sheet (64x64, 64x32, or HD 128x128, 256x256, 512x512, etc.)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = skinUrl;
    img.onload = () => {
      if (!isMounted) return;
      ctx.clearRect(0, 0, size, size);

      const w = img.naturalWidth || img.width || 64;

      // If the image is smaller than a Minecraft skin texture (min 64px width), treat as already-cropped
      if (w < 64) {
        ctx.drawImage(img, 0, 0, size, size);
        return;
      }

      // Calculate resolution scale (standard MC skin base is 64x64)
      const scale = w / 64;
      const headSize = Math.round(8 * scale);
      const faceX = Math.round(8 * scale);
      const faceY = Math.round(8 * scale);
      const hatX = Math.round(40 * scale);
      const hatY = Math.round(8 * scale);

      // Draw base face layer (front of head)
      ctx.drawImage(img, faceX, faceY, headSize, headSize, 0, 0, size, size);

      // Draw Hat / Outer layer (hair, helmet, accessories)
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = headSize;
        offCanvas.height = headSize;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
          offCtx.imageSmoothingEnabled = false;
          offCtx.drawImage(img, hatX, hatY, headSize, headSize, 0, 0, headSize, headSize);
          const imgData = offCtx.getImageData(0, 0, headSize, headSize).data;

          let hasAlpha = false;
          let isMonochrome = true;
          let hasVisiblePixels = false;
          const firstR = imgData[0];
          const firstG = imgData[1];
          const firstB = imgData[2];

          for (let i = 0; i < imgData.length; i += 4) {
            const alpha = imgData[i + 3];
            if (alpha > 0) hasVisiblePixels = true;
            if (alpha < 255) hasAlpha = true;
            if (imgData[i] !== firstR || imgData[i + 1] !== firstG || imgData[i + 2] !== firstB) {
              isMonochrome = false;
            }
          }

          // Only overlay hat if there are visible pixels and it's not a solid monochrome opaque block
          if (hasVisiblePixels && (hasAlpha || !isMonochrome)) {
            ctx.drawImage(offCanvas, 0, 0, headSize, headSize, 0, 0, size, size);
          }
        }
      } catch {
        // Fallback: draw directly if canvas pixel inspection is restricted
        try {
          ctx.drawImage(img, hatX, hatY, headSize, headSize, 0, 0, size, size);
        } catch {
          // ignore
        }
      }
    };
    img.onerror = renderMinotarFallback;

    return () => {
      isMounted = false;
    };
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
