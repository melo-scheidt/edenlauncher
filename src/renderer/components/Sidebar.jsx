import React from 'react';
import { User, Gamepad2, Layers, Map as MapIcon, Settings, LogOut } from 'lucide-react';

export default function Sidebar({ active, onSelect }) {
  const tabs = [
    { id: 'profile', label: 'conta', icon: User },
    { id: 'home', label: 'jogar', icon: Gamepad2 },
    { id: 'mods', label: 'mods', icon: Layers },
    { id: 'map', label: 'mapa', icon: MapIcon },
    { id: 'settings', label: 'configurações', icon: Settings },
  ];

  return (
    <aside className="eden-sidebar-pill">
      <nav className="eden-sidebar-nav">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              id={`nav-tab-${t.id}`}
              className={`eden-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(t.id)}
              title={t.label}
            >
              <div className="eden-nav-icon-wrap">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <span className="eden-nav-label">{t.label}</span>
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
          title="Sair"
        >
          <div className="eden-nav-icon-wrap">
            <LogOut size={18} strokeWidth={2.2} />
          </div>
          <span className="eden-nav-label">sair</span>
        </button>
      </div>
    </aside>
  );
}
