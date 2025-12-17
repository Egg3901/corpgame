'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import ComposeMessage from '@/components/ComposeMessage';
import { messagesAPI, ConversationResponse, MessageResponse, authAPI } from '@/lib/api';
import { MessageSquare, Send, Plus, ChevronLeft, User, Clock } from 'lucide-react';
import Link from 'next/link';

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        setLoading(true);
        const [conversationsData, unreadData, me] = await Promise.all([
          messagesAPI.getAll('conversations'),
          messagesAPI.getUnreadCount(),
          authAPI.getMe(),
        ]);
        setConversations(conversationsData as ConversationResponse[]);
        setUnreadCount(unreadData.count);
        setCurrentUserId(me.id);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const fetchConversationMessages = async (userId: number) => {
    try {
      setMessagesLoading(true);
      const conversationMessages = await messagesAPI.getConversation(userId);
      setMessages(conversationMessages.reverse()); // Reverse to show oldest first
      
      // Mark conversation as read
      await messagesAPI.markConversationAsRead(userId);
      
      // Refresh conversations to update unread counts
      const conversationsData = await messagesAPI.getAll('conversations');
      setConversations(conversationsData as ConversationResponse[]);
      
      const unreadData = await messagesAPI.getUnreadCount();
      setUnreadCount(unreadData.count);
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleConversationClick = (userId: number) => {
    setSelectedConversation(userId);
    fetchConversationMessages(userId);
  };

  const handleComposeSuccess = async () => {
    // Refresh conversations
    const conversationsData = await messagesAPI.getAll('conversations');
    setConversations(conversationsData as ConversationResponse[]);
    
    const unreadData = await messagesAPI.getUnreadCount();
    setUnreadCount(unreadData.count);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const selectedConversationData = selectedConversation
    ? conversations.find(c => c.other_user_id === selectedConversation)
    : null;

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-corporate-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-corporate-blue-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Message
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/70 shadow-xl backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conversations</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start a new conversation to get started</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.other_user_id}
                      onClick={() => handleConversationClick(conversation.other_user_id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        selectedConversation === conversation.other_user_id
                          ? 'bg-corporate-blue/10 dark:bg-corporate-blue/20 border-l-4 border-corporate-blue'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={conversation.other_user.profile_image_url || '/defaultpfp.jpg'}
                            alt={conversation.other_user.username}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50"
                            onError={(e) => {
                              e.currentTarget.src = '/defaultpfp.jpg';
                            }}
                          />
                          {conversation.unread_count > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {conversation.other_user.player_name || conversation.other_user.username}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                              {formatDate(conversation.last_message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {conversation.last_message.subject && (
                              <span className="font-medium">{conversation.last_message.subject}: </span>
                            )}
                            {conversation.last_message.body}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2">
            {selectedConversation && selectedConversationData ? (
              <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/70 shadow-xl backdrop-blur-sm overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <img
                      src={selectedConversationData.other_user.profile_image_url || '/defaultpfp.jpg'}
                      alt={selectedConversationData.other_user.username}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50"
                      onError={(e) => {
                        e.currentTarget.src = '/defaultpfp.jpg';
                      }}
                    />
                    <div>
                      <Link
                        href={`/profile/${selectedConversationData.other_user.profile_id}`}
                        className="font-semibold text-gray-900 dark:text-white hover:text-corporate-blue transition-colors"
                      >
                        {selectedConversationData.other_user.player_name || selectedConversationData.other_user.username}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Profile #{selectedConversationData.other_user.profile_id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setComposeOpen(true);
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-corporate-blue text-white hover:bg-corporate-blue-dark transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Reply
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No messages in this conversation</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isSent = currentUserId !== null && message.sender_id === currentUserId;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isSent
                                ? 'bg-corporate-blue text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                            }`}
                          >
                            {message.subject && (
                              <p className={`font-semibold mb-1 ${isSent ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {message.subject}
                              </p>
                            )}
                            <p className={`whitespace-pre-wrap ${isSent ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {message.body}
                            </p>
                            <div className={`flex items-center gap-2 mt-2 text-xs ${isSent ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                              <Clock className="w-3 h-3" />
                              {formatDate(message.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/70 shadow-xl backdrop-blur-sm h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <ComposeMessage
          isOpen={composeOpen}
          onClose={() => setComposeOpen(false)}
          recipientId={selectedConversation || undefined}
          recipientName={selectedConversationData?.other_user.player_name || selectedConversationData?.other_user.username}
          onSuccess={handleComposeSuccess}
        />
      </div>
    </AppNavigation>
  );
}
