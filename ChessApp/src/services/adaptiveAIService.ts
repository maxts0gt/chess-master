/**
 * Adaptive AI Service
 * Intelligent AI that learns and grows with the player
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { stockfish } from './stockfishService';
import { coach } from './coachService';

const STORAGE_KEY = '@ChessApp:PlayerStats';

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentLevel: number; // 1-20
  streak: number;
  lastPlayed: Date;
  totalMoves: number;
  blunders: number;
  brilliantMoves: number;
}

export interface GameResult {
  result: 'win' | 'loss' | 'draw';
  moves: number;
  duration: number;
  playerColor: 'white' | 'black';
  finalPosition: string;
}

class AdaptiveAIService {
  private stats: PlayerStats = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentLevel: 5, // Start at beginner-intermediate
    streak: 0,
    lastPlayed: new Date(),
    totalMoves: 0,
    blunders: 0,
    brilliantMoves: 0,
  };

  private readonly levelSettings = {
    // Skill level 1-20 mapped to Stockfish settings
    1: { depth: 1, skillLevel: 0, moveTime: 10 },
    2: { depth: 2, skillLevel: 1, moveTime: 20 },
    3: { depth: 3, skillLevel: 2, moveTime: 50 },
    4: { depth: 4, skillLevel: 3, moveTime: 100 },
    5: { depth: 5, skillLevel: 4, moveTime: 150 },
    6: { depth: 6, skillLevel: 5, moveTime: 200 },
    7: { depth: 7, skillLevel: 6, moveTime: 250 },
    8: { depth: 8, skillLevel: 7, moveTime: 300 },
    9: { depth: 8, skillLevel: 8, moveTime: 350 },
    10: { depth: 9, skillLevel: 9, moveTime: 400 },
    11: { depth: 10, skillLevel: 10, moveTime: 450 },
    12: { depth: 10, skillLevel: 11, moveTime: 500 },
    13: { depth: 11, skillLevel: 12, moveTime: 600 },
    14: { depth: 11, skillLevel: 13, moveTime: 700 },
    15: { depth: 12, skillLevel: 14, moveTime: 800 },
    16: { depth: 12, skillLevel: 15, moveTime: 900 },
    17: { depth: 13, skillLevel: 16, moveTime: 1000 },
    18: { depth: 14, skillLevel: 17, moveTime: 1200 },
    19: { depth: 15, skillLevel: 18, moveTime: 1500 },
    20: { depth: 16, skillLevel: 20, moveTime: 2000 },
  };

  /**
   * Initialize and load player stats
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.stats = JSON.parse(stored);
        this.stats.lastPlayed = new Date(this.stats.lastPlayed);
      }
      
      // Apply current difficulty to Stockfish
      await this.applyDifficulty();
      
      console.log('Adaptive AI initialized:', {
        level: this.stats.currentLevel,
        winRate: this.getWinRate(),
      });
    } catch (error) {
      console.error('Failed to load player stats:', error);
    }
  }

  /**
   * Get current difficulty settings
   */
  getCurrentSettings() {
    return this.levelSettings[this.stats.currentLevel as keyof typeof this.levelSettings] 
      || this.levelSettings[5];
  }

  /**
   * Apply difficulty settings to Stockfish
   */
  private async applyDifficulty(): Promise<void> {
    const settings = this.getCurrentSettings();
    
    // Map to our existing difficulty levels
    let difficulty: 'beginner' | 'intermediate' | 'expert';
    if (this.stats.currentLevel <= 7) {
      difficulty = 'beginner';
    } else if (this.stats.currentLevel <= 14) {
      difficulty = 'intermediate';
    } else {
      difficulty = 'expert';
    }
    
    await stockfish.setDifficulty(difficulty);
  }

  /**
   * Record game result and adjust difficulty
   */
  async recordGame(result: GameResult): Promise<void> {
    // Update stats
    this.stats.gamesPlayed++;
    this.stats.totalMoves += result.moves;
    
    switch (result.result) {
      case 'win':
        this.stats.wins++;
        this.stats.streak = Math.max(0, this.stats.streak) + 1;
        break;
      case 'loss':
        this.stats.losses++;
        this.stats.streak = Math.min(0, this.stats.streak) - 1;
        break;
      case 'draw':
        this.stats.draws++;
        this.stats.streak = 0;
        break;
    }
    
    this.stats.lastPlayed = new Date();
    
    // Adjust difficulty based on performance
    await this.adjustDifficulty();
    
    // Save stats
    await this.saveStats();
    
    // Log progress
    console.log('Game recorded:', {
      result: result.result,
      newLevel: this.stats.currentLevel,
      winRate: this.getWinRate(),
      streak: this.stats.streak,
    });
  }

  /**
   * Intelligent difficulty adjustment
   */
  private async adjustDifficulty(): Promise<void> {
    const winRate = this.getWinRate();
    const recentGames = Math.min(10, this.stats.gamesPlayed);
    
    // Don't adjust on first few games
    if (this.stats.gamesPlayed < 3) return;
    
    // Check win streak for rapid adjustment
    if (this.stats.streak >= 3) {
      // Won 3+ in a row - bump up difficulty
      this.stats.currentLevel = Math.min(20, this.stats.currentLevel + 2);
      this.stats.streak = 0; // Reset streak
    } else if (this.stats.streak <= -3) {
      // Lost 3+ in a row - reduce difficulty
      this.stats.currentLevel = Math.max(1, this.stats.currentLevel - 2);
      this.stats.streak = 0; // Reset streak
    } else {
      // Gradual adjustment based on win rate
      if (winRate > 0.7 && this.stats.gamesPlayed >= recentGames) {
        // Winning too much - increase difficulty
        this.stats.currentLevel = Math.min(20, this.stats.currentLevel + 1);
      } else if (winRate < 0.3 && this.stats.gamesPlayed >= recentGames) {
        // Struggling - decrease difficulty
        this.stats.currentLevel = Math.max(1, this.stats.currentLevel - 1);
      }
    }
    
    // Apply new difficulty
    await this.applyDifficulty();
  }

  /**
   * Get tailored AI move with personality
   */
  async getAdaptiveMove(fen: string): Promise<string> {
    const settings = this.getCurrentSettings();
    
    // Add some personality based on level
    if (this.stats.currentLevel <= 5) {
      // Beginner AI - might make intentional mistakes
      if (Math.random() < 0.1) {
        // 10% chance of a random move
        return stockfish.getRandomMove(fen);
      }
    }
    
    // Get best move with current settings
    const move = await stockfish.getBestMove(fen, {
      depth: settings.depth,
    });
    
    return move;
  }

  /**
   * Get personalized coaching based on level
   */
  async getPersonalizedCoaching(fen: string, lastMove: string | null): Promise<string[]> {
    // Provide 3 short tips based on level; fallback to coachService tips
    try {
      const tips = await coach.getPositionTips(fen);
      return tips;
    } catch {
      return [
        'Control the center',
        'Develop pieces',
        'Ensure king safety',
      ];
    }
  }

  /**
   * Get win rate
   */
  getWinRate(): number {
    const totalGames = this.stats.wins + this.stats.losses;
    if (totalGames === 0) return 0.5;
    return this.stats.wins / totalGames;
  }

  /**
   * Get draw rate
   */
  getDrawRate(): number {
    if (this.stats.gamesPlayed === 0) return 0;
    return this.stats.draws / this.stats.gamesPlayed;
  }

  /**
   * Get level description
   */
  getLevelDescription(): string {
    const level = this.stats.currentLevel;
    if (level <= 5) return 'Beginner';
    if (level <= 10) return 'Intermediate';
    if (level <= 15) return 'Advanced';
    if (level <= 18) return 'Expert';
    return 'Master';
  }

  /**
   * Get player stats
   */
  getStats(): PlayerStats {
    return { ...this.stats };
  }

  /**
   * Get motivational message
   */
  getMotivationalMessage(): string {
    const winRate = this.getWinRate();
    const level = this.stats.currentLevel;
    
    if (this.stats.gamesPlayed === 0) {
      return "Welcome! Let's play your first game! 🎯";
    }
    
    if (winRate > 0.7) {
      return `Amazing! You're dominating at level ${level}! 🏆`;
    } else if (winRate > 0.5) {
      return `Great progress! You're winning ${Math.round(winRate * 100)}% of games! 📈`;
    } else if (winRate > 0.3) {
      return `Keep going! Every game makes you stronger! 💪`;
    } else {
      return `Don't give up! Chess mastery takes time! 🌟`;
    }
  }

  /**
   * Save stats to storage
   */
  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  /**
   * Reset stats (for testing or user request)
   */
  async resetStats(): Promise<void> {
    this.stats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentLevel: 5,
      streak: 0,
      lastPlayed: new Date(),
      totalMoves: 0,
      blunders: 0,
      brilliantMoves: 0,
    };
    
    await this.saveStats();
    await this.applyDifficulty();
  }
}

export const adaptiveAI = new AdaptiveAIService();