import React, { useEffect, useState, useCallback, useRef } from 'react';
import EdenCanvas from './components/EdenCanvas.jsx';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import CRTOverlay from './components/CRTOverlay.jsx';
import UpdateModal from './components/UpdateModal.jsx';
import HomeTab from './tabs/HomeTab.jsx';
import ProfileTab from './tabs/ProfileTab.jsx';
import ModsTab from './tabs/ModsTab.jsx';
import MapTab from './tabs/MapTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';
import { getValue, setValue } from './lib/store.js';
import './styles/canvas.css';
import './styles/app.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [activeSkin, setActiveSkin] = useState('');

  // Launch state (without overlay)
  const [launchError, setLaunchError] = useState('');
  const launchListenerRef = useRef(null);
  const [update, setUpdate] = useState(null);

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

  // ── Launch handler ────────────────────────────────────────────────────────
  const handleLaunch = useCallback(async ({ profile: prof, settings, manifest }) => {
    setLaunchError('');

    if (window.eden?.launch?.onEvent && !launchListenerRef.current) {
      launchListenerRef.current = true;
      window.eden.launch.onEvent((evt) => {
        if (evt.phase === 'jvm:exit' || evt.phase === 'jvm:error') {
          if (evt.code !== 0 && evt.phase === 'jvm:exit') {
            setLaunchError(`Minecraft encerrou com código ${evt.code}`);
          }
          if (evt.phase === 'jvm:error') {
            setLaunchError(evt.error || 'Erro ao iniciar Java');
          }
        }
      });
    }

    try {
      const res = await window.eden.launch.start({ profile: prof, settings, manifest });
      if (!res?.ok) {
        setLaunchError(res?.error || 'Falha ao iniciar Minecraft');
      }
    } catch (e) {
      setLaunchError(e.message);
    }
  }, []);

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
        />

        <main className="app-body">
          <div key={activeTab} className="tab-panel eden-fade-in">
            {activeTab === 'home' && (
              <HomeTab
                profile={profile}
                onLaunch={handleLaunch}
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
