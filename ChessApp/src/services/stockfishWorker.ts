/**
 * Stockfish WASM Worker
 * Handles UCI communication with Stockfish engine
 */

export interface StockfishMessage {
  type: 'uci' | 'position' | 'go' | 'stop' | 'quit';
  data?: any;
}

export interface StockfishResponse {
  type: 'uciok' | 'readyok' | 'bestmove' | 'info' | 'error';
  data: any;
}

class StockfishWorker {
  private worker: Worker | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isReady = false;

  async initialize(): Promise<void> {
    try {
      // Load Stockfish WASM worker
      const stockfishWasm = require('stockfish.wasm');
      
      // Create worker instance
      this.worker = await stockfishWasm();
      
      // Set up message handling
      this.worker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      // Initialize UCI
      await this.sendCommand('uci');
      await this.waitForMessage('uciok');
      
      // Set options for mobile performance
      await this.sendCommand('setoption name Threads value 2');
      await this.sendCommand('setoption name Hash value 32');
      await this.sendCommand('setoption name Ponder value false');
      
      // Confirm ready
      await this.sendCommand('isready');
      await this.waitForMessage('readyok');
      
      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      throw error;
    }
  }

  private handleMessage(line: string) {
    // Parse UCI output
    if (line.startsWith('uciok')) {
      this.emit('uciok', {});
    } else if (line.startsWith('readyok')) {
      this.emit('readyok', {});
    } else if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1];
      const ponderMove = parts[3]; // May be undefined
      this.emit('bestmove', { move: bestMove, ponder: ponderMove });
    } else if (line.startsWith('info')) {
      this.parseInfoLine(line);
    }
  }

  private parseInfoLine(line: string) {
    const info: any = {};
    const parts = line.split(' ');
    
    for (let i = 1; i < parts.length; i++) {
      switch (parts[i]) {
        case 'depth':
          info.depth = parseInt(parts[++i]);
          break;
        case 'seldepth':
          info.seldepth = parseInt(parts[++i]);
          break;
        case 'time':
          info.time = parseInt(parts[++i]);
          break;
        case 'nodes':
          info.nodes = parseInt(parts[++i]);
          break;
        case 'pv':
          info.pv = parts.slice(++i).join(' ');
          break;
        case 'score':
          if (parts[++i] === 'cp') {
            info.score = parseInt(parts[++i]) / 100; // Convert centipawns to pawns
          } else if (parts[i] === 'mate') {
            info.mate = parseInt(parts[++i]);
          }
          break;
        case 'nps':
          info.nps = parseInt(parts[++i]);
          break;
      }
    }
    
    this.emit('info', info);
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.worker) {
      throw new Error('Stockfish not initialized');
    }
    this.worker.postMessage(command);
  }

  async getBestMove(fen: string, options: {
    depth?: number;
    time?: number;
    nodes?: number;
  } = {}): Promise<string> {
    if (!this.isReady) {
      throw new Error('Stockfish not ready');
    }

    // Set position
    await this.sendCommand(`position fen ${fen}`);
    
    // Build go command
    let goCommand = 'go';
    if (options.depth) {
      goCommand += ` depth ${options.depth}`;
    }
    if (options.time) {
      goCommand += ` movetime ${options.time}`;
    }
    if (options.nodes) {
      goCommand += ` nodes ${options.nodes}`;
    }
    
    // Default to depth 12 if no options specified
    if (goCommand === 'go') {
      goCommand += ' depth 12';
    }
    
    // Send go command and wait for best move
    const bestMovePromise = this.waitForMessage('bestmove');
    await this.sendCommand(goCommand);
    const result = await bestMovePromise;
    
    return result.move;
  }

  async analyze(fen: string, options: {
    multiPV?: number;
    depth?: number;
  } = {}): Promise<any[]> {
    if (!this.isReady) {
      throw new Error('Stockfish not ready');
    }

    const lines: any[] = [];
    const multiPV = options.multiPV || 1;
    
    // Set MultiPV
    await this.sendCommand(`setoption name MultiPV value ${multiPV}`);
    
    // Set position
    await this.sendCommand(`position fen ${fen}`);
    
    // Collect info messages
    const infoHandler = (data: any) => {
      if (data.pv) {
        lines.push(data);
      }
    };
    
    this.on('info', infoHandler);
    
    // Start analysis
    const depth = options.depth || 20;
    await this.sendCommand(`go depth ${depth}`);
    await this.waitForMessage('bestmove');
    
    // Clean up handler
    this.off('info', infoHandler);
    
    // Reset MultiPV
    await this.sendCommand('setoption name MultiPV value 1');
    
    return lines;
  }

  private emit(event: string, data: any) {
    const handlers = this.messageHandlers.get(event) || [];
    if (Array.isArray(handlers)) {
      handlers.forEach(handler => handler(data));
    } else {
      handlers(data);
    }
  }

  private on(event: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(event) || [];
    if (Array.isArray(handlers)) {
      handlers.push(handler);
      this.messageHandlers.set(event, handlers);
    } else {
      this.messageHandlers.set(event, [handlers, handler]);
    }
  }

  private off(event: string, handler: (data: any) => void) {
    const handlers = this.messageHandlers.get(event);
    if (Array.isArray(handlers)) {
      const filtered = handlers.filter(h => h !== handler);
      if (filtered.length > 0) {
        this.messageHandlers.set(event, filtered);
      } else {
        this.messageHandlers.delete(event);
      }
    } else if (handlers === handler) {
      this.messageHandlers.delete(event);
    }
  }

  private waitForMessage(type: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(type, handler);
        reject(new Error(`Timeout waiting for ${type}`));
      }, timeout);

      const handler = (data: any) => {
        clearTimeout(timer);
        this.off(type, handler);
        resolve(data);
      };

      this.on(type, handler);
    });
  }

  async setSkillLevel(level: number) {
    // Stockfish skill level: 0-20 (0 = weakest, 20 = strongest)
    await this.sendCommand(`setoption name Skill Level value ${level}`);
  }

  async stop() {
    if (this.worker) {
      await this.sendCommand('stop');
    }
  }

  async quit() {
    if (this.worker) {
      await this.sendCommand('quit');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

export const stockfishWorker = new StockfishWorker();