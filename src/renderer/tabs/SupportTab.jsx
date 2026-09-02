import React, { useEffect, useState } from 'react';
import { SUPPORT_LINKS } from '../lib/mockData.js';
import { useI18n } from '../i18n/index.jsx';
import '../styles/support.css';

export default function SupportTab() {
  const { t } = useI18n();
  const [logs, setLogs] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (window.eden?.logs?.read) {
          const txt = await window.eden.logs.read();
          if (!cancelled) setLogs(txt);
        } else {
          // Browser preview fallback
          setLogs(makeFakeLogs());
        }
      } catch (err) {
        setError(err.message || String(err));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openExternal = async (url) => {
    if (window.eden?.shell?.openExternal) {
      await window.eden.shell.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError(t('support.copyFail', { msg: err.message }));
    }
  };

  const openLogsFolder = async () => {
    if (window.eden?.logs?.openFolder) {
      await window.eden.logs.openFolder();
    } else {
      alert(t('support.electronOnly'));
    }
  };

  return (
    <div className="support-grid">
      <section className="eden-panel support-panel">
        <header className="panel-head">
          <div>
            <h3 className="eden-title panel-title">{t('support.title')}</h3>
            <span className="panel-sub">{t('support.subtitle')}</span>
          </div>
        </header>

        <div className="support-links">
          {SUPPORT_LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              className="support-link"
              style={{ '--accent': l.color }}
              onClick={() => openExternal(l.url)}
            >
              <div className="support-link-icon">
                {iconFor(l.id)}
              </div>
              <div className="support-link-text">
                <strong>{t(l.labelKey)}</strong>
                <span>{t(l.descKey)}</span>
                <code>{l.url}</code>
              </div>
              <div className="support-link-arrow">→</div>
            </button>
          ))}
        </div>
      </section>

      <section className="eden-panel support-panel">
        <header className="panel-head">
          <div>
            <h3 className="eden-title panel-title">{t('support.logViewer')}</h3>
            <span className="panel-sub">launcher-latest.log</span>
          </div>
          <div className="logs-actions">
            <button type="button" className="btn-ghost" onClick={openLogsFolder}>
              {t('support.openFolder')}
            </button>
            <button
              type="button"
              className={`btn-ghost ${copied ? 'is-active' : ''}`}
              onClick={copyLogs}
            >
              {copied ? `✓ ${t('support.copied').replace('✓ ', '')}` : t('support.copy')}
            </button>
          </div>
        </header>

        <div className="logs-viewer-wrap">
          {error ? (
            <div className="logs-error">⚠ {error}</div>
          ) : (
            <textarea
              className="logs-viewer"
              readOnly
              value={logs}
              spellCheck={false}
            />
          )}
        </div>

        <p className="form-help">
          {t('support.help')}
        </p>
      </section>
    </div>
  );
}

function iconFor(id) {
  const props = {
    width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (id) {
    case 'discord':
      return (
        <svg {...props}>
          <path d="M9 12a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="none" />
          <path d="M5 17l-1 3 4-2c.5.1 2.4.5 4 .5s3.5-.4 4-.5l4 2-1-3c1.5-1.5 2-4 2-7l-2-3c-1-1-3-1.5-4-1.5l-1 1.5-2-.5-2 .5L9 5C8 5 6 5.5 5 6.5L3 10c0 3 .5 5.5 2 7z" />
        </svg>
      );
    case 'website':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
        </svg>
      );
    case 'faq':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4M12 17h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function makeFakeLogs() {
  const now = new Date().toISOString();
  return [
    `[${now}] [INFO] Éden Launcher starting...`,
    `[${now}] [INFO] Browser preview (no Electron).`,
    `[${now}] [DEBUG] Loaded modpack manifest v1.4.2`,
    `[${now}] [INFO] Mods checksum OK (28/28)`,
    `[${now}] [INFO] Connection to jogar.eden.net:25565 ready`,
  ].join('\n');
}
