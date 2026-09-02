import React, { useState } from 'react';
import { ChevronRight, Sparkles, User, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import EdenLogo from './EdenLogo.jsx';
import '../styles/login.css';

export default function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [passConf, setPassConf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setSuccess('');
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailOk) {
      setError('Informe um e-mail válido');
      return;
    }

    if (tab === 'register' && !/^[A-Za-z0-9_]{3,16}$/.test(nick.trim())) {
      setError('Nickname: 3–16 caracteres (letras, números ou _)');
      return;
    }

    if (pass.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres');
      return;
    }

    if (tab === 'register' && pass !== passConf) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const fn = tab === 'login'
        ? window.eden?.auth?.login
        : window.eden?.auth?.register;

      if (!fn) {
        // Fallback preview
        onLogin({
          type: 'offline',
          nickname: nick.trim(),
          uuid: `offline-${nick.trim()}`,
          accessToken: '0',
          role: 'player',
        });
        return;
      }

      const res = await fn(nick.trim(), pass, email.trim());
      if (res?.ok) {
        if (tab === 'register') {
          setSuccess('Conta criada com sucesso! Entrando...');
          setTimeout(() => onLogin(res.session), 800);
        } else {
          onLogin(res.session);
        }
      } else {
        setError(res?.error || 'Não foi possível autenticar');
      }
    } catch (err) {
      setError(err.message || 'Erro ao conectar ao servidor de autenticação');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading
    && emailOk && pass.length >= 6
    && (tab === 'login' || /^[A-Za-z0-9_]{3,16}$/.test(nick.trim()))
    && (tab === 'login' || pass === passConf);

  return (
    <div className="eden-login-wrapper">
      {/* ── Left Hero Side ── */}
      <div className="eden-login-hero">
        <div className="eden-login-hero-content">
          <div className="eden-hero-pill">
            <Sparkles size={14} className="eden-hero-sparkle" />
            <span>NOVA ERA MEDIEVAL RPG</span>
          </div>
          <h1 className="eden-hero-heading">Bem-vindo!</h1>
          <p className="eden-hero-desc">
            Autentique-se para mergulhar na verdadeira experiência de sobrevivência!
          </p>
        </div>
      </div>

      {/* ── Right Auth Card Side ── */}
      <div className="eden-login-card-side">
        <div className="eden-login-card">
          {/* Brand Header */}
          <div className="eden-card-brand">
            <EdenLogo size="large" showBeta={true} showText={true} />
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="eden-auth-alert eden-auth-alert--error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="eden-auth-alert eden-auth-alert--success">
              <CheckCircle size={15} />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form className="eden-auth-form" onSubmit={handleSubmit}>
            <div className="eden-input-group">
              <label htmlFor="auth-email" className="eden-input-label">
                E-mail
              </label>
              <div className="eden-input-field-wrap">
                <input
                  id="auth-email"
                  type="email"
                  className="eden-auth-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {tab === 'register' && (
              <div className="eden-input-group">
                <label htmlFor="auth-nick" className="eden-input-label">
                  Nickname
                </label>
                <div className="eden-input-field-wrap">
                  <input
                    id="auth-nick"
                    type="text"
                    className="eden-auth-input"
                    placeholder="Seu nickname..."
                    value={nick}
                    onChange={(e) => setNick(e.target.value)}
                    maxLength={16}
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div className="eden-input-group">
              <label htmlFor="auth-pass" className="eden-input-label">
                Senha
              </label>
              <div className="eden-input-field-wrap">
                <input
                  id="auth-pass"
                  type="password"
                  className="eden-auth-input"
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {tab === 'register' && (
              <div className="eden-input-group">
                <label htmlFor="auth-pass-conf" className="eden-input-label">
                  Confirmar Senha
                </label>
                <div className="eden-input-field-wrap">
                  <input
                    id="auth-pass-conf"
                    type="password"
                    className="eden-auth-input"
                    placeholder="••••••••"
                    value={passConf}
                    onChange={(e) => setPassConf(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              className="eden-auth-submit-btn"
              disabled={!canSubmit}
            >
              {loading ? (
                <span className="eden-auth-spinner" />
              ) : (
                <>
                  <span className="eden-auth-btn-icon">
                    <ChevronRight size={16} strokeWidth={3} />
                  </span>
                  <span>{tab === 'login' ? 'AUTENTICAR' : 'REGISTRAR'}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="eden-auth-footer">
            {tab === 'login' ? (
              <p className="eden-auth-switch-text">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  className="eden-auth-link"
                  onClick={() => switchTab('register')}
                >
                  Registre-se!
                </button>
              </p>
            ) : (
              <p className="eden-auth-switch-text">
                Já tem uma conta?{' '}
                <button
                  type="button"
                  className="eden-auth-link"
                  onClick={() => switchTab('login')}
                >
                  Entrar
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
