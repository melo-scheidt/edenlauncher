import React, { useState } from 'react';
import { ChevronLeft, Play, Settings as SettingsIcon, FileText } from 'lucide-react';
import SettingsModal from '../components/SettingsModal.jsx';

export default function ServerDetail({ server, onBack, profile }) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="server-detail">
      <button className="back-btn" onClick={onBack}>
        <ChevronLeft size={16} /> VOLTAR
      </button>

      <div className="detail-content">
        <h1 className="detail-title">{server.name}</h1>
        <p className="detail-desc">{server.description}</p>

        <div className="detail-actions">
          <button className="btn-play">
            <Play size={18} /> JOGAR
          </button>
          
          <button className="btn-settings" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={18} /> CONFIGURAR
          </button>
        </div>
      </div>

      <div className="detail-footer">
        <button className="btn-secondary">
          <FileText size={16} /> LISTA DE MODS
        </button>
        
        <button className="btn-secondary">
          NOSSO SITE
        </button>
      </div>

      {showSettings && (
        <SettingsModal 
          serverName={server.name} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
}
