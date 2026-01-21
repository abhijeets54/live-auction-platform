// Common types used across the application

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  total?: number;
  page?: number;
  pages?: number;
  errors?: any[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaymentMetadata {
  courseId?: string;
  semester?: string;
  studentId?: string;
  [key: string]: any;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}
