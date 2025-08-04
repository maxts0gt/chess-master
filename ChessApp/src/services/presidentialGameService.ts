/**
 * Presidential Game Service
 * Combines WebRTC, Signal encryption, and chess logic
 */

import { Chess } from 'chess.js';
import { webRTCService } from './webRTCService';
import { signalEncryption, EncryptedMessage } from './signalEncryptionService';
import { stockfish } from './stockfishService';

export interface GameMessage {
  type: 'move' | 'chat' | 'resign' | 'draw-offer' | 'signal-bundle';
  data: any;
  timestamp: number;
}

export interface PresidentialGameCallbacks {
  onMove: (move: string) => void;
  onChat: (message: string, from: 'local' | 'remote') => void;
  onGameEnd: (result: 'win' | 'lose' | 'draw') => void;
  onConnectionChange: (state: string) => void;
  onError: (error: Error) => void;
}

class PresidentialGameService {
  private chess = new Chess();
  private callbacks: PresidentialGameCallbacks | null = null;
  private remoteId: string = '';
  private isWhite = true;
  private gameStarted = false;
  
  /**
   * Initialize Presidential Mode game
   */
  async initialize(
    isHost: boolean,
    remoteId: string,
    callbacks: PresidentialGameCallbacks
  ): Promise<void> {
    this.callbacks = callbacks;
    this.remoteId = remoteId;
    this.isWhite = isHost; // Host plays white

    try {
      console.log('Initializing Presidential Mode...');
      
      // Initialize Signal encryption
      await signalEncryption.initialize();
      
      // Initialize WebRTC
      await webRTCService.initialize(isHost, {
        onMessage: this.handleP2PMessage.bind(this),
        onConnectionStateChange: (state) => {
          callbacks.onConnectionChange(state);
          if (state === 'connected') {
            this.onConnectionEstablished();
          }
        },
        onError: callbacks.onError,
      });
      
      console.log('Presidential Mode initialized');
    } catch (error) {
      console.error('Failed to initialize Presidential Mode:', error);
      throw error;
    }
  }

  /**
   * Handle incoming P2P messages
   */
  private async handleP2PMessage(message: string): Promise<void> {
    try {
      // Try to decrypt if it looks encrypted
      let decryptedMessage = message;
      try {
        const encrypted: EncryptedMessage = JSON.parse(message);
        if (encrypted.type && encrypted.body) {
          decryptedMessage = await signalEncryption.decryptMessage(
            this.remoteId,
            encrypted
          );
        }
      } catch {
        // Not encrypted, use as-is
      }

      const gameMessage: GameMessage = JSON.parse(decryptedMessage);
      
      switch (gameMessage.type) {
        case 'move':
          await this.handleRemoteMove(gameMessage.data);
          break;
        
        case 'chat':
          this.callbacks?.onChat(gameMessage.data, 'remote');
          break;
        
        case 'resign':
          this.handleResign(false);
          break;
        
        case 'draw-offer':
          this.handleDrawOffer();
          break;
        
        case 'signal-bundle':
          // Exchange Signal bundles for encryption
          await signalEncryption.processBundle(
            this.remoteId,
            gameMessage.data
          );
          break;
      }
    } catch (error) {
      console.error('Failed to handle P2P message:', error);
    }
  }

  /**
   * Connection established - exchange encryption keys
   */
  private async onConnectionEstablished(): Promise<void> {
    console.log('P2P connection established');
    
    // Exchange Signal bundles if no session exists
    if (!await signalEncryption.hasSession(this.remoteId)) {
      const bundle = await signalEncryption.getPublicBundle();
      await this.sendMessage({
        type: 'signal-bundle',
        data: bundle,
        timestamp: Date.now(),
      });
    }
    
    this.gameStarted = true;
  }

  /**
   * Make a move
   */
  async makeMove(move: any): Promise<boolean> {
    // Check if it's our turn
    const isOurTurn = (this.chess.turn() === 'w') === this.isWhite;
    if (!isOurTurn) {
      console.warn('Not our turn');
      return false;
    }

    try {
      // Validate move locally
      const result = this.chess.move(move);
      if (!result) {
        console.warn('Invalid move');
        return false;
      }

      // Send move to opponent
      await this.sendMessage({
        type: 'move',
        data: result.san,
        timestamp: Date.now(),
      });

      // Check game state
      this.checkGameState();
      
      return true;
    } catch (error) {
      console.error('Failed to make move:', error);
      return false;
    }
  }

