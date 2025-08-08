/**
 * Advanced Offline Puzzle Service
 * Pattern recognition, adaptive difficulty, and unlimited puzzle generation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chess } from 'chess.js';
import { offlineStockfish } from './offlineStockfishService';
import { GameReview } from './historyService';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[]; // Solution moves
  rating: number;
  themes: PuzzleTheme[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'master';
  attempts: number;
  solved: boolean;
  personalBest: number; // Time in seconds
  createdAt: Date;
}

export type PuzzleTheme = 
  | 'mate_in_1' | 'mate_in_2' | 'mate_in_3'
  | 'fork' | 'pin' | 'skewer' | 'discovered_attack'
  | 'double_attack' | 'remove_defender' | 'deflection'
  | 'decoy' | 'sacrifice' | 'clearance' | 'interference'
  | 'back_rank' | 'smothered_mate' | 'hanging_piece'
  | 'trapped_piece' | 'endgame' | 'promotion' | 'zugzwang';

interface PuzzleStats {
  totalSolved: number;
  totalAttempts: number;
  averageTime: number;
  bestStreak: number;
  currentStreak: number;
  themeAccuracy: Record<PuzzleTheme, { solved: number; attempted: number }>;
  ratingProgress: { date: string; rating: number }[];
}

interface PatternEngine {
  detectPatterns(fen: string): Promise<PuzzleTheme[]>;
  generatePuzzleFromPattern(theme: PuzzleTheme, rating: number): Promise<Puzzle>;
  validateSolution(puzzle: Puzzle, moves: string[]): boolean;
}

class PuzzleService {
  private puzzleCache: Map<string, Puzzle> = new Map();
  private userRating: number = 1200;
  private stats: PuzzleStats = {
    totalSolved: 0,
    totalAttempts: 0,
    averageTime: 0,
    bestStreak: 0,
    currentStreak: 0,
    themeAccuracy: {} as Record<PuzzleTheme, { solved: number; attempted: number }>,
    ratingProgress: [],
  };
  private preferredThemes: PuzzleTheme[] | undefined;

  async initialize() {
    await this.loadStats();
    await this.loadPuzzleCache();
  }

  /**
   * Use recent reviews to bias puzzle generation towards user's weak patterns
   */
  setBiasFromReviews(reviews: GameReview[]) {
    const themeCounts: Record<PuzzleTheme, number> = {} as any;
    // Naive heuristic: map large negative deltas to typical tactical themes
    for (const rev of reviews.slice(-5)) {
      for (const m of rev.moves) {
        if (m.isBlunder && m.delta < -0.7) {
          // Map by quick detection on fen
          // Reuse detectPatterns on the blunder position
          // Note: this is async normally, but we can store target fens for next generation
          // For now, assign common themes likely from blunders
          const likely: PuzzleTheme[] = ['fork', 'pin', 'skewer', 'back_rank', 'hanging_piece'];
          for (const t of likely) themeCounts[t] = (themeCounts[t] || 0) + 1;
        }
      }
    }
    const ranked = Object.entries(themeCounts).sort((a,b) => b[1]-a[1]).map(([t]) => t as PuzzleTheme);
    this.preferredThemes = ranked.slice(0, 3);
  }

  private async loadStats() {
    try {
      const saved = await AsyncStorage.getItem('puzzle_stats');
      if (saved) {
        this.stats = JSON.parse(saved);
      }
      
      const rating = await AsyncStorage.getItem('puzzle_rating');
      if (rating) {
        this.userRating = parseInt(rating);
      }
    } catch (error) {
      console.error('Failed to load puzzle stats:', error);
    }
  }

  private async saveStats() {
    try {
      await AsyncStorage.setItem('puzzle_stats', JSON.stringify(this.stats));
      await AsyncStorage.setItem('puzzle_rating', this.userRating.toString());
    } catch (error) {
      console.error('Failed to save puzzle stats:', error);
    }
  }

  private async loadPuzzleCache() {
    try {
      const saved = await AsyncStorage.getItem('puzzle_cache');
      if (saved) {
        const puzzles = JSON.parse(saved);
        puzzles.forEach((p: Puzzle) => this.puzzleCache.set(p.id, p));
      }
    } catch (error) {
      console.error('Failed to load puzzle cache:', error);
    }
  }

  private async savePuzzleCache() {
    try {
      const puzzles = Array.from(this.puzzleCache.values()).slice(-100); // Keep last 100
      await AsyncStorage.setItem('puzzle_cache', JSON.stringify(puzzles));
    } catch (error) {
      console.error('Failed to save puzzle cache:', error);
    }
  }

  /**
   * Generate a new puzzle based on user's rating and preferences
   */
  async generatePuzzle(themes?: PuzzleTheme[]): Promise<Puzzle> {
    // Adaptive difficulty based on user rating
    const ratingRange = this.getRatingRange();
    const targetRating = ratingRange.min + Math.random() * (ratingRange.max - ratingRange.min);
    
    // Apply bias if caller did not provide themes
    const usedThemes = themes && themes.length ? themes : this.preferredThemes;
    
    // Generate tactical position using Stockfish
    const puzzle = await this.generateTacticalPosition(targetRating, usedThemes);
    
    // Cache the puzzle
    this.puzzleCache.set(puzzle.id, puzzle);
    await this.savePuzzleCache();
    
    return puzzle;
  }

  private getRatingRange(): { min: number; max: number } {
    // Adaptive range based on user's performance
    const baseRange = 200;
    const adjustment = this.stats.currentStreak > 3 ? 50 : 
                      this.stats.currentStreak < -3 ? -50 : 0;
    
    return {
      min: Math.max(600, this.userRating - baseRange + adjustment),
      max: Math.min(2800, this.userRating + baseRange + adjustment),
    };
  }

  private async generateTacticalPosition(
    targetRating: number, 
    preferredThemes?: PuzzleTheme[]
  ): Promise<Puzzle> {
    // Generate random position with tactical opportunities
    const chess = new Chess();
    
    // Start from a semi-random position
    const moves = this.generateRandomGame(20 + Math.floor(Math.random() * 20));
    moves.forEach(move => chess.move(move));
    
    // Find critical positions using Stockfish
    const analysis = await offlineStockfish.analyzePosition(chess.fen(), { depth: 20 });
    
    // Look for positions with sharp tactical content
    const tacticalMoves = await this.findTacticalMoves(chess.fen());
    
    if (tacticalMoves.length === 0) {
      // Recursively try again if no tactics found
      return this.generateTacticalPosition(targetRating, preferredThemes);
    }
    
    // Detect patterns in the position
    const detectedThemes = await this.detectPatterns(chess.fen());
    const themes = preferredThemes?.filter(t => detectedThemes.includes(t)) || detectedThemes;
    
    return {
      id: this.generatePuzzleId(),
      fen: chess.fen(),
      moves: tacticalMoves,
      rating: targetRating,
      themes,
      difficulty: this.ratingToDifficulty(targetRating),
      attempts: 0,
      solved: false,
      personalBest: 0,
      createdAt: new Date(),
    };
  }

  private generateRandomGame(moveCount: number): string[] {
    const chess = new Chess();
    const moves: string[] = [];
    
    for (let i = 0; i < moveCount && !chess.isGameOver(); i++) {
      const legalMoves = chess.moves();
      const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      chess.move(move);
      moves.push(move);
    }
    
    return moves;
  }

  private async findTacticalMoves(fen: string): Promise<string[]> {
    const chess = new Chess(fen);
    const moves: string[] = [];
    
    // Get best line from Stockfish
    const analysis = await offlineStockfish.analyzePosition(fen, { depth: 20 });
    if (!analysis.bestMove) return [];
    
    // Check if the best move leads to significant advantage
    const currentEval = typeof (analysis as any).evaluation === 'number' ? (analysis as any).evaluation : (analysis as any).evaluation?.value ?? 0;
    chess.move(analysis.bestMove);
    
    const afterMoveAnalysis = await offlineStockfish.analyzePosition(chess.fen(), { depth: 15 });
    const afterEval = typeof (afterMoveAnalysis as any).evaluation === 'number' ? (afterMoveAnalysis as any).evaluation : (afterMoveAnalysis as any).evaluation?.value ?? 0;
    const evalDiff = Math.abs(afterEval - currentEval);
    
    // If significant material/positional gain, it's likely tactical
    if (evalDiff > 1.5) {
      moves.push(analysis.bestMove);
      
      // Get the continuation
      if (afterMoveAnalysis.bestMove) {
        chess.move(afterMoveAnalysis.bestMove);
        const continuation = await offlineStockfish.analyzePosition(chess.fen(), { depth: 15 });
        if (continuation.bestMove) {
          moves.push(afterMoveAnalysis.bestMove, continuation.bestMove);
        }
      }
    }
    
    return moves;
  }

  private async detectPatterns(fen: string): Promise<PuzzleTheme[]> {
    const themes: PuzzleTheme[] = [];
    const chess = new Chess(fen);
    
    // Analyze position for common patterns
    const pieces = this.getPiecePositions(chess);
    const attacks = this.getAttackMap(chess);
    
    // Check for mate patterns
    if (this.isMateInN(chess, 1)) themes.push('mate_in_1');
    else if (this.isMateInN(chess, 2)) themes.push('mate_in_2');
    else if (this.isMateInN(chess, 3)) themes.push('mate_in_3');
    
    // Check for tactical patterns
    if (this.detectFork(pieces, attacks)) themes.push('fork');
    if (this.detectPin(pieces, attacks, chess)) themes.push('pin');
    if (this.detectSkewer(pieces, attacks, chess)) themes.push('skewer');
    if (this.detectHangingPiece(pieces, attacks)) themes.push('hanging_piece');
    if (this.detectBackRankMate(chess)) themes.push('back_rank');
    
    // Endgame detection
    const pieceCount = Object.keys(pieces).length;
    if (pieceCount <= 7) themes.push('endgame');
    
    return themes;
  }

  private getPiecePositions(chess: Chess): Record<string, { type: string; color: string }> {
    const pieces: Record<string, { type: string; color: string }> = {};
    
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const square = String.fromCharCode(97 + file) + (rank + 1);
        const piece = chess.get(square as any);
        if (piece) {
          pieces[square] = piece;
        }
      }
    }
    
    return pieces;
  }

  private getAttackMap(chess: Chess): Record<string, string[]> {
    const attacks: Record<string, string[]> = {};
    
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const square = String.fromCharCode(97 + file) + (rank + 1);
        attacks[square] = [];
        
        // Check all possible moves to this square
        const moves = chess.moves({ verbose: true });
        moves.forEach(move => {
          if (move.to === square) {
            attacks[square].push(move.from);
          }
        });
      }
    }
    
    return attacks;
  }

  private isMateInN(chess: Chess, n: number): boolean {
    // Simple heuristic - would need deeper analysis
    if (chess.isCheckmate()) return n === 0;
    if (n === 0) return false;
    
    const moves = chess.moves();
    for (const move of moves) {
      chess.move(move);
      const opponentCanEscape = chess.moves().some(oppMove => {
        chess.move(oppMove);
        const result = !this.isMateInN(chess, n - 1);
        chess.undo();
        return result;
      });
      chess.undo();
      
      if (!opponentCanEscape) return true;
    }
    
    return false;
  }

  private detectFork(
    pieces: Record<string, { type: string; color: string }>, 
    attacks: Record<string, string[]>
  ): boolean {
    // Check if any piece attacks multiple valuable pieces
    for (const [square, attackers] of Object.entries(attacks)) {
      const piece = pieces[square];
      if (!piece) continue;
      
      const targets = Object.entries(pieces).filter(([targetSquare, targetPiece]) => {
        return targetPiece.color !== piece.color && 
               attacks[targetSquare]?.includes(square) &&
               this.getPieceValue(targetPiece.type) >= 3;
      });
      
      if (targets.length >= 2) return true;
    }
    
    return false;
  }

  private detectPin(
    pieces: Record<string, { type: string; color: string }>,
    attacks: Record<string, string[]>,
    chess: Chess
  ): boolean {
    // Check for absolute pins (piece can't move without exposing king)
    for (const [square, piece] of Object.entries(pieces)) {
      if (piece.type === 'k') continue;
      
      // Try moving the piece and see if king is in check
      const moves = chess.moves({ square: square as any, verbose: true });
      for (const move of moves) {
        chess.move(move);
        if (chess.inCheck()) {
          chess.undo();
          return true;
        }
        chess.undo();
      }
    }
    
    return false;
  }

  private detectSkewer(
    pieces: Record<string, { type: string; color: string }>,
    attacks: Record<string, string[]>,
    chess: Chess
  ): boolean {
    // Similar to pin but valuable piece in front
    // Simplified detection
    return false; // TODO: Implement proper skewer detection
  }

  private detectHangingPiece(
    pieces: Record<string, { type: string; color: string }>,
    attacks: Record<string, string[]>
  ): boolean {
    for (const [square, piece] of Object.entries(pieces)) {
      const attackers = attacks[square] || [];
      const defenders = attackers.filter(sq => pieces[sq]?.color === piece.color);
      const threats = attackers.filter(sq => pieces[sq]?.color !== piece.color);
      
      if (threats.length > defenders.length && this.getPieceValue(piece.type) > 1) {
        return true;
      }
    }
    
    return false;
  }

  private detectBackRankMate(chess: Chess): boolean {
    const fen = chess.fen();
    const turn = chess.turn();
    const backRank = turn === 'w' ? '1' : '8';
    
    // Check if king is on back rank with limited escape squares
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + backRank;
      const piece = chess.get(square as any);
      
      if (piece && piece.type === 'k' && piece.color === turn) {
        // Count escape squares
        const moves = chess.moves({ square: square as any });
        if (moves.length <= 2) return true;
      }
    }
    
    return false;
  }

  private getPieceValue(type: string): number {
    const values: Record<string, number> = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    };
    return values[type.toLowerCase()] || 0;
  }

  private ratingToDifficulty(rating: number): Puzzle['difficulty'] {
    if (rating < 1000) return 'beginner';
    if (rating < 1500) return 'intermediate';
    if (rating < 2000) return 'advanced';
    return 'master';
  }

  private generatePuzzleId(): string {
    return `puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Submit solution and update ratings
   */
  async submitSolution(
    puzzleId: string, 
    moves: string[], 
    timeSpent: number
  ): Promise<{ correct: boolean; ratingChange: number; newStreak: number }> {
    const puzzle = this.puzzleCache.get(puzzleId);
    if (!puzzle) throw new Error('Puzzle not found');
    
    puzzle.attempts++;
    const correct = this.validateSolution(puzzle, moves);
    
    let ratingChange = 0;
    if (correct) {
      puzzle.solved = true;
      puzzle.personalBest = puzzle.personalBest === 0 
        ? timeSpent 
        : Math.min(puzzle.personalBest, timeSpent);
      
      // Update stats
      this.stats.totalSolved++;
      this.stats.currentStreak++;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
      
      // Calculate rating change
      const expectedScore = this.getExpectedScore(this.userRating, puzzle.rating);
      ratingChange = this.calculateRatingChange(1, expectedScore);
      this.userRating += ratingChange;
      
      // Update theme accuracy
      puzzle.themes.forEach(theme => {
        if (!this.stats.themeAccuracy[theme]) {
          this.stats.themeAccuracy[theme] = { solved: 0, attempted: 0 };
        }
        this.stats.themeAccuracy[theme].solved++;
        this.stats.themeAccuracy[theme].attempted++;
      });
    } else {
      this.stats.currentStreak = 0;
      
      // Small rating decrease for wrong answer
      const expectedScore = this.getExpectedScore(this.userRating, puzzle.rating);
      ratingChange = this.calculateRatingChange(0, expectedScore);
      this.userRating += ratingChange;
      
      // Update theme accuracy
      puzzle.themes.forEach(theme => {
        if (!this.stats.themeAccuracy[theme]) {
          this.stats.themeAccuracy[theme] = { solved: 0, attempted: 0 };
        }
        this.stats.themeAccuracy[theme].attempted++;
      });
    }
    
    this.stats.totalAttempts++;
    
    // Update rating progress
    this.stats.ratingProgress.push({
      date: new Date().toISOString(),
      rating: this.userRating,
    });
    
    // Keep only last 100 rating points
    if (this.stats.ratingProgress.length > 100) {
      this.stats.ratingProgress = this.stats.ratingProgress.slice(-100);
    }
    
    await this.saveStats();
    await this.savePuzzleCache();
    
    return {
      correct,
      ratingChange,
      newStreak: this.stats.currentStreak,
    };
  }

  private validateSolution(puzzle: Puzzle, moves: string[]): boolean {
    if (moves.length !== puzzle.moves.length) return false;
    
    const chess = new Chess(puzzle.fen);
    
    for (let i = 0; i < moves.length; i++) {
      const expectedMove = puzzle.moves[i];
      const actualMove = moves[i];
      
      // Check if moves are equivalent (handle different notations)
      try {
        const expected = chess.move(expectedMove);
        chess.undo();
        const actual = chess.move(actualMove);
        chess.undo();
        
        if (expected.from !== actual.from || expected.to !== actual.to) {
          return false;
        }
        
        chess.move(actualMove);
      } catch {
        return false;
      }
    }
    
    return true;
  }

  private getExpectedScore(userRating: number, puzzleRating: number): number {
    return 1 / (1 + Math.pow(10, (puzzleRating - userRating) / 400));
  }

  private calculateRatingChange(actualScore: number, expectedScore: number): number {
    const K = 32; // K-factor for rating volatility
    return Math.round(K * (actualScore - expectedScore));
  }

  /**
   * Get puzzles by theme
   */
  async getPuzzlesByTheme(theme: PuzzleTheme, count: number = 10): Promise<Puzzle[]> {
    const puzzles: Puzzle[] = [];
    
    for (let i = 0; i < count; i++) {
      const puzzle = await this.generatePuzzle([theme]);
      puzzles.push(puzzle);
    }
    
    return puzzles;
  }

  /**
   * Get puzzle rush set (rapid-fire puzzles)
   */
  async getPuzzleRush(difficulty?: Puzzle['difficulty']): Promise<Puzzle[]> {
    const count = 20; // Standard puzzle rush
    const puzzles: Puzzle[] = [];
    
    for (let i = 0; i < count; i++) {
      const puzzle = await this.generatePuzzle();
      if (!difficulty || puzzle.difficulty === difficulty) {
        puzzles.push(puzzle);
      }
    }
    
    return puzzles;
  }

  /**
   * Get daily puzzle
   */
  async getDailyPuzzle(): Promise<Puzzle> {
    const today = new Date().toDateString();
    const cached = await AsyncStorage.getItem(`daily_puzzle_${today}`);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Generate new daily puzzle with balanced difficulty
    const puzzle = await this.generatePuzzle();
    await AsyncStorage.setItem(`daily_puzzle_${today}`, JSON.stringify(puzzle));
    
    return puzzle;
  }

  /**
   * Get user statistics
   */
  getStats(): PuzzleStats & { rating: number } {
    return {
      ...this.stats,
      rating: this.userRating,
    };
  }

  /**
   * Get theme performance
   */
  getThemePerformance(): Array<{
    theme: PuzzleTheme;
    accuracy: number;
    solved: number;
    attempted: number;
  }> {
    return Object.entries(this.stats.themeAccuracy).map(([theme, stats]) => ({
      theme: theme as PuzzleTheme,
      accuracy: stats.attempted > 0 ? stats.solved / stats.attempted : 0,
      solved: stats.solved,
      attempted: stats.attempted,
    })).sort((a, b) => b.accuracy - a.accuracy);
  }
}

export const puzzleService = new PuzzleService();