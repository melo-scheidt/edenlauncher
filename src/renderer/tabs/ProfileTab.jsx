import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import SkinViewer3D from '../components/SkinViewer.jsx';
import PlayerHead from '../components/PlayerHead.jsx';
import RoleTag from '../components/RoleTag.jsx';
import { getValue, setValue } from '../lib/store.js';
import '../styles/profile.css';

const DEFAULT_SAVED_SKINS = [
  { id: 'skin-default', name: 'Original', url: '', active: false },
  { id: 'skin-steve', name: 'Clássico', url: 'https://minotar.net/skin/MHF_Steve', active: false },
];

export default function ProfileTab({ profile, activeSkin, onSkinChange }) {
  const [skinModel, setSkinModel] = useState('auto');
  const [savedSkins, setSavedSkins] = useState(DEFAULT_SAVED_SKINS);
  const [skinsLoaded, setSkinsLoaded] = useState(false);

  const nick = profile?.nickname || 'Aventureiro';
  const isMicrosoft = profile?.type === 'microsoft';
  const uuid = profile?.uuid || '';

  const defaultRawSkinUrl = isMicrosoft && uuid
    ? `https://minotar.net/skin/${uuid}`
    : `https://minotar.net/skin/${nick}`;

  // Load persisted skins from the launcher store
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getValue('savedSkins', null);
      if (!cancelled && Array.isArray(stored) && stored.length > 0) {
        setSavedSkins(stored);
      }
      if (!cancelled) setSkinsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist the skin list whenever it changes
  useEffect(() => {
    if (!skinsLoaded) return;
    setValue('savedSkins', savedSkins);
  }, [savedSkins, skinsLoaded]);

  // Keep saved skins synced with active skin
  useEffect(() => {
    setSavedSkins((prev) => {
      let found = false;
      const updated = prev.map((s) => {
        const url = s.url || defaultRawSkinUrl;
        const matches = activeSkin ? (s.url === activeSkin) : (!s.url);
        if (matches) found = true;
        return { ...s, active: matches };
      });

      if (!found && activeSkin) {
        const customCount = updated.filter((s) => s.name.startsWith('Skin')).length;
        return [
          ...updated.map((s) => ({ ...s, active: false })),
          {
            id: `skin-${Date.now()}`,
            name: customCount === 0 ? 'Skin Personalizada' : `Skin Personalizada ${customCount + 1}`,
            url: activeSkin,
            active: true,
          },
        ];
      }
      return updated;
    });
  }, [activeSkin, defaultRawSkinUrl]);

  const handleAddSkin = async () => {
    if (window.eden?.skins?.pick) {
      try {
        const res = await window.eden.skins.pick(nick);
        if (res?.ok && res.base64) {
          if (onSkinChange) onSkinChange(res.base64);
        } else if (res?.error && res.error !== 'Cancelado') {
          alert('Erro ao selecionar skin: ' + res.error);
        }
      } catch (e) {
        console.error('[ProfileTab] Erro ao adicionar skin:', e);
      }
    } else {
      // Browser preview fallback
      const fakeUrl = 'https://minotar.net/skin/MHF_Alex';
      if (onSkinChange) onSkinChange(fakeUrl);
    }
  };

  const handleSelectSkin = (skin) => {
    const targetUrl = skin.url || defaultRawSkinUrl;
    if (onSkinChange) onSkinChange(targetUrl);
  };

  const currentSkinUrl = activeSkin || defaultRawSkinUrl;

  return (
    <div className="eden-profile-container eden-fade-in">
      {/* ── Top Layout Grid: Left Stats | Center 3D | Right Saved Skins ── */}
      <div className="eden-profile-top-grid">
        {/* Left: Player Profile & Stats Card */}
        <div className="eden-profile-card">
          <div className="eden-profile-header-row">
            <div className="eden-profile-user-group">
              <div className="eden-profile-head-avatar">
                <PlayerHead skinUrl={currentSkinUrl} nickname={nick} size={48} />
              </div>
              <div className="eden-profile-user-info">
                <div className="eden-user-badge-row">
                  <RoleTag role={profile?.role} size="lg" />
                  <span className="eden-pass-status-text">Passe: adquirida</span>
                </div>
                <h2 className="eden-user-display-name">{nick}</h2>
              </div>
            </div>

            <div className="eden-balance-col">
              <span className="eden-balance-label">Seu Saldo</span>
              <span className="eden-balance-amount">1.000 VP</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="eden-stats-grid">
            <div className="eden-stat-box">
              <span className="eden-stat-label">Tempo em jogo</span>
              <strong className="eden-stat-val">1273h 30m</strong>
            </div>
            <div className="eden-stat-box">
              <span className="eden-stat-label">Mobs derrotados</span>
              <strong className="eden-stat-val">192.034</strong>
            </div>
            <div className="eden-stat-box">
              <span className="eden-stat-label">Qtd. de mortes</span>
              <strong className="eden-stat-val">95</strong>
            </div>
            <div className="eden-stat-box">
              <span className="eden-stat-label">Data registro</span>
              <strong className="eden-stat-val">10.12.2024</strong>
            </div>
            <div className="eden-stat-box">
              <span className="eden-stat-label">Último login</span>
              <strong className="eden-stat-val">Hoje</strong>
            </div>
            <div className="eden-stat-box">
              <span className="eden-stat-label">No projeto</span>
              <strong className="eden-stat-val">1 ano</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="eden-profile-btn-row">
            <button type="button" className="eden-profile-btn eden-profile-btn--primary">
              Comprar Passe
            </button>
            <button type="button" className="eden-profile-btn eden-profile-btn--secondary">
              Recarregar Saldo
            </button>
          </div>
        </div>

        {/* Center: 3D Skin Viewer */}
        <div className="eden-skin-viewer-panel">
          <div className="eden-skin-nick-badge">{nick}</div>
          <div className="eden-skin-3d-stage">
            <SkinViewer3D
              skinUrl={currentSkinUrl}
              model={skinModel}
              width={200}
              height={290}
            />
          </div>
        </div>

        {/* Right: Saved Skins */}
        <div className="eden-saved-skins-panel">
          <h3 className="eden-skins-title">Skins Salvas</h3>
          <div className="eden-skins-list">
            <button
              type="button"
              className="eden-add-skin-btn"
              onClick={handleAddSkin}
            >
              <Plus size={24} />
              <span>Adicionar skin</span>
            </button>

            {savedSkins.map((s) => (
              <div
                key={s.id}
                className={`eden-skin-item-card ${s.active ? 'is-active' : ''}`}
                onClick={() => handleSelectSkin(s)}
              >
                <div className="eden-skin-thumb-preview">
                  <PlayerHead skinUrl={s.url || defaultRawSkinUrl} nickname={nick} size={44} />
                </div>
                {s.active && <div className="eden-skin-active-tag">Ativa</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
