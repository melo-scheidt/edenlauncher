import React, { useState } from 'react';
import { X, Crown, Check, Sparkles, ExternalLink, Zap } from 'lucide-react';
import { VIP_TIERS } from '../lib/vips.js';
import '../styles/vip-modal.css';

export default function VipModal({ isOpen, onClose, currentRole, onSelectVip }) {
  const [selectedId, setSelectedId] = useState('diamante');

  if (!isOpen) return null;

  const selectedVip = VIP_TIERS.find((v) => v.id === selectedId) || VIP_TIERS[2];

  const handleAcquire = (vip) => {
    const target = vip || selectedVip;
    const url = 'https://discord.gg/XE5SsTurP5';
    if (window.eden?.shell?.openExternal) {
      window.eden.shell.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="eden-vip-modal-backdrop eden-fade-in" onClick={onClose}>
      <div
        className="eden-vip-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          '--vip-color': selectedVip.color,
          '--vip-glow': selectedVip.glow,
          '--vip-border': selectedVip.border,
        }}
      >
        {/* Header */}
        <div className="eden-vip-modal-head">
          <div className="eden-vip-modal-title-group">
            <div className="eden-vip-crown-icon-wrap" style={{ background: selectedVip.bg, borderColor: selectedVip.border }}>
              <Crown size={22} style={{ color: selectedVip.color }} />
            </div>
            <div>
              <div className="eden-vip-subtitle-pill">
                <Sparkles size={12} />
                <span>PLANOS EXCLUSIVOS DO SERVIDOR</span>
              </div>
              <h2 className="eden-vip-modal-title">Escolha seu VIP</h2>
            </div>
          </div>

          <button
            type="button"
            className="eden-vip-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 VIP Tabs / Cards Row */}
        <div className="eden-vip-tiers-row">
          {VIP_TIERS.map((vip) => {
            const isSelected = vip.id === selectedId;
            return (
              <div
                key={vip.id}
                className={`eden-vip-tier-card ${isSelected ? 'is-selected' : ''}`}
                style={{
                  '--card-color': vip.color,
                  '--card-border': vip.border,
                  '--card-bg': vip.bg,
                  '--card-glow': vip.glow,
                }}
                onClick={() => setSelectedId(vip.id)}
              >
                {vip.badgeText && (
                  <div className="eden-vip-tier-badge" style={{ background: vip.gradient }}>
                    {vip.badgeText}
                  </div>
                )}
                <div className="eden-vip-tier-icon-box" style={{ borderColor: isSelected ? vip.color : vip.border }}>
                  <Crown size={20} style={{ color: vip.color }} />
                </div>
                <h3 className="eden-vip-tier-name">{vip.tierName}</h3>
                <div className="eden-vip-tier-price">
                  <span className="eden-vip-vp">{vip.priceVP} VP</span>
                  <span className="eden-vip-brl">ou R$ {vip.priceBRL}</span>
                </div>
                <div className="eden-vip-tag-preview" style={{ color: vip.color, background: vip.bg, borderColor: vip.border }}>
                  {vip.tag}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Tier Detail & Perks */}
        <div className="eden-vip-detail-panel" style={{ borderColor: selectedVip.border, background: selectedVip.bg }}>
          <div className="eden-vip-detail-head">
            <div className="eden-vip-detail-info">
              <span className="eden-vip-detail-duration">Duração: {selectedVip.duration}</span>
              <h4 className="eden-vip-detail-title" style={{ color: selectedVip.color }}>
                Vantagens do {selectedVip.name}
              </h4>
            </div>
            <div className="eden-vip-detail-pricing">
              <span className="eden-vip-big-price">{selectedVip.priceVP} VP</span>
              <span className="eden-vip-sub-price">R$ {selectedVip.priceBRL} / mês</span>
            </div>
          </div>

          <div className="eden-vip-perks-grid">
            {selectedVip.perks.map((perk, idx) => (
              <div key={idx} className="eden-vip-perk-item">
                <div className="eden-vip-check-icon" style={{ background: selectedVip.color }}>
                  <Check size={12} color="#000" strokeWidth={3} />
                </div>
                <span>{perk}</span>
              </div>
            ))}
          </div>

          <div className="eden-vip-actions-row">
            <button
              type="button"
              className="eden-vip-buy-btn"
              style={{ background: selectedVip.gradient, boxShadow: `0 0 20px ${selectedVip.glow}` }}
              onClick={() => handleAcquire(selectedVip)}
            >
              <Zap size={16} />
              <span>Adquirir {selectedVip.name}</span>
              <ExternalLink size={14} style={{ marginLeft: 4 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
