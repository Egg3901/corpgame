'use client';

import { useEffect, useState, useCallback } from 'react';
import { gameAPI, ServerTimeResponse } from '@/lib/api';
import { Clock, Zap, Vote, Calendar } from 'lucide-react';
import { calculateGameTime, timeUntilNextQuarter, GameTime } from '@/lib/gameTime';
import { Divider, Skeleton } from "@heroui/react";

export default function ServerTimeFooter() {
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [gameStartDate, setGameStartDate] = useState<Date | null>(null);
  const [gameTime, setGameTime] = useState<GameTime | null>(null);
  const [nextActionUpdate, setNextActionUpdate] = useState<Date | null>(null);
  const [nextProposalCheck, setNextProposalCheck] = useState<Date | null>(null);
  const [timeOffset, setTimeOffset] = useState(0); // Difference between server and local time
  const [error, setError] = useState(false);

  const syncWithServer = useCallback(async () => {
    try {
      const data = await gameAPI.getTime();
      const serverNow = new Date(data.server_time);
      const localNow = new Date();
      const gameStart = new Date(data.game_start_date);
      
      // Calculate offset between server and local time
      setTimeOffset(serverNow.getTime() - localNow.getTime());
      setServerTime(serverNow);
      setGameStartDate(gameStart);
      setNextActionUpdate(new Date(data.next_action_update));
      setNextProposalCheck(new Date(data.next_proposal_check));
      
      // Calculate game time
      const calculatedGameTime = calculateGameTime(gameStart, serverNow);
      setGameTime(calculatedGameTime);
      
      setError(false);
    } catch (err: unknown) {
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
      if (serverTime && gameStartDate) {
        const adjustedTime = new Date(Date.now() + timeOffset);
        setServerTime(adjustedTime);
        
        // Update game time
        const calculatedGameTime = calculateGameTime(gameStartDate, adjustedTime);
        setGameTime(calculatedGameTime);
      }
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [timeOffset, serverTime, gameStartDate]);

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

  const isLoaded = !!serverTime;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#121212] backdrop-blur-md transition-colors duration-300">
      {/* Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 py-2">
          
          {/* Left: Game Time */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
            <div className="p-1.5 rounded-lg bg-corporate-blue/10 dark:bg-corporate-blue/20 bloomberg:bg-bloomberg-green/10">
              <Calendar className="w-4 h-4 text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-content-tertiary bloomberg:text-bloomberg-green-dim font-medium">
                Game Date
              </span>
              <Skeleton isLoaded={!!gameTime} className="rounded-md min-w-[60px] min-h-[20px]">
                <span className="text-sm font-bold text-content-primary bloomberg:text-bloomberg-green-bright">
                  {gameTime ? gameTime.display : 'Q1 1930'}
                </span>
              </Skeleton>
            </div>
          </div>

          <Divider orientation="vertical" className="hidden sm:block h-8 bg-gray-200 dark:bg-gray-800" />
          <Divider className="sm:hidden w-full bg-gray-200 dark:bg-gray-800" />

          {/* Center: Server Time */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-center">
            <div className="p-1.5 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 bloomberg:bg-bloomberg-green/10">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 bloomberg:text-bloomberg-green" />
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-[10px] uppercase tracking-wider text-content-tertiary bloomberg:text-bloomberg-green-dim font-medium">
                Server Time
              </span>
              <div className="flex items-baseline gap-2">
                <Skeleton isLoaded={isLoaded} className="rounded-md min-w-[140px] min-h-[20px]">
                  <div className="flex gap-2">
                    <span className="text-sm font-bold text-content-primary bloomberg:text-bloomberg-green-bright font-mono">
                      {formatDate(serverTime)}
                    </span>
                    <span className="text-sm font-bold text-content-primary bloomberg:text-bloomberg-green-bright font-mono">
                      {formatTime(serverTime)}
                    </span>
                  </div>
                </Skeleton>
              </div>
            </div>
          </div>

          <Divider orientation="vertical" className="hidden sm:block h-8 bg-gray-200 dark:bg-gray-800" />
          <Divider className="sm:hidden w-full bg-gray-200 dark:bg-gray-800" />

          {/* Right: Next Updates */}
          <div className="flex items-center gap-6 w-full sm:w-auto justify-center sm:justify-end">
            
            {/* Action Timer */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-status-warning/10 dark:bg-status-warning/20 bloomberg:bg-bloomberg-green/10">
                <Zap className="w-4 h-4 text-status-warning dark:text-status-warning bloomberg:text-bloomberg-green" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-content-tertiary bloomberg:text-bloomberg-green-dim font-medium">
                  Actions
                </span>
                <Skeleton isLoaded={isLoaded} className="rounded-md min-w-[40px] min-h-[20px]">
                  <span className={`text-sm font-bold font-mono ${
                    !nextActionUpdate ? 'text-content-tertiary' : 
                    (nextActionUpdate.getTime() - (serverTime?.getTime() || 0) < 300000) 
                      ? 'text-status-warning animate-pulse' 
                      : 'text-content-primary bloomberg:text-bloomberg-green-bright'
                  }`}>
                    {formatCountdown(nextActionUpdate)}
                  </span>
                </Skeleton>
              </div>
            </div>

            <Divider orientation="vertical" className="h-8 bg-gray-200 dark:bg-gray-800" />

            {/* Proposal Timer */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 bloomberg:bg-bloomberg-green/10">
                <Vote className="w-4 h-4 text-blue-600 dark:text-blue-400 bloomberg:text-bloomberg-green" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-content-tertiary bloomberg:text-bloomberg-green-dim font-medium">
                  Votes
                </span>
                <Skeleton isLoaded={isLoaded} className="rounded-md min-w-[40px] min-h-[20px]">
                  <span className="text-sm font-bold text-content-primary bloomberg:text-bloomberg-green-bright font-mono">
                    {formatCountdown(nextProposalCheck)}
                  </span>
                </Skeleton>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
