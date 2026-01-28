export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentBid: number;
  currentBidder: string | null;
  auctionEndTime: number; // Unix timestamp in milliseconds
  imageUrl: string;
}

export interface BidRequest {
  itemId: string;
  bidAmount: number;
  userId: string;
  username: string;
}

export interface BidResponse {
  success: boolean;
  message: string;
  item?: AuctionItem;
  error?: string;
}

export interface ServerTimeResponse {
  serverTime: number;
}

export interface SocketEvents {
  // Client to Server
  BID_PLACED: (data: BidRequest, callback: (response: BidResponse) => void) => void;
  REQUEST_SERVER_TIME: (callback: (response: ServerTimeResponse) => void) => void;

  // Server to Client
  UPDATE_BID: (item: AuctionItem) => void;
  AUCTION_ENDED: (itemId: string) => void;
  OUTBID: (data: { itemId: string; newBid: number; username: string }) => void;
}
