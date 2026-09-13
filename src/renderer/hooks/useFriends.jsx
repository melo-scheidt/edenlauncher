import { useEffect, useState, useCallback } from 'react';

// O hook usa o window.eden.friends bridge definido no preload.js
// Este bridge expõe os métodos do friends.js service via IPCRenderer

function useFriends(nickname) {
  const [me, setMe] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingIn, setPendingIn] = useState([]);
  const [pendingOut, setPendingOut] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [unread, setUnread] = useState({});
  const [status, setStatus] = useState({ available: false, loggedIn: false });

  // Carregar dados iniciais via IPC
  const load = useCallback(async () => {
    if (!nickname || !window.eden?.friends) return;
    try {
      // Usa o método list() exposto pelo bridge no preload
      const result = await window.eden.friends.list();
      if (!result?.me) return;

      setMe(result.me);
      setFriends((result.friends || []).filter((f) => f.status === 'accepted'));
      setPendingIn((result.pendingIn || []).filter((f) => f.direction === 'in'));
      setPendingOut((result.pendingOut || []).filter((f) => f.direction === 'out'));
      setBlocked((result.blocked || []).filter((f) => f.status === 'blocked'));

      // Contadores de não-lidos
      const unreadCounts = {};
      if (result.me) {
        const msgs = await window.eden.friends.messages(result.me, 200);
        (msgs?.messages || []).forEach((m) => {
          if (!m.read_at) {
            unreadCounts[m.sender_id] = (unreadCounts[m.sender_id] || 0) + 1;
          }
        });
      }
      setUnread(unreadCounts);
    } catch (e) {
      console.warn('[useFriends] load error:', e);
    }
  }, [nickname]);

  // Efeito: carregar na montagem e subscrever eventos do realtime
  useEffect(() => {
    if (!nickname) return;
    load();

    // Inscrever-se em eventos de mudança amigos (emitidos pelo main process)
    const handler = (e) => {
      load().catch(() => {});
    };
    if (window.eden?.friends?.onEvent) {
      window.eden.friends.onEvent(handler);
    }
    return () => {
      if (window.eden?.friends?.offEvent) {
        window.eden.friends.offEvent(handler);
      }
    };
  }, [nickname, load]);

  return {
    status,
    me,
    friends,
    pendingIn,
    pendingOut,
    blocked,
    unread,
    load,
    // Delegar os demais métodos ao window.eden.friends bridge
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