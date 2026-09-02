import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function SettingsModal({ serverName, onClose }) {
  const [ram, setRam] = useState(1024);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoLogin, setAutoLogin] = useState(true);
  const [jvmArgs, setJvmArgs] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header">
          <h3>Configurações de {serverName}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-group">
            <label>Memória RAM:</label>
            <div className="ram-slider-container">
              <input 
                type="range" 
                min="512" 
                max="8192" 
                step="512"
                value={ram} 
                onChange={(e) => setRam(e.target.value)}
                className="ram-slider"
              />
              <span className="ram-value">{ram} MB</span>
            </div>
          </div>

            <div className="settings-group">
              <div className="toggle-container" onClick={() => setFullscreen(!fullscreen)}>
                <label className={`toggle ${fullscreen ? 'on' : ''}`}>
                  <input type="checkbox" checked={fullscreen} readOnly />
                  <span className="toggle-thumb"></span>
                </label>
                <span className="toggle-label">Modo tela cheia</span>
              </div>
            </div>

            <div className="settings-group">
              <div className="toggle-container" onClick={() => setAutoLogin(!autoLogin)}>
                <label className={`toggle ${autoLogin ? 'on' : ''}`}>
                  <input type="checkbox" checked={autoLogin} readOnly />
                  <span className="toggle-thumb"></span>
                </label>
                <span className="toggle-label">Login automático no servidor</span>
              </div>
            </div>

          <div className="settings-group">
            <label>Argumentos JVM adicionais:</label>
            <input 
              type="text" 
              className="jvm-input" 
              placeholder="Argumentos do Minecraft"
              value={jvmArgs}
              onChange={(e) => setJvmArgs(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>CANCELAR</button>
          <button className="btn-apply" onClick={onClose}>APLICAR</button>
        </div>

      </div>
    </div>
  );
}
