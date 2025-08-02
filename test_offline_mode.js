// Mock AsyncStorage for testing
const mockAsyncStorage = {
  storage: {},
  
  getItem: async (key) => {
    console.log(`[AsyncStorage] Getting item: ${key}`);
    return mockAsyncStorage.storage[key] || null;
  },
  
  setItem: async (key, value) => {
    console.log(`[AsyncStorage] Setting item: ${key}`);
    mockAsyncStorage.storage[key] = value;
  },
  
  removeItem: async (key) => {
    console.log(`[AsyncStorage] Removing item: ${key}`);
    delete mockAsyncStorage.storage[key];
  },
  
  multiRemove: async (keys) => {
    console.log(`[AsyncStorage] Removing multiple items: ${keys.join(', ')}`);
    keys.forEach(key => delete mockAsyncStorage.storage[key]);
  }
};

// Mock the offline storage service
class OfflineStorageService {
  constructor() {
    this.STORAGE_KEYS = {
      PUZZLES_CACHE: 'chess_puzzles_cache',
      USER_PROGRESS: 'chess_user_progress',
      GAME_STATES: 'chess_game_states',
      AI_RESPONSES: 'chess_ai_responses',
      OFFLINE_QUEUE: 'chess_offline_queue',
      LAST_SYNC: 'chess_last_sync',
      USER_PREFERENCES: 'chess_user_preferences',
    };
  }

  async initialize() {
    console.log('\n=== Initializing Offline Storage ===');
    try {
      const lastSync = await this.getLastSyncTime();
      if (!lastSync) {
        await this.setLastSyncTime(Date.now());
        console.log('✓ Set initial sync time');
      }
      
      const puzzles = await this.getCachedPuzzles();
      console.log(`✓ Found ${puzzles.length} cached puzzles`);
      
      if (puzzles.length === 0) {
        console.log('→ No puzzles found, preloading defaults...');
        await this.preloadDefaultPuzzles();
      }
    } catch (error) {
      console.error('✗ Error initializing offline storage:', error);
    }
  }

