import React, { useEffect, useState } from 'react';

const SERVER_HOST = 'jogar.eden.net';

export default function ServerStatus() {
  const [status, setStatus] = useState({
    online:  false,
    players: 0,
    max:     500,
    version: '—',
    ping:    0,
    loading: true,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_HOST}`, { cache: 'no-store' });
        const ping = Math.round(performance.now() - t0);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStatus({
          online:  data.online  ?? false,
          players: data.players?.online ?? 0,
          max:     data.players?.max    ?? 500,
          version: data.version         ?? '—',
          ping,
          loading: false,
        });
      } catch {
        setStatus((s) => ({ ...s, online: false, loading: false }));
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  const { online, players, max, version, ping, loading } = status;
  const fillPct = max > 0 ? Math.min((players / max) * 100, 100) : 0;

  return (
    <div className={`server-status ${online ? 'is-online' : 'is-offline'} ${loading ? 'is-loading' : ''}`}>
      <div className="server-status-head">
        <span className="status-dot" />
        <span className="status-label">
          {loading ? 'VERIFICANDO…' : online ? 'ONLINE' : 'OFFLINE'}
        </span>
        {online && ping > 0 && <span className="status-ping">{ping}ms</span>}
      </div>
      <div className="server-status-body">
        <div className="status-host">{SERVER_HOST}</div>
        <div className="status-players">
          <strong>{players}</strong>
          <span>/ {max}</span>
          <em>jogadores</em>
        </div>
        {online && version && version !== '—' && (
          <div className="status-version">MC {version}</div>
        )}
      </div>
      <div className="status-bar">
        <div
          className="status-bar-fill"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  );
}
