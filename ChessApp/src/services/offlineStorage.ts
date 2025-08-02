import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PUZZLES_CACHE: 'chess_puzzles_cache',
  USER_PROGRESS: 'chess_user_progress',
  GAME_STATES: 'chess_game_states',
  AI_RESPONSES: 'chess_ai_responses',
  OFFLINE_QUEUE: 'chess_offline_queue',
  LAST_SYNC: 'chess_last_sync',
  USER_PREFERENCES: 'chess_user_preferences',
};

interface CachedPuzzle {
  id: number;
  fen: string;
  solution: string[];
  description: string;
  difficulty: string;
  theme: string;
  rating: number;
  cachedAt: number;
}

interface UserProgress {
  puzzlesSolved: number;
  totalScore: number;
  bestStreak: number;
  lastPlayed: number;
  statsPerMode: {
    [mode: string]: {
      gamesPlayed: number;
      bestScore: number;
      averageScore: number;
      totalTime: number;
    };
  };
}

interface OfflineAction {
  id: string;
  type: 'puzzle_completed' | 'game_saved' | 'progress_update';
  data: any;
  timestamp: number;
}

interface RecentlyShownPuzzles {
  puzzleIds: number[];
  maxSize: number;
}

class OfflineStorageService {
  private recentlyShownPuzzles: RecentlyShownPuzzles = {
    puzzleIds: [],
    maxSize: 10,
  };
  // Initialize offline storage
  async initialize(): Promise<void> {
    try {
      // Check if we have existing data
      const lastSync = await this.getLastSyncTime();
      if (!lastSync) {
        await this.setLastSyncTime(Date.now());
      }
      
      // Pre-load some puzzles if cache is empty
      const puzzles = await this.getCachedPuzzles();
      if (puzzles.length === 0) {
        await this.preloadDefaultPuzzles();
      }
    } catch (error) {
      console.error('Error initializing offline storage:', error);
    }
  }

