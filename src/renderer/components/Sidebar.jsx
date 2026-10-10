import React from 'react';
import SpriteIcon from './SpriteIcon.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function Sidebar({ active, onSelect, badges }) {
  const { t } = useI18n();
  const tabs = [
    { id: 'profile', labelKey: 'nav.profile', icon: 'usuario' },
    { id: 'home', labelKey: 'nav.home', icon: 'inicio' },
    { id: 'mods', labelKey: 'nav.mods', icon: 'modos' },
    { id: 'map', labelKey: 'nav.map', icon: 'mapa' },
    { id: 'friends', labelKey: 'nav.friends', icon: 'usuarios' },
    { id: 'settings', labelKey: 'nav.settings', icon: 'configuracoes' },
  ];

  return (
    <aside className="eden-sidebar-pill">
      <nav className="eden-sidebar-nav">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const label = t(tab.labelKey);
          const badge = badges?.[tab.id] > 0 ? badges[tab.id] : 0;
          return (
            <button
              key={tab.id}
              type="button"
              id={`nav-tab-${tab.id}`}
              className={`eden-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(tab.id)}
              title={label}
            >
              <div className="eden-nav-icon-wrap">
                <SpriteIcon name={tab.icon} size={20} />
                {badge > 0 && (
                  <span className="eden-nav-badge">{badge > 99 ? '99+' : badge}</span>
                )}
              </div>
              <span className="eden-nav-label">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="eden-sidebar-bottom">
        <button
          type="button"
          id="nav-tab-logout"
          className="eden-nav-item eden-nav-item--logout"
          onClick={() => onSelect('logout')}
          title={t('nav.logout')}
        >
          <div className="eden-nav-icon-wrap">
            <SpriteIcon name="sair" size={18} />
          </div>
          <span className="eden-nav-label">{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