  async getCachedPuzzles() {
    try {
      const data = await mockAsyncStorage.getItem(this.STORAGE_KEYS.PUZZLES_CACHE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached puzzles:', error);
      return [];
    }
  }

  async cachePuzzles(puzzles) {
    try {
      const cachedPuzzles = puzzles.map(puzzle => ({
        ...puzzle,
        cachedAt: Date.now(),
      }));
      
      const existing = await this.getCachedPuzzles();
      const merged = [...existing, ...cachedPuzzles];
      const sorted = merged.sort((a, b) => b.cachedAt - a.cachedAt);
      const limited = sorted.slice(0, 100);
      
      await mockAsyncStorage.setItem(
        this.STORAGE_KEYS.PUZZLES_CACHE,
        JSON.stringify(limited)
      );
      console.log(`✓ Cached ${puzzles.length} new puzzles (total: ${limited.length})`);
    } catch (error) {
      console.error('Error caching puzzles:', error);
    }
  }

  async getRandomPuzzle(difficulty) {
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

  async saveUserProgress(progress) {
    try {
      const existing = await this.getUserProgress();
      const updated = { ...existing, ...progress };
      
      await mockAsyncStorage.setItem(
        this.STORAGE_KEYS.USER_PROGRESS,
        JSON.stringify(updated)
      );
      console.log('✓ Saved user progress');
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }

  async getUserProgress() {
    try {
      const data = await mockAsyncStorage.getItem(this.STORAGE_KEYS.USER_PROGRESS);
      return data ? JSON.parse(data) : this.getDefaultProgress();
    } catch (error) {
      console.error('Error getting user progress:', error);
      return this.getDefaultProgress();
    }
  }

  getDefaultProgress() {
    return {
      puzzlesSolved: 0,
      totalScore: 0,
      bestStreak: 0,
      lastPlayed: Date.now(),
      statsPerMode: {
        classic: { gamesPlayed: 0, bestScore: 0, averageScore: 0, totalTime: 0 },
        storm: { gamesPlayed: 0, bestScore: 0, averageScore: 0, totalTime: 0 },
        streak: { gamesPlayed: 0, bestScore: 0, averageScore: 0, totalTime: 0 },
      },
    };
  }

  async addToOfflineQueue(action) {
    try {
      const queue = await this.getOfflineQueue();
      const newAction = {
        ...action,
        id: `${Date.now()}_${Math.random()}`,
      };
      
      queue.push(newAction);
      
      await mockAsyncStorage.setItem(
        this.STORAGE_KEYS.OFFLINE_QUEUE,
        JSON.stringify(queue)
      );
      console.log('✓ Added action to offline queue');
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  async getOfflineQueue() {
    try {
      const data = await mockAsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  async setLastSyncTime(timestamp) {
    try {
      await mockAsyncStorage.setItem(
        this.STORAGE_KEYS.LAST_SYNC,
        timestamp.toString()
      );
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }

  async getLastSyncTime() {
    try {
      const data = await mockAsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  async preloadDefaultPuzzles() {
    const defaultPuzzles = [
      {
        id: 1001,
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        solution: ['Bxf7+', 'Kxf7', 'Ng5+'],
        description: 'White to play and win material',
        difficulty: 'Beginner',
        theme: 'Fork',
        rating: 1000,
      },
      {
        id: 1002,
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        solution: ['Nf6', 'd3', 'Bg4'],
        description: 'Black to develop with tempo',
        difficulty: 'Beginner',
        theme: 'Development',
        rating: 1100,
      },
      // Add all 30 puzzles here to match the actual implementation
      // ... (keeping it short for the test, but the real app has 30 puzzles)
    ];

    await this.cachePuzzles(defaultPuzzles);
    console.log('✓ Preloaded default puzzles');
  }

  async getStorageInfo() {
    try {
      const puzzles = await this.getCachedPuzzles();
      const queue = await this.getOfflineQueue();
      const lastSync = await this.getLastSyncTime();
      const progress = await this.getUserProgress();
      
      return {
        puzzleCount: puzzles.length,
        queueSize: queue.length,
        lastSync,
        progress,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
}

// Test scenarios
async function runOfflineTests() {
  console.log('🧪 Testing Offline Mode Functionality\n');
  
  const storage = new OfflineStorageService();
  
  // Test 1: Initial setup
  console.log('\n📋 Test 1: Initial Setup');
  await storage.initialize();
  
  // Test 2: Get puzzle in offline mode
  console.log('\n📋 Test 2: Getting Random Puzzle (Offline)');
  const puzzle = await storage.getRandomPuzzle();
  if (puzzle) {
    console.log(`✓ Got puzzle: ${puzzle.description}`);
    console.log(`  Difficulty: ${puzzle.difficulty}`);
    console.log(`  Theme: ${puzzle.theme}`);
  } else {
    console.log('✗ No puzzle available');
  }
  
  // Test 3: Complete a puzzle offline
  console.log('\n📋 Test 3: Completing Puzzle Offline');
  await storage.saveUserProgress({
    puzzlesSolved: 1,
    totalScore: 150,
    bestStreak: 1,
    lastPlayed: Date.now(),
  });
  
  await storage.addToOfflineQueue({
    type: 'puzzle_completed',
    data: {
      puzzleId: puzzle?.id,
      score: 150,
      time: 45,
      gameMode: 'classic',
    },
    timestamp: Date.now(),
  });
  
  // Test 4: Check storage state
  console.log('\n📋 Test 4: Storage State');
  const info = await storage.getStorageInfo();
  console.log('Storage Info:');
  console.log(`  Cached Puzzles: ${info.puzzleCount}`);
  console.log(`  Offline Queue Size: ${info.queueSize}`);
  console.log(`  Last Sync: ${info.lastSync ? new Date(info.lastSync).toLocaleString() : 'Never'}`);
  console.log(`  Puzzles Solved: ${info.progress.puzzlesSolved}`);
  console.log(`  Total Score: ${info.progress.totalScore}`);
  
  // Test 5: Simulate multiple offline sessions
  console.log('\n📋 Test 5: Multiple Offline Sessions');
  for (let i = 0; i < 5; i++) {
    const puzzle = await storage.getRandomPuzzle();
    if (puzzle) {
      console.log(`  Session ${i + 1}: Got puzzle "${puzzle.description}"`);
      
      // Simulate solving
      await storage.addToOfflineQueue({
        type: 'puzzle_completed',
        data: {
          puzzleId: puzzle.id,
          score: 100 + Math.floor(Math.random() * 200),
          time: 30 + Math.floor(Math.random() * 60),
          gameMode: 'classic',
        },
        timestamp: Date.now(),
      });
    }
  }
  
  // Test 6: Check queue after multiple sessions
  console.log('\n📋 Test 6: Offline Queue Status');
  const queue = await storage.getOfflineQueue();
  console.log(`✓ ${queue.length} actions waiting to sync`);
  queue.forEach((action, index) => {
    console.log(`  ${index + 1}. ${action.type} - Score: ${action.data.score}`);
  });
  
  // Test 7: Edge cases
  console.log('\n📋 Test 7: Edge Cases');
  
  // Try to get puzzle with specific difficulty when none available
  console.log('\n→ Testing non-existent difficulty filter:');
  const expertPuzzle = await storage.getRandomPuzzle('Expert');
  console.log(expertPuzzle ? '✓ Found expert puzzle' : '✗ No expert puzzles available');
  
  // Test with empty cache
  console.log('\n→ Testing with cleared cache:');
  mockAsyncStorage.storage = {};
  await storage.initialize();
  const emptyPuzzle = await storage.getRandomPuzzle();
  console.log(emptyPuzzle ? '✓ Got puzzle from empty cache' : '✗ No puzzles in empty cache');
  
  console.log('\n✅ Offline Mode Tests Complete\n');
}

// Run the tests
runOfflineTests().catch(console.error);