  // Puzzle Management
  async cachePuzzles(puzzles: any[]): Promise<void> {
    try {
      const cachedPuzzles: CachedPuzzle[] = puzzles.map(puzzle => ({
        ...puzzle,
        cachedAt: Date.now(),
      }));
      
      const existing = await this.getCachedPuzzles();
      const merged = [...existing, ...cachedPuzzles];
      
      // Keep only the most recent 100 puzzles
      const sorted = merged.sort((a, b) => b.cachedAt - a.cachedAt);
      const limited = sorted.slice(0, 100);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PUZZLES_CACHE,
        JSON.stringify(limited)
      );
    } catch (error) {
      console.error('Error caching puzzles:', error);
    }
  }

  async getCachedPuzzles(): Promise<CachedPuzzle[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PUZZLES_CACHE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached puzzles:', error);
      return [];
    }
  }

  async getRandomPuzzle(difficulty?: string, avoidRecent: boolean = true): Promise<CachedPuzzle | null> {
    try {
      const puzzles = await this.getCachedPuzzles();
      let filtered = difficulty
        ? puzzles.filter(p => p.difficulty === difficulty)
        : puzzles;
      
      if (filtered.length === 0) return null;
      
      // Try to avoid recently shown puzzles
      if (avoidRecent && this.recentlyShownPuzzles.puzzleIds.length > 0) {
        const notRecentlyShown = filtered.filter(
          p => !this.recentlyShownPuzzles.puzzleIds.includes(p.id)
        );
        
        // Use non-recent puzzles if available
        if (notRecentlyShown.length > 0) {
          filtered = notRecentlyShown;
        } else {
          // All puzzles have been shown recently - clear history
          this.recentlyShownPuzzles.puzzleIds = [];
          console.log('All puzzles shown recently - resetting history');
        }
      }
      
      const randomIndex = Math.floor(Math.random() * filtered.length);
      const selectedPuzzle = filtered[randomIndex];
      
      // Add to recently shown
      if (selectedPuzzle && avoidRecent) {
        this.addToRecentlyShown(selectedPuzzle.id);
      }
      
      return selectedPuzzle;
    } catch (error) {
      console.error('Error getting random puzzle:', error);
      return null;
    }
  }
  
  private addToRecentlyShown(puzzleId: number): void {
    // Remove if already in list (to move to end)
    this.recentlyShownPuzzles.puzzleIds = this.recentlyShownPuzzles.puzzleIds.filter(
      id => id !== puzzleId
    );
    
    // Add to end
    this.recentlyShownPuzzles.puzzleIds.push(puzzleId);
    
    // Keep only last N puzzles
    if (this.recentlyShownPuzzles.puzzleIds.length > this.recentlyShownPuzzles.maxSize) {
      this.recentlyShownPuzzles.puzzleIds.shift();
    }
  }

  // User Progress Management
  async saveUserProgress(progress: Partial<UserProgress>): Promise<void> {
    try {
      const existing = await this.getUserProgress();
      const updated = { ...existing, ...progress };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PROGRESS,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }

  async getUserProgress(): Promise<UserProgress> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROGRESS);
      return data ? JSON.parse(data) : this.getDefaultProgress();
    } catch (error) {
      console.error('Error getting user progress:', error);
      return this.getDefaultProgress();
    }
  }

  private getDefaultProgress(): UserProgress {
    return {
      puzzlesSolved: 0,
      totalScore: 0,
      bestStreak: 0,
      lastPlayed: Date.now(),
      statsPerMode: {
        classic: {
          gamesPlayed: 0,
          bestScore: 0,
          averageScore: 0,
          totalTime: 0,
        },
        storm: {
          gamesPlayed: 0,
          bestScore: 0,
          averageScore: 0,
          totalTime: 0,
        },
        streak: {
          gamesPlayed: 0,
          bestScore: 0,
          averageScore: 0,
          totalTime: 0,
        },
      },
    };
  }

  // Offline Queue Management
  async addToOfflineQueue(action: Omit<OfflineAction, 'id'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const newAction: OfflineAction = {
        ...action,
        id: `${Date.now()}_${Math.random()}`,
      };
      
      queue.push(newAction);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_QUEUE,
        JSON.stringify(queue)
      );
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }

  // Sync Management
  async setLastSyncTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        timestamp.toString()
      );
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }

  async getLastSyncTime(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // User Preferences
  async saveUserPreferences(preferences: any): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  async getUserPreferences(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  // Pre-load default puzzles for offline use
  private async preloadDefaultPuzzles(): Promise<void> {
    const defaultPuzzles: CachedPuzzle[] = [
      // Beginner puzzles (10)
      {
        id: 1001,
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        solution: ['Bxf7+', 'Kxf7', 'Ng5+'],
        description: 'White to play and win material',
        difficulty: 'Beginner',
        theme: 'Fork',
        rating: 1000,
        cachedAt: Date.now(),
      },
      {
        id: 1002,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        solution: ['Nf6', 'd3', 'Bg4'],
        description: 'Black to develop with tempo',
        difficulty: 'Beginner',
        theme: 'Development',
        rating: 1100,
        cachedAt: Date.now(),
      },
      {
        id: 1003,
        fen: 'r3k2r/ppp2ppp/2n1bn2/2bpq3/3NP3/2P1BN2/PPP2PPP/R2QKB1R w KQkq - 0 1',
        solution: ['Ndxe5'],
        description: 'White wins a pawn',
        difficulty: 'Beginner',
        theme: 'Hanging Piece',
        rating: 1000,
        cachedAt: Date.now(),
      },
      {
        id: 1004,
        fen: 'rnbqkb1r/pp3ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 1',
        solution: ['cxd5', 'exd5', 'Nxd5'],
        description: 'Win a pawn in the center',
        difficulty: 'Beginner',
        theme: 'Pawn Structure',
        rating: 1100,
        cachedAt: Date.now(),
      },
      {
        id: 1005,
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
        solution: ['Bxf7+'],
        description: 'Fork the king and rook',
        difficulty: 'Beginner',
        theme: 'Fork',
        rating: 1200,
        cachedAt: Date.now(),
      },
      {
        id: 1006,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        solution: ['Nc6', 'Bb5', 'a6'],
        description: 'Develop with tempo',
        difficulty: 'Beginner',
        theme: 'Opening',
        rating: 1000,
        cachedAt: Date.now(),
      },
      {
        id: 1007,
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 1',
        solution: ['Nd4'],
        description: 'Attack the queen with tempo',
        difficulty: 'Beginner',
        theme: 'Tempo',
        rating: 1100,
        cachedAt: Date.now(),
      },
      {
        id: 1008,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1',
        solution: ['exd4', 'Nxd4', 'Nf6'],
        description: 'Accept the gambit and develop',
        difficulty: 'Beginner',
        theme: 'Gambit',
        rating: 1200,
        cachedAt: Date.now(),
      },
      {
        id: 1009,
        fen: '8/8/8/2k5/8/3K4/1Q6/8 w - - 0 1',
        solution: ['Qb5+'],
        description: 'Checkmate in one',
        difficulty: 'Beginner',
        theme: 'Checkmate',
        rating: 900,
        cachedAt: Date.now(),
      },
      {
        id: 1010,
        fen: 'r3k2r/ppp2ppp/2nqbn2/3p4/3P4/2N1BN2/PPP2PPP/R2QKB1R w KQkq - 0 1',
        solution: ['Nxd5'],
        description: 'Win the hanging pawn',
        difficulty: 'Beginner',
        theme: 'Hanging Piece',
        rating: 1000,
        cachedAt: Date.now(),
      },
      
      // Intermediate puzzles (10)
      {
        id: 2001,
        fen: '2kr1b1r/pp1npppp/2p1bn2/8/3PN3/2N1B3/PPP1BPPP/R3K2R w KQ - 0 1',
        solution: ['Nxf6+', 'gxf6', 'Bh5'],
        description: 'White to gain a positional advantage',
        difficulty: 'Intermediate',
        theme: 'Positional',
        rating: 1400,
        cachedAt: Date.now(),
      },
      {
        id: 2002,
        fen: 'r2qkb1r/1b1n1ppp/p3pn2/1p6/3NP3/2N1BP2/PPP3PP/R2QKB1R w KQkq - 0 1',
        solution: ['Ndxb5', 'axb5', 'Nxb5'],
        description: 'White to win a pawn',
        difficulty: 'Intermediate',
        theme: 'Tactics',
        rating: 1500,
        cachedAt: Date.now(),
      },
      {
        id: 2003,
        fen: 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PPQ1BPPP/R1B1K2R w KQ - 0 1',
        solution: ['cxd5', 'exd5', 'Nxd5', 'Nxd5', 'Bxh7+'],
        description: 'Greek gift sacrifice',
        difficulty: 'Intermediate',
        theme: 'Sacrifice',
        rating: 1600,
        cachedAt: Date.now(),
      },
      {
        id: 2004,
        fen: 'r2q1rk1/ppp2ppp/2np1n2/2b1p1B1/2B1P1b1/3P1N2/PPP2PPP/RN1Q1RK1 w - - 0 1',
        solution: ['Bxf6', 'Bxf3', 'Bxd8'],
        description: 'Win the exchange',
        difficulty: 'Intermediate',
        theme: 'Exchange',
        rating: 1500,
        cachedAt: Date.now(),
      },
      {
        id: 2005,
        fen: 'r1bqk2r/pp1nbppp/2n1p3/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 1',
        solution: ['cxd5', 'exd5', 'Nxd5'],
        description: 'Isolated pawn weakness',
        difficulty: 'Intermediate',
        theme: 'Pawn Structure',
        rating: 1400,
        cachedAt: Date.now(),
      },
      {
        id: 2006,
        fen: 'r2qkb1r/pp1bpppp/2np1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 0 1',
        solution: ['Ndb5', 'Rc8', 'Nxd6+'],
        description: 'Knight outpost exploitation',
        difficulty: 'Intermediate',
        theme: 'Outpost',
        rating: 1600,
        cachedAt: Date.now(),
      },
      {
        id: 2007,
        fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
        solution: ['Bxf7+', 'Kxf7', 'Ng5+', 'Kg8', 'Qf3'],
        description: 'Attacking the exposed king',
        difficulty: 'Intermediate',
        theme: 'King Safety',
        rating: 1700,
        cachedAt: Date.now(),
      },
      {
        id: 2008,
        fen: 'r3k2r/ppp1qppp/2np1n2/2b1p1B1/2B1P1b1/3P1N2/PPP2PPP/RN1Q1RK1 b kq - 0 1',
        solution: ['Bxf3', 'gxf3', 'Nh5'],
        description: 'Weakening the kingside',
        difficulty: 'Intermediate',
        theme: 'Attack',
        rating: 1500,
        cachedAt: Date.now(),
      },
      {
        id: 2009,
        fen: 'r1bqr1k1/pp3pbp/2np1np1/4p3/2P1P3/2N1BN1P/PP3PP1/R2QKB1R w KQ - 0 1',
        solution: ['Nd5', 'Nxd5', 'cxd5'],
        description: 'Creating a passed pawn',
        difficulty: 'Intermediate',
        theme: 'Endgame',
        rating: 1600,
        cachedAt: Date.now(),
      },
      {
        id: 2010,
        fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 1',
        solution: ['cxd5', 'Bxc3+', 'bxc3', 'exd5'],
        description: 'Accepting doubled pawns for activity',
        difficulty: 'Intermediate',
        theme: 'Compensation',
        rating: 1700,
        cachedAt: Date.now(),
      },
      
      // Advanced puzzles (10)
      {
        id: 3001,
        fen: 'r2q1rk1/1b1nbppp/pp2pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKB1R w KQ - 0 1',
        solution: ['c5', 'bxc5', 'Nxd5'],
        description: 'White to break through in the center',
        difficulty: 'Advanced',
        theme: 'Breakthrough',
        rating: 1800,
        cachedAt: Date.now(),
      },
      {
        id: 3002,
        fen: 'r2q1rk1/1b2bppp/p1n1pn2/1p6/3P4/1BN1PN2/PP3PPP/R1BQ1RK1 w - - 0 1',
        solution: ['e4', 'Bb4', 'e5', 'Bxc3', 'exf6', 'Bxf6', 'Bg5'],
        description: 'Central breakthrough with tactics',
        difficulty: 'Advanced',
        theme: 'Central Attack',
        rating: 1900,
        cachedAt: Date.now(),
      },
      {
        id: 3003,
        fen: 'r1b2rk1/2q1bppp/p1n1pn2/1p2N3/4P3/1BN5/PPP2PPP/R1BQ1RK1 w - - 0 1',
        solution: ['Nxf7', 'Rxf7', 'e5', 'Nd5', 'Ne4'],
        description: 'Sacrifice for dominating position',
        difficulty: 'Advanced',
        theme: 'Positional Sacrifice',
        rating: 2000,
        cachedAt: Date.now(),
      },
      {
        id: 3004,
        fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 1',
        solution: ['d5', 'Na5', 'Nd4', 'c5', 'Nb5'],
        description: 'Space advantage exploitation',
        difficulty: 'Advanced',
        theme: 'Space',
        rating: 1800,
        cachedAt: Date.now(),
      },
      {
        id: 3005,
        fen: 'r2qr1k1/1b1nbppp/pp2pn2/3p4/2PP4/1PN1PN2/PBQ2PPP/R3KB1R w KQ - 0 1',
        solution: ['cxd5', 'Nxd5', 'Nxd5', 'Bxd5', 'e4', 'Bb7', 'd5'],
        description: 'Central pawn roller',
        difficulty: 'Advanced',
        theme: 'Pawn Storm',
        rating: 1900,
        cachedAt: Date.now(),
      },
      {
        id: 3006,
        fen: 'r3k2r/1bqnbppp/pp2pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKB1R w KQkq - 0 1',
        solution: ['cxd5', 'Nxd5', 'Nxd5', 'Bxd5', 'Bc4'],
        description: 'Piece activity over structure',
        difficulty: 'Advanced',
        theme: 'Dynamic Play',
        rating: 2000,
        cachedAt: Date.now(),
      },
      {
        id: 3007,
        fen: '2rq1rk1/pb1nbppp/1p2pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKB1R w KQ - 0 1',
        solution: ['c5', 'bxc5', 'dxc5', 'Nxc5', 'Nd4'],
        description: 'Minority attack transformation',
        difficulty: 'Advanced',
        theme: 'Pawn Play',
        rating: 2100,
        cachedAt: Date.now(),
      },
      {
        id: 3008,
        fen: 'r1bq1rk1/1p2bppp/p1n1pn2/3p4/2PP4/P1N1PN2/1P3PPP/R1BQKB1R w KQ - 0 1',
        solution: ['cxd5', 'exd5', 'Bf4', 'Bd6', 'Bxd6', 'Qxd6', 'Nb5'],
        description: 'Trading for better pieces',
        difficulty: 'Advanced',
        theme: 'Piece Exchanges',
        rating: 1800,
        cachedAt: Date.now(),
      },
      {
        id: 3009,
        fen: 'r1b2rk1/ppq1bppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 1',
        solution: ['cxd5', 'Nxd5', 'Bc4', 'Nxc3', 'bxc3'],
        description: 'Better pawn structure in IQP',
        difficulty: 'Advanced',
        theme: 'IQP',
        rating: 1900,
        cachedAt: Date.now(),
      },
      {
        id: 3010,
        fen: 'r2q1rk1/1b1nbppp/pp2pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKBR1 w Q - 0 1',
        solution: ['c5', 'b5', 'Nd4', 'a5', 'f3'],
        description: 'Restraining counterplay',
        difficulty: 'Advanced',
        theme: 'Prophylaxis',
        rating: 2000,
        cachedAt: Date.now(),
      },
    ];

    await this.cachePuzzles(defaultPuzzles);
  }

  // Clear all offline data
  async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }

  // Check if game mode is available offline
  async isGameModeAvailable(gameMode: string): Promise<{
    available: boolean;
    puzzleCount: number;
    message?: string;
  }> {
    try {
      const puzzles = await this.getCachedPuzzles();
      const puzzleCount = puzzles.length;
      
      switch (gameMode) {
        case 'classic':
          return {
            available: puzzleCount >= 5,
            puzzleCount,
            message: puzzleCount < 5 ? 'Need at least 5 puzzles for Classic mode' : undefined,
          };
        
        case 'storm':
          return {
            available: puzzleCount >= 20,
            puzzleCount,
            message: puzzleCount < 20 ? `Storm mode needs 20+ puzzles. You have ${puzzleCount}.` : undefined,
          };
        
        case 'streak':
          return {
            available: puzzleCount >= 10,
            puzzleCount,
            message: puzzleCount < 10 ? `Streak mode needs 10+ puzzles. You have ${puzzleCount}.` : undefined,
          };
        
        default:
          return {
            available: true,
            puzzleCount,
          };
      }
    } catch (error) {
      console.error('Error checking game mode availability:', error);
      return {
        available: false,
        puzzleCount: 0,
        message: 'Error checking puzzle availability',
      };
    }
  }
  
  // Get storage info
  async getStorageInfo(): Promise<{
    puzzleCount: number;
    queueSize: number;
    lastSync: number | null;
    totalSize: string;
  }> {
    try {
      const puzzles = await this.getCachedPuzzles();
      const queue = await this.getOfflineQueue();
      const lastSync = await this.getLastSyncTime();
      
      // Estimate total size
      const allKeys = Object.values(STORAGE_KEYS);
      let totalSize = 0;
      
      for (const key of allKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }
      
      return {
        puzzleCount: puzzles.length,
        queueSize: queue.length,
        lastSync,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        puzzleCount: 0,
        queueSize: 0,
        lastSync: null,
        totalSize: '0 KB',
      };
    }
  }
}

export default new OfflineStorageService();