import { Server, Socket } from 'socket.io';
import { AuctionManager } from '../services/AuctionManager';
import { BidRequest, BidResponse, ServerTimeResponse } from '../types';
import { logger } from '../utils/logger';

/**
 * SocketHandler manages all Socket.io connections and events
 */
export class SocketHandler {
  private io: Server;
  private auctionManager: AuctionManager;
  private auctionCheckInterval: NodeJS.Timeout | null = null;
  private notifiedEndedAuctions: Set<string> = new Set();

  constructor(io: Server, auctionManager: AuctionManager) {
    this.io = io;
    this.auctionManager = auctionManager;
    this.setupSocketListeners();
    this.startAuctionMonitoring();
  }

  /**
   * Set up socket connection listeners
   */
  private setupSocketListeners(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle BID_PLACED event
      socket.on('BID_PLACED', async (data: BidRequest, callback: (response: BidResponse) => void) => {
        try {
          logger.info(`Bid received from ${socket.id}: Item ${data.itemId}, Amount $${data.bidAmount}`);

          // Process the bid through the auction manager (handles race conditions)
          const response = await this.auctionManager.processBid(data);

          // Send response back to the bidder
          callback(response);

          // If bid was successful, broadcast to all clients
          if (response.success && response.item) {
            logger.info(`Broadcasting bid update for item ${data.itemId}`);
            this.io.emit('UPDATE_BID', response.item);

            // Notify other clients if they were outbid
            socket.broadcast.emit('OUTBID', {
              itemId: data.itemId,
              newBid: data.bidAmount,
              username: data.username
            });
          }
        } catch (error) {
          logger.error('Error handling BID_PLACED:', error);
          callback({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR'
          });
        }
      });

      // Handle REQUEST_SERVER_TIME event (for timer synchronization)
      socket.on('REQUEST_SERVER_TIME', (callback: (response: ServerTimeResponse) => void) => {
        callback({ serverTime: Date.now() });
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Monitor auctions and notify clients when they end
   * Broadcasts global restart countdown after all auctions end
   * Auto-resets ALL auctions together 30 seconds after all have ended
   */
  private startAuctionMonitoring(): void {
    this.auctionCheckInterval = setInterval(() => {
      // Check for newly expired individual auctions
      const expiredAuctions = this.auctionManager.getExpiredAuctions();

      expiredAuctions.forEach(itemId => {
        // Only notify if we haven't already notified for this auction
        if (!this.notifiedEndedAuctions.has(itemId)) {
          logger.info(`Auction ended for item: ${itemId}`);
          this.io.emit('AUCTION_ENDED', itemId);
          this.notifiedEndedAuctions.add(itemId);
        }
      });

      // Get global restart countdown status
      const restartCountdown = this.auctionManager.getRestartCountdown();
      const allEnded = this.auctionManager.areAllAuctionsEnded();

      // Broadcast restart countdown to all clients
      this.io.emit('RESTART_COUNTDOWN', {
        allAuctionsEnded: allEnded,
        restartCountdown: restartCountdown // null if not all ended, or milliseconds until restart
      });

      // Auto-reset ALL auctions together (30 seconds after all ended)
      const resetItems = this.auctionManager.autoResetExpiredAuctions();

      if (resetItems.length > 0) {
        logger.info(`Broadcasting coordinated reset for all ${resetItems.length} items`);
        this.io.emit('ALL_AUCTIONS_RESET', resetItems);
        // Clear notified set so auctions can end again
        this.notifiedEndedAuctions.clear();
      }
    }, 1000); // Check every second
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.auctionCheckInterval) {
      clearInterval(this.auctionCheckInterval);
    }
  }
}
