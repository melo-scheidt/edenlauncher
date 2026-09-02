import React, { useEffect, useState, useRef } from 'react';
import { Monitor, Cpu, FolderArchive, Check, RotateCcw, FolderOpen, Trash2, Sun, Moon } from 'lucide-react';
import { getValue, setValue } from '../lib/store.js';
import { useI18n } from '../i18n/index.jsx';
import '../styles/settings.css';

const DEFAULTS = {
  theme: 'dark', // 'dark' | 'light'
  ramGb: 4,
  fullscreen: false,
  width: 1920,
  height: 1080,
  javaPath: '',
  vsync: true,
  launchArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled',
};

export default function SettingsTab({ currentTheme, onThemeChange }) {
  const { t } = useI18n();
  const [activeSubTab, setActiveSubTab] = useState('window'); // 'window' | 'java' | 'resources'
  const [settings, setSettings] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const persisted = await getValue('settings', null);
      if (persisted) {
        setSettings((prev) => ({ ...prev, ...persisted }));
      }
      if (window.eden?.app?.getInfo) {
        try {
          const info = await window.eden.app.getInfo();
          setSystemInfo(info);
        } catch {}
      }
    })();
  }, []);

  const update = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.theme && onThemeChange) {
        onThemeChange(patch.theme);
      }
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        setValue('settings', next).then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        });
      }, 400);
      return next;
    });
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    setValue('settings', DEFAULTS);
    if (onThemeChange) onThemeChange('dark');
  };

  const handleBrowseJava = async () => {
    if (window.eden?.dialog?.pickJava) {
      const path = await window.eden.dialog.pickJava();
      if (path) update({ javaPath: path });
    }
  };

  const handleOpenFolder = () => {
    if (window.eden?.logs?.openFolder) {
      window.eden.logs.openFolder();
    }
  };

  const handleUninstallLauncher = async () => {
    if (!window.confirm(t('settings.uninstallConfirm'))) return;
    if (window.eden?.app?.uninstall) {
      const res = await window.eden.app.uninstall();
      if (!res?.ok) {
        window.alert(t('settings.uninstallUnavailable'));
      }
    } else {
      window.alert(t('settings.uninstallUnavailable'));
    }
  };

  const ramMax = systemInfo
    ? Math.min(32, Math.max(8, Math.floor(systemInfo.totalMemGB)))
    : 16;

  return (
    <div className="eden-settings-page eden-fade-in">
      {/* Top Header (Screenshot 4 Match) */}
      <div className="eden-settings-head">
        <h1 className="eden-settings-title">{t('settings.title')}</h1>
        <p className="eden-settings-subtitle">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Main Layout: Sidebar Subtabs + Content Panel */}
      <div className="eden-settings-body-grid">
        {/* Left Sub-navigation Tabs */}
        <div className="eden-settings-nav-col">
          <button
            type="button"
            className={`eden-subtab-btn ${activeSubTab === 'window' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('window')}
          >
            <Monitor size={16} />
            <span>{t('settings.window')}</span>
          </button>

          <button
            type="button"
            className={`eden-subtab-btn ${activeSubTab === 'java' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('java')}
          >
            <Cpu size={16} />
            <span>{t('settings.java')}</span>
          </button>

          <button
            type="button"
            className={`eden-subtab-btn ${activeSubTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('resources')}
          >
            <FolderArchive size={16} />
            <span>{t('settings.management')}</span>
          </button>

          {/* Footer Info Bottom Left */}
          <div className="eden-settings-footer-info">
            <span className="eden-footer-app-name">Éden App 1.0 Beta</span>
            <span className="eden-footer-os-info">
              {systemInfo?.platform === 'win32' ? t('settings.osWin') : t('settings.osOther')}
            </span>
          </div>
        </div>

        {/* Right Settings Form Content */}
        <div className="eden-settings-content-card">
          {/* Tab: Janela e Tela (Screenshot 4 Match) */}
          {activeSubTab === 'window' && (
            <div className="eden-settings-group eden-fade-in">
              {/* Fullscreen Toggle */}
              <div className="eden-setting-row-toggle">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.fullscreen')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.fullscreenDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle ${settings.fullscreen ? 'on' : ''}`}
                  role="switch"
                  aria-checked={settings.fullscreen}
                  onClick={() => update({ fullscreen: !settings.fullscreen })}
                />
              </div>

              {/* Window Width */}
              <div className="eden-setting-row-input">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.width')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.widthDesc')}
                  </p>
                </div>
                <input
                  type="number"
                  className="eden-setting-num-input"
                  value={settings.width || 1920}
                  onChange={(e) => update({ width: Number(e.target.value) })}
                />
              </div>

              {/* Window Height */}
              <div className="eden-setting-row-input">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.height')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.heightDesc')}
                  </p>
                </div>
                <input
                  type="number"
                  className="eden-setting-num-input"
                  value={settings.height || 1080}
                  onChange={(e) => update({ height: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {/* Tab: Java e Memória */}
          {activeSubTab === 'java' && (
            <div className="eden-settings-group eden-fade-in">
              {/* RAM Slider */}
              <div className="eden-setting-item">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.ram')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.ramDesc')}
                  </p>
                </div>

                <div className="eden-ram-control-box">
                  <div className="eden-ram-slider-row">
                    <input
                      type="range"
                      min={2}
                      max={ramMax}
                      step={1}
                      value={settings.ramGb}
                      onChange={(e) => update({ ramGb: Number(e.target.value) })}
                      className="eden-range-slider"
                    />
                    <div className="eden-ram-badge">
                      <strong>{settings.ramGb}</strong> GB
                    </div>
                  </div>
                  <div className="eden-ram-ticks-row">
                    <span>2 GB</span>
                    <span>{Math.round((2 + ramMax) / 2)} GB</span>
                    <span>{ramMax} GB</span>
                  </div>
                </div>
              </div>

              {/* Java Executable Path */}
              <div className="eden-setting-item">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.javaPath')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.javaPathDesc')}
                  </p>
                </div>
                <div className="eden-java-path-row">
                  <input
                    type="text"
                    className="eden-setting-text-input"
                    placeholder={t('settings.javaPathPlaceholder')}
                    value={settings.javaPath}
                    onChange={(e) => update({ javaPath: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleBrowseJava}
                  >
                    {t('settings.browse')}
                  </button>
                </div>
              </div>

              {/* JVM Flags */}
              <div className="eden-setting-item">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.jvmArgs')}</h4>
                  <p className="eden-item-desc">{t('settings.jvmArgsDesc')}</p>
                </div>
                <input
                  type="text"
                  className="eden-setting-text-input font-mono"
                  value={settings.launchArgs}
                  onChange={(e) => update({ launchArgs: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Tab: Gerenciamento de Recursos */}
          {activeSubTab === 'resources' && (
            <div className="eden-settings-group eden-fade-in">
              <div className="eden-setting-item">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.gameDir')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.gameDirDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost eden-action-inline-btn"
                  onClick={handleOpenFolder}
                >
                  <FolderOpen size={16} />
                  <span>{t('settings.openLogs')}</span>
                </button>
              </div>

              <div className="eden-setting-item">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.reset')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.resetDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost eden-action-inline-btn"
                  onClick={handleReset}
                >
                  <RotateCcw size={16} />
                  <span>{t('settings.resetBtn')}</span>
                </button>
              </div>

              <div className="eden-setting-item">
                <div className="eden-setting-meta">
                  <h4 className="eden-item-title">{t('settings.uninstallLauncher')}</h4>
                  <p className="eden-item-desc">
                    {t('settings.uninstallLauncherDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost eden-action-inline-btn eden-danger-btn"
                  onClick={handleUninstallLauncher}
                >
                  <Trash2 size={16} />
                  <span>{t('settings.uninstallBtn')}</span>
                </button>
              </div>
            </div>
          )}

          {saved && (
            <div className="eden-saved-toast">
              <Check size={14} /> {t('settings.saved')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}