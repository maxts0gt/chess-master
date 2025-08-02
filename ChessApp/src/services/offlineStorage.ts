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

class OfflineStorageService {
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

  async getRandomPuzzle(difficulty?: string): Promise<CachedPuzzle | null> {
    try {
      const puzzles = await this.getCachedPuzzles();
      const filtered = difficulty
        ? puzzles.filter(p => p.difficulty === difficulty)
        : puzzles;
      
      if (filtered.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * filtered.length);
      return filtered[randomIndex];
    } catch (error) {
      console.error('Error getting random puzzle:', error);
      return null;
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
      // Beginner puzzles
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
      // Intermediate puzzles
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
      // Advanced puzzles
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