  /**
   * Handle remote move
   */
  private async handleRemoteMove(moveSan: string): Promise<void> {
    try {
      // Validate move with Stockfish for anti-cheat
      const isLegal = await this.validateMoveWithStockfish(
        this.chess.fen(),
        moveSan
      );
      
      if (!isLegal) {
        console.error('Illegal move detected!');
        this.callbacks?.onError(new Error('Opponent made illegal move'));
        return;
      }

      // Apply move
      const result = this.chess.move(moveSan);
      if (result) {
        this.callbacks?.onMove(moveSan);
        this.checkGameState();
      }
    } catch (error) {
      console.error('Failed to handle remote move:', error);
    }
  }

  /**
   * Validate move with Stockfish (anti-cheat)
   */
  private async validateMoveWithStockfish(
    fen: string,
    moveSan: string
  ): Promise<boolean> {
    try {
      // Create temp chess instance
      const tempChess = new Chess(fen);
      const move = tempChess.move(moveSan);
      
      if (!move) return false;
      
      // For now, just check if it's a legal move
      // Could enhance to detect engine-like play patterns
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send encrypted message
   */
  private async sendMessage(message: GameMessage): Promise<void> {
    if (!webRTCService.isConnected()) {
      throw new Error('Not connected');
    }

    try {
      const messageStr = JSON.stringify(message);
      
      // Encrypt if we have a session
      if (await signalEncryption.hasSession(this.remoteId)) {
        const encrypted = await signalEncryption.encryptMessage(
          this.remoteId,
          messageStr
        );
        webRTCService.sendMessage(JSON.stringify(encrypted));
      } else {
        // Send unencrypted until Signal session established
        webRTCService.sendMessage(messageStr);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send chat message
   */
  async sendChat(message: string): Promise<void> {
    // Add to local chat
    this.callbacks?.onChat(message, 'local');
    
    // Send to opponent
    await this.sendMessage({
      type: 'chat',
      data: message,
      timestamp: Date.now(),
    });
  }

  /**
   * Check game state
   */
  private checkGameState(): void {
    if (this.chess.isCheckmate()) {
      // Current turn loses
      const weWon = (this.chess.turn() === 'w') !== this.isWhite;
      this.callbacks?.onGameEnd(weWon ? 'win' : 'lose');
    } else if (this.chess.isDraw()) {
      this.callbacks?.onGameEnd('draw');
    }
  }

  /**
   * Resign game
   */
  async resign(): Promise<void> {
    await this.sendMessage({
      type: 'resign',
      data: null,
      timestamp: Date.now(),
    });
    this.handleResign(true);
  }

  /**
   * Handle resignation
   */
  private handleResign(weResigned: boolean): void {
    this.callbacks?.onGameEnd(weResigned ? 'lose' : 'win');
    this.cleanup();
  }

  /**
   * Offer draw
   */
  async offerDraw(): Promise<void> {
    await this.sendMessage({
      type: 'draw-offer',
      data: null,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle draw offer
   */
  private handleDrawOffer(): void {
    // For now, auto-accept draws
    // In production, show UI for accept/decline
    this.callbacks?.onGameEnd('draw');
    this.cleanup();
  }

  /**
   * Get current FEN
   */
  getFen(): string {
    return this.chess.fen();
  }

  /**
   * Get PGN
   */
  getPgn(): string {
    return this.chess.pgn();
  }

  /**
   * Is it our turn?
   */
  isOurTurn(): boolean {
    return (this.chess.turn() === 'w') === this.isWhite;
  }

  /**
   * Clean up (with auto-burn)
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up Presidential game...');
    
    // Close P2P connection
    await webRTCService.close();
    
    // Clear encryption data (auto-burn)
    await signalEncryption.clearAllData();
    
    // Reset game
    this.chess.reset();
    this.gameStarted = false;
    
    console.log('Game data securely erased');
  }
}

export const presidentialGame = new PresidentialGameService();