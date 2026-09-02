import React from 'react';
import { Rocket, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import '../styles/launch.css';

// Phase label map — all possible phases from installer + launcher
const PHASE_LABELS = {
  // Install phases
  'install:start':          'Verificando ambiente Minecraft...',
  'install:manifest':       'Baixando manifesto de versões...',
  'install:version-json':   'Baixando configuração da versão...',
  'install:client-jar':     'Baixando Minecraft.jar...',
  'install:library':        'Baixando libraries...',
  'install:natives':        'Baixando natives...',
  'install:extract-natives':'Extraindo natives...',
  'install:asset-index':    'Baixando índice de assets...',
  'install:assets-start':   'Verificando assets...',
  'install:assets':         'Baixando assets...',
  'install:fabric':         'Baixando Fabric Loader...',
  'install:fabric-lib':     'Baixando library Fabric...',
  'install:done':           'Ambiente instalado com sucesso!',
  'install:complete':       'Ambiente pronto',
  // Modpack
  'modpack:start':          'Verificando modpack...',
  'modpack:done':           'Modpack atualizado',
  'download':               'Baixando arquivos do jogo...',
  'verify':                 'Verificando integridade dos arquivos...',
  'done':                   'Modpack sincronizado',
  // Launch pipeline
  'anticheat:start':        'Verificando integridade do cliente...',
  'anticheat:ok':           'Anti-cheat: OK',
  'integrity:start':        'Gerando hash de integridade...',
  'integrity:ok':           'Integridade verificada',
  'token:start':            'Autenticando sessão com o servidor...',
  'token:ok':               'Sessão autorizada',
  'jvm:spawn':              'Iniciando Minecraft...',
  'jvm:exit':               'Minecraft encerrado',
  'jvm:error':              'Erro ao iniciar Java',
};

const COUNTED_PHASES = new Set(['install:library', 'install:assets', 'install:natives', 'verify']);

function getOverallProgress(event) {
  if (!event) return 0;
  const { phase } = event;
  if (typeof phase !== 'string') return 0;

  if (phase.startsWith('install:manifest'))       return 4;
  if (phase.startsWith('install:version-json'))   return 8;
  if (phase.startsWith('install:client-jar'))     return 15 + (event.progress || 0) * 15;
  if (phase.startsWith('install:library'))        return 30 + ((event.done || 0) / Math.max(event.total, 1)) * 20;
  if (phase.startsWith('install:natives'))        return 50 + ((event.done || 0) / Math.max(event.total, 1)) * 10;
  if (phase.startsWith('install:asset'))          return 60 + ((event.done || 0) / Math.max(event.total, 1)) * 20;
  if (phase.startsWith('install:fabric'))         return 80 + ((event.done || 0) / Math.max(event.total, 1)) * 5;
  if (phase === 'install:complete')               return 85;
  if (phase === 'modpack:start')                  return 86;
  if (phase === 'download')                       return 86 + ((event.done || 0) / Math.max(event.total, 1)) * 8;
  if (phase === 'modpack:done' || phase === 'done') return 94;
  if (phase === 'anticheat:start')                return 95;
  if (phase === 'integrity:start')                return 97;
  if (phase === 'jvm:spawn')                      return 100;
  if (phase === 'jvm:exit')                       return 100;
  return 0;
}

export default function LaunchOverlay({ event, events = [], error, onClose }) {
  const phase   = event?.phase || '';
  const label   = PHASE_LABELS[phase] || (phase ? `${phase}...` : 'Preparando lançamento...');
  const overall = getOverallProgress(event);

  const currentFile  = event?.file || event?.msg || '';
  const countedDone  = COUNTED_PHASES.has(phase) ? (event?.done  ?? 0) : null;
  const countedTotal = COUNTED_PHASES.has(phase) ? (event?.total ?? 0) : null;

  return (
    <div className={`eden-launch-bottom-bar ${error ? 'is-error' : ''} eden-fade-in`}>
      <div className="eden-bottom-bar-content">
        {error ? (
          <div className="eden-bottom-bar-error">
            <AlertTriangle size={18} className="error-icon" />
            <div className="error-text-col">
              <span className="error-title">Falha ao iniciar o jogo</span>
              <span className="error-msg">{error}</span>
            </div>
            <button type="button" className="eden-bottom-close-btn" onClick={onClose}>
              <X size={14} /> Fechar
            </button>
          </div>
        ) : (
          <div className="eden-bottom-bar-main">
            {/* Left Info Column */}
            <div className="eden-bottom-info">
              <div className="eden-bottom-rocket-badge">
                <Rocket size={16} />
              </div>
              <div className="eden-bottom-text-col">
                <span className="eden-bottom-label">{label}</span>
                {currentFile && (
                  <span className="eden-bottom-subfile" title={currentFile}>
                    {currentFile}
                  </span>
                )}
              </div>
            </div>

            {/* Center Progress Bar */}
            <div className="eden-bottom-progress-col">
              <div className="eden-bottom-track">
                <div
                  className="eden-bottom-fill"
                  style={{ width: `${Math.min(overall, 100)}%` }}
                />
              </div>
              {countedDone !== null && countedTotal > 0 && (
                <span className="eden-bottom-counter">
                  {countedDone} / {countedTotal} arquivos
                </span>
              )}
            </div>

            {/* Right Percentage Badge */}
            <div className="eden-bottom-pct-badge">
              <span>{Math.round(overall)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
