/**
 * Mistral AI Service for Offline Chess Coaching
 * Uses llama.rn to run Mistral models locally on mobile devices
 */

import { LlamaContext, initLlama } from 'llama.rn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Chess } from 'chess.js';

interface MistralConfig {
  modelPath: string;
  contextSize: number;
  threads: number;
  temperature: number;
  topK: number;
  topP: number;
  repeatPenalty: number;
}

interface ChessAnalysis {
  evaluation: string;
  bestMoves: string[];
  explanation: string;
  strategicAdvice: string;
  tacticalHints: string[];
  difficulty: number;
}

class MistralChessService {
  private context: LlamaContext | null = null;
  private modelPath: string = '';
  private isInitialized: boolean = false;
  private analysisCache: Map<string, ChessAnalysis> = new Map();

  // Mistral model configurations optimized for chess
  private readonly configs = {
    'mistral-7b-chess': {
      modelPath: 'mistral-7b-chess-q4_k_m.gguf',
      contextSize: 4096,
      threads: 4,
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      repeatPenalty: 1.1
    },
    'mistral-3b-chess': {
      modelPath: 'mistral-3b-chess-q5_k_m.gguf',
      contextSize: 2048,
      threads: 4,
      temperature: 0.8,
      topK: 50,
      topP: 0.9,
      repeatPenalty: 1.05
    }
  };

  async initialize(modelName: 'mistral-7b-chess' | 'mistral-3b-chess' = 'mistral-3b-chess'): Promise<void> {
    try {
      const config = this.configs[modelName];
      
      // Check if model exists locally
      const modelDir = `${RNFS.DocumentDirectoryPath}/models`;
      this.modelPath = `${modelDir}/${config.modelPath}`;
      
      const modelExists = await RNFS.exists(this.modelPath);
      if (!modelExists) {
        await this.downloadModel(modelName);
      }

      // Initialize llama.rn with Mistral model
      await initLlama({
        model: this.modelPath,
        use_mlock: true,
        n_gpu_layers: 0, // CPU only for mobile compatibility
      });

      // Create context with chess-optimized parameters
      this.context = await LlamaContext.create({
        n_ctx: config.contextSize,
        n_threads: config.threads,
        temp: config.temperature,
        top_k: config.topK,
        top_p: config.topP,
        repeat_penalty: config.repeatPenalty,
        seed: Date.now(),
      });

      this.isInitialized = true;
      await this.warmupModel();
      
    } catch (error) {
      console.error('Failed to initialize Mistral:', error);
      throw error;
    }
  }

  private async downloadModel(modelName: string): Promise<void> {
    // In production, this would download from your CDN
    // For now, we'll assume the model is bundled with the app
    console.log(`Model ${modelName} needs to be downloaded`);
    // Implementation for model download...
  }

  private async warmupModel(): Promise<void> {
    // Warm up the model with a simple chess position
    const warmupPrompt = this.buildChessPrompt(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'e2e4',
      1200
    );
    
    await this.context?.completion({
      prompt: warmupPrompt,
      n_predict: 50,
    });
  }

  private buildChessPrompt(fen: string, lastMove: string | null, playerRating: number): string {
    return `You are an expert chess coach analyzing positions for a ${playerRating}-rated player.

Current position (FEN): ${fen}
Last move played: ${lastMove || 'Starting position'}

Provide a brief analysis focusing on:
1. Position evaluation
2. Best moves (top 3)
3. Strategic concepts
4. Tactical opportunities
5. Common mistakes to avoid

Keep explanations clear and educational. Use chess notation.

Analysis:`;
  }

