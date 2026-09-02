import React, { useEffect, useState } from 'react';
import EdenCanvas from './components/EdenCanvas.jsx';
import EdenLogo from './components/EdenLogo.jsx';
import './styles/splash.css';

const PHASES = [
  'Carregando recursos...',
  'Verificando ambiente Éden...',
  'Conectando aos servidores...',
  'Pronto para iniciar.',
];

export default function SplashApp() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const total = 3000;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / total) * 100);
      setProgress(pct);
      setPhase(Math.min(PHASES.length - 1, Math.floor((pct / 100) * PHASES.length)));
      if (pct >= 100) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="splash-root">
      <EdenCanvas dense />
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
            <span>{PHASES[phase]}</span>
            <span>{Math.floor(progress)}%</span>
          </div>
        </div>

        <div className="splash-footer">Éden Launcher · v0.2.0</div>
      </div>
    </div>
  );
}
