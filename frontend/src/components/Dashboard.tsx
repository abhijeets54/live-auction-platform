import { useState, useEffect } from 'react';
import { AuctionItem, OutbidData } from '../types';
import { AuctionCard } from './AuctionCard';
import { apiService } from '../services/apiService';
import { socketService } from '../services/socketService';
import { useUserId } from '../hooks/useUserId';
import { FaWifi, FaTimesCircle } from 'react-icons/fa';

/**
 * Main dashboard displaying all auction items
 */
export const Dashboard: React.FC = () => {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biddingItemId, setBiddingItemId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { userId, username } = useUserId();

  // Initialize and load items
  useEffect(() => {
    const initialize = async () => {
      try {
        // Connect socket
        socketService.connect();
        setIsConnected(true);

        // Load initial items
        const response = await apiService.getItems();
        setItems(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError('Failed to load auction items. Please refresh the page.');
        setLoading(false);
      }
    };

    initialize();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Set up socket listeners (only once)
  useEffect(() => {
    if (!userId) return;

    // Listen for bid updates
    socketService.onBidUpdate((updatedItem: AuctionItem) => {
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    });

    // Listen for outbid notifications
    socketService.onOutbid((data: OutbidData) => {
      setItems(prevItems => {
        const item = prevItems.find(i => i.id === data.itemId);
        if (item && item.currentBidder === userId) {
          showNotification(`You've been outbid on "${item.title}"!`, 'error');
        }
        return prevItems;
      });
    });

    // Listen for auction end
    socketService.onAuctionEnded((itemId: string) => {
      setItems(prevItems => {
        const item = prevItems.find(i => i.id === itemId);
        if (item) {
          // Only show notification if user was the winner or had bid on it
          if (item.currentBidder === userId) {
            showNotification(`Congratulations! You won "${item.title}"!`, 'success');
          }
        }
        return prevItems;
      });
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [userId]); // Only re-run if userId changes

  const handleBid = async (itemId: string, amount: number) => {
    if (!userId || !username) return;

    setBiddingItemId(itemId);

    try {
      const response = await socketService.placeBid({
        itemId,
        bidAmount: amount,
        userId,
        username
      });

      if (response.success) {
        showNotification('Bid placed successfully!', 'success');
      } else {
        showNotification(response.message, 'error');
      }
    } catch (err) {
      console.error('Bid error:', err);
      showNotification('Failed to place bid. Please try again.', 'error');
    } finally {
      setBiddingItemId(null);
    }
  };

  const showNotification = (message: string, _type: 'success' | 'error' | 'info') => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Loading auctions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <FaTimesCircle className="text-red-500 text-6xl mx-auto mb-4" />
          <p className="text-xl text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Live Auction Platform</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, <span className="font-semibold">{username}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <FaWifi className="text-green-500" />
                  <span className="text-sm text-green-600 font-semibold">Connected</span>
                </>
              ) : (
                <>
                  <FaTimesCircle className="text-red-500" />
                  <span className="text-sm text-red-600 font-semibold">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className={`
            px-6 py-3 rounded-lg shadow-lg text-white font-semibold
            ${notification.includes('successfully') || notification.includes('won')
              ? 'bg-green-500'
              : notification.includes('outbid') || notification.includes('Failed')
              ? 'bg-red-500'
              : 'bg-blue-500'
            }
          `}>
            {notification}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Active Auctions ({items.length})
          </h2>
          <p className="text-gray-600 mt-1">
            Place your bids before time runs out!
          </p>
        </div>

        {/* Grid of auction cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <AuctionCard
              key={item.id}
              item={item}
              userId={userId}
              username={username}
              onBid={handleBid}
              isBidding={biddingItemId === item.id}
            />
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600">No active auctions at the moment.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Real-time auction platform with Socket.io</p>
          <p className="text-sm mt-2">All timers are synchronized with server time</p>
        </div>
      </footer>
    </div>
  );
};
