# Live Auction Platform

A real-time auction platform where users compete to buy items in the final seconds. Built with Node.js, Socket.io, React, and TypeScript.

## Features

### Backend (Node.js + Socket.io)
- **REST API**: Get auction items with real-time data
- **Real-Time Socket Events**: Instant bid updates using Socket.io
- **Race Condition Handling**: Queue-based system ensures only one bid wins when multiple users bid simultaneously
- **Server Time Synchronization**: Prevents client-side timer manipulation
- **Comprehensive Logging**: Winston logger for production-ready monitoring
- **Health Checks**: Built-in health check endpoints

### Frontend (React + TypeScript)
- **Responsive Dashboard**: Grid layout displaying all auction items
- **Live Countdown Timers**: Server-synced timers that can't be hacked
- **Visual Feedback**:
  - Green flash animation when new bids are placed
  - "Winning" badge for the highest bidder
  - Red "Outbid" notification when outbid
- **Real-Time Updates**: Instant price updates across all connected clients
- **Modern UI**: Built with Tailwind CSS

### Infrastructure
- **Docker Support**: Complete Docker setup with multi-stage builds
- **Production-Ready**: Optimized builds, health checks, and logging
- **Easy Deployment**: One-command deployment with docker-compose

## Technology Stack

### Backend
- Node.js 20
- TypeScript
- Express.js
- Socket.io
- Winston (logging)
- Docker

### Frontend
- React 18
- TypeScript
- Vite
- Socket.io Client
- Axios
- Tailwind CSS
- React Icons

## Getting Started

### Prerequisites
- Node.js 20+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- npm or yarn

### Option 1: Docker Deployment (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd task
```

2. Build and start the containers:
```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Health Check: http://localhost:3001/api/health

### Option 2: Local Development

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The backend will be running at http://localhost:3001

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be running at http://localhost:3000

## Project Structure

```
task/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   └── AuctionManager.ts     # Core auction logic with race condition handling
│   │   ├── sockets/
│   │   │   └── socketHandler.ts      # Socket.io event handlers
│   │   ├── routes/
│   │   │   └── auctionRoutes.ts      # REST API routes
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   ├── utils/
│   │   │   └── logger.ts             # Winston logger configuration
│   │   └── server.ts                 # Main server file
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx         # Main dashboard component
│   │   │   ├── AuctionCard.tsx       # Individual auction item card
│   │   │   └── CountdownTimer.tsx    # Server-synced countdown timer
│   │   ├── services/
│   │   │   ├── socketService.ts      # Socket.io client service
│   │   │   └── apiService.ts         # REST API client
│   │   ├── hooks/
│   │   │   └── useUserId.ts          # User identification hook
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
└── docker-compose.yml
```

## Key Features Explained

### 1. Race Condition Handling

The backend uses a queue-based system to handle concurrent bids:

```typescript
// From AuctionManager.ts
public async processBid(bidRequest: BidRequest): Promise<BidResponse> {
  const currentQueue = this.bidQueues.get(itemId) || Promise.resolve();

  const bidPromise = currentQueue.then(async () => {
    return this.executeBid(itemId, bidAmount, userId, username);
  });

  this.bidQueues.set(itemId, bidPromise);
  return bidPromise;
}
```

When two users bid at the exact same millisecond:
1. Both bids enter the queue
2. The first bid is processed and accepted
3. The second bid is processed but rejected with "BID_TOO_LOW" error
4. The second user receives an immediate "Outbid" notification

### 2. Server Time Synchronization

The countdown timer uses server time to prevent client-side manipulation:

```typescript
// From CountdownTimer.tsx
const serverTime = socketService.getServerTime();
const remaining = Math.max(0, endTime - serverTime);
```

The client syncs with server time on connection and calculates the offset:

```typescript
// From socketService.ts
private async syncServerTime(): Promise<void> {
  this.socket.emit('REQUEST_SERVER_TIME', (response: ServerTimeResponse) => {
    const clientTime = Date.now();
    this.serverTimeOffset = response.serverTime - clientTime;
  });
}
```

### 3. Real-Time Visual Feedback

- **Green Flash**: Triggered on `UPDATE_BID` socket event
- **Winning Badge**: Shown when `item.currentBidder === userId`
- **Outbid Notification**: Triggered on `OUTBID` socket event

## API Endpoints

### REST API

- `GET /api/items` - Get all auction items
- `GET /api/items/:id` - Get a specific auction item
- `GET /api/server-time` - Get current server time
- `GET /api/health` - Health check endpoint

### Socket Events

#### Client to Server
- `BID_PLACED` - Place a bid
- `REQUEST_SERVER_TIME` - Request server time for synchronization

#### Server to Client
- `UPDATE_BID` - Broadcast when a new bid is placed
- `OUTBID` - Notify when a user is outbid
- `AUCTION_ENDED` - Notify when an auction ends

## Testing the Application

### Test Race Condition Handling

1. Open two browser windows side by side
2. Both windows should show the same auction item
3. Click the bid button on both windows simultaneously
4. Observe that only one bid succeeds
5. The second user receives an "Outbid" error immediately

### Test Server Time Synchronization

1. Open the browser developer console
2. Try to manipulate the countdown timer using JavaScript
3. The timer will continue to use server time, preventing manipulation

### Test Visual Feedback

1. **Green Flash**: Place a bid and watch the price flash green
2. **Winning Badge**: The highest bidder sees a "Winning" badge
3. **Outbid Notification**: When outbid, a red notification appears

## Production Deployment

### Building for Production

#### Backend
```bash
cd backend
npm run build
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

### Docker Production Deployment

The Docker setup uses multi-stage builds for optimized production images:

```bash
docker-compose up -d
```

To view logs:
```bash
docker-compose logs -f
```

To stop:
```bash
docker-compose down
```

## Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

## Code Quality

### Backend
- **TypeScript Strict Mode**: Full type safety
- **Modular Architecture**: Separation of concerns (services, routes, sockets)
- **Error Handling**: Comprehensive try-catch blocks with logging
- **Logging**: Winston logger with different log levels

### Frontend
- **TypeScript**: Full type safety across components
- **React Best Practices**: Hooks, functional components
- **Clean Code**: Modular components with single responsibilities
- **Performance**: Optimized re-renders, memoization where needed

## Performance Considerations

- **Queue-based bid processing**: Prevents race conditions without locks
- **WebSocket connections**: Real-time updates without polling
- **Server time sync**: Single sync on connection, then client-side calculation
- **Optimized Docker images**: Multi-stage builds reduce image size
- **Nginx caching**: Static assets cached for performance

## Security Features

- **CORS Configuration**: Controlled cross-origin requests
- **Input Validation**: All bid requests validated
- **Server Time Authority**: Prevents client-side timer manipulation
- **Health Checks**: Monitor application health
- **Security Headers**: Nginx configured with security headers

## Future Enhancements

- User authentication with JWT
- Persistent database (PostgreSQL/MongoDB)
- Payment integration
- Email notifications
- Bid history
- Admin dashboard
- Mobile app

## License

MIT

## Author

Built for internship assessment - demonstrating production-ready code quality, real-time features, and Docker infrastructure.
