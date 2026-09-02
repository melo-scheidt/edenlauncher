import React, { useState, useEffect } from 'react';
import { MessageSquare, Globe, Send, ShieldCheck, Sun, Moon } from 'lucide-react';
import EdenLogo from './EdenLogo.jsx';
import PlayerHead from './PlayerHead.jsx';
import RoleTag from './RoleTag.jsx';

export default function TopBar({ profile, theme, onToggleTheme, activeSkin, onlinePlayers = 54, maxPlayers = 100 }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const nick = profile?.nickname || 'Aventureiro';
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
            <span className="eden-status-text">online do servidor</span>
          </div>
        </div>
      </div>

      {/* ── Center / Social Links ── */}
      <div className="eden-topbar-center">
        <div className="eden-social-links">
          <button
            type="button"
            className="eden-social-btn"
            title="Discord da Comunidade"
            onClick={() => openSocial('https://discord.gg/eden')}
          >
            <MessageSquare size={16} />
          </button>
          <button
            type="button"
            className="eden-social-btn"
            title="Site Oficial"
            onClick={() => openSocial('https://eden.net')}
          >
            <Globe size={16} />
          </button>
          <button
            type="button"
            className="eden-social-btn"
            title="Canal do Telegram / Notificações"
            onClick={() => openSocial('https://t.me/eden')}
          >
            <Send size={16} />
          </button>
          {onToggleTheme && (
            <button
              type="button"
              className="eden-social-btn eden-theme-toggle-btn"
              title={theme === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
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
            <ShieldCheck size={13} className="eden-pass-icon" />
            <span>Passe: <strong>adquirido</strong></span>
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
