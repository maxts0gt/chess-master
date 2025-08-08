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
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import { mistralChess } from './mistralService';
import { sha256 } from 'react-native-sha256';
import { modelManifest } from './modelManifestService';

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
  DOWNLOAD_PENDING: '@ChessApp:DownloadPending',
};

// Model download URL (you'll need to host this)
const AI_MODEL_URL = 'https://your-cdn.com/models/mistral-3b-chess-q4.gguf';
const AI_MODEL_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5GB
const AI_MODEL_SHA256 = 'REPLACE_WITH_REAL_SHA256';

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
      
      // Check for pending downloads
      await this.checkPendingDownload();
      
      // Listen for network changes
      this.setupNetworkListener();
      
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
    // Check network connection type
    this.checkNetworkAndPromptDownload();
  }
  
  /**
   * Check network type and show appropriate download prompt
   */
  private async checkNetworkAndPromptDownload(): Promise<void> {
    try {
      const connectionInfo = await NetInfo.fetch();
      const isWifi = connectionInfo.type === 'wifi';
      const isConnected = connectionInfo.isConnected;
      
      if (!isConnected) {
        Alert.alert(
          '📶 No Internet Connection',
          'Your purchase is complete! You can download the AI Coach (1.5GB) when you have an internet connection.\n\nThe app will remind you next time you\'re online.',
          [
            { text: 'OK', onPress: () => this.scheduleDownloadReminder() }
          ]
        );
        return;
      }
      
      if (!isWifi) {
        Alert.alert(
          '📱 Cellular Data Warning',
          'Your AI Coach is ready to download (1.5GB).\n\n⚠️ You\'re on cellular data. This large download may:\n• Use significant data allowance\n• Incur charges from your carrier\n• Take longer to complete\n\nWe recommend using WiFi.',
          [
            { text: 'Wait for WiFi', style: 'cancel', onPress: () => this.scheduleDownloadReminder() },
            { 
              text: 'Download Anyway', 
              style: 'destructive',
              onPress: () => this.confirmCellularDownload() 
            },
          ]
        );
      } else {
        Alert.alert(
          '✅ Ready to Download',
          'Great! You\'re on WiFi.\n\nYour AI Coach (1.5GB) is ready to download. This will take a few minutes depending on your connection speed.',
          [
            { text: 'Download Later', style: 'cancel', onPress: () => this.scheduleDownloadReminder() },
            { text: 'Download Now', onPress: () => this.downloadAIModel() },
          ]
        );
      }
    } catch (error) {
      // If we can't determine network type, show generic prompt
      Alert.alert(
        '🧠 Download AI Coach',
        `Your purchase is complete! Now let's download your AI coach (1.5GB).\n\n⚠️ Large download - WiFi recommended.`,
        [
          { text: 'Later', style: 'cancel', onPress: () => this.scheduleDownloadReminder() },
          { text: 'Download', onPress: () => this.downloadAIModel() },
        ]
      );
    }
  }
  
  /**
   * Confirm cellular download
   */
  private confirmCellularDownload(): void {
    Alert.alert(
      '⚠️ Confirm Cellular Download',
      'Are you sure you want to download 1.5GB over cellular data?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => this.scheduleDownloadReminder() },
        { text: 'Yes, Download', style: 'destructive', onPress: () => this.downloadAIModel() },
      ]
    );
  }
  
  /**
   * Schedule a reminder to download later
   */
  private async scheduleDownloadReminder(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOAD_PENDING, 'true');
    // The app will check this on next launch or when network changes
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
      const target = await modelManifest.chooseModel(true);
      const modelPath = `${RNFS.DocumentDirectoryPath}/${target.name}.gguf`;
      
      // Ensure enough free space (size + 1GB headroom)
      const fsInfo = await RNFS.getFSInfo();
      if (fsInfo.freeSpace < target.size_bytes + 1 * 1024 * 1024 * 1024) {
        Alert.alert('Not Enough Space', 'Please free up storage to download the AI model.');
        return;
      }

      // Fresh download using RNFS
      this.downloadTask = RNFS.downloadFile({
        fromUrl: target.url,
        toFile: modelPath,
        background: true,
        discretionary: true,
        cacheable: false,
        progressDivider: 1,
        begin: () => {},
        progress: (res) => {
          const progress = res.bytesWritten / res.contentLength;
          this.state.downloadProgress = progress;
          this.notifyListeners();
        },
      });
      const result = await this.downloadTask.promise;
      if (!(result.statusCode === 200)) throw new Error('Download failed');

      // Verify checksum
      if (target.sha256 && target.sha256.length > 10) {
        try {
          const fileHash = (RNFS as any).hash ? await (RNFS as any).hash(modelPath, 'sha256') : await sha256(await RNFS.readFile(modelPath, 'base64'));
          if (fileHash.toLowerCase() !== target.sha256.toLowerCase()) {
            await RNFS.unlink(modelPath);
            throw new Error('Checksum mismatch');
          }
        } catch (e) {
          Alert.alert('Checksum Failed', 'Model file failed verification. Please retry.');
          this.state.downloadProgress = 0;
          this.notifyListeners();
          return;
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.AI_MODEL_PATH, modelPath);
      this.state.isModelDownloaded = true;
      this.state.downloadProgress = 1;
      this.notifyListeners();
      await mistralChess.initialize('mistral-3b-chess', modelPath);
      Alert.alert('✅ AI Coach Ready!', 'Your AI coach is ready to help you improve your chess!');
    } catch (error) {
      console.error('Failed to download AI model:', error);
      Alert.alert('Download Failed', 'Unable to download AI model. Please check your connection and try again.');
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
   * Check for pending downloads
   */
  private async checkPendingDownload(): Promise<void> {
    const isPending = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOAD_PENDING);
    
    if (isPending === 'true' && this.state.hasAICoach && !this.state.isModelDownloaded) {
      // Check if we're on WiFi now
      const connectionInfo = await NetInfo.fetch();
      if (connectionInfo.type === 'wifi' && connectionInfo.isConnected) {
        setTimeout(() => {
          Alert.alert(
            '📶 WiFi Connected!',
            'You\'re now on WiFi. Would you like to download your AI Coach (1.5GB)?',
            [
              { text: 'Not Now', style: 'cancel' },
              { 
                text: 'Download', 
                onPress: async () => {
                  await AsyncStorage.removeItem(STORAGE_KEYS.DOWNLOAD_PENDING);
                  this.downloadAIModel();
                }
              },
            ]
          );
        }, 2000); // Delay to not overwhelm user on app launch
      }
    }
  }
  
  /**
   * Setup network listener for download reminders
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(async (state) => {
      const isPending = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOAD_PENDING);
      
      if (isPending === 'true' && 
          state.type === 'wifi' && 
          state.isConnected && 
          this.state.hasAICoach && 
          !this.state.isModelDownloaded) {
        
        Alert.alert(
          '📶 WiFi Available',
          'Great! You\'re connected to WiFi. Download your AI Coach now?',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Download Now', 
              onPress: async () => {
                await AsyncStorage.removeItem(STORAGE_KEYS.DOWNLOAD_PENDING);
                this.downloadAIModel();
              }
            },
          ]
        );
      }
    });
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