import React, { useState } from 'react';
import { RefreshCw, CheckCircle, CloudDownload, AlertTriangle } from 'lucide-react';
import '../styles/update.css';

// Modal bloqueante de atualização — não pode ser fechado.
// Estados: baixando (progresso) → pronto (botão reiniciar) | erro (retry).
export default function UpdateModal({ info, progress, ready, error, onInstall, onRetry }) {
  const [installing, setInstalling] = useState(false);

  const version = info?.version || '';
  const downloadPct = progress
    ? Math.round((progress.percent ?? ((progress.transferred / progress.total) * 100)) || 0)
    : null;

  const handleInstall = () => {
    setInstalling(true);
    onInstall?.();
  };

  return (
    <div className="update-modal-overlay">
      <div
        className={`update-modal ${ready ? 'update-modal--ready' : ''} ${error ? 'update-modal--error' : ''}`}
      >
        <div className="update-modal-icon">
          {error ? <AlertTriangle size={30} /> : ready ? <CheckCircle size={30} /> : <CloudDownload size={30} />}
        </div>

        <h2 className="update-modal-title">
          {error
            ? 'Falha ao baixar a atualização'
            : ready
              ? 'Atualização pronta!'
              : 'Nova atualização disponível!'}
        </h2>

        <p className="update-modal-desc">
          {error
            ? 'Não foi possível concluir o download. Verifique sua conexão e tente novamente.'
            : ready
              ? `A versão ${version ? `v${version} ` : ''}foi baixada e está pronta. Reinicie o launcher para aplicá-la.`
              : `Uma nova versão${version ? ` (v${version})` : ''} do Éden Launcher está disponível e já está sendo baixada. O launcher será liberado após a atualização.`}
        </p>

        {error ? (
          <button className="update-modal-btn" onClick={onRetry}>
            <RefreshCw size={15} />
            Tentar novamente
          </button>
        ) : ready ? (
          <button
            className="update-modal-btn update-modal-btn--success"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? <RefreshCw size={15} className="spinning" /> : <RefreshCw size={15} />}
            {installing ? 'Reiniciando…' : 'Reiniciar & Atualizar'}
          </button>
        ) : (
          <div className="update-modal-progress">
            <div className="update-modal-progress-track">
              <div className="update-modal-progress-fill" style={{ width: `${downloadPct ?? 0}%` }} />
            </div>
            <span className="update-modal-progress-label">
              {downloadPct !== null ? `Baixando… ${downloadPct}%` : 'Preparando download…'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