  async analyzePosition(
    fen: string,
    lastMove: string | null = null,
    playerRating: number = 1500
  ): Promise<ChessAnalysis> {
    if (!this.isInitialized || !this.context) {
      throw new Error('Mistral service not initialized');
    }

    // Check cache first
    const cacheKey = `${fen}-${playerRating}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      const prompt = this.buildChessPrompt(fen, lastMove, playerRating);
      
      const response = await this.context.completion({
        prompt,
        n_predict: 400,
        stop: ['\n\n', 'Human:', 'User:'],
      });

      const analysis = this.parseAnalysis(response.text);
      
      // Cache the result
      this.analysisCache.set(cacheKey, analysis);
      
      // Limit cache size
      if (this.analysisCache.size > 100) {
        const firstKey = this.analysisCache.keys().next().value;
        this.analysisCache.delete(firstKey);
      }

      return analysis;
    } catch (error) {
      console.error('Analysis failed:', error);
      return this.getFallbackAnalysis(fen);
    }
  }

  private parseAnalysis(text: string): ChessAnalysis {
    // Parse the Mistral response into structured data
    const lines = text.split('\n').filter(line => line.trim());
    
    let evaluation = 'Equal position';
    let bestMoves: string[] = [];
    let explanation = '';
    let strategicAdvice = '';
    let tacticalHints: string[] = [];

    // Extract structured information from response
    let currentSection = '';
    for (const line of lines) {
      if (line.includes('evaluation') || line.includes('Evaluation')) {
        currentSection = 'evaluation';
      } else if (line.includes('best moves') || line.includes('Best moves')) {
        currentSection = 'moves';
      } else if (line.includes('strategic') || line.includes('Strategic')) {
        currentSection = 'strategic';
      } else if (line.includes('tactical') || line.includes('Tactical')) {
        currentSection = 'tactical';
      } else {
        switch (currentSection) {
          case 'evaluation':
            evaluation = line;
            break;
          case 'moves':
            const moveMatch = line.match(/\d\.\s*([a-h][1-8][a-h][1-8]|[NBRQK][a-h]?[1-8]?x?[a-h][1-8])/);
            if (moveMatch) {
              bestMoves.push(moveMatch[1]);
            }
            break;
          case 'strategic':
            strategicAdvice += line + ' ';
            break;
          case 'tactical':
            tacticalHints.push(line);
            break;
          default:
            explanation += line + ' ';
        }
      }
    }

    return {
      evaluation: evaluation.trim(),
      bestMoves: bestMoves.slice(0, 3),
      explanation: explanation.trim(),
      strategicAdvice: strategicAdvice.trim(),
      tacticalHints: tacticalHints.slice(0, 3),
      difficulty: this.assessDifficulty(evaluation)
    };
  }

  private assessDifficulty(evaluation: string): number {
    // Simple difficulty assessment based on position
    if (evaluation.includes('winning') || evaluation.includes('advantage')) {
      return 0.3;
    } else if (evaluation.includes('equal') || evaluation.includes('balanced')) {
      return 0.5;
    } else if (evaluation.includes('difficult') || evaluation.includes('pressure')) {
      return 0.7;
    }
    return 0.5;
  }

  private getFallbackAnalysis(fen: string): ChessAnalysis {
    // Fallback analysis when Mistral fails
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    return {
      evaluation: 'Position analysis in progress',
      bestMoves: moves.slice(0, 3).map(m => m.san),
      explanation: 'Calculating best continuation...',
      strategicAdvice: 'Focus on piece development and king safety',
      tacticalHints: ['Look for checks', 'Protect hanging pieces', 'Control the center'],
      difficulty: 0.5
    };
  }

  async getOpeningAdvice(fen: string, moves: string[]): Promise<string> {
    if (!this.isInitialized || !this.context) {
      throw new Error('Mistral service not initialized');
    }

    const prompt = `As a chess opening expert, analyze this position:
FEN: ${fen}
Moves played: ${moves.join(' ')}

Identify the opening and provide:
1. Opening name and variation
2. Key ideas and plans
3. Common mistakes to avoid
4. Recommended continuation

Opening Analysis:`;

    const response = await this.context.completion({
      prompt,
      n_predict: 300,
      temperature: 0.7,
    });

    return response.text;
  }

  async getTacticalHint(fen: string, theme: string): Promise<string> {
    if (!this.isInitialized || !this.context) {
      throw new Error('Mistral service not initialized');
    }

    const prompt = `Analyze this chess position for ${theme} tactics:
FEN: ${fen}

Provide a hint without giving away the solution:`;

    const response = await this.context.completion({
      prompt,
      n_predict: 100,
      temperature: 0.9,
    });

    return response.text;
  }

  async explainMove(fen: string, move: string, playerLevel: number): Promise<string> {
    if (!this.isInitialized || !this.context) {
      throw new Error('Mistral service not initialized');
    }

    const prompt = `Explain why ${move} is played in this position to a ${playerLevel}-rated player:
FEN: ${fen}

Use simple language and focus on the key concept:`;

    const response = await this.context.completion({
      prompt,
      n_predict: 150,
      temperature: 0.8,
    });

    return response.text;
  }

  async generatePuzzle(theme: string, difficulty: number): Promise<{fen: string, solution: string[], hint: string}> {
    // This would generate puzzles based on theme and difficulty
    // For now, return a placeholder
    return {
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      solution: ['Bxf6', 'Qxf6', 'Nxe5'],
      hint: 'Look for a way to win material by exploiting the pin'
    };
  }

  // Clean up resources
  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
    }
    this.isInitialized = false;
    this.analysisCache.clear();
  }

  // Save analysis for offline access
  async saveAnalysisHistory(analysis: ChessAnalysis, fen: string): Promise<void> {
    try {
      const history = await AsyncStorage.getItem('chess_analysis_history');
      const historyData = history ? JSON.parse(history) : [];
      
      historyData.push({
        fen,
        analysis,
        timestamp: Date.now()
      });

      // Keep only last 50 analyses
      if (historyData.length > 50) {
        historyData.shift();
      }

      await AsyncStorage.setItem('chess_analysis_history', JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to save analysis history:', error);
    }
  }

  // Get model info
  getModelInfo(): {name: string, size: string, capabilities: string[]} {
    return {
      name: 'Mistral 3B Chess',
      size: '1.8GB',
      capabilities: [
        'Position analysis',
        'Opening identification',
        'Tactical hints',
        'Move explanations',
        'Strategic advice',
        'Endgame guidance'
      ]
    };
  }
}

// Export singleton instance
export const mistralChess = new MistralChessService();