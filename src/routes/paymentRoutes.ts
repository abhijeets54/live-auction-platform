import express from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getMyTransactions,
  getAllTransactions,
  getTransactionById,
  refundTransaction
} from '../controllers/paymentController';
import { protect, authorize } from '../middleware/auth';
import { paymentValidation } from '../middleware/validator';
import { UserRole } from '../models/User';

const router = express.Router();

// Protected routes (all require authentication)
router.use(protect);

// User routes
router.post('/create-payment-intent', paymentValidation, createPaymentIntent);
router.post('/confirm/:transactionId', confirmPayment);
router.get('/transactions', getMyTransactions);

// Admin-only routes (must come BEFORE /transactions/:id to avoid route collision)
router.get('/transactions/all', authorize(UserRole.ADMIN), getAllTransactions);
router.post('/refund/:transactionId', authorize(UserRole.ADMIN), refundTransaction);

// Parameterized routes (must come LAST)
router.get('/transactions/:id', getTransactionById);

export default router;
