'use client';

import { useState, useEffect } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { messagesAPI } from '@/lib/api';

interface ComposeMessageProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: number;
  recipientName?: string;
  onSuccess?: () => void;
}

export default function ComposeMessage({
  isOpen,
  onClose,
  recipientId: initialRecipientId,
  recipientName: initialRecipientName,
  onSuccess,
}: ComposeMessageProps) {
  const [recipientId, setRecipientId] = useState(initialRecipientId?.toString() || '');
  const [recipientName, setRecipientName] = useState(initialRecipientName || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setRecipientId(initialRecipientId?.toString() || '');
      setRecipientName(initialRecipientName || '');
      setSubject('');
      setBody('');
      setError('');
    }
  }, [isOpen, initialRecipientId, initialRecipientName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const recipientIdNum = parseInt(recipientId, 10);
    if (isNaN(recipientIdNum)) {
      setError('Please enter a valid recipient ID');
      setLoading(false);
      return;
    }

    if (!body.trim()) {
      setError('Message body cannot be empty');
      setLoading(false);
      return;
    }

    if (body.length > 10000) {
      setError('Message body cannot exceed 10000 characters');
      setLoading(false);
      return;
    }

    try {
      await messagesAPI.send({
        recipient_id: recipientIdNum,
        subject: subject.trim() || undefined,
        body: body.trim(),
      });

      // Reset form
      setRecipientId('');
      setRecipientName('');
      setSubject('');
      setBody('');
      setError('');

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200/50 bg-white shadow-2xl dark:border-gray-700/50 dark:bg-gray-900">
        <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compose Message</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient {initialRecipientId ? '(pre-filled)' : 'ID'}
              </label>
              <input
                type="number"
                id="recipient"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder="Enter recipient profile ID"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                required
                disabled={loading || !!initialRecipientId}
              />
              {recipientName && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  To: <span className="font-semibold">{recipientName}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject (optional)
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                disabled={loading}
                maxLength={255}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subject.length}/255</p>
            </div>

            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                id="body"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent resize-none"
                required
                disabled={loading}
                maxLength={10000}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{body.length}/10000</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !body.trim() || !recipientId}
                className="flex-1 px-4 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


