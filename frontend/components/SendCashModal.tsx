'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cashAPI, authAPI } from '@/lib/api';

interface SendCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: number;
  recipientName: string;
  onSuccess?: (newBalance: number) => void;
}

export default function SendCashModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  onSuccess,
}: SendCashModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [transferredAmount, setTransferredAmount] = useState<number>(0);
  const [userCash, setUserCash] = useState<number | null>(null);

  // Fetch user's cash balance when modal opens
  useEffect(() => {
    if (isOpen && userCash === null) {
      const fetchCash = async () => {
        try {
          const me = await authAPI.getMe();
          // Try to get cash from profile API if available
          if (me.profile_id) {
            try {
              const { profileAPI } = await import('@/lib/api');
              const profile = await profileAPI.getById(me.profile_id.toString());
              if (profile.cash !== undefined) {
                setUserCash(profile.cash);
              }
            } catch (err) {
              console.warn('Could not fetch cash from profile, using placeholder');
              setUserCash(10000); // Placeholder
            }
          }
        } catch (err) {
          console.error('Failed to fetch cash:', err);
        }
      };
      fetchCash();
    }
  }, [isOpen, userCash]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setNote('');
      setError('');
      setSuccess(false);
      setLoading(false);
      setTransferredAmount(0);
    }
  }, [isOpen]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      setLoading(false);
      return;
    }

    if (userCash !== null && transferAmount > userCash) {
      setError(`Insufficient funds. You have ${formatCurrency(userCash)}`);
      setLoading(false);
      return;
    }

    try {
      const response = await cashAPI.transfer({
        recipient_id: recipientId,
        amount: transferAmount,
        note: note.trim() || undefined,
      });

      // Store transferred amount for success message
      setTransferredAmount(transferAmount);

      // Update cash balance with new balance from response
      if (response.sender_new_balance !== undefined) {
        setUserCash(response.sender_new_balance);
      }

      // Show success message
      setSuccess(true);
      setError('');

      // Call onSuccess with new balance
      if (onSuccess && response.sender_new_balance !== undefined) {
        onSuccess(response.sender_new_balance);
      }

      // Reset form and close modal after a short delay
      setTimeout(() => {
        setAmount('');
        setNote('');
        setSuccess(false);
        setTransferredAmount(0);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send cash. Please try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200/50 bg-white shadow-2xl dark:border-gray-700/50 dark:bg-gray-900">
        <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Send Cash</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sending to: <span className="font-semibold text-gray-900 dark:text-white">{recipientName}</span>
            </p>
            {userCash !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Your balance: <span className="font-semibold">{formatCurrency(userCash)}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="amount"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note (optional)
              </label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for this transfer..."
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent resize-none"
                disabled={loading}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note.length}/500</p>
            </div>

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Successfully sent {formatCurrency(transferredAmount)} to {recipientName}!
                </p>
              </div>
            )}

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
                disabled={loading || success || !amount || parseFloat(amount) <= 0}
                className="flex-1 px-4 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Sent!
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Send Cash
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


