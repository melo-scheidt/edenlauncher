import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageSquare, Loader2, Ban, Paperclip } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { toast } from '../hooks/useToast.jsx';
import PlayerHead from './PlayerHead.jsx';

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
  const [selectedMedia, setSelectedMedia] = useState(null); // { file, name, size, type, dataUrl }
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error('O arquivo excede o limite máximo de 5 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedMedia({
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if ((!text && !selectedMedia) || sending) return;

    setSending(true);
    try {
      let bodyText = text;
      if (selectedMedia) {
        if (selectedMedia.type.startsWith('image/')) {
          bodyText = text ? `${text}\n${selectedMedia.dataUrl}` : selectedMedia.dataUrl;
        } else {
          bodyText = text
            ? `${text}\n[mídia: ${selectedMedia.name} (${selectedMedia.size})]`
            : `[mídia: ${selectedMedia.name} (${selectedMedia.size})]`;
        }
      }

      const res = await window.eden.friends.send(friend.userId, bodyText);
      if (res?.ok) {
        setInputText('');
        setSelectedMedia(null);
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

  const renderStatus = () => {
    if (friend?.isTyping) {
      return (
        <span className="friend-chat-subtitle friend-chat-status--typing">
          digitando...
        </span>
      );
    }
    if (friend?.status === 'offline' || friend?.online === false) {
      const lastSeenTime = friend?.lastSeen
        ? (typeof friend.lastSeen === 'string' && friend.lastSeen.includes(':')
            ? friend.lastSeen
            : formatTime(friend.lastSeen))
        : null;
      return (
        <span className="friend-chat-subtitle friend-chat-status--offline">
          {lastSeenTime ? `visto por último às ${lastSeenTime}` : 'offline'}
        </span>
      );
    }
    return (
      <span className="friend-chat-subtitle friend-chat-status--online">
        online
      </span>
    );
  };

  const renderBubbleContent = (body) => {
    if (!body) return null;

    if (body.includes('data:image/')) {
      const parts = body.split('\n');
      const textPart = parts.filter((p) => !p.startsWith('data:image/')).join('\n');
      const imgPart = parts.find((p) => p.startsWith('data:image/'));

      return (
        <div className="friend-chat-media-wrap">
          {textPart && <div className="friend-chat-bubble-text">{textPart}</div>}
          {imgPart && (
            <div className="friend-chat-img-container">
              <img
                src={imgPart}
                alt="Mídia enviada"
                className="friend-chat-bubble-img"
                onClick={() => {
                  const w = window.open('');
                  if (w) {
                    w.document.write(`<img src="${imgPart}" style="max-width:100%;height:auto;margin:auto;display:block;" />`);
                  }
                }}
              />
            </div>
          )}
        </div>
      );
    }

    return <div className="friend-chat-bubble-text">{body}</div>;
  };

  const isOnline = friend?.online !== false && friend?.status !== 'offline';

  return (
    <div className="friend-chat-overlay" onClick={onClose}>
      <div className="friend-chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="friend-chat-header">
          <div className="friend-chat-user-info">
            <div className="friend-chat-avatar">
              <PlayerHead nickname={friend?.nick} skinUrl={friend?.skinUrl} size={30} />
              <span className={`friend-avatar-status-badge ${isOnline ? 'online' : 'offline'}`} />
            </div>
            <div className="friend-chat-header-text">
              <span className="friend-chat-title">{friend.nick}</span>
              {renderStatus()}
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
                      {renderBubbleContent(m.body)}
                      <div className="friend-chat-bubble-time">{formatTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Preview da Mídia Selecionada */}
        {selectedMedia && (
          <div className="friend-chat-media-preview-bar">
            <div className="friend-chat-media-info">
              <Paperclip size={14} className="friend-chat-media-icon" />
              <span className="friend-chat-media-name">{selectedMedia.name}</span>
              <span className="friend-chat-media-size">({selectedMedia.size})</span>
            </div>
            <button
              type="button"
              className="friend-chat-media-remove-btn"
              onClick={() => setSelectedMedia(null)}
              title="Remover mídia"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Campo de Envio */}
        <form className="friend-chat-footer" onSubmit={handleSend}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*,video/*,audio/*,.pdf,.zip,.rar"
            onChange={handleMediaSelect}
          />
          <button
            type="button"
            className="friend-chat-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Anexar mídia (até 5MB)"
            disabled={sending}
          >
            <Paperclip size={18} />
          </button>

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
            disabled={(!inputText.trim() && !selectedMedia) || sending}
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
