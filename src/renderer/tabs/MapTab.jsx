import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, Radio } from 'lucide-react';
import '../styles/map.css';

const LIVE_MAP_URL = 'http://sd-br12.blazebr.com:26880/';

export default function MapTab() {
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef(null);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleReload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const handleOpenExternal = useCallback(() => {
    if (window.eden?.shell?.openExternal) {
      window.eden.shell.openExternal(LIVE_MAP_URL);
    }
  }, []);

  // Safety timeout: if the map never fires onLoad, drop the loading overlay
  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setLoading(false), 12000);
    return () => clearTimeout(timer);
  }, [loading, reloadKey]);

  return (
    <div className="eden-map-view-wrapper eden-fade-in">
      {/* ── Top Center: Live Indicator ── */}
      <div className="eden-map-time-badge">
        <span className="eden-map-live-dot" />
        <Radio size={14} className="eden-map-sun-icon" />
        <span className="eden-map-time-text">Mapa em tempo real</span>
      </div>

      {/* ── Top Right: Tools (Reload, Open in Browser) ── */}
      <div className="eden-map-tools-tr">
        <button
          type="button"
          className="eden-map-tool-btn"
          onClick={handleReload}
          title="Recarregar mapa"
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          className="eden-map-tool-btn"
          onClick={handleOpenExternal}
          title="Abrir no navegador"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* ── Live Map Viewport ── */}
      <div className="eden-map-viewport eden-map-live-viewport">
        {loading && (
          <div className="eden-map-loading-overlay">
            <div className="eden-map-spinner" />
            <span className="eden-map-loading-text">Carregando mapa do servidor...</span>
          </div>
        )}
        <iframe
          key={reloadKey}
          ref={iframeRef}
          className="eden-map-iframe"
          src={LIVE_MAP_URL}
          title="Mapa do servidor em tempo real"
          onLoad={handleIframeLoad}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
