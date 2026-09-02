import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCw, Sparkles, Tag, Gift, Award, Compass, Flame, ShieldAlert, Check, Trash2 } from 'lucide-react';
import { getValue } from '../lib/store.js';
import '../styles/home.css';

const SETTINGS_DEFAULTS = {
  ramGb: 4,
  resolution: '1920x1080',
  fullscreen: false,
  javaPath: '',
  vsync: true,
  launchArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled',
};

const PROMO_CARDS = [
  {
    id: 'p1',
    badge: 'CUPOM EXCLUSIVO',
    badgeColor: '#52b788',
    title: 'Cupom de Boas-vindas',
    subtitle: 'Use EDEN2026 e receba 500 VP + Kit Inicial exclusivo!',
    time: 'Válido até 30/12',
    imageType: 'cupom',
  },
  {
    id: 'p2',
    badge: 'EVENTO RP',
    badgeColor: '#e9c46a',
    title: 'Guerra dos Tronos do Norte',
    subtitle: 'Conflito de facções pelo controle da Fortaleza de Calderon.',
    time: 'Neste Sábado às 19h',
    imageType: 'evento',
  },
  {
    id: 'p3',
    badge: 'ATUALIZAÇÃO',
    badgeColor: '#40916c',
    title: 'Dungeons & Relíquias',
    subtitle: 'Novos chefes lendários, masmorras ancestrais e itens épicos.',
    time: 'Versão 1.4.2 Ativa',
    imageType: 'update',
  },
  {
    id: 'p4',
    badge: 'RECOMPENSA',
    badgeColor: '#e76f51',
    title: 'Passe de Temporada',
    subtitle: 'Desbloqueie montarias exclusivas, cosméticos e títulos raros.',
    time: 'Temporada 1',
    imageType: 'passe',
  },
];

