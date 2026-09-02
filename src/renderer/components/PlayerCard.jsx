import React, { useState } from 'react';

export default function PlayerCard({ profile, hydrated, onLoginMicrosoft, onLoginOffline, onLogout }) {
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput,   setNickInput]   = useState('');
  const [loading,     setLoading]     = useState(false);

  const isMicrosoft = profile?.type === 'microsoft';

  const handleOfflineSubmit = async () => {
    const nick = nickInput.trim();
    if (!nick) return;
    setLoading(true);
    await onLoginOffline(nick);
    setLoading(false);
    setEditingNick(false);
    setNickInput('');
  };

  const handleMicrosoft = async () => {
    setLoading(true);
    await onLoginMicrosoft();
    setLoading(false);
  };

  return (
    <div className="player-card eden-panel">
      <div className="player-skin-preview">
        <div className="skin-placeholder">
          <span className="skin-icon">🧑‍🎤</span>
        </div>
      </div>

      <div className="player-info">
        {hydrated ? (
          <>
            <span className="player-name">{profile.nickname}</span>
            <span className={`player-mode ${isMicrosoft ? 'premium' : 'offline'}`}>
              {isMicrosoft ? '✦ Premium' : '◉ Offline'}
            </span>
            <span className="player-uuid">{profile.uuid?.slice(0, 18)}…</span>
          </>
        ) : (
          <span className="player-name">Carregando…</span>
        )}
      </div>

      <div className="player-actions">
        {!isMicrosoft && (
          <button className="btn-primary" onClick={handleMicrosoft} disabled={loading}>
            {loading ? '…' : '🔑 Login Microsoft'}
          </button>
        )}

        {editingNick ? (
          <div className="nick-form">
            <input
              className="text-input"
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              placeholder="Seu nickname (3-16 chars)"
              onKeyDown={(e) => e.key === 'Enter' && handleOfflineSubmit()}
              maxLength={16}
              autoFocus
            />
            <div className="nick-form-btns">
              <button className="btn-ghost" onClick={() => setEditingNick(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleOfflineSubmit} disabled={loading}>
                {loading ? '…' : 'Confirmar'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => { setEditingNick(true); setNickInput(profile.nickname || ''); }}>
            ✏️ {isMicrosoft ? 'Trocar conta offline' : 'Trocar nickname'}
          </button>
        )}

        {(isMicrosoft || profile?.nickname !== 'EdenRunner') && (
          <button className="btn-ghost danger" onClick={onLogout}>
            ↩ Sair
          </button>
        )}
      </div>
    </div>
  );
}
