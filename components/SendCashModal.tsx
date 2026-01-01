'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea } from '@heroui/react';
import { X, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cashAPI, authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { trapFocus } from '@/lib/utils/accessibility';

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
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap for modal accessibility (WCAG 2.1.2)
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const cleanup = trapFocus(modalRef.current);
      return cleanup;
    }
  }, [isOpen]);

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
            } catch (err: unknown) {
              console.warn('Could not fetch cash from profile, using placeholder');
              setUserCash(10000); // Placeholder
            }
          }
        } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send cash. Please try again.'));
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} placement="center">
      <ModalContent>
        {(onClose) => (
          <div ref={modalRef}>
            <ModalHeader className="flex flex-col gap-1">
              Transfer Funds to {recipientName}
            </ModalHeader>
            <ModalBody>
              {success ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-success">Transfer Successful</h3>
                    <p className="text-default-500 mt-1">
                      You sent {formatCurrency(transferredAmount)} to {recipientName}
                    </p>
                  </div>
                </div>
              ) : (
                <form id="send-cash-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {userCash !== null && (
                    <div className="p-3 bg-default-100 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-default-600">Available Balance</span>
                      <span className="font-mono font-bold text-success">
                        {formatCurrency(userCash)}
                      </span>
                    </div>
                  )}

                  <Input
                    label="Amount"
                    labelPlacement="outside"
                    placeholder="0.00"
                    variant="bordered"
                    startContent={
                      <DollarSign className="text-default-400 pointer-events-none flex-shrink-0" />
                    }
                    value={amount}
                    onValueChange={setAmount}
                    type="number"
                    min={0}
                    step="0.01"
                    isRequired
                    isInvalid={!!error}
                    errorMessage={error}
                  />

                  <Textarea
                    label="Note (Optional)"
                    labelPlacement="outside"
                    placeholder="What is this for?"
                    variant="bordered"
                    value={note}
                    onValueChange={setNote}
                    minRows={2}
                  />
                </form>
              )}
            </ModalBody>
            <ModalFooter>
              {success ? (
                <Button color="success" onPress={onClose}>
                  Close
                </Button>
              ) : (
                <>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    color="primary" 
                    type="submit" 
                    form="send-cash-form"
                    isLoading={loading}
                  >
                    Send Cash
                  </Button>
                </>
              )}
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}


