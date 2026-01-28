import { Router, Request, Response } from 'express';
import { AuctionManager } from '../services/AuctionManager';
import { logger } from '../utils/logger';

/**
 * Auction REST API routes
 */
export class AuctionRoutes {
  public router: Router;
  private auctionManager: AuctionManager;

  constructor(auctionManager: AuctionManager) {
    this.router = Router();
    this.auctionManager = auctionManager;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    /**
     * GET /items
     * Returns all auction items with current bid information
     */
    this.router.get('/items', (_req: Request, res: Response) => {
      try {
        const items = this.auctionManager.getAllItems();
        logger.info(`GET /items - Returning ${items.length} items`);

        res.json({
          success: true,
          data: items,
          serverTime: Date.now()
        });
      } catch (error) {
        logger.error('Error in GET /items:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    /**
     * GET /items/:id
     * Returns a specific auction item
     */
    this.router.get('/items/:id', (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const item = this.auctionManager.getItem(id);

        if (!item) {
          return res.status(404).json({
            success: false,
            message: 'Item not found'
          });
        }

        logger.info(`GET /items/${id} - Item found`);
        return res.json({
          success: true,
          data: item,
          serverTime: Date.now()
        });
      } catch (error) {
        logger.error(`Error in GET /items/:id:`, error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    /**
     * GET /server-time
     * Returns current server time for synchronization
     */
    this.router.get('/server-time', (_req: Request, res: Response) => {
      res.json({
        success: true,
        serverTime: Date.now()
      });
    });

    /**
     * GET /restart-countdown
     * Returns global restart countdown info
     */
    this.router.get('/restart-countdown', (_req: Request, res: Response) => {
      try {
        const restartCountdown = this.auctionManager.getRestartCountdown();
        const allEnded = this.auctionManager.areAllAuctionsEnded();

        res.json({
          success: true,
          allAuctionsEnded: allEnded,
          restartCountdown: restartCountdown, // null if not all ended, or milliseconds until restart
          serverTime: Date.now()
        });
      } catch (error) {
        logger.error('Error getting restart countdown:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    /**
     * GET /health
     * Health check endpoint
     */
    this.router.get('/health', (_req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: Date.now()
      });
    });

    /**
     * POST /reset-auctions
     * Manually reset all auctions (for demo purposes)
     */
    this.router.post('/reset-auctions', (_req: Request, res: Response) => {
      try {
        const resetItems = this.auctionManager.resetAllAuctions();
        logger.info('All auctions manually reset via API');

        res.json({
          success: true,
          message: 'All auctions have been reset',
          data: resetItems,
          serverTime: Date.now()
        });
      } catch (error) {
        logger.error('Error resetting auctions:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  }
}
