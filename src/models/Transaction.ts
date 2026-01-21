import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: TransactionStatus;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user']
    },
    amount: {
      type: Number,
      required: [true, 'Please provide transaction amount'],
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'usd',
      uppercase: true
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true
    },
    stripePaymentMethodId: {
      type: String
    },
    description: {
      type: String,
      required: [true, 'Please provide transaction description'],
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
