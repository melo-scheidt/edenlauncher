import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCw, Sparkles, Tag, Gift, Award, Compass, Flame, ShieldAlert, Check, Trash2, Crown } from 'lucide-react';
import { getValue } from '../lib/store.js';
import { useI18n } from '../i18n/index.jsx';
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
  { id: 'p1', badgeKey: 'promo.p1.badge', badgeColor: '#52b788', titleKey: 'promo.p1.title', subKey: 'promo.p1.sub', timeKey: 'promo.p1.time', imageType: 'cupom' },
  { id: 'p2', badgeKey: 'promo.p2.badge', badgeColor: '#e9c46a', titleKey: 'promo.p2.title', subKey: 'promo.p2.sub', timeKey: 'promo.p2.time', imageType: 'evento' },
  { id: 'p3', badgeKey: 'promo.p3.badge', badgeColor: '#40916c', titleKey: 'promo.p3.title', subKey: 'promo.p3.sub', timeKey: 'promo.p3.time', imageType: 'update' },
  { id: 'p4', badgeKey: 'promo.p4.badge', badgeColor: '#00f5d4', titleKey: 'promo.p4.title', subKey: 'promo.p4.sub', timeKey: 'promo.p4.time', imageType: 'vip' },
];

export default function HomeTab({ profile, onLaunch }) {
  const { t } = useI18n();
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
            <span className="eden-pill-tag">{t('home.version', { v: serverStatus.version })}</span>
            <span className="eden-pill-tag">{t('home.modsCount', { n: modCount })}</span>
            <span className="eden-pill-tag">{t('home.tagRP')}</span>
          </div>

          {/* Description */}
          <p className="eden-hero-description">
            {t('home.heroDesc')}
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
                    ? t('home.checking')
                    : launching
                    ? t('home.launching')
                    : isInstalled
                    ? t('home.play')
                    : t('home.install')}
                </span>
              </span>
            </button>

            {isInstalled && (
              <button
                type="button"
                className="eden-btn-uninstall"
                title={t('home.uninstallTip')}
                onClick={handleUninstall}
                disabled={uninstalling || launching}
              >
                <span>{uninstalling ? t('home.uninstalling') : t('home.uninstall')}</span>
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
                  {(card.imageType === 'vip' || card.imageType === 'passe') && <Crown size={28} />}
                </div>
                <div className="eden-promo-badge-tag" style={{ color: card.badgeColor }}>
                  {t(card.badgeKey)}
                </div>
              </div>

              <div className="eden-promo-info">
                <h3 className="eden-promo-title">{t(card.titleKey)}</h3>
                <p className="eden-promo-desc">{t(card.subKey)}</p>
                <span className="eden-promo-time">{t(card.timeKey)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
