import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useFriends } from '../hooks/useFriends.jsx';
import { useToast } from '../hooks/useToast.jsx';
import '../styles/friends.css';

export default function FriendsTab({ profile }) {
  const { t } = useI18n();
  const [view, setView] = useState('friends'); // 'friends' | 'requests' | 'blocked'
  const [search, setSearch] = useState('');
  const [nickInput, setNickInput] = useState('');
  const [pendingInCount, setPendingInCount] = useState(0);
  const [pendingOutCount, setPendingOutCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Hook que gerencia estado + realtime
  const {
    status,
    me,
    friends,
    pendingIn,
    pendingOut,
    blocked,
    unread,
    load,
    request,
    respond,
    cancel,
    block,
    unblock,
    send,
    messages,
    markRead,
  } = useFriends(profile?.nickname || '');

  useEffect(() => {
    if (!me) return;
    load();
  }, [me, load]);

  // Atualizar contadores na sidebar
  useEffect(() => {
    const inC = (pendingIn || []).filter((p) => p.status === 'pending').length;
    const outC = (pendingOut || []).filter((p) => p.status === 'pending').length;
    setPendingInCount(inC);
    setPendingOutCount(outC);

    const totalUnread = Object.values(unread || {}).reduce((a, c) => a + c, 0);
    setUnreadCount(totalUnread);
  }, [pendingIn, pendingOut, unread]);

  // Subscribe to realtime events for UI updates
  useEffect(() => {
    if (!status.available) return;

    const unsubscribe = () => {
      // cleanup
    };

    // Events come via preload -> main -> renderer through emitter
    // We re-query after each event to keep UI in sync
    const handleEvent = async (e) => {
      switch (e.type) {
        case 'friends-changed':
        case 'friend-request':
        case 'friend-accepted':
        case 'message':
          await load();
          break;
        case 'presence':
          // presence updates handled elsewhere
          break;
      }
    };

    // Listen for events from main process
    const cleanup = () => {
      // Event bus handled in preload
    };

    return () => {
      cleanup();
    };
  }, [status.available, me, load]);

  // ----- UI -----

  const handleAdd = async () => {
    const nick = nickInput.trim();
    if (!nick) return;
    try {
      await request(nick);
      setNickInput('');
      toast.success(t('friends.reqSent', { nick }));
    } catch (e) {
      toast.error(t(`friends.err${e.code || 'Generic'}`, { nick }));
    }
  };

  const handleAccept = async (id) => {
    try {
      await respond(id, true);
      toast.success(t('friends.reqAccepted', { nick: '???' }));
    } catch (e) {
      toast.error(t('friends.errGeneric'));
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancel(id);
      toast.success(t('friends.reqCancelled'));
    } catch (e) {
      toast.error(t('friends.errGeneric'));
    }
  };

  const handleBlock = async (userId) => {
    try {
      await block(userId);
      toast.success(t('friends.unblocked', { nick: '???' }));
    } catch (e) {
      toast.error(t('friends.errGeneric'));
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await unblock(userId);
      toast.success(t('friends.unblocked', { nick: '???' }));
    } catch (e) {
      toast.error(t('friends.errGeneric'));
    }
  };

  const handleSend = async (userId) => {
    const body = (e.target?.value || '').trim();
    if (!body) return;
    try {
      await send(userId, body);
      setMessageRef((ref) => { if (ref) ref.current.value = ''; });
      toast.success(t('friends.newMessage', { nick: '???' }));
    } catch (e) {
      toast.error(t(`friends.err${e.code || 'Generic'}`));
    }
  };

  // ----- Render -----

  if (!me || !status.available) {
    return (
      <div className="friends-tab">
        <div className="friends-empty">
          <t className="empty-text">{t('friends.unavailable')}</t>
        </div>
      </div>
    );
  }

  const myFriends = (friends || []).filter((f) => f.direction === 'out' || f.status === 'accepted');
  const myPendingIn = pendingIn || [];
  const myPendingOut = pendingOut || [];
  const myBlocked = blocked || [];

  // Get nicks for blocked list
  const blockedNicks = (myBlocked || []).map((b) => b.nick || '?');

  return (
    <section className="friends-tab">
      <header className="friends-header">
        <h1>{t('friends.title')}</h1>
        <p>{t('friends.subtitle')}</p>
      </header>

      <div className="friends-controls">
        <div className="friends-search-wrapper">
          <Input
            placeholder={t('friends.searchPlaceholder', { default: 'Pesquisar nick...' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!me}
          />
        </div>

        {/* Add Friend Section */}
        <div className="friends-add-wrapper">
          <Input
            placeholder={t('friends.addPlaceholder', { default: t('friends.addPlaceholder') })}
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={!me}
          />
          <button className="friends-add-btn" onClick={handleAdd} disabled={!me || !nickInput.trim()}>
            <Plus className="friends-add-icon" /> {t('friends.addBtn')}
          </button>
        </div>
      </div>

      <nav className="friends-nav">
        <button
          className={`friends-tab-btn ${view === 'friends' ? 'active' : ''}`}
          onClick={() => setView('friends')}
        >
          {t('friends.tabFriends')} {(friends || []).length > 0 && (
            <span className="friends-badge">{((friends || []).length > 99 ? '99+' : (friends || []).length)}</span>
          )}
        </button>
        <button
          className={`friends-tab-btn ${view === 'requests' ? 'active' : ''}`}
          onClick={() => setView('requests')}
        >
          {t('friends.tabRequests')}
          {(pendingIn || []).length > 0 && (
            <span className="friends-badge">{((pendingIn || []).length > 99 ? '99+' : (pendingIn || []).length)}</span>
          )}
          {(pendingOut || []).length > 0 && (
            <span className="friends-badge" style={{ marginLeft: '-4px' }}>
              {((pendingOut || []).length > 99 ? '99+' : (pendingOut || []).length)}
            </span>
          )}
        </button>
        <button
          className={`friends-tab-btn ${view === 'blocked' ? 'active' : ''}`}
          onClick={() => setView('blocked')}
        >
          {t('friends.tabBlocked')}
          {(blocked || []).length > 0 && (
            <span className="friends-badge">{((blocked || []).length > 99 ? '99+' : (blocked || []).length)}</span>
          )}
        </button>
      </nav>

      <div className="friends-tabs-content">
        {/* Friends Tab */}
        {view === 'friends' && (
          <div className="friends-friends-panel">
            {myFriends.length === 0 && (
              <div className="friends-empty-list">
                <t>{t('friends.emptyFriends')}</t>
              </div>
            )}
            <ul className="friends-list">
              {myFriends.map((f) => (
                <li key={f.id} className="friends-list-item">
                  <div className="friends-list-info">
                    <span className="friends-list-nick">{f.nick}</span>
                    <span className="friends-list-status">
                      {f.direction === 'out' ? t('friends.online') : t('friends.offline')}
                    </span>
                  </div>
                  <div className="friends-list-actions">
                    <button
                      className="friends-action-btn small"
                      onClick={() => {
                        // Open DM
                        setSearch(f.nick);
                      }}
                    >
                      <Mail className="friends-action-icon" />
                      {t('friends.chatWith', { nick: f.nick })}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requests Tab */}
        {view === 'requests' && (
          <div className="friends-requests-panel">
            <div className="friends-requests-grid">
              {/* Pending Incoming */}
              <div className="friends-request-column">
                <h3>{t('friends.requestsIn')} {(pendingIn || []).length > 0 ? '' : t('friends.emptyRequests')}</h3>
                {myPendingIn.length === 0 && (
                  <p className="friends-empty-list">{t('friends.emptyRequests')}</p>
                )}
                {myPendingIn.map((req) => (
                  <div key={req.id} className="friends-request-item">
                    <div className="friends-requester-info">
                      <span className="friends-requester-nick">{req.nick}</span>
                      <small>{t('friends.chatWith', { nick: req.nick })}</small>
                    </div>
                    <div className="friends-request-actions">
                      <button
                        className="friends-action-btn accept"
                        onClick={() => handleAccept(req.id)}
                        title={t('friends.accept')}
                      >
                        <Check />
                      </button>
                      <button
                        className="friends-action-btn cancel"
                        onClick={() => handleCancel(req.id)}
                        title={t('friends.cancel')}
                      >
                        <X />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending Outgoing */}
              <div className="friends-request-column">
                <h3>{t('friends.requestsOut')}</h3>
                {myPendingOut.length === 0 && (
                  <p className="friends-empty-list">{t('friends.emptyRequests')}</p>
                )}
                {myPendingOut.map((req) => (
                  <div key={req.id} className="friends-request-item">
                    <div className="friends-requester-info">
                      <span className="friends-requester-nick">{req.nick}</span>
                      <small>{t('friends.chatWith', { nick: req.nick })}</small>
                    </div>
                    <button
                      className="friends-action-btn cancel"
                      onClick={() => handleCancel(req.id)}
                      title={t('friends.cancel')}
                    >
                      <X />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Blocked Tab */}
        {view === 'blocked' && (
          <div className="friends-blocked-panel">
            {myBlocked.length === 0 && (
              <p className="friends-empty-list">{t('friends.emptyBlocked')}</p>
            )}
            <ul className="friends-blocked-list">
              {myBlocked.map((b) => (
                <li key={b.id} className="friends-blocked-item">
                  <span className="friends-blocked-nick">{b.nick}</span>
                  <button
                    className="friends-action-btn unblock"
                    onClick={() => handleUnblock(b.userId)}
                    title={t('friends.unblock')}
                  >
                    <X />
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