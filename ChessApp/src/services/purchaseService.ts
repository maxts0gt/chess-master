/**
 * Purchase Service
 * Handles Pro Coach unlock with react-native-iap
 */

import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  Purchase,
  Product,
  PurchaseError,
} from 'react-native-iap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Product IDs
const PRODUCT_IDS = Platform.select({
  ios: ['com.chessapp.procoach'],
  android: ['pro_coach_unlock'],
  default: [],
});

const STORAGE_KEY = '@ChessApp:ProUnlocked';

export interface PurchaseState {
  isProUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
}

class PurchaseService {
  private initialized = false;
  private products: Product[] = [];
  private proUnlocked = false;

  /**
   * Initialize IAP connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing IAP...');
      
      // Connect to store
      const connected = await initConnection();
      if (!connected) {
        throw new Error('Failed to connect to store');
      }

      // Load products
      this.products = await getProducts({ skus: PRODUCT_IDS });
      console.log('Products loaded:', this.products.length);

      // Check if already purchased
      await this.checkPurchaseStatus();
      
      this.initialized = true;
      console.log('IAP initialized successfully');
    } catch (error) {
      console.error('IAP initialization failed:', error);
      // Don't throw - app should work without IAP
    }
  }

  /**
   * Check if Pro is already unlocked
   */
  async checkPurchaseStatus(): Promise<boolean> {
    try {
      // Check local storage first
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        this.proUnlocked = true;
        return true;
      }

      // Check store purchases
      const purchases = await getAvailablePurchases();
      const hasPro = purchases.some(purchase => 
        PRODUCT_IDS.includes(purchase.productId)
      );

      if (hasPro) {
        await this.unlockPro();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check purchase status:', error);
      return false;
    }
  }

  /**
   * Get Pro product info
   */
  getProProduct(): Product | null {
    return this.products.find(p => PRODUCT_IDS.includes(p.productId)) || null;
  }

  /**
   * Purchase Pro Coach
   */
  async purchasePro(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.proUnlocked) {
      console.log('Pro already unlocked');
      return true;
    }

    const product = this.getProProduct();
    if (!product) {
      throw new Error('Pro product not found');
    }

    try {
      console.log('Requesting purchase...');
      const purchase = await requestPurchase({
        sku: product.productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });

      // Validate purchase
      if (purchase) {
        await this.handlePurchase(purchase);
        return true;
      }

      return false;
    } catch (error) {
      if ((error as PurchaseError).code === 'E_USER_CANCELLED') {
        console.log('Purchase cancelled by user');
      } else {
        console.error('Purchase failed:', error);
      }
      throw error;
    }
  }

  /**
   * Handle successful purchase
   */
  private async handlePurchase(purchase: Purchase): Promise<void> {
    try {
      // Finish transaction
      await finishTransaction({ 
        purchase,
        isConsumable: false,
      });

      // Unlock Pro
      await this.unlockPro();
      
      console.log('Purchase completed successfully');
    } catch (error) {
      console.error('Failed to handle purchase:', error);
      throw error;
    }
  }

  /**
   * Unlock Pro features
   */
  private async unlockPro(): Promise<void> {
    this.proUnlocked = true;
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    console.log('Pro features unlocked!');
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<boolean> {
    try {
      console.log('Restoring purchases...');
      const purchases = await getAvailablePurchases();
      
      const hasPro = purchases.some(purchase => 
        PRODUCT_IDS.includes(purchase.productId)
      );

      if (hasPro) {
        await this.unlockPro();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  /**
   * Check if Pro is unlocked
   */
  isProUnlocked(): boolean {
    return this.proUnlocked;
  }

  /**
   * Get formatted price
   */
  getProPrice(): string {
    const product = this.getProProduct();
    if (!product) return '$14.99';
    
    return product.localizedPrice || product.price || '$14.99';
  }

  /**
   * Clean up
   */
  async cleanup(): Promise<void> {
    if (this.initialized) {
      await endConnection();
      this.initialized = false;
    }
  }
}

export const purchaseService = new PurchaseService();