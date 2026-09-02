import React, { useState, useEffect } from 'react';
import { Languages, Crown, Sun, Moon } from 'lucide-react';
import EdenLogo from './EdenLogo.jsx';
import PlayerHead from './PlayerHead.jsx';
import RoleTag from './RoleTag.jsx';
import { useI18n, LANGUAGES } from '../i18n/index.jsx';

function DiscordIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function TopBar({ profile, theme, onToggleTheme, activeSkin, onlinePlayers = 54, maxPlayers = 100 }) {
  const [timeStr, setTimeStr] = useState('');
  const { lang, setLang, t } = useI18n();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  const handleToggleLanguage = () => {
    const idx = LANGUAGES.findIndex((l) => l.code === lang);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length].code;
    setLang(next);
  };

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const nick = profile?.nickname || t('user.defaultNick');
  const onlinePct = Math.min(100, Math.round((onlinePlayers / maxPlayers) * 100));

  const openSocial = (url) => {
    if (window.eden?.shell?.openExternal) {
      window.eden.shell.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <header className="eden-topbar">
      {/* ── Left: Logo + Clock + Server Status ── */}
      <div className="eden-topbar-left">
        <EdenLogo size="icon-only" showText={false} showBeta={false} />

        <div className="eden-time-display">
          <span>{timeStr || '16:34'}</span>
        </div>

        {/* Server Online Status Indicator */}
        <div className="eden-server-status-pill">
          <div className="eden-status-diamond">
            <span>{onlinePlayers}</span>
            <span className="eden-diamond-sub">/{maxPlayers}</span>
          </div>
          <div className="eden-status-progress-col">
            <div className="eden-status-bar">
              <div className="eden-status-bar-fill" style={{ width: `${onlinePct}%` }} />
            </div>
            <span className="eden-status-text">{t('topbar.online')}</span>
          </div>
        </div>
      </div>

      {/* ── Center / Social Links ── */}
      <div className="eden-topbar-center">
        <div className="eden-social-links">
          <button
            type="button"
            className="eden-social-btn eden-discord-btn"
            title={t('topbar.discord')}
            onClick={() => openSocial('https://discord.gg/XE5SsTurP5')}
          >
            <DiscordIcon size={16} />
          </button>

          <button
            type="button"
            className="eden-social-btn eden-lang-btn"
            title={t('topbar.lang', { name: currentLang.name })}
            onClick={handleToggleLanguage}
          >
            <Languages size={14} />
            <span className="eden-lang-badge">{currentLang.short}</span>
          </button>

          {onToggleTheme && (
            <button
              type="button"
              className="eden-social-btn eden-theme-toggle-btn"
              title={t(theme === 'light' ? 'topbar.themeDark' : 'topbar.themeLight')}
              onClick={onToggleTheme}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Right: Pass & Player Summary ── */}
      <div className="eden-topbar-right">
        <div className="eden-player-pill">
          <div className="eden-pass-badge">
            <Crown size={13} className="eden-pass-icon" />
            <span>{t('topbar.pass').split(':')[0]}: <strong>{t('topbar.pass').split(': ')[1]}</strong></span>
          </div>

          <span className="eden-player-name">{nick}</span>

          <RoleTag role={profile?.role} />

          <div className="eden-player-avatar">
            <PlayerHead skinUrl={activeSkin} nickname={nick} size={34} />
          </div>
        </div>
      </div>
    </header>
  );
}
