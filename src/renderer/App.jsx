import React, { useEffect, useState, useCallback, useRef } from 'react';
import EdenCanvas from './components/EdenCanvas.jsx';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import CRTOverlay from './components/CRTOverlay.jsx';
import UpdateModal from './components/UpdateModal.jsx';
import VipModal from './components/VipModal.jsx';
import { useI18n } from './i18n/index.jsx';
import HomeTab from './tabs/HomeTab.jsx';
import ProfileTab from './tabs/ProfileTab.jsx';
import ModsTab from './tabs/ModsTab.jsx';
import MapTab from './tabs/MapTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';
import { getValue, setValue } from './lib/store.js';
import './styles/canvas.css';
import './styles/app.css';

// Fallbacks de status do servidor (preview no navegador ou ping direto bloqueado):
// endpoint do plugin EdenStatus (porta 25617 liberada pelo host) + serviços públicos
const STATUS_ENDPOINTS = [
  'http://sp-22.magnohost.com.br:25617/status',
  'https://api.mcstatus.io/v2/status/java/sp-22.magnohost.com.br:25573',
  'https://api.mcsrvstat.us/3/sp-22.magnohost.com.br:25573',
];

const pickVersion = (v) => {
  if (typeof v === 'object' && v) return v.name_clean || v.name || '1.21.5';
  return v || '1.21.5';
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [activeSkin, setActiveSkin] = useState('');
  const [vipModalOpen, setVipModalOpen] = useState(false);

  // Launch state (without overlay)
  const [launchError, setLaunchError] = useState('');
  const [gameRunning, setGameRunning] = useState(false);
  const injectionRef = useRef(false);
  const [update, setUpdate] = useState(null);
  const { t } = useI18n();

  // ── Theme Handlers ────────────────────────────────────────────────────────
  const applyTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  const handleToggleTheme = useCallback(async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    const settings = (await getValue('settings', {})) || {};
    await setValue('settings', { ...settings, theme: nextTheme });
  }, [theme, applyTheme]);

  // ── Skin Handler ──────────────────────────────────────────────────────────
  const handleSkinChange = useCallback(async (newSkinUrl) => {
    setActiveSkin(newSkinUrl);
    await setValue('customSkin', newSkinUrl);
  }, []);

  // ── Hydrate session, theme & skin on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Load theme from settings
        const settings = await getValue('settings', null);
        if (settings?.theme) {
          applyTheme(settings.theme);
        } else {
          applyTheme('dark');
        }

        // Load profile session
        let session = null;
        if (window.eden?.auth?.current) {
          session = await window.eden.auth.current();
        } else {
          session = await getValue('profile', null);
        }

        if (!cancelled && session?.nickname) {
          setProfile(session);

          // Check for local custom skin file or stored skin
          let skin = await getValue('customSkin', null);
          if (!skin && window.eden?.skins?.getLocal) {
            const localRes = await window.eden.skins.getLocal(session.nickname);
            if (localRes?.ok && localRes.base64) {
              skin = localRes.base64;
            }
          }
          if (skin) setActiveSkin(skin);
        }
      } catch (e) {
        console.warn('[App] hydration error', e);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [applyTheme]);

  // ── Auto-update events (modal bloqueante) ──────────────────────────────────
  useEffect(() => {
    if (!window.eden?.updater) return;
    window.eden.updater.onAvailable((info) => setUpdate((u) => ({ ...u, info })));
    window.eden.updater.onProgress((progress) => setUpdate((u) => ({ ...u, progress })));
    window.eden.updater.onReady(() => setUpdate((u) => ({ ...u, ready: true, error: null })));
    // Só exibe erro se a atualização já tinha sido detectada (não travar offline)
    window.eden.updater.onError((error) => setUpdate((u) => (u?.info ? { ...u, error } : u)));
    // Re-checa após montar para não perder eventos disparados antes do mount
    window.eden.updater.check?.().catch(() => {});
  }, []);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (session) => {
    setProfile(session);
    await setValue('profile', session);

    // Check skin for newly logged-in user
    if (session?.nickname) {
      let skin = await getValue('customSkin', null);
      if (!skin && window.eden?.skins?.getLocal) {
        const localRes = await window.eden.skins.getLocal(session.nickname);
        if (localRes?.ok && localRes.base64) skin = localRes.base64;
      }
      if (skin) setActiveSkin(skin);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (window.eden?.auth?.logout) {
      await window.eden.auth.logout();
    }
    setProfile(null);
    await setValue('profile', null);
  }, []);

  // ── Status do servidor (ping direto + fallbacks, compartilhado) ─────────────
  const [serverStatus, setServerStatus] = useState({ online: false, players: 0, max: 0, version: '1.21.5' });

  useEffect(() => {
    let cancelled = false;
    const applyStatus = (data) => {
      if (cancelled) return;
      setServerStatus({
        online: data.online,
        players: data.players?.online ?? 0,
        max: data.players?.max ?? 0,
        version: pickVersion(data.version),
      });
    };
    const fetchStatus = async () => {
      // 1. Ping direto no protocolo do Minecraft (main process, tempo real)
      if (window.eden?.server?.status) {
        try {
          applyStatus(await window.eden.server.status());
          return;
        } catch { /* cai para o fallback público */ }
      }
      // 2. Fallback público (plugin na 25617 + serviços externos)
      for (const endpoint of STATUS_ENDPOINTS) {
        try {
          const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) continue;
          const data = await res.json();
          if (data && data.online !== undefined) {
            applyStatus(data);
            return;
          }
        } catch {
          // tenta o próximo endpoint
        }
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── Launch events: estado do jogo (JOGANDO) e erros ────────────────────────
  useEffect(() => {
    if (!window.eden?.launch?.onEvent) return;
    window.eden.launch.onEvent((evt) => {
      if (evt.phase === 'jvm:spawn') setGameRunning(true);
      if (evt.phase === 'anticheat:injection') {
        injectionRef.current = true;
        setLaunchError(t('launch.injectionKilled'));
      }
      if (evt.phase === 'jvm:exit' || evt.phase === 'jvm:error') {
        setGameRunning(false);
        if (evt.phase === 'jvm:exit' && evt.code !== 0 && !injectionRef.current) {
          setLaunchError(t('launch.exitError', { code: evt.code }));
        }
        if (evt.phase === 'jvm:error') {
          setLaunchError(evt.error || t('launch.javaError'));
        }
      }
    });
    // Se o renderer recarregar com o jogo aberto, sincroniza o estado
    window.eden.launch.isRunning?.().then(setGameRunning).catch(() => {});
  }, [t]);

  const handleLaunch = useCallback(async ({ profile: prof, settings, manifest }) => {
    setLaunchError('');
    injectionRef.current = false;
    try {
      const res = await window.eden.launch.start({ profile: prof, settings, manifest });
      if (!res?.ok) {
        const msg = res?.error === 'already-running'
          ? t('launch.alreadyRunning')
          : (res?.error || t('launch.failed'));
        setLaunchError(msg);
      }
    } catch (e) {
      setLaunchError(e.message);
    }
  }, [t]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!hydrated) return null;

  if (!profile) {
    return (
      <div className="app-shell">
        <EdenCanvas theme={theme} />
        <CRTOverlay />
        <LoginScreen onLogin={handleLogin} />
        {update?.info && (
          <UpdateModal
            info={update.info}
            progress={update.progress}
            ready={update.ready}
            error={update.error}
            onInstall={() => window.eden?.updater?.install?.()}
            onRetry={() => {
              setUpdate((u) => ({ ...u, error: null }));
              window.eden?.updater?.check?.();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <EdenCanvas theme={theme} />
      <CRTOverlay />

      {/* Floating Pill Sidebar */}
      <Sidebar
        active={activeTab}
        onSelect={(id) => {
          if (id === 'logout') handleLogout();
          else setActiveTab(id);
        }}
      />

      <div className="app-main-content">
        {/* Floating TopBar */}
        <TopBar
          profile={profile}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          activeSkin={activeSkin}
          onlinePlayers={serverStatus.players}
          maxPlayers={serverStatus.max}
          onOpenVipModal={() => setVipModalOpen(true)}
        />

        <main className="app-body">
          <div key={activeTab} className="tab-panel eden-fade-in">
            {activeTab === 'home' && (
              <HomeTab
                profile={profile}
                onLaunch={handleLaunch}
                gameRunning={gameRunning}
                serverStatus={serverStatus}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
                activeSkin={activeSkin}
                onSkinChange={handleSkinChange}
              />
            )}
            {activeTab === 'mods' && <ModsTab />}
            {activeTab === 'map' && <MapTab />}
            {activeTab === 'settings' && (
              <SettingsTab
                currentTheme={theme}
                onThemeChange={applyTheme}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── 4 VIP Tiers Modal (Cobre, Ferro, Diamante, Rubi) ── */}
      <VipModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        currentRole={profile?.role}
      />

      {update?.info && (
        <UpdateModal
          info={update.info}
          progress={update.progress}
          ready={update.ready}
          error={update.error}
          onInstall={() => window.eden?.updater?.install?.()}
          onRetry={() => {
            setUpdate((u) => ({ ...u, error: null }));
            window.eden?.updater?.check?.();
          }}
        />
      )}

      </div>
  );
}
