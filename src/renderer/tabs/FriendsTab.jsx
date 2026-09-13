import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useFriends } from '../hooks/useFriends.jsx';
import { toast } from '../hooks/useToast.jsx';
import '../styles/friends.css';

// Códigos vindos do main (friends:*) -> chaves i18n
const ERR_MAP = {
  FRIENDS_NICK_NOT_FOUND: 'friends.errNickNotFound',
  FRIENDS_SELF: 'friends.errSelf',
  FRIENDS_NICK_INVALID: 'friends.errInvalidNick',
  FRIENDS_ALREADY: 'friends.errAlready',
  FRIENDS_PENDING_OUT: 'friends.errPendingOut',
  FRIENDS_PENDING_IN: 'friends.errPendingIn',
  FRIENDS_BLOCKED_BY_ME: 'friends.errBlockedMe',
  FRIENDS_BLOCKED_BY_THEM: 'friends.errBlockedThem',
  FRIENDS_BLOCKED_SEND: 'friends.errBlockedSend',
  FRIENDS_NOT_FRIENDS: 'friends.errNotFriends',
  FRIENDS_TOKEN: 'friends.errToken',
};

export default function FriendsTab({ profile }) {
  const { t } = useI18n();
  const [view, setView] = useState('friends'); // 'friends' | 'requests' | 'blocked'
  const [nickInput, setNickInput] = useState('');

  const {
    status,
    loaded,
    loadError,
    me,
    friends,
    pendingIn,
    pendingOut,
    blocked,
    load,
    request,
    respond,
    cancel,
    unblock,
  } = useFriends(profile?.nickname || '');

  const errMsg = (code, params) => t(ERR_MAP[code] || 'friends.errGeneric', params);
  const nickOf = (list, id) => (list || []).find((x) => x.userId === id)?.nick || '?';

  // ----- Ações -----

  const handleAdd = async () => {
    const nick = nickInput.trim();
    if (!nick) return;
    const res = await request(nick);
    if (res?.ok) {
      setNickInput('');
      toast.success(t('friends.reqSent', { nick }));
      load();
    } else {
      toast.error(errMsg(res?.error, { nick }));
    }
  };

  const handleAccept = async (id) => {
    const nick = nickOf(pendingIn, (pendingIn || []).find((p) => p.id === id)?.userId);
    const res = await respond(id, true);
    if (res?.ok) {
      toast.success(t('friends.reqAccepted', { nick }));
      load();
    } else {
      toast.error(errMsg(res?.error, { nick }));
    }
  };

  const handleDecline = async (id) => {
    const nick = nickOf(pendingIn, (pendingIn || []).find((p) => p.id === id)?.userId);
    const res = await respond(id, false);
    if (res?.ok) {
      toast.success(t('friends.reqDeclined', { nick }));
      load();
    } else {
      toast.error(errMsg(res?.error, { nick }));
    }
  };

  const handleCancel = async (id) => {
    const res = await cancel(id);
    if (res?.ok) {
      toast.success(t('friends.reqCancelled'));
      load();
    } else {
      toast.error(errMsg(res?.error));
    }
  };

  const handleUnblock = async (userId, nick) => {
    const res = await unblock(userId);
    if (res?.ok) {
      toast.success(t('friends.unblocked', { nick }));
      load();
    } else {
      toast.error(errMsg(res?.error, { nick }));
    }
  };

  // ----- Render -----

  const renderState = () => {
    if (!status.available) {
      return (
        <div className="friends-empty">
          <p className="empty-text">{t('friends.unavailable')}</p>
        </div>
      );
    }
    if (!loaded) {
      return (
        <div className="friends-empty">
          <p className="empty-text">{t('friends.loading')}</p>
        </div>
      );
    }
    if (loadError || !me) {
      return (
        <div className="friends-empty">
          <p className="empty-text">
            {loadError === 'FRIENDS_TOKEN' ? t('friends.errToken') : t('friends.errGeneric')}
          </p>
        </div>
      );
    }
    return null;
  };

  const blocking = renderState();
  if (blocking) {
    return (
      <section className="friends-tab">
        <header className="friends-header">
          <h1>{t('friends.title')}</h1>
          <p>{t('friends.subtitle')}</p>
        </header>
        {blocking}
      </section>
    );
  }

  return (
    <section className="friends-tab">
      <header className="friends-header">
        <h1>{t('friends.title')}</h1>
        <p>{t('friends.subtitle')}</p>
      </header>

      <div className="friends-controls">
        <div className="friends-add-wrapper">
          <input
            className="friends-input"
            placeholder={t('friends.addPlaceholder')}
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            maxLength={16}
          />
          <button
            type="button"
            className="friends-add-btn"
            onClick={handleAdd}
            disabled={!nickInput.trim()}
          >
            <Plus size={14} className="friends-add-icon" /> {t('friends.addBtn')}
          </button>
        </div>
      </div>

      <nav className="friends-nav">
        <button
          type="button"
          className={`friends-tab-btn ${view === 'friends' ? 'active' : ''}`}
          onClick={() => setView('friends')}
        >
          {t('friends.tabFriends')}
          {(friends || []).length > 0 && (
            <span className="friends-badge">
              {(friends || []).length > 99 ? '99+' : (friends || []).length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`friends-tab-btn ${view === 'requests' ? 'active' : ''}`}
          onClick={() => setView('requests')}
        >
          {t('friends.tabRequests')}
          {(pendingIn || []).length > 0 && (
            <span className="friends-badge">
              {(pendingIn || []).length > 99 ? '99+' : (pendingIn || []).length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`friends-tab-btn ${view === 'blocked' ? 'active' : ''}`}
          onClick={() => setView('blocked')}
        >
          {t('friends.tabBlocked')}
          {(blocked || []).length > 0 && (
            <span className="friends-badge">
              {(blocked || []).length > 99 ? '99+' : (blocked || []).length}
            </span>
          )}
        </button>
      </nav>

      <div className="friends-tabs-content">
        {view === 'friends' && (
          <div className="friends-friends-panel">
            {(friends || []).length === 0 && (
              <p className="friends-empty-list">{t('friends.emptyFriends')}</p>
            )}
            <ul className="friends-list">
              {(friends || []).map((f) => (
                <li key={f.id} className="friends-list-item">
                  <div className="friends-list-info">
                    <span className="friends-list-nick">{f.nick}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === 'requests' && (
          <div className="friends-requests-panel">
            <div className="friends-requests-grid">
              <div className="friends-request-column">
                <h3>{t('friends.requestsIn')}</h3>
                {(pendingIn || []).length === 0 && (
                  <p className="friends-empty-list">{t('friends.emptyRequests')}</p>
                )}
                {(pendingIn || []).map((req) => (
                  <div key={req.id} className="friends-request-item">
                    <div className="friends-requester-info">
                      <span className="friends-requester-nick">{req.nick}</span>
                    </div>
                    <div className="friends-request-actions">
                      <button
                        type="button"
                        className="friends-action-btn accept"
                        onClick={() => handleAccept(req.id)}
                        title={t('friends.accept')}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="friends-action-btn cancel"
                        onClick={() => handleDecline(req.id)}
                        title={t('friends.decline')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="friends-request-column">
                <h3>{t('friends.requestsOut')}</h3>
                {(pendingOut || []).length === 0 && (
                  <p className="friends-empty-list">{t('friends.emptyRequests')}</p>
                )}
                {(pendingOut || []).map((req) => (
                  <div key={req.id} className="friends-request-item">
                    <div className="friends-requester-info">
                      <span className="friends-requester-nick">{req.nick}</span>
                    </div>
                    <button
                      type="button"
                      className="friends-action-btn cancel"
                      onClick={() => handleCancel(req.id)}
                      title={t('friends.cancel')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'blocked' && (
          <div className="friends-blocked-panel">
            {(blocked || []).length === 0 && (
              <p className="friends-empty-list">{t('friends.emptyBlocked')}</p>
            )}
            <ul className="friends-blocked-list">
              {(blocked || []).map((b) => (
                <li key={b.id} className="friends-blocked-item">
                  <span className="friends-blocked-nick">{b.nick}</span>
                  <button
                    type="button"
                    className="friends-action-btn unblock"
                    onClick={() => handleUnblock(b.userId, b.nick)}
                    title={t('friends.unblock')}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
