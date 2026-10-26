import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  CheckCheck,
  Check,
  User,
  RefreshCw,
} from 'lucide-react';

export default function Messages() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConvId = searchParams.get('conversationId') || null;

  // Conversations list state
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(initialConvId);

  // Active conversation & messages state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Refs for polling and auto-scroll
  const messagesEndRef = useRef(null);
  const isPollingRef = useRef(false);
  const pollIntervalRef = useRef(null);

  // Helper to extract the other participant from a conversation
  const getOtherParticipant = useCallback(
    (conv) => {
      if (!conv || !conv.participants || !currentUser) return null;
      const currentId = currentUser.id || currentUser._id;
      return (
        conv.participants.find((p) => {
          const pId = p.id || p._id;
          return pId && pId.toString() !== currentId.toString();
        }) || conv.participants[0]
      );
    },
    [currentUser]
  );

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/conversations?limit=30');
      if (res.data && res.data.success) {
        setConversations(res.data.conversations || []);
        // If no active conversation selected, pick the first one
        if (!activeConversationId && res.data.conversations?.length > 0) {
          const firstId = res.data.conversations[0].id || res.data.conversations[0]._id;
          setActiveConversationId(firstId);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load conversations'));
    } finally {
      setLoadingConversations(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Keep URL query param in sync with selected conversation
  useEffect(() => {
    if (activeConversationId) {
      setSearchParams({ conversationId: activeConversationId }, { replace: true });
    }
  }, [activeConversationId, setSearchParams]);

  // 2. Fetch messages for active conversation
  const fetchMessages = useCallback(
    async (isBackgroundPoll = false) => {
      if (!activeConversationId) return;
      if (isBackgroundPoll && isPollingRef.current) return; // Prevent overlapping requests

      if (!isBackgroundPoll) setLoadingMessages(true);
      if (isBackgroundPoll) isPollingRef.current = true;

      try {
        const res = await api.get(`/conversations/${activeConversationId}/messages?limit=100`);
        if (res.data && res.data.success) {
          setMessages(res.data.messages || []);

          // Automatically mark incoming messages as read
          try {
            await api.patch(`/conversations/${activeConversationId}/read`);
          } catch {
            // Silently ignore read receipt background error
          }
        }
      } catch (err) {
        if (!isBackgroundPoll) {
          setError(getErrorMessage(err, 'Failed to load messages'));
        }
      } finally {
        if (!isBackgroundPoll) setLoadingMessages(false);
        if (isBackgroundPoll) isPollingRef.current = false;
      }
    },
    [activeConversationId]
  );

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      setError('');
      fetchMessages(false);
    }
  }, [activeConversationId, fetchMessages]);

  // 3. REST Polling: Check for new messages periodically (every 5 seconds)
  useEffect(() => {
    if (!activeConversationId) return;

    // Clear existing timer if any
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Set new polling timer
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeConversationId, fetchMessages]);

  // Auto-scroll to bottom of message thread
  useEffect(() => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === 'function'
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);


  // 4. Send Message Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const textToSend = messageText.trim();
    if (!textToSend || !activeConversationId || sending) return;

    setSending(true);
    setError('');

    try {
      const res = await api.post(`/conversations/${activeConversationId}/messages`, {
        text: textToSend,
      });

      if (res.data && res.data.success) {
        // Clear input draft only on success!
        setMessageText('');
        // Append newly sent message to local state
        setMessages((prev) => [...prev, res.data.message]);
        // Refresh conversations list to update lastMessage timestamp
        fetchConversations();
      }
    } catch (err) {
      // Keep draft text intact on error so user doesn't lose it
      setError(getErrorMessage(err, 'Failed to send message. Your draft has been kept.'));
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find(
    (c) => (c.id || c._id) === activeConversationId
  );
  const activePartner = getOtherParticipant(activeConversation);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden h-[calc(100vh-8.5rem)] flex flex-col md:flex-row">
        {/* Left Column: Conversations Sidebar */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200/80 flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">Conversations</h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {conversations.length}
            </span>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                <p className="text-xs">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No conversations yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Accept an exchange request to start messaging.
                </p>
                <Link
                  to="/requests"
                  className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  View requests →
                </Link>
              </div>
            ) : (
              conversations.map((conv) => {
                const convId = conv.id || conv._id;
                const partner = getOtherParticipant(conv);
                const isSelected = convId === activeConversationId;
                const lastMsgText = conv.lastMessage?.text || 'Exchange accepted! Start chatting.';

                return (
                  <button
                    key={convId}
                    onClick={() => setActiveConversationId(convId)}
                    className={`w-full p-4 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50/70 border-r-4 border-brand-600'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <Avatar src={partner?.avatar} name={partner?.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {partner?.name || 'Peer'}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(conv.lastMessageAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{lastMsgText}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-50/50 min-h-0">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                  <Avatar src={activePartner?.avatar} name={activePartner?.name} size="sm" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{activePartner?.name}</h3>
                    {activePartner?.skillsToTeach && activePartner.skillsToTeach.length > 0 && (
                      <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                        Teaches: {activePartner.skillsToTeach.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activePartner && (
                    <Link
                      to={`/profile/${activePartner.id || activePartner._id}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View Profile
                    </Link>
                  )}
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-600 mb-2" />
                    <p className="text-xs">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                      <Send className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Start your conversation!</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Say hello, introduce your goals, and agree on how you'd like to share knowledge.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const msgId = msg.id || msg._id;
                    const isMine =
                      msg.sender &&
                      (msg.sender.id === currentUser?.id ||
                        msg.sender._id === currentUser?._id ||
                        msg.sender === currentUser?.id ||
                        msg.sender === currentUser?._id);

                    return (
                      <div
                        key={msgId}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs break-words ${
                            isMine
                              ? 'bg-brand-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>

                        {/* Timestamp & read receipt */}
                        <div
                          className={`flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1 ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMine &&
                            (msg.readAt ? (
                              <CheckCheck
                                className="w-3.5 h-3.5 text-teal-600"
                                title={`Read at ${new Date(msg.readAt).toLocaleTimeString()}`}
                              />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400" title="Delivered" />
                            ))}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Send Input Bar */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message..."
                      maxLength={5000}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
                      {messageText.length}/5000
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={!messageText.trim() || sending}
                    className="px-4 py-2.5 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer text-sm shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800 text-lg">No conversation selected</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Choose a conversation from the left sidebar or accept an exchange request to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
