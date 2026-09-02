import React from 'react';

const TAG_COLORS = {
  Update: 'var(--eden-cyan)',
  Evento: 'var(--eden-magenta)',
  Aviso: 'var(--eden-warn)',
};

export default function NewsList({ items = [] }) {
  return (
    <section className="eden-panel news-panel">
      <header className="panel-head">
        <h3 className="eden-title panel-title">Notícias do servidor</h3>
        <span className="panel-sub">{items.length} atualizações recentes</span>
      </header>
      <div className="news-grid">
        {items.map((n) => (
          <article key={n.id} className="news-card">
            <header>
              <span
                className="news-tag"
                style={{ color: TAG_COLORS[n.tag] || 'var(--eden-cyan)' }}
              >
                {n.tag}
              </span>
              <time>{formatDate(n.date)}</time>
            </header>
            <h4>{n.title}</h4>
            <p>{n.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
}
