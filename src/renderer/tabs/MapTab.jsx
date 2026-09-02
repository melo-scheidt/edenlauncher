import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import '../styles/map.css';

const LIVE_MAP_URL = 'http://sd-br12.blazebr.com:26880/';

export default function MapTab() {
  const { t } = useI18n();
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
      {/* ── Top Right: Tools (Reload, Open in Browser) ── */}
      <div className="eden-map-tools-tr">
        <button
          type="button"
          className="eden-map-tool-btn"
          onClick={handleReload}
          title={t('map.reload')}
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          className="eden-map-tool-btn"
          onClick={handleOpenExternal}
          title={t('map.openBrowser')}
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* ── Live Map Viewport ── */}
      <div className="eden-map-viewport eden-map-live-viewport">
        {loading && (
          <div className="eden-map-loading-overlay">
            <div className="eden-map-spinner" />
            <span className="eden-map-loading-text">{t('map.loading')}</span>
          </div>
        )}
        <iframe
          key={reloadKey}
          ref={iframeRef}
          className="eden-map-iframe"
          src={LIVE_MAP_URL}
          title={t('map.iframeTitle')}
          onLoad={handleIframeLoad}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
