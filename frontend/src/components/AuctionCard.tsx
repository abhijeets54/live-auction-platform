import { useState, useEffect } from 'react';
import { AuctionItem } from '../types';
import { CountdownTimer } from './CountdownTimer';
import { FaTrophy, FaGavel } from 'react-icons/fa';
import { socketService } from '../services/socketService';

interface AuctionCardProps {
  item: AuctionItem;
  userId: string;
  username: string;
  onBid: (itemId: string, amount: number) => void;
  isBidding: boolean;
}

/**
 * Auction item card with real-time updates and visual feedback
 */
export const AuctionCard: React.FC<AuctionCardProps> = ({
  item,
  userId,
  username: _username,
  onBid,
  isBidding
}) => {
  const [flashGreen, setFlashGreen] = useState(false);
  const [showOutbid, setShowOutbid] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [previousBidder, setPreviousBidder] = useState<string | null>(null);

  const isWinning = item.currentBidder === userId;
  const nextBidAmount = item.currentBid + 10;

  // Check if auction has ended
  useEffect(() => {
    const serverTime = socketService.getServerTime();
    setIsEnded(serverTime >= item.auctionEndTime);
  }, [item.auctionEndTime]);

  // Trigger green flash when bid updates
  useEffect(() => {
    setFlashGreen(true);
    const timeout = setTimeout(() => setFlashGreen(false), 500);
    return () => clearTimeout(timeout);
  }, [item.currentBid]);

  // Detect when user gets outbid
  useEffect(() => {
    // If I was the previous bidder and now someone else is the current bidder
    if (previousBidder === userId && item.currentBidder !== userId && item.currentBidder !== null) {
      setShowOutbid(true);
      const timeout = setTimeout(() => setShowOutbid(false), 3000);
      return () => clearTimeout(timeout);
    }

    // Track the current bidder for next update
    setPreviousBidder(item.currentBidder);
  }, [item.currentBidder, userId, previousBidder]);

  const handleBid = () => {
    if (!isEnded && !isBidding) {
      onBid(item.id, nextBidAmount);
    }
  };

  const handleAuctionExpire = () => {
    setIsEnded(true);
  };

  return (
    <div className={`
      bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300
      hover:shadow-xl transform hover:-translate-y-1
      ${flashGreen ? 'ring-4 ring-green-400 scale-105' : ''}
      ${isEnded ? 'opacity-75' : ''}
    `}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Auction+Item';
          }}
        />

        {/* Status badges */}
        <div className="absolute top-2 right-2 flex gap-2">
          {isWinning && !isEnded && (
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-bounce">
              <FaTrophy /> Winning
            </div>
          )}
          {showOutbid && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              Outbid!
            </div>
          )}
          {isEnded && (
            <div className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-bold">
              Ended
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">
          {item.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {item.description}
        </p>

        {/* Price and timer */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">Current Bid</p>
            <p className={`
              text-2xl font-bold transition-all duration-300
              ${flashGreen ? 'text-green-600 scale-110' : 'text-gray-800'}
            `}>
              ${item.currentBid.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Time Left</p>
            <p className="text-lg font-semibold">
              <CountdownTimer
                endTime={item.auctionEndTime}
                onExpire={handleAuctionExpire}
              />
            </p>
          </div>
        </div>

        {/* Bid button */}
        <button
          onClick={handleBid}
          disabled={isEnded || isBidding || isWinning}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold text-white
            flex items-center justify-center gap-2 transition-all duration-200
            ${isEnded || isWinning
              ? 'bg-gray-400 cursor-not-allowed'
              : isBidding
              ? 'bg-blue-400 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }
          `}
        >
          <FaGavel />
          {isEnded
            ? 'Auction Ended'
            : isWinning
            ? 'You\'re Winning!'
            : isBidding
            ? 'Placing Bid...'
            : `Bid $${nextBidAmount.toLocaleString()}`
          }
        </button>

        {/* Starting price info */}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Starting price: ${item.startingPrice.toLocaleString()}
        </p>
      </div>
    </div>
  );
};
