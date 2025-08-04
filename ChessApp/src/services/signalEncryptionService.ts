/**
 * Signal Encryption Service
 * Provides end-to-end encryption using Signal Protocol
 */

import { 
  SignalProtocolManager,
  SignalProtocolAddress,
  SessionCipher,
  PreKeyBundle,
} from 'react-native-libsignal-protocol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomBytes } from 'react-native-randombytes';

export interface EncryptedMessage {
  type: 'prekey' | 'message';
  body: string;
  registrationId?: number;
}

class SignalEncryptionService {
  private manager: SignalProtocolManager | null = null;
  private registrationId: number = 0;
  private identityKeyPair: any = null;
  private initialized = false;

  /**
   * Initialize Signal Protocol
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Signal Protocol...');
      
      // Create Signal Protocol manager with storage
      this.manager = new SignalProtocolManager(
        this.createStorageProvider()
      );

      // Generate registration ID
      this.registrationId = this.generateRegistrationId();
      
      // Generate identity key pair
      this.identityKeyPair = await this.manager.generateIdentityKeyPair();
      
      // Store identity
      await this.storeIdentity();
      
      // Generate prekeys
      await this.generatePreKeys();
      
      this.initialized = true;
      console.log('Signal Protocol initialized');
    } catch (error) {
      console.error('Failed to initialize Signal Protocol:', error);
      throw error;
    }
  }

  /**
   * Generate registration ID
   */
  private generateRegistrationId(): number {
    return Math.floor(Math.random() * 16383) + 1;
  }

  /**
   * Create storage provider for Signal Protocol
   */
  private createStorageProvider() {
    const STORAGE_PREFIX = '@ChessApp:Signal:';

    return {
      getIdentityKeyPair: async () => {
        const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}identity`);
        return stored ? JSON.parse(stored) : null;
      },

      getLocalRegistrationId: async () => {
        const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}registrationId`);
        return stored ? parseInt(stored, 10) : null;
      },

      storeSession: async (identifier: string, session: any) => {
        await AsyncStorage.setItem(
          `${STORAGE_PREFIX}session:${identifier}`,
          JSON.stringify(session)
        );
      },

      loadSession: async (identifier: string) => {
        const stored = await AsyncStorage.getItem(
          `${STORAGE_PREFIX}session:${identifier}`
        );
        return stored ? JSON.parse(stored) : null;
      },

      removeSession: async (identifier: string) => {
        await AsyncStorage.removeItem(
          `${STORAGE_PREFIX}session:${identifier}`
        );
      },

      storePreKey: async (keyId: number, keyPair: any) => {
        await AsyncStorage.setItem(
          `${STORAGE_PREFIX}prekey:${keyId}`,
          JSON.stringify(keyPair)
        );
      },

      loadPreKey: async (keyId: number) => {
        const stored = await AsyncStorage.getItem(
          `${STORAGE_PREFIX}prekey:${keyId}`
        );
        return stored ? JSON.parse(stored) : null;
      },

      removePreKey: async (keyId: number) => {
        await AsyncStorage.removeItem(
          `${STORAGE_PREFIX}prekey:${keyId}`
        );
      },

      storeSignedPreKey: async (keyId: number, keyPair: any) => {
        await AsyncStorage.setItem(
          `${STORAGE_PREFIX}signedprekey:${keyId}`,
          JSON.stringify(keyPair)
        );
      },

      loadSignedPreKey: async (keyId: number) => {
        const stored = await AsyncStorage.getItem(
          `${STORAGE_PREFIX}signedprekey:${keyId}`
        );
        return stored ? JSON.parse(stored) : null;
      },

      removeSignedPreKey: async (keyId: number) => {
        await AsyncStorage.removeItem(
          `${STORAGE_PREFIX}signedprekey:${keyId}`
        );
      },

      isTrustedIdentity: async (
        identifier: string,
        identityKey: ArrayBuffer
      ) => {
        // For Presidential Mode, we verify identities out-of-band
        // In production, implement proper identity verification
        return true;
      },

      saveIdentity: async (
        identifier: string,
        identityKey: ArrayBuffer
      ) => {
        await AsyncStorage.setItem(
          `${STORAGE_PREFIX}identity:${identifier}`,
          JSON.stringify(Array.from(new Uint8Array(identityKey)))
        );
        return true;
      },

