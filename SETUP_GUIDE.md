# Quick Setup Guide

Follow these steps to get the API running in under 5 minutes.

## Prerequisites Check

- [ ] Node.js installed (v16+) - Check: `node --version`
- [ ] MongoDB installed or MongoDB Atlas account
- [ ] Stripe account (free test mode)

## Step-by-Step Setup

### 1. Install Dependencies (1 minute)

```bash
npm install
```

### 2. Set Up Environment Variables (2 minutes)

```bash
cp .env.example .env
```

Edit `.env` file and update:

**MongoDB (choose one):**

Option A - Local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/school-platform
```

Option B - MongoDB Atlas (free):
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school-platform
```

**JWT Secret:**
```env
JWT_SECRET=your_random_secret_key_change_this
```

**Stripe (get from https://dashboard.stripe.com/test/apikeys):**
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Start MongoDB (if using local) (1 minute)

```bash
# macOS/Linux
mongod

# Windows
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
```

### 4. Run the Application (1 minute)

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║     🚀 School Platform API Server Running                ║
║     Environment: development                              ║
║     Port: 5000                                            ║
╚═══════════════════════════════════════════════════════════╝
```

## Quick Test

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running"
}
```

### Test 2: Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

You should receive a JWT token in the response!

### Test 3: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

## Using Postman (Recommended)

1. Import `POSTMAN_COLLECTION.json` into Postman
2. Set environment variable `baseUrl` to `http://localhost:5000`
3. Run requests in order:
   - Register User
   - Login (saves token automatically)
   - Create Payment Intent
   - Get My Transactions

## Common Issues

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- For Atlas, whitelist your IP address

### Port Already in Use
Change port in `.env`:
```env
PORT=3000
```

### Stripe Error
- Verify API keys are correct
- Use test mode keys (start with `sk_test_`)
- Check https://dashboard.stripe.com/test/apikeys

## Next Steps

1. Read the full [README.md](README.md) for API documentation
2. Test all endpoints using Postman
3. Create an admin user to test admin endpoints
4. Try payment integration with Stripe test cards

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure MongoDB is running
4. Check Node.js version (should be 16+)

## Testing Payment Flow

1. Register/Login to get a token
2. Create payment intent
3. Use Stripe test card: `4242 4242 4242 4242`
4. Confirm payment
5. View transaction history

**Congratulations! Your API is ready to use! 🎉**
