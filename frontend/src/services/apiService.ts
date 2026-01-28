import axios from 'axios';
import { AuctionItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * API service for REST endpoints
 */
export const apiService = {
  /**
   * Get all auction items
   */
  async getItems(): Promise<{ data: AuctionItem[]; serverTime: number }> {
    const response = await api.get('/items');
    return response.data;
  },

  /**
   * Get a specific auction item
   */
  async getItem(id: string): Promise<{ data: AuctionItem; serverTime: number }> {
    const response = await api.get(`/items/${id}`);
    return response.data;
  },

  /**
   * Get server time
   */
  async getServerTime(): Promise<number> {
    const response = await api.get('/server-time');
    return response.data.serverTime;
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.success;
    } catch {
      return false;
    }
  }
};
