import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { AuctionManager } from './services/AuctionManager';
import { SocketHandler } from './sockets/socketHandler';
import { AuctionRoutes } from './routes/auctionRoutes';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

/**
 * Main server application
 */
class AuctionServer {
  private app: Application;
  private server: ReturnType<typeof createServer>;
  private io: Server;
  private auctionManager: AuctionManager;
  private socketHandler: SocketHandler;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = parseInt(process.env.PORT || '3001', 10);

    // Initialize Socket.io with CORS
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Initialize auction manager
    this.auctionManager = new AuctionManager();

    // Initialize socket handler
    this.socketHandler = new SocketHandler(this.io, this.auctionManager);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configure API routes
   */
  private setupRoutes(): void {
    const auctionRoutes = new AuctionRoutes(this.auctionManager);
    this.app.use('/api', auctionRoutes.router);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'Auction Platform API',
        version: '1.0.0',
        endpoints: {
          items: '/api/items',
          serverTime: '/api/server-time',
          health: '/api/health'
        }
      });
    });

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found'
      });
    });

    // Error handler
    this.app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    });
  }

  /**
   * Start the server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`
╔═══════════════════════════════════════════╗
║   🎯 Auction Platform Server Running     ║
╠═══════════════════════════════════════════╣
║   Port: ${this.port}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
║   API: http://localhost:${this.port}/api       ║
║   Socket.io: Ready                        ║
╚═══════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Graceful shutdown
   */
  private shutdown(): void {
    logger.info('Shutting down gracefully...');
    this.socketHandler.destroy();
    this.server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  }
}

// Start the server
const server = new AuctionServer();
server.start();
