/**
 * Offline Stockfish Service
 * High-performance chess engine running entirely in WebAssembly
 */

import { NativeModules } from 'react-native';

// Stockfish WASM types
interface StockfishEngine {
  postMessage: (message: string) => void;
  addMessageListener: (callback: (message: string) => void) => void;
  removeMessageListener: (callback: (message: string) => void) => void;
  terminate: () => void;
}

interface EngineAnalysis {
  bestMove: string;
  ponder: string | null;
  evaluation: {
    type: 'cp' | 'mate';
    value: number;
  };
  depth: number;
  nodes: number;
  time: number;
  pv: string[]; // Principal variation
  multiPv: Array<{
    move: string;
    evaluation: { type: 'cp' | 'mate'; value: number };
    pv: string[];
  }>;
}

class OfflineStockfishService {
  private engine: StockfishEngine | null = null;
  private isReady: boolean = false;
  private analysisCallbacks: Map<string, (analysis: EngineAnalysis) => void> = new Map();
  private currentAnalysis: Partial<EngineAnalysis> = {};
  private multiPvResults: Map<number, any> = new Map();

  async initialize(): Promise<void> {
    try {
      // Import Stockfish WASM
      const Stockfish = await import('stockfish.wasm');
      
      // Create engine instance
      this.engine = await Stockfish.default();
      
      // Set up message listener
      this.engine.addMessageListener(this.handleEngineMessage.bind(this));
      
      // Initialize engine
      this.sendCommand('uci');
      
      // Wait for engine to be ready
      await this.waitForReady();
      
      // Configure for mobile performance
      await this.configureEngine();
      
      console.log('Stockfish initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      throw error;
    }
  }

  private async waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (this.isReady) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        resolve();
      }, 5000);
    });
  }

  private async configureEngine(): Promise<void> {
    // Optimize for mobile devices
    this.sendCommand('setoption name Threads value 2');
    this.sendCommand('setoption name Hash value 32'); // 32MB hash table
    this.sendCommand('setoption name MultiPV value 3'); // Top 3 moves
    this.sendCommand('setoption name Skill Level value 20'); // Max strength
    this.sendCommand('setoption name Move Overhead value 100'); // Time buffer
    this.sendCommand('setoption name Ponder value false'); // Save battery
    
    // Wait for configuration to apply
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private handleEngineMessage(message: string): void {
    // console.log('Engine:', message);
    
    if (message === 'uciok') {
      this.isReady = true;
      this.sendCommand('isready');
    }
    
    if (message === 'readyok') {
      // Engine is ready for commands
    }
    
    // Parse best move
    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const bestMove = parts[1];
      const ponder = parts[3] || null;
      
      if (this.currentAnalysis) {
        this.currentAnalysis.bestMove = bestMove;
        this.currentAnalysis.ponder = ponder;
        
        // Compile multi-PV results
        const multiPv: any[] = [];
        this.multiPvResults.forEach((value) => {
          multiPv.push(value);
        });
        this.currentAnalysis.multiPv = multiPv.sort((a, b) => a.multipv - b.multipv);
        
        // Trigger callbacks
        const analysis = this.currentAnalysis as EngineAnalysis;
        this.analysisCallbacks.forEach(callback => callback(analysis));
        this.analysisCallbacks.clear();
        
        // Reset state
        this.currentAnalysis = {};
        this.multiPvResults.clear();
      }
    }
    
    // Parse info lines
    if (message.startsWith('info')) {
      this.parseInfoLine(message);
    }
  }

  private parseInfoLine(message: string): void {
    const parts = message.split(' ');
    let i = 1; // Skip 'info'
    
    let depth = 0;
    let multipv = 1;
    let score: { type: 'cp' | 'mate'; value: number } | null = null;
    let nodes = 0;
    let time = 0;
    let pv: string[] = [];
    
    while (i < parts.length) {
      switch (parts[i]) {
        case 'depth':
          depth = parseInt(parts[++i]);
          break;
        case 'multipv':
          multipv = parseInt(parts[++i]);
          break;
        case 'score':
          i++;
          if (parts[i] === 'cp') {
            score = { type: 'cp', value: parseInt(parts[++i]) };
          } else if (parts[i] === 'mate') {
            score = { type: 'mate', value: parseInt(parts[++i]) };
          }
          break;
        case 'nodes':
          nodes = parseInt(parts[++i]);
          break;
        case 'time':
          time = parseInt(parts[++i]);
          break;
        case 'pv':
          i++;
          pv = [];
          while (i < parts.length && !['depth', 'score', 'nodes', 'time'].includes(parts[i])) {
            pv.push(parts[i++]);
          }
          i--; // Back up one
          break;
      }
      i++;
    }
    
    // Update current analysis
    if (depth > (this.currentAnalysis.depth || 0)) {
      this.currentAnalysis.depth = depth;
      this.currentAnalysis.nodes = nodes;
      this.currentAnalysis.time = time;
      
      if (multipv === 1 && score) {
        this.currentAnalysis.evaluation = score;
        this.currentAnalysis.pv = pv;
      }
    }
    
    // Store multi-PV results
    if (score && pv.length > 0) {
      this.multiPvResults.set(multipv, {
        multipv,
        move: pv[0],
        evaluation: score,
        pv: pv
      });
    }
  }

  private sendCommand(command: string): void {
    if (this.engine && (this.engine as any).postMessage) {
      this.engine.postMessage(command);
    }
  }

  async analyzePosition(
    fen: string,
    options: {
      depth?: number;
      time?: number;
      multiPv?: number;
    } = {}
  ): Promise<EngineAnalysis> {
    if (!this.engine || !this.isReady) {
      throw new Error('Stockfish not initialized');
    }

    return new Promise((resolve) => {
      // Store callback
      const id = Date.now().toString();
      this.analysisCallbacks.set(id, resolve);
      
      // Set position
      this.sendCommand(`position fen ${fen}`);
      
      // Configure analysis
      if (options.multiPv) {
        this.sendCommand(`setoption name MultiPV value ${options.multiPv}`);
      }
      
      // Start analysis
      let goCommand = 'go';
      if (options.depth) {
        goCommand += ` depth ${options.depth}`;
      } else if (options.time) {
        goCommand += ` movetime ${options.time}`;
      } else {
        goCommand += ' depth 15'; // Default depth
      }
      
      this.sendCommand(goCommand);
    });
  }

  async getBestMove(fen: string, timeMs: number = 1000): Promise<string> {
    const analysis = await this.analyzePosition(fen, { time: timeMs });
    return analysis.bestMove;
  }

  async getTopMoves(fen: string, count: number = 3, depth: number = 15): Promise<Array<{
    move: string;
    evaluation: number;
    line: string[];
  }>> {
    const analysis = await this.analyzePosition(fen, { 
      depth, 
      multiPv: count 
    });
    
    return analysis.multiPv.map(pv => ({
      move: pv.move,
      evaluation: pv.evaluation.type === 'cp' 
        ? pv.evaluation.value / 100 
        : pv.evaluation.value * 100, // Mate score
      line: pv.pv
    }));
  }

  async evaluatePosition(fen: string): Promise<number> {
    const analysis = await this.analyzePosition(fen, { depth: 20 });
    
    if (analysis.evaluation.type === 'cp') {
      return analysis.evaluation.value / 100; // Convert centipawns to pawns
    } else {
      // Mate score
      return analysis.evaluation.value > 0 ? 100 : -100;
    }
  }

  async findTactics(fen: string, timeMs: number = 3000): Promise<{
    found: boolean;
    move: string;
    type: string;
    evaluation: number;
  }> {
    const analysis = await this.analyzePosition(fen, { time: timeMs });
    
    // Check if there's a significant advantage after the best move
    const evalDiff = Math.abs(analysis.evaluation.value);
    
    if (analysis.evaluation.type === 'mate' || evalDiff > 200) {
      // Analyze the position to determine tactic type
      const tacticType = this.identifyTacticType(analysis.pv);
      
      return {
        found: true,
        move: analysis.bestMove,
        type: tacticType,
        evaluation: analysis.evaluation.type === 'cp' 
          ? analysis.evaluation.value / 100 
          : analysis.evaluation.value * 100
      };
    }
    
    return {
      found: false,
      move: analysis.bestMove,
      type: 'none',
      evaluation: 0
    };
  }

  private identifyTacticType(pv: string[]): string {
    // Simple tactic identification based on moves
    const moves = pv.slice(0, 4).join(' ').toLowerCase();
    
    if (moves.includes('x') && moves.split('x').length > 2) {
      return 'combination';
    } else if (moves.includes('+')) {
      return 'check_sequence';
    } else if (moves.includes('=q') || moves.includes('=r')) {
      return 'promotion';
    } else if (pv.length <= 3) {
      return 'tactical_blow';
    } else {
      return 'positional_advantage';
    }
  }

  async analyzeGame(pgn: string): Promise<Array<{
    moveNumber: number;
    move: string;
    evaluation: number;
    bestMove: string;
    accuracy: number;
  }>> {
    // This would analyze a complete game
    // For now, return placeholder
    return [];
  }

  setStrength(level: number): void {
    // Level 0-20, where 20 is maximum strength
    this.sendCommand(`setoption name Skill Level value ${level}`);
    
    // Adjust other parameters for more human-like play at lower levels
    if (level < 10) {
      this.sendCommand(`setoption name Slow Mover value ${100 - level * 5}`);
    }
  }

  async getOpeningName(fen: string, moves: string[]): Promise<string> {
    // This would use an opening database
    // For now, use basic detection
    const moveString = moves.join(' ');
    
    if (moveString.startsWith('e4 e5')) {
      if (moveString.includes('Nf3')) return 'Italian Game';
      if (moveString.includes('f4')) return "King's Gambit";
      return 'Open Game';
    } else if (moveString.startsWith('d4 d5')) {
      if (moveString.includes('c4')) return "Queen's Gambit";
      return 'Closed Game';
    } else if (moveString.startsWith('e4 c5')) {
      return 'Sicilian Defense';
    } else if (moveString.startsWith('d4 Nf6')) {
      return 'Indian Defense';
    }
    
    return 'Unknown Opening';
  }

  destroy(): void {
    if (this.engine) {
      this.sendCommand('quit');
      this.engine.terminate();
      this.engine = null;
    }
    this.isReady = false;
    this.analysisCallbacks.clear();
  }

  // Performance monitoring
  getPerformanceStats(): {
    avgAnalysisTime: number;
    totalPositionsAnalyzed: number;
    cacheHitRate: number;
  } {
    // This would track real performance metrics
    return {
      avgAnalysisTime: 250, // ms
      totalPositionsAnalyzed: 1337,
      cacheHitRate: 0.42
    };
  }
}

// Export singleton instance
export const offlineStockfish = new OfflineStockfishService();