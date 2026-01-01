'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import ComposeMessage from '@/components/ComposeMessage';
import { messagesAPI, ConversationResponse, MessageResponse, authAPI } from '@/lib/api';
import { MessageSquare, Send, Plus, ChevronLeft, User, Clock, Flag, X, Circle } from 'lucide-react';
import Link from 'next/link';
import { Button, Textarea } from "@heroui/react";
import { getErrorMessage } from '@/lib/utils';

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

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
    } catch (err: unknown) {
      console.error('Failed to fetch conversation:', err);
      // Quietly fail or show a toast if we had one
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleConversationClick = (userId: number) => {
    setSelectedConversation(userId);
    fetchConversationMessages(userId);
  };

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

        // Check if there's a userId in the URL params
        const userIdParam = searchParams.get('userId');
        if (userIdParam) {
          const userId = parseInt(userIdParam, 10);
          if (!isNaN(userId)) {
            setSelectedConversation(userId);
            fetchConversationMessages(userId);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, searchParams]);

  const handleComposeSuccess = async () => {
    // Refresh conversations
    const conversationsData = await messagesAPI.getAll('conversations');
    setConversations(conversationsData as ConversationResponse[]);
    
    const unreadData = await messagesAPI.getUnreadCount();
    setUnreadCount(unreadData.count);
  };

  const handleReportConversation = async () => {
    if (!selectedConversation) return;

    try {
      setReporting(true);
      await messagesAPI.reportConversation(selectedConversation, reportReason.trim() || undefined);
      setReportDialogOpen(false);
      setReportReason('');
      alert('Conversation reported successfully. Administrators will review it.');
    } catch (err: unknown) {
      console.error('Failed to report conversation:', err);
      alert(getErrorMessage(err, 'Failed to report conversation'));
    } finally {
      setReporting(false);
    }
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

  const formatLastSeen = (lastSeenAt: string | undefined, isOnline: boolean | undefined) => {
    if (isOnline) return 'Online';
    if (!lastSeenAt) return 'Offline';
    
    const date = new Date(lastSeenAt);
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
            <h1 className="text-3xl font-bold text-content-primary">Messages</h1>
            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-content-secondary">
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Button
            onPress={() => setComposeOpen(true)}
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            className="font-semibold shadow-sm"
          >
            New Message
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List - Hidden on mobile when a conversation is selected */}
          <div className={`lg:col-span-1 ${selectedConversation ? 'hidden lg:block' : 'block'}`}>
            <div className="rounded-2xl border border-line-subtle/50 bg-surface-1/80 shadow-xl backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-line-subtle">
                <h2 className="text-lg font-semibold text-content-primary">Conversations</h2>
              </div>
              <div className="divide-y divide-line-subtle max-h-[calc(100vh-250px)] lg:max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-content-tertiary">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-content-tertiary">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start a new conversation to get started</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.other_user_id}
                      onClick={() => handleConversationClick(conversation.other_user_id)}
                      className={`w-full text-left p-4 hover:bg-surface-2 transition-colors ${
                        selectedConversation === conversation.other_user_id
                          ? 'bg-accent/10 border-l-4 border-accent'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={conversation.other_user.profile_image_url || '/defaultpfp.jpg'}
                            alt={conversation.other_user.username}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-line-subtle"
                            onError={(e) => {
                              e.currentTarget.src = '/defaultpfp.jpg';
                            }}
                          />
                          {conversation.unread_count > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-error text-white text-xs font-bold flex items-center justify-center">
                              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className="font-semibold text-content-primary truncate">
                                {conversation.other_user.player_name || conversation.other_user.username}
                              </p>
                              {conversation.other_user.last_seen_at !== undefined && (
                                <div className={`flex items-center gap-1 flex-shrink-0 ${
                                  conversation.other_user.is_online 
                                    ? 'text-status-success' 
                                    : 'text-content-tertiary'
                                }`}>
                                  <Circle 
                                    className={`h-1.5 w-1.5 ${
                                      conversation.other_user.is_online 
                                        ? 'fill-status-success' 
                                        : 'fill-content-tertiary'
                                    }`} 
                                  />
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-content-tertiary flex-shrink-0 ml-2">
                              {formatDate(conversation.last_message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-content-secondary truncate">
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

          {/* Message Thread - Hidden on mobile when no conversation is selected */}
          <div className={`lg:col-span-2 ${selectedConversation ? 'block' : 'hidden lg:block'}`}>
            {selectedConversation && selectedConversationData ? (
              <div className="rounded-2xl border border-line-subtle/50 bg-surface-1/80 shadow-xl backdrop-blur-sm overflow-hidden flex flex-col h-[calc(100vh-200px)] lg:h-[600px]">
                {/* Header */}
                <div className="p-4 border-b border-line-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden rounded-lg p-1 hover:bg-surface-2 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <img
                      src={selectedConversationData.other_user.profile_image_url || '/defaultpfp.jpg'}
                      alt={selectedConversationData.other_user.username}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-line-subtle"
                      onError={(e) => {
                        e.currentTarget.src = '/defaultpfp.jpg';
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${selectedConversationData.other_user.profile_id}`}
                          className="font-semibold text-content-primary hover:text-accent transition-colors"
                        >
                          {selectedConversationData.other_user.player_name || selectedConversationData.other_user.username}
                        </Link>
                        {selectedConversationData.other_user.last_seen_at !== undefined && (
                          <div className={`flex items-center gap-1 text-xs ${
                            selectedConversationData.other_user.is_online 
                              ? 'text-status-success' 
                              : 'text-content-tertiary'
                          }`}>
                            <Circle 
                              className={`h-1.5 w-1.5 ${
                                selectedConversationData.other_user.is_online 
                                  ? 'fill-status-success' 
                                  : 'fill-content-tertiary'
                              }`} 
                            />
                            <span>{formatLastSeen(selectedConversationData.other_user.last_seen_at, selectedConversationData.other_user.is_online)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-content-tertiary">
                        Profile #{selectedConversationData.other_user.profile_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onPress={() => setReportDialogOpen(true)}
                      variant="bordered"
                      size="sm"
                      startContent={<Flag className="w-4 h-4" />}
                      className="font-semibold"
                      title="Report this conversation"
                    >
                      Report
                    </Button>
                    <Button
                      onPress={() => {
                        setComposeOpen(true);
                      }}
                      color="primary"
                      size="sm"
                      startContent={<Send className="w-4 h-4" />}
                      className="font-semibold"
                    >
                      Reply
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-content-tertiary py-8">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-content-tertiary py-8">
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
                                ? 'bg-accent text-white'
                                : 'bg-surface-2 text-content-primary'
                            }`}
                          >
                            {message.subject && (
                              <p className={`font-semibold mb-1 ${isSent ? 'text-white' : 'text-content-primary'}`}>
                                {message.subject}
                              </p>
                            )}
                            <p className={`whitespace-pre-wrap ${isSent ? 'text-white' : 'text-content-secondary'}`}>
                              {message.body}
                            </p>
                            <div className={`flex items-center gap-2 mt-2 text-xs ${isSent ? 'text-white/70' : 'text-content-tertiary'}`}>
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
              <div className="rounded-2xl border border-line-subtle/50 bg-surface-1/80 shadow-xl backdrop-blur-sm h-[600px] flex items-center justify-center">
                <div className="text-center text-content-tertiary">
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

        {/* Report Dialog */}
        {reportDialogOpen && selectedConversationData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface-1 rounded-xl shadow-xl border border-line-subtle p-6 max-w-md mx-4 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-content-primary">Report Conversation</h3>
                <button
                  onClick={() => {
                    setReportDialogOpen(false);
                    setReportReason('');
                  }}
                  className="text-content-tertiary hover:text-content-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-content-secondary mb-4">
                Reporting conversation with <strong>{selectedConversationData.other_user.player_name || selectedConversationData.other_user.username}</strong>
              </p>
              <p className="text-xs text-content-tertiary mb-4">
                <strong>Note:</strong> This is for reporting inappropriate content or behavior. For game suggestions or bugs, please use the &quot;Feedback & Issues&quot; page instead.
              </p>
              <div className="mb-4">
                <Textarea
                  id="report-reason"
                  label="Reason (optional)"
                  labelPlacement="outside"
                  value={reportReason}
                  onValueChange={setReportReason}
                  minRows={4}
                  maxLength={2000}
                  placeholder="Please provide details about why you're reporting this conversation..."
                  description={`${reportReason.length} / 2000 characters`}
                  variant="bordered"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  onPress={() => {
                    setReportDialogOpen(false);
                    setReportReason('');
                  }}
                  variant="bordered"
                  isDisabled={reporting}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleReportConversation}
                  isDisabled={reporting}
                  isLoading={reporting}
                  color="danger"
                >
                  {reporting ? 'Reporting...' : 'Report Conversation'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppNavigation>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-content-secondary">Loading messages...</div>
        </div>
      </AppNavigation>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}



