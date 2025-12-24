'use client';

import { useEffect, useState, useCallback } from 'react';
import { gameAPI, ServerTimeResponse } from '@/lib/api';
import { Clock, Zap, Vote } from 'lucide-react';

export default function ServerTimeFooter() {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [nextActionUpdate, setNextActionUpdate] = useState<Date | null>(null);
  const [nextProposalCheck, setNextProposalCheck] = useState<Date | null>(null);
  const [timeOffset, setTimeOffset] = useState(0); // Difference between server and local time
  const [error, setError] = useState(false);

  const syncWithServer = useCallback(async () => {
    try {
      const data = await gameAPI.getTime();
      const serverNow = new Date(data.server_time);
      const localNow = new Date();
      
      // Calculate offset between server and local time
      setTimeOffset(serverNow.getTime() - localNow.getTime());
      setServerTime(serverNow);
      setNextActionUpdate(new Date(data.next_action_update));
      setNextProposalCheck(new Date(data.next_proposal_check));
      setError(false);
    } catch (err) {
      console.error('Failed to sync server time:', err);
      setError(true);
    }
  }, []);

  // Initial sync and periodic re-sync every 60 seconds
  useEffect(() => {
    syncWithServer();
    const syncInterval = setInterval(syncWithServer, 60000);
    return () => clearInterval(syncInterval);
  }, [syncWithServer]);

  // Update displayed time every second using local clock + offset
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (serverTime) {
        const adjustedTime = new Date(Date.now() + timeOffset);
        setServerTime(adjustedTime);
      }
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [timeOffset, serverTime]);

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '---';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCountdown = (targetDate: Date | null) => {
    if (!targetDate || !serverTime) return '--:--';
    
    const diff = targetDate.getTime() - serverTime.getTime();
    if (diff <= 0) return '00:00';

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error && !serverTime) {
    return null; // Don't show footer if we can't connect to server
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-6 py-2 text-xs sm:text-sm">
          {/* Server Time */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5 text-corporate-blue" />
            <span className="hidden sm:inline font-medium">Server:</span>
            <span className="font-mono">
              {formatDate(serverTime)} {formatTime(serverTime)}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Next Action Update */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline font-medium">Actions:</span>
            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
              {formatCountdown(nextActionUpdate)}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Next Vote Check */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Vote className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline font-medium">Votes:</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCountdown(nextProposalCheck)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

