/**
 * Stockfish Chess Engine Service
 * 
 * World's strongest open-source chess engine
 * Provides grandmaster-level analysis in <200ms per move
 */

import { offlineStockfish } from './offlineStockfishService';

interface EngineOptions {
  threads?: number;
  hash?: number;
  multiPV?: number;
  depth?: number;
}

class StockfishService {
  private initialized = false;
  private currentDepth = 12; // Default depth for <200ms response
  private difficulty: 'beginner' | 'intermediate' | 'expert' = 'expert';

  /**
   * Initialize Stockfish engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Stockfish engine...');
      
      // Initialize the WASM worker
      await offlineStockfish.initialize();
      
      this.initialized = true;
      console.log('Stockfish initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      // Don't throw - app should work even without engine
      this.initialized = false;
    }
  }

  /**
   * Get best move for a position
   * @param fen - Current position in FEN notation
   * @param options - Engine options
   * @returns Best move in UCI notation (e.g., "e2e4")
   */
  async getBestMove(fen: string, options?: EngineOptions): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
      
      // If still not initialized, return a random legal move
      if (!this.initialized) {
        return this.getRandomMove(fen);
      }
    }

    try {
      const depth = options?.depth || this.currentDepth;
      const analysis = await offlineStockfish.analyzePosition(fen, { depth });
      const move = analysis.bestMove || '';
      return move;
    } catch (error) {
      console.error('Stockfish error:', error);
      // Fallback to random move
      return this.getRandomMove(fen);
    }
  }

  /**
   * Get a random legal move (fallback when Stockfish fails)
   */
  getRandomMove(fen: string): string {
    try {
      const { Chess } = require('chess.js');
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      
      if (moves.length === 0) {
        throw new Error('No legal moves');
      }
      
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return randomMove.from + randomMove.to + (randomMove.promotion || '');
    } catch (error) {
      console.error('Failed to generate random move:', error);
      return 'e2e4'; // Default opening move
    }
  }

  /**
   * Analyze position and get evaluation
   * @param fen - Position to analyze
   * @param options - Analysis options
   */
  async analyze(fen: string, options?: EngineOptions): Promise<{
    evaluation: number;
    bestMove: string;
    pv: string[];
  }> {
    if (!this.initialized) {
      await this.initialize();
      
      if (!this.initialized) {
        // Return basic analysis
        const bestMove = await this.getBestMove(fen);
        return {
          evaluation: 0,
          bestMove,
          pv: [bestMove]
        };
      }
    }

    try {
      const lines = await offlineStockfish.getTopMoves(fen, options?.multiPV || 1, options?.depth || 20);
      
      if (lines.length > 0) {
        const topLine = lines[0];
        return {
          evaluation: topLine.evaluation || 0,
          bestMove: topLine.move || '',
          pv: topLine.line || []
        };
      }
      
      // Fallback if no lines
      const bestMove = await this.getBestMove(fen, options);
      return {
        evaluation: 0,
        bestMove,
        pv: [bestMove]
      };
    } catch (error) {
      console.error('Analysis error:', error);
      const bestMove = await this.getBestMove(fen, options);
      return {
        evaluation: 0,
        bestMove,
        pv: [bestMove]
      };
    }
  }

  /**
   * Set engine strength for different difficulty levels
   */
  async setDifficulty(level: 'beginner' | 'intermediate' | 'expert') {
    this.difficulty = level;
    
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.initialized) {
      try {
        switch (level) {
          case 'beginner':
            this.currentDepth = 6;
            // Skill level not supported in offlineStockfish; adjust depth only
            break;
          case 'intermediate':
            this.currentDepth = 10;
            // Skill level not supported in offlineStockfish
            break;
          case 'expert':
            this.currentDepth = 12;
            // Skill level not supported in offlineStockfish
            break;
        }
      } catch (error) {
        console.error('Failed to set difficulty:', error);
      }
    }
  }

  /**
   * Stop current calculation
   */
  async stop() {
    if (this.initialized) {
      try {
        // no-op for offlineStockfish
      } catch (error) {
        console.error('Failed to stop engine:', error);
      }
    }
  }

  /**
   * Cleanup resources
   */
  async terminate() {
    if (this.initialized) {
      try {
        // no-op for offlineStockfish
      } catch (error) {
        console.error('Failed to terminate engine:', error);
      }
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const stockfish = new StockfishService();