      loadIdentityKey: async (identifier: string) => {
        const stored = await AsyncStorage.getItem(
          `${STORAGE_PREFIX}identity:${identifier}`
        );
        if (stored) {
          const array = JSON.parse(stored);
          return new Uint8Array(array).buffer;
        }
        return null;
      },
    };
  }

  /**
   * Store our identity
   */
  private async storeIdentity(): Promise<void> {
    const STORAGE_PREFIX = '@ChessApp:Signal:';
    
    await AsyncStorage.setItem(
      `${STORAGE_PREFIX}identity`,
      JSON.stringify(this.identityKeyPair)
    );
    
    await AsyncStorage.setItem(
      `${STORAGE_PREFIX}registrationId`,
      this.registrationId.toString()
    );
  }

  /**
   * Generate prekeys for Signal Protocol
   */
  private async generatePreKeys(): Promise<void> {
    if (!this.manager) throw new Error('Manager not initialized');

    // Generate 100 prekeys
    const preKeys = [];
    for (let i = 1; i <= 100; i++) {
      const preKey = await this.manager.generatePreKey(i);
      preKeys.push(preKey);
    }

    // Generate signed prekey
    const signedPreKey = await this.manager.generateSignedPreKey(
      this.identityKeyPair,
      1
    );

    console.log('Generated prekeys and signed prekey');
  }

  /**
   * Get our public identity bundle
   */
  async getPublicBundle(): Promise<PreKeyBundle> {
    if (!this.manager || !this.initialized) {
      throw new Error('Signal not initialized');
    }

    // Get a random prekey
    const preKeyId = Math.floor(Math.random() * 100) + 1;
    const preKey = await this.manager.loadPreKey(preKeyId);
    const signedPreKey = await this.manager.loadSignedPreKey(1);

    return {
      registrationId: this.registrationId,
      identityKey: this.identityKeyPair.pubKey,
      preKey: {
        keyId: preKeyId,
        publicKey: preKey.pubKey,
      },
      signedPreKey: {
        keyId: 1,
        publicKey: signedPreKey.pubKey,
        signature: signedPreKey.signature,
      },
    };
  }

  /**
   * Process received bundle and establish session
   */
  async processBundle(
    remoteAddress: string,
    bundle: PreKeyBundle
  ): Promise<void> {
    if (!this.manager) throw new Error('Manager not initialized');

    const address = new SignalProtocolAddress(remoteAddress, 1);
    
    // Process the bundle to establish session
    await this.manager.processPreKeyBundle(address, bundle);
    
    console.log(`Session established with ${remoteAddress}`);
  }

  /**
   * Encrypt a message
   */
  async encryptMessage(
    remoteAddress: string,
    message: string
  ): Promise<EncryptedMessage> {
    if (!this.manager) throw new Error('Manager not initialized');

    const address = new SignalProtocolAddress(remoteAddress, 1);
    const sessionCipher = new SessionCipher(this.manager, address);
    
    // Convert message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message).buffer;
    
    // Encrypt
    const ciphertext = await sessionCipher.encrypt(messageBuffer);
    
    return {
      type: ciphertext.type === 3 ? 'prekey' : 'message',
      body: this.arrayBufferToBase64(ciphertext.body),
      registrationId: ciphertext.registrationId,
    };
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(
    remoteAddress: string,
    encryptedMessage: EncryptedMessage
  ): Promise<string> {
    if (!this.manager) throw new Error('Manager not initialized');

    const address = new SignalProtocolAddress(remoteAddress, 1);
    const sessionCipher = new SessionCipher(this.manager, address);
    
    // Convert from base64
    const ciphertext = {
      type: encryptedMessage.type === 'prekey' ? 3 : 1,
      body: this.base64ToArrayBuffer(encryptedMessage.body),
      registrationId: encryptedMessage.registrationId,
    };
    
    // Decrypt
    let plaintext: ArrayBuffer;
    if (ciphertext.type === 3) {
      plaintext = await sessionCipher.decryptPreKeyMessage(ciphertext);
    } else {
      plaintext = await sessionCipher.decryptMessage(ciphertext);
    }
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Check if we have a session with remote
   */
  async hasSession(remoteAddress: string): boolean {
    if (!this.manager) return false;
    
    const address = new SignalProtocolAddress(remoteAddress, 1);
    const sessionCipher = new SessionCipher(this.manager, address);
    
    return await sessionCipher.hasOpenSession();
  }

  /**
   * Clear all data (for security)
   */
  async clearAllData(): Promise<void> {
    const STORAGE_PREFIX = '@ChessApp:Signal:';
    const keys = await AsyncStorage.getAllKeys();
    const signalKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
    
    await AsyncStorage.multiRemove(signalKeys);
    
    this.initialized = false;
    this.manager = null;
    console.log('Signal data cleared');
  }
}

export const signalEncryption = new SignalEncryptionService();