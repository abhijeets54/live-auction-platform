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
   * Auto-resets auctions 5 seconds after they end to keep demo active
   */
  private startAuctionMonitoring(): void {
    this.auctionCheckInterval = setInterval(() => {
      // Check for newly expired auctions
      const expiredAuctions = this.auctionManager.getExpiredAuctions();

      expiredAuctions.forEach(itemId => {
        // Only notify if we haven't already notified for this auction
        if (!this.notifiedEndedAuctions.has(itemId)) {
          logger.info(`Auction ended for item: ${itemId}`);
          this.io.emit('AUCTION_ENDED', itemId);
          this.notifiedEndedAuctions.add(itemId);
        }
      });

      // Auto-reset expired auctions (5 seconds after they end)
      const resetItems = this.auctionManager.autoResetExpiredAuctions();

      resetItems.forEach(item => {
        logger.info(`Broadcasting reset for item: ${item.title}`);
        this.io.emit('AUCTION_RESET', item);
        // Remove from notified set so it can end again
        this.notifiedEndedAuctions.delete(item.id);
      });
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
