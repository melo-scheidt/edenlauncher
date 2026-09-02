import React, { useEffect, useState } from 'react';
import EdenLogo from './components/EdenLogo.jsx';
import { useI18n } from './i18n/index.jsx';
import './styles/splash.css';

const PHASE_KEYS = ['splash.phase1', 'splash.phase2', 'splash.phase3', 'splash.phase4'];

export default function SplashApp() {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.eden?.app?.getInfo?.()
      .then((info) => { if (info?.version) setVersion(info.version); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const start = Date.now();
    const total = 3000;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / total) * 100);
      setProgress(pct);
      setPhase(Math.min(PHASE_KEYS.length - 1, Math.floor((pct / 100) * PHASE_KEYS.length)));
      if (pct >= 100) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="splash-root">
      <div className="splash-card">
        <div className="splash-logo-container">
          <EdenLogo size="large" showBeta={true} showText={true} />
        </div>

        <div className="splash-progress">
          <div className="splash-progress-track">
            <div
              className="splash-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="splash-progress-meta">
            <span>{t(PHASE_KEYS[phase])}</span>
            <span>{Math.floor(progress)}%</span>
          </div>
        </div>

        <div className="splash-footer">{t('app.name')}{version ? ` · v${version}` : ''}</div>
      </div>
    </div>
  );
}
