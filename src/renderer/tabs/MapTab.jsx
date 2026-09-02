import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Layers, MapPin, Users, Compass, Copy, Check, Sun, Moon } from 'lucide-react';
import '../styles/map.css';

export default function MapTab() {
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [activeLayer, setActiveLayer] = useState('surface'); // 'surface' | 'caves' | 'biomes'
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mapCanvasRef = useRef(null);

  const coords = { x: 576, y: 64, z: -1648 };

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${coords.x}, ${coords.y}, ${coords.z}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, z - 0.25));

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Render stylized terrain on canvas
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = (canvas.width = 1200);
    const height = (canvas.height = 700);

    // Draw background sea
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, width, height);

    // Draw continent shapes (medieval procedural landmasses)
    // Deep green forests
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.ellipse(350, 320, 240, 180, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(750, 380, 280, 220, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Plains / Light green
    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.ellipse(320, 300, 160, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(700, 360, 190, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snowy peaks
    ctx.fillStyle = '#e9ecef';
    ctx.beginPath();
    ctx.ellipse(180, 220, 80, 120, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(980, 480, 90, 140, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Rivers
    ctx.strokeStyle = '#219ebc';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(350, 140);
    ctx.bezierCurveTo(420, 260, 300, 380, 480, 520);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(700, 180);
    ctx.bezierCurveTo(620, 320, 800, 420, 750, 600);
    ctx.stroke();

    // Roads & Paths
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(250, 300);
    ctx.lineTo(576, 320);
    ctx.lineTo(820, 390);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  return (
    <div className="eden-map-view-wrapper eden-fade-in">
      {/* ── Top Left Zoom Controls ── */}
      <div className="eden-map-controls-tl">
        <button
          type="button"
          className="eden-map-ctrl-btn"
          onClick={handleZoomIn}
          title="Aproximar"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="eden-map-ctrl-btn"
          onClick={handleZoomOut}
          title="Afastar"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          className="eden-map-ctrl-btn"
          onClick={() => setActiveLayer((l) => (l === 'surface' ? 'biomes' : 'surface'))}
          title="Alternar Camadas"
        >
          <Layers size={16} />
        </button>
      </div>

      {/* ── Top Center: Time & Biome Indicator ── */}
      <div className="eden-map-time-badge">
        <Sun size={14} className="eden-map-sun-icon" />
        <span className="eden-map-time-text">21:21</span>
      </div>

      {/* ── Top Right: Tools (Layers, Markers, Players) ── */}
      <div className="eden-map-tools-tr">
        <button type="button" className="eden-map-tool-btn" title="Camadas do Mundo">
          <Layers size={16} />
        </button>
        <button type="button" className="eden-map-tool-btn" title="Pontos de Interesse">
          <MapPin size={16} />
        </button>
        <button type="button" className="eden-map-tool-btn" title="Jogadores Online">
          <Users size={16} />
        </button>
      </div>

      {/* ── Interactive Map Canvas Viewport ── */}
      <div
        className="eden-map-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="eden-map-canvas-transformer"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <canvas ref={mapCanvasRef} className="eden-map-canvas" />

          {/* Player Pin Marker */}
          <div className="eden-map-player-pin" style={{ top: '320px', left: '576px' }}>
            <div className="eden-pin-glow" />
            <div className="eden-pin-point" />
            <div className="eden-pin-label">Você</div>
          </div>

          {/* Castle / Spawn Point */}
          <div className="eden-map-poi-pin" style={{ top: '280px', left: '320px' }}>
            <div className="eden-poi-icon">🏰</div>
            <div className="eden-poi-label">Capital Éden</div>
          </div>

          {/* Boss Dungeon */}
          <div className="eden-map-poi-pin" style={{ top: '420px', left: '780px' }}>
            <div className="eden-poi-icon">⚔️</div>
            <div className="eden-poi-label">Ruínas de Calderon</div>
          </div>
        </div>
      </div>

      {/* ── Bottom Left: Location Coordinates Pill ── */}
      <div className="eden-map-coords-pill">
        <button
          type="button"
          className="eden-coords-copy-btn"
          onClick={handleCopyCoords}
          title="Copiar Coordenadas"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <div className="eden-coords-text-col">
          <span className="eden-coords-sub">Localização</span>
          <span className="eden-coords-val">
            {coords.x}, {coords.y}, {coords.z}
          </span>
        </div>
      </div>
    </div>
  );
}
