import React from 'react';
import { User, Gamepad2, Layers, Map as MapIcon, Settings, LogOut } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

export default function Sidebar({ active, onSelect }) {
  const { t } = useI18n();
  const tabs = [
    { id: 'profile', labelKey: 'nav.profile', icon: User },
    { id: 'home', labelKey: 'nav.home', icon: Gamepad2 },
    { id: 'mods', labelKey: 'nav.mods', icon: Layers },
    { id: 'map', labelKey: 'nav.map', icon: MapIcon },
    { id: 'settings', labelKey: 'nav.settings', icon: Settings },
  ];

  return (
    <aside className="eden-sidebar-pill">
      <nav className="eden-sidebar-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          const label = t(tab.labelKey);
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
                <Icon size={20} strokeWidth={2.2} />
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
            <LogOut size={18} strokeWidth={2.2} />
          </div>
          <span className="eden-nav-label">{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
