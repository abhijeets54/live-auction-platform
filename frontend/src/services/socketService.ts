import { io, Socket } from 'socket.io-client';
import { BidRequest, BidResponse, AuctionItem, OutbidData, ServerTimeResponse } from '../types';

/**
 * Socket service for managing Socket.io connection
 */
class SocketService {
  private socket: Socket | null = null;
  private serverTimeOffset: number = 0;

  /**
   * Initialize socket connection
   */
  connect(): void {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.syncServerTime();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  /**
   * Sync server time to prevent client-side timer manipulation
   */
  private async syncServerTime(): Promise<void> {
    if (!this.socket) return;

    this.socket.emit('REQUEST_SERVER_TIME', (response: ServerTimeResponse) => {
      const clientTime = Date.now();
      this.serverTimeOffset = response.serverTime - clientTime;
      console.log('Server time synced, offset:', this.serverTimeOffset, 'ms');
    });
  }

  /**
   * Get synchronized server time
   */
  getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  /**
   * Place a bid
   */
  placeBid(bidRequest: BidRequest): Promise<BidResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('BID_PLACED', bidRequest, (response: BidResponse) => {
        resolve(response);
      });
    });
  }

  /**
   * Subscribe to bid updates
   */
  onBidUpdate(callback: (item: AuctionItem) => void): void {
    if (!this.socket) return;
    this.socket.on('UPDATE_BID', callback);
  }

  /**
   * Subscribe to outbid notifications
   */
  onOutbid(callback: (data: OutbidData) => void): void {
    if (!this.socket) return;
    this.socket.on('OUTBID', callback);
  }

  /**
   * Subscribe to auction end notifications
   */
  onAuctionEnded(callback: (itemId: string) => void): void {
    if (!this.socket) return;
    this.socket.on('AUCTION_ENDED', callback);
  }

  /**
   * Subscribe to auction reset notifications
   */
  onAuctionReset(callback: (item: AuctionItem) => void): void {
    if (!this.socket) return;
    this.socket.on('AUCTION_RESET', callback);
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const socketService = new SocketService();
