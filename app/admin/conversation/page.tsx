'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import { adminAPI, authAPI, MessageResponse, normalizeImageUrl } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { MessageSquare, Clock, ChevronLeft, User } from 'lucide-react';
import Link from 'next/link';

type ConversationParticipant = Awaited<ReturnType<typeof adminAPI.getConversation>>['user1'];

function AdminConversationViewerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [user1, setUser1] = useState<ConversationParticipant | null>(null);
  const [user2, setUser2] = useState<ConversationParticipant | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const userId1 = searchParams.get('userId1');
  const userId2 = searchParams.get('userId2');

  useEffect(() => {
    const loadConversation = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/login');
        return;
      }

      if (!userId1 || !userId2) {
        setError('Missing user IDs');
        setLoading(false);
        return;
      }

      try {
        // Verify admin status
        const me = await authAPI.getMe();
        setCurrentUserId(me.id);

        if (!me.is_admin) {
          router.push('/overview');
          return;
        }

        // Load conversation
        const data = await adminAPI.getConversation(
          parseInt(userId1, 10),
          parseInt(userId2, 10)
        );

        setMessages(data.messages.reverse()); // Reverse to show oldest first
        setUser1(data.user1);
        setUser2(data.user2);
      } catch (err: unknown) {
        console.error('Failed to load conversation:', err);
        
        // Handle 403 Forbidden specifically for redirect
        const errorMessage = getErrorMessage(err, 'Failed to load conversation');
        if (errorMessage.includes('403') || errorMessage.toLowerCase().includes('forbidden')) {
          router.push('/overview');
          return;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [router, userId1, userId2]);

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

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading conversation...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error) {
    return (
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
        </div>
      </AppNavigation>
    );
  }

  if (!user1 || !user2) {
    return (
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-300">Users not found</div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Admin Panel
          </button>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Conversation Viewer</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Viewing conversation between{' '}
            <Link href={`/profile/${user1.profile_id}`} className="text-corporate-blue hover:underline font-medium">
              {user1.player_name || user1.username}
            </Link>
            {' '}and{' '}
            <Link href={`/profile/${user2.profile_id}`} className="text-corporate-blue hover:underline font-medium">
              {user2.player_name || user2.username}
            </Link>
          </p>
        </div>

        {/* Conversation Header */}
        <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/70 shadow-xl backdrop-blur-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <img
                  src={normalizeImageUrl(user1.profile_image_url)}
                  alt={user1.username}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50"
                  onError={(e) => {
                    e.currentTarget.src = '/defaultpfp.jpg';
                  }}
                />
                <div>
                  <Link
                    href={`/profile/${user1.profile_id}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-corporate-blue transition-colors"
                  >
                    {user1.player_name || user1.username}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{user1.username}
                  </p>
                </div>
              </div>
              <div className="text-gray-400 dark:text-gray-500">↔</div>
              <div className="flex items-center gap-3 flex-1">
                <img
                  src={normalizeImageUrl(user2.profile_image_url)}
                  alt={user2.username}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50"
                  onError={(e) => {
                    e.currentTarget.src = '/defaultpfp.jpg';
                  }}
                />
                <div>
                  <Link
                    href={`/profile/${user2.profile_id}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-corporate-blue transition-colors"
                  >
                    {user2.player_name || user2.username}
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{user2.username}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[600px]">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages in this conversation</p>
              </div>
            ) : (
              messages.map((message) => {
                const isUser1 = message.sender_id === user1.id;
                const sender = isUser1 ? user1 : user2;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser1 ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isUser1
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          : 'bg-corporate-blue text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <img
                          src={normalizeImageUrl(sender.profile_image_url)}
                          alt={sender.username}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/defaultpfp.jpg';
                          }}
                        />
                        <span className={`text-xs font-semibold ${isUser1 ? 'text-gray-700 dark:text-gray-300' : 'text-white/90'}`}>
                          {sender.player_name || sender.username}
                        </span>
                      </div>
                      {message.subject && (
                        <p className={`font-semibold mb-1 ${isUser1 ? 'text-gray-900 dark:text-white' : 'text-white'}`}>
                          {message.subject}
                        </p>
                      )}
                      <p className={`whitespace-pre-wrap ${isUser1 ? 'text-gray-700 dark:text-gray-300' : 'text-white'}`}>
                        {message.body}
                      </p>
                      <div className={`flex items-center gap-2 mt-2 text-xs ${isUser1 ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'}`}>
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
      </div>
    </AppNavigation>
  );
}

export default function AdminConversationViewerPage() {
  return (
    <Suspense fallback={
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading conversation...</div>
        </div>
      </AppNavigation>
    }>
      <AdminConversationViewerContent />
    </Suspense>
  );
}



