/**
 * Premium AI Coach Service
 * Handles $9.99 one-time purchase and AI model management
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
import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { mistralChess } from './mistralService';

// Product IDs
const PRODUCTS = {
  AI_COACH: Platform.select({
    ios: 'com.chessapp.ai_coach',
    android: 'ai_coach_premium',
  }) as string,
  
  // Future add-ons
  OPENING_MASTER: Platform.select({
    ios: 'com.chessapp.opening_master',
    android: 'opening_master',
  }) as string,
  
  ENDGAME_WIZARD: Platform.select({
    ios: 'com.chessapp.endgame_wizard',
    android: 'endgame_wizard',
  }) as string,
  
  EVERYTHING_BUNDLE: Platform.select({
    ios: 'com.chessapp.everything_bundle',
    android: 'everything_bundle',
  }) as string,
};

// Storage keys
const STORAGE_KEYS = {
  PURCHASES: '@ChessApp:Purchases',
  AI_MODEL_PATH: '@ChessApp:AIModelPath',
  FIRST_TIME_BUYER: '@ChessApp:FirstTimeBuyer',
};

// Model download URL (you'll need to host this)
const AI_MODEL_URL = 'https://your-cdn.com/models/mistral-3b-chess-q4.gguf';
const AI_MODEL_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5GB

interface PremiumState {
  hasAICoach: boolean;
  hasOpeningMaster: boolean;
  hasEndgameWizard: boolean;
  isModelDownloaded: boolean;
  downloadProgress: number;
  purchases: string[];
}

class PremiumService {
  private initialized = false;
  private products: Map<string, Product> = new Map();
  private state: PremiumState = {
    hasAICoach: false,
    hasOpeningMaster: false,
    hasEndgameWizard: false,
    isModelDownloaded: false,
    downloadProgress: 0,
    purchases: [],
  };
  
  private downloadTask?: any;
  private listeners: ((state: PremiumState) => void)[] = [];

  /**
   * Initialize premium service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Connect to store
      await initConnection();
      
      // Load saved purchases
      await this.loadPurchases();
      
      // Get products from store
      const products = await getProducts({ skus: Object.values(PRODUCTS) });
      products.forEach(product => {
        this.products.set(product.productId, product);
      });
      
      // Restore purchases
      await this.restorePurchases();
      
      // Check if AI model is downloaded
      await this.checkModelStatus();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize premium service:', error);
    }
  }

  /**
   * Load saved purchases from storage
   */
  private async loadPurchases(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASES);
      if (saved) {
        const purchases = JSON.parse(saved);
        this.state.purchases = purchases;
        this.state.hasAICoach = purchases.includes(PRODUCTS.AI_COACH);
        this.state.hasOpeningMaster = purchases.includes(PRODUCTS.OPENING_MASTER);
        this.state.hasEndgameWizard = purchases.includes(PRODUCTS.ENDGAME_WIZARD);
      }
    } catch (error) {
      console.error('Failed to load purchases:', error);
    }
  }

  /**
   * Save purchases to storage
   */
  private async savePurchases(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PURCHASES,
        JSON.stringify(this.state.purchases)
      );
    } catch (error) {
      console.error('Failed to save purchases:', error);
    }
  }

  /**
   * Check if AI model is downloaded
   */
  private async checkModelStatus(): Promise<void> {
    try {
      const modelPath = await AsyncStorage.getItem(STORAGE_KEYS.AI_MODEL_PATH);
      if (modelPath && await RNFS.exists(modelPath)) {
        this.state.isModelDownloaded = true;
      }
    } catch (error) {
      console.error('Failed to check model status:', error);
    }
  }

  /**
   * Get product information
   */
  getProduct(productId: string): Product | undefined {
    return this.products.get(productId);
  }

  /**
   * Get AI Coach product with formatted price
   */
  getAICoachProduct(): { price: string; description: string } | null {
    const product = this.products.get(PRODUCTS.AI_COACH);
    if (!product) return null;
    
    return {
      price: product.localizedPrice || '$9.99',
      description: product.description || 'Unlock your personal AI chess coach',
    };
  }

  /**
   * Purchase AI Coach
   */
  async purchaseAICoach(): Promise<boolean> {
    try {
      if (this.state.hasAICoach) {
        Alert.alert('Already Purchased', 'You already own the AI Coach!');
        return true;
      }

      // Request purchase
      const purchase = await requestPurchase({
        sku: PRODUCTS.AI_COACH,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });

      // Verify and finish transaction
      if (purchase) {
        await finishTransaction({ purchase, isConsumable: false });
        
        // Update state
        this.state.hasAICoach = true;
        this.state.purchases.push(PRODUCTS.AI_COACH);
        await this.savePurchases();
        
        // Track first-time buyer
        const isFirstTime = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_TIME_BUYER);
        if (!isFirstTime) {
          await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME_BUYER, 'true');
          this.showThankYouMessage();
        }
        
        // Notify listeners
        this.notifyListeners();
        
        // Prompt to download AI model
        this.promptModelDownload();
        
        return true;
      }
      
      return false;
    } catch (error) {
      const err = error as PurchaseError;
      if (err.code === 'E_USER_CANCELLED') {
        // User cancelled, no need to show error
        return false;
      }
      
      Alert.alert(
        'Purchase Failed',
        'Unable to complete purchase. Please try again.'
      );
      return false;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<void> {
    try {
      const purchases = await getAvailablePurchases();
      
      for (const purchase of purchases) {
        if (purchase.productId === PRODUCTS.AI_COACH) {
          this.state.hasAICoach = true;
          if (!this.state.purchases.includes(PRODUCTS.AI_COACH)) {
            this.state.purchases.push(PRODUCTS.AI_COACH);
          }
        }
        // Add other products as needed
      }
      
      await this.savePurchases();
      this.notifyListeners();
      
      if (this.state.hasAICoach && !this.state.isModelDownloaded) {
        this.promptModelDownload();
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
    }
  }

  /**
   * Show thank you message for first-time buyers
   */
  private showThankYouMessage(): void {
    Alert.alert(
      '🎉 Welcome to Chess Masters Club!',
      'Thank you for supporting the app! Your AI coach is ready to help you become a chess master.\n\nLet\'s download your personal AI coach!',
      [{ text: 'Download Now', onPress: () => this.downloadAIModel() }]
    );
  }

  /**
   * Prompt to download AI model
   */
  private promptModelDownload(): void {
    Alert.alert(
      '🧠 Download AI Coach',
      `Your purchase is complete! Now let's download your AI coach (1.5GB).\n\nMake sure you're on WiFi for the best experience.`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Download', onPress: () => this.downloadAIModel() },
      ]
    );
  }

  /**
   * Download AI model
   */
  async downloadAIModel(): Promise<void> {
    if (this.state.isModelDownloaded) {
      Alert.alert('Already Downloaded', 'AI model is already downloaded!');
      return;
    }

    if (!this.state.hasAICoach) {
      Alert.alert('Purchase Required', 'Please purchase AI Coach first.');
      return;
    }

    try {
      const modelPath = `${RNFS.DocumentDirectoryPath}/mistral-3b-chess.gguf`;
      
      // Start download
      this.downloadTask = RNFS.downloadFile({
        fromUrl: AI_MODEL_URL,
        toFile: modelPath,
        background: true,
        discretionary: true,
        cacheable: false,
        progressDivider: 1,
        begin: (res) => {
          console.log('Download started:', res);
        },
        progress: (res) => {
          const progress = res.bytesWritten / res.contentLength;
          this.state.downloadProgress = progress;
          this.notifyListeners();
        },
      });

      const result = await this.downloadTask.promise;
      
      if (result.statusCode === 200) {
        // Save model path
        await AsyncStorage.setItem(STORAGE_KEYS.AI_MODEL_PATH, modelPath);
        
        // Update state
        this.state.isModelDownloaded = true;
        this.state.downloadProgress = 1;
        this.notifyListeners();
        
        // Initialize AI
        await mistralChess.initialize('mistral-3b-chess', modelPath);
        
        Alert.alert(
          '✅ AI Coach Ready!',
          'Your AI coach is ready to help you improve your chess!',
          [{ text: 'Start Playing', onPress: () => {} }]
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Failed to download AI model:', error);
      Alert.alert(
        'Download Failed',
        'Unable to download AI model. Please check your connection and try again.'
      );
      this.state.downloadProgress = 0;
      this.notifyListeners();
    }
  }

  /**
   * Cancel download
   */
  cancelDownload(): void {
    if (this.downloadTask) {
      RNFS.stopDownload(this.downloadTask.jobId);
      this.downloadTask = undefined;
      this.state.downloadProgress = 0;
      this.notifyListeners();
    }
  }

  /**
   * Get current state
   */
  getState(): PremiumState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: PremiumState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Check if user has access to AI features
   */
  hasAIAccess(): boolean {
    return this.state.hasAICoach && this.state.isModelDownloaded;
  }

  /**
   * Get formatted file size
   */
  getModelSizeFormatted(): string {
    return '1.5 GB';
  }

  /**
   * Clean up
   */
  async cleanup(): Promise<void> {
    await endConnection();
    this.initialized = false;
  }
}

export const premiumService = new PremiumService();