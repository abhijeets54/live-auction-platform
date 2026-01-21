# School Platform API

A robust REST API built with Node.js, Express, TypeScript, and MongoDB featuring JWT authentication, role-based access control, and Stripe payment integration.

## Features

- **User Authentication**
  - User registration with email validation
  - Secure login with JWT tokens
  - Password hashing with bcrypt
  - Token-based session management

- **Role-Based Access Control**
  - Two user roles: `User` and `Admin`
  - Protected routes with authorization middleware
  - Role-specific endpoints

- **Payment Integration**
  - Stripe payment processing
  - Payment intent creation
  - Transaction tracking and history
  - Refund management (Admin only)
  - Payment status monitoring

- **Security**
  - Helmet.js for security headers
  - Rate limiting to prevent abuse
  - CORS configuration
  - Input validation with express-validator
  - Password encryption

- **Database**
  - MongoDB with Mongoose ODM
  - Indexed queries for performance
  - Transaction tracking
  - User management

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose)
- **Authentication:** JWT (jsonwebtoken)
- **Payment:** Stripe
- **Validation:** express-validator
- **Security:** Helmet, bcrypt, rate-limit

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Stripe account (for payment integration)
- npm or yarn

## Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd backend-task
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**

Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Update the `.env` file with your credentials:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/school-platform
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
CLIENT_URL=http://localhost:3000
```

4. **Start MongoDB**

If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas connection string in `.env`

5. **Run the application**

Development mode with hot reload:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

The server will start at `http://localhost:5000`

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Response Format
All responses follow this structure:
```json
{
  "success": true/false,
  "message": "Response message",
  "data": { /* Response data */ }
}
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"  // optional: "user" or "admin" (default: "user")
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "65abc123...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login
**POST** `/api/auth/login`

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65abc123...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get Current User
**GET** `/api/auth/me`

Get the currently authenticated user's information.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "65abc123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

## Payment Endpoints

All payment endpoints require authentication via JWT token.

### 1. Create Payment Intent
**POST** `/api/payments/create-payment-intent`

Create a new payment intent with Stripe.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 50.00,
  "currency": "usd",
  "description": "Course enrollment payment",
  "metadata": {
    "courseId": "course123",
    "semester": "Fall 2024"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "clientSecret": "pi_abc123_secret_def456",
    "transactionId": "65xyz789...",
    "paymentIntentId": "pi_abc123"
  }
}
```

### 2. Confirm Payment
**POST** `/api/payments/confirm/:transactionId`

Confirm a payment with a payment method.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request Body:**
```json
{
  "paymentMethodId": "pm_card_visa"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment succeeded",
  "data": {
    "transaction": { /* transaction details */ },
    "paymentStatus": "succeeded"
  }
}
```

### 3. Get My Transactions
**GET** `/api/payments/transactions`

Get all transactions for the authenticated user.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "65xyz789...",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "amount": 50,
      "currency": "USD",
      "status": "completed",
      "description": "Course enrollment payment",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 4. Get Transaction by ID
**GET** `/api/payments/transactions/:id`

Get a specific transaction by ID (accessible by transaction owner or admin).

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65xyz789...",
    "user": { /* user details */ },
    "amount": 50,
    "status": "completed",
    "description": "Course enrollment payment"
  }
}
```

### 5. Get All Transactions (Admin Only)
**GET** `/api/payments/transactions/all`

Get all transactions in the system with pagination and filtering.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, completed, failed, refunded)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```
GET /api/payments/transactions/all?status=completed&page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "data": [ /* array of transactions */ ]
}
```

### 6. Refund Transaction (Admin Only)
**POST** `/api/payments/refund/:transactionId`

Refund a completed transaction.

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Transaction refunded successfully",
  "data": {
    "transaction": { /* updated transaction */ },
    "refund": { /* Stripe refund details */ }
  }
}
```

---

## Testing the API

