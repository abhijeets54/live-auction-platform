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
  }
}
