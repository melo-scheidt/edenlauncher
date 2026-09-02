import React, { useState } from 'react';
import { RefreshCw, CheckCircle, CloudDownload, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import '../styles/update.css';

// Modal bloqueante de atualização — não pode ser fechado.
// Estados: baixando (progresso) → pronto (botão reiniciar) | erro (retry).
export default function UpdateModal({ info, progress, ready, error, onInstall, onRetry }) {
  const { t } = useI18n();
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
          {error ? t('update.error') : ready ? t('update.ready') : t('update.available')}
        </h2>

        <p className="update-modal-desc">
          {error
            ? t('update.descError')
            : ready
              ? t('update.descReady', { v: version })
              : t('update.descAvailable', { v: version })}
        </p>

        {error ? (
          <button className="update-modal-btn" onClick={onRetry}>
            <RefreshCw size={15} />
            {t('update.retry')}
          </button>
        ) : ready ? (
          <button
            className="update-modal-btn update-modal-btn--success"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? <RefreshCw size={15} className="spinning" /> : <RefreshCw size={15} />}
            {installing ? t('update.restarting') : t('update.install')}
          </button>
        ) : (
          <div className="update-modal-progress">
            <div className="update-modal-progress-track">
              <div className="update-modal-progress-fill" style={{ width: `${downloadPct ?? 0}%` }} />
            </div>
            <span className="update-modal-progress-label">
              {downloadPct !== null ? t('splash.phase1').replace('...', `… ${downloadPct}%`) : t('map.loading')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
