import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageSquare, Loader2, User, Ban } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { toast } from '../hooks/useToast.jsx';

const ERR_MAP = {
  FRIENDS_NICK_NOT_FOUND: 'friends.errNickNotFound',
  FRIENDS_SELF: 'friends.errSelf',
  FRIENDS_NICK_INVALID: 'friends.errInvalidNick',
  FRIENDS_ALREADY: 'friends.errAlready',
  FRIENDS_PENDING_OUT: 'friends.errPendingOut',
  FRIENDS_PENDING_IN: 'friends.errPendingIn',
  FRIENDS_BLOCKED_BY_ME: 'friends.errBlockedMe',
  FRIENDS_BLOCKED_BY_ME_SEND: 'friends.errBlockedMe',
  FRIENDS_BLOCKED_BY_THEM: 'friends.errBlockedThem',
  FRIENDS_BLOCKED_SEND: 'friends.errBlockedSend',
  FRIENDS_NOT_FRIENDS: 'friends.errNotFriends',
  FRIENDS_TOKEN: 'friends.errToken',
};

export default function FriendChatModal({ friend, myUserId, onClose, onBlock }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = useCallback(async () => {
    if (!friend?.userId || !window.eden?.friends) return;
    try {
      const res = await window.eden.friends.messages(friend.userId, 100);
      if (res?.ok && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
      // Marcar como lidas
      await window.eden.friends.markRead(friend.userId);
    } catch (err) {
      console.warn('[FriendChatModal] Falha ao carregar mensagens:', err);
    } finally {
      setLoading(false);
    }
  }, [friend?.userId]);

  useEffect(() => {
    setLoading(true);
    loadMessages();

    // Focar no input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // Escuta eventos em tempo real
    if (!window.eden?.friends?.onEvent) return undefined;
    const unsub = window.eden.friends.onEvent((evt) => {
      if (evt?.type === 'message' || evt?.type === 'friends-changed') {
        loadMessages();
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [loadMessages]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom('auto');
    }
  }, [loading, messages.length]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await window.eden.friends.send(friend.userId, text);
      if (res?.ok) {
        setInputText('');
        await loadMessages();
        scrollToBottom('smooth');
      } else {
        const errKey = ERR_MAP[res?.error] || 'friends.errGeneric';
        toast.error(t(errKey));
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="friend-chat-overlay" onClick={onClose}>
      <div className="friend-chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="friend-chat-header">
          <div className="friend-chat-user-info">
            <div className="friend-chat-avatar">
              <User size={18} />
            </div>
            <div className="friend-chat-header-text">
              <span className="friend-chat-title">{friend.nick}</span>
              <span className="friend-chat-subtitle">
                {t('friends.chatWith', { nick: friend.nick })}
              </span>
            </div>
          </div>
          <div className="friend-chat-header-actions">
            {onBlock && (
              <button
                type="button"
                className="friend-chat-btn-block"
                onClick={() => onBlock(friend.userId, friend.nick)}
                title={t('friends.block')}
              >
                <Ban size={15} />
                <span>{t('friends.block')}</span>
              </button>
            )}
            <button
              type="button"
              className="friend-chat-close-btn"
              onClick={onClose}
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lista de Mensagens */}
        <div className="friend-chat-body">
          {loading ? (
            <div className="friend-chat-loading">
              <Loader2 size={24} className="spin" />
              <span>{t('friends.loading') || 'Carregando conversa...'}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="friend-chat-empty">
              <MessageSquare size={36} className="friend-chat-empty-icon" />
              <p>{t('friends.chatEmpty')}</p>
            </div>
          ) : (
            <div className="friend-chat-messages-list">
              {messages.map((m) => {
                const isMe = m.sender_id === myUserId;
                return (
                  <div
                    key={m.id}
                    className={`friend-chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}`}
                  >
                    <div className="friend-chat-bubble">
                      <div className="friend-chat-bubble-text">{m.body}</div>
                      <div className="friend-chat-bubble-time">{formatTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Campo de Envio */}
        <form className="friend-chat-footer" onSubmit={handleSend}>
          <input
            ref={inputRef}
            className="friend-chat-input"
            placeholder={t('friends.chatPlaceholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            maxLength={1000}
            disabled={sending}
          />
          <button
            type="submit"
            className="friend-chat-send-btn"
            disabled={!inputText.trim() || sending}
            title={t('friends.chatSend')}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            <span>{t('friends.chatSend')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
