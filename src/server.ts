import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();

// Connect to database (async)
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Welcome route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to School Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      payments: '/api/payments',
      health: '/health'
    },
    documentation: 'See README.md for API documentation'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🚀 School Platform API Server Running                ║
║                                                           ║
║     Environment: ${process.env.NODE_ENV || 'development'}                              ║
║     Port: ${PORT}                                            ║
║                                                           ║
║     API Endpoints:                                        ║
║     - http://localhost:${PORT}/                            ║
║     - http://localhost:${PORT}/api/auth                    ║
║     - http://localhost:${PORT}/api/payments                ║
║                                                           ║
║     Note: Check MongoDB connection message above          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