### Using cURL

**1. Register a user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**2. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**3. Create a payment (replace TOKEN):**
```bash
curl -X POST http://localhost:5000/api/payments/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 50.00,
    "currency": "usd",
    "description": "Test payment"
  }'
```

### Using Postman

1. Import the collection from the `postman` folder (if available)
2. Set up environment variables for `baseUrl` and `token`
3. Run requests in the following order:
   - Register → Login → Save token → Make payment requests

---

## Project Structure

```
backend-task/
├── src/
│   ├── config/
│   │   └── database.ts          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.ts    # Authentication logic
│   │   └── paymentController.ts # Payment logic
│   ├── middleware/
│   │   ├── auth.ts              # JWT & role-based auth
│   │   ├── errorHandler.ts      # Global error handling
│   │   └── validator.ts         # Input validation rules
│   ├── models/
│   │   ├── User.ts              # User model & schema
│   │   └── Transaction.ts       # Transaction model & schema
│   ├── routes/
│   │   ├── authRoutes.ts        # Authentication routes
│   │   └── paymentRoutes.ts     # Payment routes
│   └── server.ts                # Application entry point
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

**Error Response Example:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

---

## Security Features

- **Password Hashing:** Passwords are hashed using bcrypt before storage
- **JWT Authentication:** Stateless authentication with secure tokens
- **Rate Limiting:** 100 requests per 10 minutes per IP
- **Helmet:** Security headers to protect against common vulnerabilities
- **CORS:** Configurable cross-origin resource sharing
- **Input Validation:** All inputs are validated and sanitized
- **Role-Based Access:** Different permissions for User and Admin roles

---

## Database Models

### User Schema
```typescript
{
  name: String,
  email: String (unique, lowercase),
  password: String (hashed),
  role: Enum ['user', 'admin'],
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Schema
```typescript
{
  user: ObjectId (ref: User),
  amount: Number,
  currency: String,
  status: Enum ['pending', 'completed', 'failed', 'refunded'],
  stripePaymentIntentId: String,
  stripePaymentMethodId: String,
  description: String,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Stripe Testing

Use Stripe test cards for payment testing:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires Authentication:** `4000 0025 0000 3155`

**Test Card Details:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

---

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=<your-production-mongodb-uri>
JWT_SECRET=<strong-random-secret>
STRIPE_SECRET_KEY=<live-stripe-key>
CLIENT_URL=<your-frontend-url>
```

### Build for Production

```bash
npm run build
npm start
```

---

## Development Highlights

This API demonstrates:

✅ **Clean Architecture** - Organized MVC pattern with separation of concerns
✅ **TypeScript** - Type-safe code with interfaces and strict typing
✅ **Security Best Practices** - JWT, bcrypt, helmet, rate limiting
✅ **Error Handling** - Comprehensive error messages and validation
✅ **Database Design** - Optimized schemas with indexes
✅ **Payment Integration** - Full Stripe payment flow
✅ **Role-Based Access** - Granular permissions system
✅ **Production Ready** - Environment configs, logging, error handling

---

## Author

**Abhijeet Singh**

- Portfolio: https://abhijeets-portfolio.vercel.app
- GitHub: https://github.com/abhijeets54
- Email: abhijeet@example.com

---

## License

ISC

---

## Notes for Reviewers

This API was built as a technical assessment for the Junior Backend Developer Intern position. It demonstrates:

1. **Strong fundamentals** in Node.js and Express
2. **Real-world payment integration** with Stripe
3. **Security consciousness** with multiple layers of protection
4. **Clean, maintainable code** with TypeScript
5. **Production-ready features** like error handling, validation, and rate limiting

The codebase is designed to be easily extensible for additional features like:
- Email notifications
- Password reset functionality
- Two-factor authentication
- Webhook handlers for Stripe events
- Advanced analytics and reporting
- Course management endpoints

Thank you for reviewing my submission!
