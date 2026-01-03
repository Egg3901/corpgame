'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea } from '@heroui/react';
import { X, Send, AlertCircle } from 'lucide-react';
import { messagesAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { trapFocus } from '@/lib/utils/accessibility';

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
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap for modal accessibility (WCAG 2.1.2)
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const cleanup = trapFocus(modalRef.current);
      return cleanup;
    }
  }, [isOpen]);

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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send message. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} placement="center" size="2xl">
      <ModalContent>
        {(onClose) => (
          <div ref={modalRef}>
            <ModalHeader className="flex flex-col gap-1">Compose Message</ModalHeader>
            <ModalBody>
              <form id="compose-message-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label={`Recipient ${initialRecipientId ? '(pre-filled)' : 'ID'}`}
                  labelPlacement="outside"
                  placeholder="Enter recipient profile ID"
                  value={recipientId}
                  onValueChange={setRecipientId}
                  type="number"
                  variant="bordered"
                  isRequired
                  isDisabled={loading || !!initialRecipientId}
                  description={recipientName ? `To: ${recipientName}` : undefined}
                />

                <Input
                  label="Subject (optional)"
                  labelPlacement="outside"
                  placeholder="Message subject"
                  value={subject}
                  onValueChange={setSubject}
                  variant="bordered"
                  isDisabled={loading}
                  maxLength={255}
                  description={`${subject.length}/255`}
                />

                <Textarea
                  label="Message"
                  labelPlacement="outside"
                  placeholder="Type your message here..."
                  value={body}
                  onValueChange={setBody}
                  variant="bordered"
                  minRows={5}
                  isRequired
                  isDisabled={loading}
                  maxLength={10000}
                  description={`${body.length}/10000`}
                />

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-danger-50 border border-danger-200 p-3 text-danger">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose} isDisabled={loading}>
                Cancel
              </Button>
              <Button 
                color="primary" 
                type="submit" 
                form="compose-message-form"
                isLoading={loading}
                isDisabled={!body.trim() || !recipientId}
                startContent={!loading && <Send className="w-4 h-4" />}
              >
                Send Message
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}


