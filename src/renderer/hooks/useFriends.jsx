import { useEffect, useState, useCallback } from 'react';

// Hook da aba Amigos — conversa com o main process via window.eden.friends
// (bridge IPC definido no preload). Realtime: reinscreve a lista a cada
// evento emitido pelo friends.js (mudanças, pedidos, mensagens, presença).

function useFriends(nickname) {
  const [me, setMe] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingIn, setPendingIn] = useState([]);
  const [pendingOut, setPendingOut] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [unread, setUnread] = useState({});
  const [status, setStatus] = useState({ available: false, loggedIn: false });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!nickname || !window.eden?.friends) return;
    try {
      const st = await window.eden.friends.status();
      setStatus({ available: !!st?.available, loggedIn: !!st?.loggedIn });
      if (!st?.available) return;
      const result = await window.eden.friends.list();
      if (!result?.ok) {
        setLoadError(result?.error || 'FRIENDS_GENERIC');
        return;
      }
      setLoadError(null);
      setMe(result.me);
      setFriends(result.friends || []);
      setPendingIn(result.pendingIn || []);
      setPendingOut(result.pendingOut || []);
      setBlocked(result.blocked || []);
      setUnread(result.unread || {});
    } catch (e) {
      console.warn('[useFriends] load error:', e);
      setLoadError('FRIENDS_GENERIC');
    } finally {
      setLoaded(true);
    }
  }, [nickname]);

  useEffect(() => {
    setLoaded(false);
    setLoadError(null);
    load();
    if (!window.eden?.friends?.onEvent) return undefined;
    const unsub = window.eden.friends.onEvent(() => {
      load().catch(() => {});
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [nickname, load]);

  return {
    status,
    loaded,
    loadError,
    me,
    friends,
    pendingIn,
    pendingOut,
    blocked,
    unread,
    load,
    request: (...args) => window.eden.friends?.request?.(...args),
    respond: (...args) => window.eden.friends?.respond?.(...args),
    cancel: (...args) => window.eden.friends?.cancel?.(...args),
    block: (...args) => window.eden.friends?.block?.(...args),
    unblock: (...args) => window.eden.friends?.unblock?.(...args),
    send: (...args) => window.eden.friends?.send?.(...args),
    messages: (...args) => window.eden.friends?.messages?.(...args),
    markRead: (...args) => window.eden.friends?.markRead?.(...args),
  };
}

export { useFriends };