export default function HomeTab({ profile, onLaunch }) {
  const [serverStatus, setServerStatus] = useState({ online: true, players: 54, max: 100, version: '1.21.5' });
  const [modCount, setModCount] = useState(10);
  const [launching, setLaunching] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [checkingInstall, setCheckingInstall] = useState(true);
  const [installProgress, setInstallProgress] = useState(0);

  // Fetch status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('https://api.mcsrvstat.us/3/jogar.eden.net');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.online !== undefined) {
          setServerStatus({
            online: data.online,
            players: data.players?.online ?? 54,
            max: data.players?.max ?? 100,
            version: data.version ?? '1.21.5',
          });
        }
      } catch {
        // Fallback default
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getManifest = useCallback(async () => {
    if (!window.eden?.modpack) return null;
    let manifest = await window.eden.modpack.fetchCached();
    if (!manifest) {
      try {
        const res = await window.eden.modpack.fetchManifest();
        if (res?.ok) manifest = res.manifest;
      } catch { /* use null */ }
    }
    return manifest;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (window.eden?.mods?.listAll) {
          const allMods = await window.eden.mods.listAll();
          const total = (allMods?.mandatory?.length || 0) + (allMods?.optional?.length || 0);
          if (total > 0) {
            setModCount(total);
            return;
          }
        }
        const manifest = await getManifest();
        if (manifest?.files?.length) setModCount(manifest.files.length);
      } catch {}
    })();
  }, [getManifest]);

  const checkInstalled = useCallback(async () => {
    setCheckingInstall(true);
    try {
      if (!window.eden?.launch?.isInstalled) {
        setIsInstalled(true); // default true on preview
        return;
      }
      const manifest = await getManifest();
      const inst = await window.eden.launch.isInstalled({ manifest: manifest || {} });
      setIsInstalled(inst);
    } catch (e) {
      console.warn('[HomeTab] Falha ao verificar instalação', e);
    } finally {
      setCheckingInstall(false);
    }
  }, [getManifest]);

  useEffect(() => {
    checkInstalled();
  }, [checkInstalled]);

  useEffect(() => {
    if (!window.eden?.launch?.onEvent) return;
    window.eden.launch.onEvent((evt) => {
      if (evt.progress !== undefined) {
        setInstallProgress(evt.progress * 100);
      } else if (evt.done && evt.total) {
        setInstallProgress((evt.done / evt.total) * 100);
      }
      if (evt.phase === 'install:complete' || evt.phase === 'modpack:done') {
        setIsInstalled(true);
      }
    });
  }, []);

  const handlePlay = useCallback(async () => {
    if (launching || !onLaunch) return;
    setLaunching(true);
    try {
      const storedSettings = await getValue('settings', null);
      const storedMods = await getValue('mods', null);
      const settings = {
        ...SETTINGS_DEFAULTS,
        ...(storedSettings || {}),
        modsEnabled: storedMods?.enabled || (storedSettings?.modsEnabled || {}),
      };
      let manifest = null;
      if (window.eden?.modpack) {
        manifest = await window.eden.modpack.fetchCached();
        if (!manifest) {
          try {
            const res = await window.eden.modpack.fetchManifest();
            if (res?.ok) manifest = res.manifest;
          } catch { /* use null */ }
        }
      }
      await onLaunch({ profile, settings, manifest: manifest || {} });
    } catch (e) {
      console.error('[HomeTab] launch error', e);
    } finally {
      setLaunching(false);
    }
  }, [launching, onLaunch, profile]);

  const handleUninstall = useCallback(async () => {
    if (uninstalling || launching) return;
    setUninstalling(true);
    try {
      const manifest = await getManifest();
      if (window.eden?.launch?.uninstall) {
        await window.eden.launch.uninstall({ manifest: manifest || {} });
      }
      setIsInstalled(false);
    } catch (e) {
      console.error('[HomeTab] Desinstalar falhou', e);
    } finally {
      setUninstalling(false);
    }
  }, [uninstalling, launching, getManifest]);

  return (
    <div className="eden-home-container eden-fade-in">
      {/* ── Main Hero Section (Screenshot 2 Match) ── */}
      <section className="eden-home-hero">
        <div className="eden-hero-branding">
          <h1 className="eden-hero-title">
            ÉDEN <span className="eden-hero-plus">+</span>
          </h1>

          {/* Badges Row */}
          <div className="eden-hero-tags">
            <span className="eden-pill-tag">Versão: {serverStatus.version}</span>
            <span className="eden-pill-tag">Mods: {modCount}</span>
            <span className="eden-pill-tag">RP</span>
          </div>

          {/* Description */}
          <p className="eden-hero-description">
            Explore um universo com infinitas possibilidades de vidas novas e experiências únicas.
          </p>

          {/* Action Row */}
          <div className="eden-play-row">
            <button
              id="btn-play-main"
              type="button"
              className={`eden-btn-play ${launching ? 'is-loading' : ''}`}
              onClick={handlePlay}
              disabled={launching || checkingInstall || uninstalling}
            >
              {launching && installProgress > 0 && (
                <div
                  className="eden-btn-progress-bar"
                  style={{ width: `${installProgress}%` }}
                />
              )}
              <span className="eden-play-btn-content">
                <Play size={18} fill="currentColor" />
                <span>
                  {checkingInstall
                    ? 'VERIFICANDO...'
                    : launching
                    ? 'INICIANDO...'
                    : isInstalled
                    ? 'JOGAR'
                    : 'INSTALAR'}
                </span>
              </span>
            </button>

            {isInstalled && (
              <button
                type="button"
                className="eden-btn-uninstall"
                title="Desinstalar jogo e modpack"
                onClick={handleUninstall}
                disabled={uninstalling || launching}
              >
                <span>{uninstalling ? 'DESINSTALANDO...' : 'DESINSTALAR'}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Bottom Carousel Section (Screenshot 2 Match) ── */}
      <section className="eden-home-carousel-section">
        <div className="eden-carousel-container">
          {PROMO_CARDS.map((card) => (
            <div key={card.id} className="eden-promo-card">
              <div className="eden-promo-thumb">
                <div className={`eden-thumb-art eden-thumb-art--${card.imageType}`}>
                  {card.imageType === 'cupom' && <Gift size={28} />}
                  {card.imageType === 'evento' && <Flame size={28} />}
                  {card.imageType === 'update' && <Compass size={28} />}
                  {card.imageType === 'passe' && <Award size={28} />}
                </div>
                <div className="eden-promo-badge-tag" style={{ color: card.badgeColor }}>
                  {card.badge}
                </div>
              </div>

              <div className="eden-promo-info">
                <h3 className="eden-promo-title">{card.title}</h3>
                <p className="eden-promo-desc">{card.subtitle}</p>
                <span className="eden-promo-time">{card.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
