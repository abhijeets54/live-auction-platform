export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentBid: number;
  currentBidder: string | null;
  auctionEndTime: number;
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

export interface OutbidData {
  itemId: string;
  newBid: number;
  username: string;
}
