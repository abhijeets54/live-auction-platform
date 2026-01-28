import { useState, useEffect } from 'react';
import { socketService } from '../services/socketService';

interface CountdownTimerProps {
  endTime: number;
  onExpire?: () => void;
}

/**
 * Server-synced countdown timer
 * Uses server time to prevent client-side manipulation
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTime, onExpire }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState<boolean>(false);

  useEffect(() => {
    const updateTimer = () => {
      // Use server-synced time instead of local time
      const serverTime = socketService.getServerTime();
      const remaining = Math.max(0, endTime - serverTime);

      setTimeRemaining(remaining);

      // If auction has time remaining, reset expired state (handles reset)
      if (remaining > 0 && hasExpired) {
        setHasExpired(false);
      }

      if (remaining === 0 && !hasExpired) {
        setHasExpired(true);
        onExpire?.();
      }
    };

    // Update immediately
    updateTimer();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [endTime, hasExpired, onExpire]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const getColorClass = (): string => {
    const secondsRemaining = timeRemaining / 1000;
    if (secondsRemaining <= 10) return 'text-red-600 font-bold animate-pulse';
    if (secondsRemaining <= 30) return 'text-orange-600 font-semibold';
    return 'text-gray-700';
  };

  if (hasExpired) {
    return <span className="text-red-600 font-bold">ENDED</span>;
  }

  return (
    <span className={getColorClass()}>
      {formatTime(timeRemaining)}
    </span>
  );
};
