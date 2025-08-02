// Ollama Service for Local LLM Integration
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OllamaConfig {
  baseUrl: string;
  models: {
    general: string;
    chess: string;
    analysis: string;
  };
  timeout: number;
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  eval_count?: number;
}

interface ChessAnalysisRequest {
  position: string; // FEN
  move?: string;
  gameHistory?: string[];
  analysisType: 'position' | 'move' | 'opening' | 'tactics' | 'endgame';
}

export class OllamaService {
  private config: OllamaConfig = {
    baseUrl: 'http://localhost:11434', // Default Ollama port
    models: {
      general: 'llama3.2:latest', // General purpose model
      chess: 'chessgpt:latest', // Chess-specific model (if available)
      analysis: 'deepseek-coder:latest', // For code/analysis tasks
    },
    timeout: 30000, // 30 seconds
  };

  private isAvailable: boolean = false;
  private installedModels: string[] = [];

  constructor() {
    this.checkAvailability();
  }

  // Check if Ollama is running and available
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.installedModels = data.models?.map((m: any) => m.name) || [];
        this.isAvailable = true;
        console.log('Ollama is available. Installed models:', this.installedModels);
        return true;
      }
    } catch (error) {
      console.error('Ollama not available:', error);
      this.isAvailable = false;
    }
    return false;
  }

  // Pull a model if not already installed
  async pullModel(modelName: string): Promise<boolean> {
    if (this.installedModels.includes(modelName)) {
      console.log(`Model ${modelName} already installed`);
      return true;
    }

    try {
      console.log(`Pulling model ${modelName}...`);
      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (response.ok) {
        console.log(`Model ${modelName} pulled successfully`);
        await this.checkAvailability(); // Refresh model list
        return true;
      }
    } catch (error) {
      console.error(`Error pulling model ${modelName}:`, error);
    }
    return false;
  }

  // Generate response from Ollama
  async generate(prompt: string, model?: string, context?: number[]): Promise<OllamaResponse | null> {
    if (!this.isAvailable) {
      await this.checkAvailability();
      if (!this.isAvailable) {
        console.error('Ollama is not available');
        return null;
      }
    }

    const selectedModel = model || this.config.models.general;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          stream: false,
          context: context,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error generating response:', error);
    }
    return null;
  }

  // Chess-specific analysis using Ollama
  async analyzeChessPosition(request: ChessAnalysisRequest): Promise<any> {
    const { position, move, gameHistory, analysisType } = request;

    // Create a detailed prompt based on analysis type
    let prompt = '';
    
    switch (analysisType) {
      case 'position':
        prompt = `Analyze this chess position (FEN: ${position}). 
        Consider:
        1. Material balance
        2. Piece activity and coordination
        3. Pawn structure
        4. King safety
        5. Tactical opportunities
        6. Strategic plans for both sides
        
        Provide a detailed analysis with specific move recommendations.`;
        break;

      case 'move':
        prompt = `Analyze the chess move ${move} in position (FEN: ${position}).
        Explain:
        1. The purpose of this move
        2. Tactical and strategic ideas
        3. Potential responses
        4. Alternative moves to consider
        5. Evaluation change after this move`;
        break;

      case 'opening':
        const moves = gameHistory?.join(' ') || '';
        prompt = `Identify and analyze this chess opening: ${moves}
        Current position (FEN: ${position})
        
        Please provide:
        1. Opening name and ECO code
        2. Main ideas and plans
        3. Typical pawn structures
        4. Key squares and piece placement
        5. Common mistakes to avoid
        6. Recommended continuations`;
        break;

      case 'tactics':
        prompt = `Find tactical opportunities in this position (FEN: ${position}).
        Look for:
        1. Checkmate patterns
        2. Forks, pins, and skewers
        3. Discovered attacks
        4. Sacrificial combinations
        5. Forcing sequences
        
        Provide concrete variations with evaluation.`;
        break;

      case 'endgame':
        prompt = `Analyze this endgame position (FEN: ${position}).
        Consider:
        1. Material and pawn structure
        2. King activity
        3. Passed pawns
        4. Key squares
        5. Winning/drawing techniques
        6. Concrete plan to convert advantage or hold the draw`;
        break;
    }

    // Use chess-specific model if available, otherwise general model
    const model = this.installedModels.includes(this.config.models.chess) 
      ? this.config.models.chess 
      : this.config.models.general;

    const response = await this.generate(prompt, model);
    
    if (response) {
      return {
        analysis: response.response,
        model: response.model,
        duration: response.total_duration,
        context: response.context, // Save for follow-up questions
      };
    }

    return null;
  }

  // Multi-agent chess analysis
  async multiAgentAnalysis(position: string, agents: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Define agent prompts
    const agentPrompts: Record<string, string> = {
      tactical: `As a tactical expert, analyze position (FEN: ${position}) for combinations and forcing moves.`,
      positional: `As a positional master, evaluate the strategic elements in position (FEN: ${position}).`,
      opening: `As an opening specialist, identify the opening and suggest theoretical continuations for position (FEN: ${position}).`,
      endgame: `As an endgame expert, evaluate the endgame potential and technique in position (FEN: ${position}).`,
      psychological: `As a chess psychologist, analyze the psychological aspects and practical chances in position (FEN: ${position}).`,
    };

    // Run analysis with each agent
    for (const agent of agents) {
      if (agentPrompts[agent]) {
        const response = await this.generate(agentPrompts[agent]);
        if (response) {
          results.set(agent, {
            analysis: response.response,
            duration: response.total_duration,
          });
        }
      }
    }

    return results;
  }

  // Stream analysis for real-time feedback
  async streamAnalysis(prompt: string, onChunk: (text: string) => void): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.models.general,
          prompt: prompt,
          stream: true,
        }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              onChunk(data.response);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error('Error streaming analysis:', error);
    }
  }

  // Cache analysis results
  async cacheAnalysis(key: string, analysis: any): Promise<void> {
    try {
      const cacheKey = `ollama_analysis_${key}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        analysis,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error caching analysis:', error);
    }
  }

  // Get cached analysis
  async getCachedAnalysis(key: string, maxAge: number = 3600000): Promise<any | null> {
    try {
      const cacheKey = `ollama_analysis_${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < maxAge) {
          return data.analysis;
        }
      }
    } catch (error) {
      console.error('Error getting cached analysis:', error);
    }
    return null;
  }

  // Get available models
  getAvailableModels(): string[] {
    return this.installedModels;
  }

  // Check if a specific model is available
  isModelAvailable(modelName: string): boolean {
    return this.installedModels.includes(modelName);
  }

  // Update configuration
  updateConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
    this.checkAvailability();
  }
}

// Singleton instance
export const ollamaService = new OllamaService();