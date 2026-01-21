import { Response } from 'express';
import Stripe from 'stripe';
import { validationResult } from 'express-validator';
import Transaction, { TransactionStatus } from '../models/Transaction';
import { AuthRequest } from '../middleware/auth';

// Lazy initialization of Stripe to ensure env vars are loaded
let stripeInstance: Stripe | null = null;

const getStripe = (): Stripe => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any
    });
  }
  return stripeInstance;
};

// @desc    Create a payment intent
// @route   POST /api/payments/create-payment-intent
// @access  Private
export const createPaymentIntent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { amount, currency = 'usd', description, metadata } = req.body;
    const userId = req.user?._id;

    // Create Stripe payment intent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency: currency.toLowerCase(),
      description,
      payment_method_types: ['card'], // Only accept cards (no redirects) for server-side API
      metadata: {
        userId: userId?.toString() || '',
        ...metadata
      }
    });

    // Create transaction record
    const transaction = await Transaction.create({
      user: userId,
      amount,
      currency: currency.toUpperCase(),
      status: TransactionStatus.PENDING,
      stripePaymentIntentId: paymentIntent.id,
      description,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction._id,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error: any) {
    console.error('Payment intent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment intent'
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm/:transactionId
// @access  Private
export const confirmPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const { paymentMethodId } = req.body;

    // Find transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    // Verify transaction belongs to user
    if (transaction.user.toString() !== req.user?._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access this transaction'
      });
      return;
    }

    // Confirm payment with Stripe
    const paymentIntent = await getStripe().paymentIntents.confirm(
      transaction.stripePaymentIntentId as string,
      {
        payment_method: paymentMethodId
      }
    );

    // Update transaction status
    transaction.status =
      paymentIntent.status === 'succeeded'
        ? TransactionStatus.COMPLETED
        : TransactionStatus.FAILED;
    transaction.stripePaymentMethodId = paymentMethodId;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Payment ${paymentIntent.status}`,
      data: {
        transaction,
        paymentStatus: paymentIntent.status
      }
    });
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm payment'
    });
  }
};

// @desc    Get user's transactions
// @route   GET /api/payments/transactions
// @access  Private
export const getMyTransactions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactions = await Transaction.find({ user: req.user?._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions'
    });
  }
};

// @desc    Get all transactions (Admin only)
// @route   GET /api/payments/transactions/all
// @access  Private/Admin
export const getAllTransactions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('user', 'name email role');

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: transactions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions'
    });
  }
};

// @desc    Get transaction by ID (Admin or Owner)
// @route   GET /api/payments/transactions/:id
// @access  Private
export const getTransactionById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      'user',
      'name email role'
    );

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    // Check if user is admin or transaction owner
    if (
      req.user?.role !== 'admin' &&
      transaction.user._id.toString() !== req.user?._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access this transaction'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction'
    });
  }
};

// @desc    Refund a transaction (Admin only)
// @route   POST /api/payments/refund/:transactionId
// @access  Private/Admin
export const refundTransaction = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        message: 'Only completed transactions can be refunded'
      });
      return;
    }

    // Create refund in Stripe
    const refund = await getStripe().refunds.create({
      payment_intent: transaction.stripePaymentIntentId as string
    });

    // Update transaction status
    transaction.status = TransactionStatus.REFUNDED;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction refunded successfully',
      data: {
        transaction,
        refund
      }
    });
  } catch (error: any) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
};
