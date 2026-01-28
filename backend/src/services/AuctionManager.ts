import { AuctionItem, BidRequest, BidResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * AuctionManager handles all auction logic with race condition protection
 * Uses a queue system to process bids sequentially for each item
 */
export class AuctionManager {
  private items: Map<string, AuctionItem> = new Map();
  private bidQueues: Map<string, Promise<any>> = new Map();
  private allAuctionsEndTime: number | null = null; // Track when all auctions ended

  constructor() {
    this.initializeItems();
  }

  /**
   * Initialize auction items with sample data
   */
  private initializeItems(): void {
    const now = Date.now();
    const items: AuctionItem[] = [
      {
        id: uuidv4(),
        title: 'Vintage Rolex Watch',
        description: 'Rare 1960s Rolex Submariner in excellent condition',
        startingPrice: 5000,
        currentBid: 5000,
        currentBidder: null,
        auctionEndTime: now + 300000, // 5 minutes from now
        imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400'
      },
      {
        id: uuidv4(),
        title: 'MacBook Pro M3 Max',
        description: 'Brand new 16-inch MacBook Pro with M3 Max chip',
        startingPrice: 2500,
        currentBid: 2500,
        currentBidder: null,
        auctionEndTime: now + 240000, // 4 minutes
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'
      },
      {
        id: uuidv4(),
        title: 'Signed Basketball Jersey',
        description: 'Michael Jordan signed Chicago Bulls jersey',
        startingPrice: 1500,
        currentBid: 1500,
        currentBidder: null,
        auctionEndTime: now + 180000, // 3 minutes
        imageUrl: 'https://images.unsplash.com/photo-1515523110800-9415d13b84a8?w=400'
      },
      {
        id: uuidv4(),
        title: 'Gaming PC Setup',
        description: 'RTX 4090, i9-14900K, 64GB RAM, complete setup',
        startingPrice: 3500,
        currentBid: 3500,
        currentBidder: null,
        auctionEndTime: now + 360000, // 6 minutes
        imageUrl: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400'
      },
      {
        id: uuidv4(),
        title: 'Limited Edition Sneakers',
        description: 'Nike Air Jordan 1 Retro High OG - Chicago',
        startingPrice: 800,
        currentBid: 800,
        currentBidder: null,
        auctionEndTime: now + 420000, // 7 minutes
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
      },
      {
        id: uuidv4(),
        title: 'Vintage Guitar',
        description: 'Fender Stratocaster 1964 Sunburst',
        startingPrice: 12000,
        currentBid: 12000,
        currentBidder: null,
        auctionEndTime: now + 480000, // 8 minutes
        imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400'
      }
    ];

    items.forEach(item => {
      this.items.set(item.id, item);
      this.bidQueues.set(item.id, Promise.resolve());
    });

    logger.info(`Initialized ${items.length} auction items`);
  }

  /**
   * Get all auction items
   */
  public getAllItems(): AuctionItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get a specific item by ID
   */
  public getItem(itemId: string): AuctionItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Process a bid with race condition protection
   * Uses a queue to ensure sequential processing of bids for each item
   */
  public async processBid(bidRequest: BidRequest): Promise<BidResponse> {
    const { itemId, bidAmount, userId, username } = bidRequest;

    // Add bid to the queue for this specific item
    const currentQueue = this.bidQueues.get(itemId) || Promise.resolve();

    const bidPromise = currentQueue.then(async () => {
      return this.executeBid(itemId, bidAmount, userId, username);
    }).catch((error) => {
      logger.error(`Error processing bid for item ${itemId}:`, error);
      return {
        success: false,
        message: 'Internal server error',
        error: error.message
      };
    });

    // Update the queue
    this.bidQueues.set(itemId, bidPromise);

    return bidPromise;
  }

  /**
   * Execute the bid after it's dequeued
   * This method contains the actual business logic
   */
  private async executeBid(
    itemId: string,
    bidAmount: number,
    userId: string,
    username: string
  ): Promise<BidResponse> {
    const item = this.items.get(itemId);

    // Validate item exists
    if (!item) {
      logger.warn(`Bid attempted on non-existent item: ${itemId}`);
      return {
        success: false,
        message: 'Item not found',
        error: 'ITEM_NOT_FOUND'
      };
    }

    // Check if auction has ended
    const now = Date.now();
    if (now >= item.auctionEndTime) {
      logger.info(`Bid attempted on ended auction: ${itemId}`);
      return {
        success: false,
        message: 'Auction has ended',
        error: 'AUCTION_ENDED'
      };
    }

    // Validate bid amount (must be at least $10 more than current bid)
    const minimumBid = item.currentBid + 10;
    if (bidAmount < minimumBid) {
      logger.info(`Bid too low for item ${itemId}: ${bidAmount} < ${minimumBid}`);
      return {
        success: false,
        message: `Bid must be at least $${minimumBid}`,
        error: 'BID_TOO_LOW'
      };
    }

    // Check if user is already the highest bidder
    if (item.currentBidder === userId) {
      logger.info(`User ${userId} is already the highest bidder on ${itemId}`);
      return {
        success: false,
        message: 'You are already the highest bidder',
        error: 'ALREADY_HIGHEST_BIDDER'
      };
    }

    // Update the item with the new bid
    item.currentBid = bidAmount;
    item.currentBidder = userId;

    logger.info(`Bid accepted for item ${itemId}: $${bidAmount} by ${username} (${userId})`);

    return {
      success: true,
      message: 'Bid placed successfully',
      item: { ...item }
    };
  }

  /**
   * Check and handle expired auctions
   */
  public getExpiredAuctions(): string[] {
    const now = Date.now();
    const expiredIds: string[] = [];

    this.items.forEach((item, id) => {
      if (now >= item.auctionEndTime) {
        expiredIds.push(id);
      }
    });

    return expiredIds;
  }

  /**
   * Check if all auctions have ended
   */
  public areAllAuctionsEnded(): boolean {
    const now = Date.now();
    let allEnded = true;

    this.items.forEach((item) => {
      if (now < item.auctionEndTime) {
        allEnded = false;
      }
    });

    return allEnded;
  }

  /**
   * Get the time remaining until all auctions restart (in milliseconds)
   * Returns null if not all auctions have ended yet
   */
  public getRestartCountdown(): number | null {
    const now = Date.now();

    // Check if all auctions have ended
    if (!this.areAllAuctionsEnded()) {
      this.allAuctionsEndTime = null;
      return null;
    }

    // Track when all auctions ended
    if (this.allAuctionsEndTime === null) {
      this.allAuctionsEndTime = now;
      logger.info('All auctions have ended. Starting 30-second restart countdown.');
    }

    // Calculate time remaining until restart (30 seconds after all ended)
    const restartTime = this.allAuctionsEndTime + 30000;
    const timeRemaining = Math.max(0, restartTime - now);

    return timeRemaining;
  }

  /**
   * Auto-reset all auctions together after all have ended + 30 seconds
   * Returns array of reset auction items, or empty array if not time to reset yet
   */
  public autoResetExpiredAuctions(): AuctionItem[] {
    const restartCountdown = this.getRestartCountdown();

    // If not all auctions ended, or countdown still running, don't reset yet
    if (restartCountdown === null || restartCountdown > 0) {
      return [];
    }

    // Time to reset all auctions!
    const resetItems: AuctionItem[] = [];
    const now = Date.now();

    this.items.forEach((item) => {
      item.currentBid = item.startingPrice;
      item.currentBidder = null;
      // Reset with random time between 3-8 minutes
      const randomMinutes = Math.floor(Math.random() * 6) + 3;
      item.auctionEndTime = now + (randomMinutes * 60000);

      logger.info(`Auto-reset auction: ${item.title} with ${randomMinutes} minutes`);
      resetItems.push({ ...item });
    });

    // Reset the tracking variable
    this.allAuctionsEndTime = null;

    logger.info('All auctions reset together!');
    return resetItems;
  }

  /**
   * Reset an auction manually
   */
  public resetAuction(itemId: string): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    item.currentBid = item.startingPrice;
    item.currentBidder = null;
    item.auctionEndTime = Date.now() + 300000; // Reset to 5 minutes

    return true;
  }

  /**
   * Reset all auctions manually
   */
  public resetAllAuctions(): AuctionItem[] {
    const resetItems: AuctionItem[] = [];
    const now = Date.now();

    this.items.forEach((item) => {
      item.currentBid = item.startingPrice;
      item.currentBidder = null;
      // Random time between 3-8 minutes
      const randomMinutes = Math.floor(Math.random() * 6) + 3;
      item.auctionEndTime = now + (randomMinutes * 60000);

      resetItems.push({ ...item });
    });

    logger.info('All auctions manually reset');
    return resetItems;
  }
}
