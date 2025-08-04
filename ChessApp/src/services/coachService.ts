/**
 * AI Chess Coach Service
 * 
 * Powered by Mistral 7B for ChatGPT-quality explanations
 * Provides human-like chess coaching completely offline
 */

import { mistralWorker, ChatMessage } from './mistralWorker';
import { modelDownloader } from './modelDownloadService';

interface CoachOptions {
  maxTokens?: number;
  temperature?: number;
  style?: 'friendly' | 'professional' | 'casual';
}

class CoachService {
  private initialized = false;
  private modelFilename = 'mistral-7b-instruct-v0.2.Q4_K_M.gguf';
  
  // Coach personality template
  private contextTemplate = `You are a friendly chess coach helping players improve their game.
Keep explanations concise (50 words or less) and focus on key strategic concepts.
Current position: {fen}
Last move: {move}
Explain this move in simple terms:`;

  /**
   * Initialize Mistral 7B model
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Mistral 7B coach...');
      
      // Check if model exists, if not it needs to be downloaded first
      const modelInfo = await modelDownloader.getModelInfo(this.modelFilename);
      if (!modelInfo.exists) {
        console.log('Mistral model not found locally. Please download it first.');
        this.initialized = false;
        return;
      }
      
      // Initialize Mistral with optimized settings for mobile
      await mistralWorker.initialize({
        modelPath: modelInfo.path!,
        contextSize: 2048,
        threads: 4,
        gpuLayers: 0, // Will be set based on device capabilities
      });
      
      this.initialized = mistralWorker.isReady();
      console.log('Coach initialized successfully');
    } catch (error) {
      console.error('Failed to initialize coach:', error);
      // Don't throw - app should work even without coach
      this.initialized = false;
    }
  }

  /**
   * Explain a chess move in human-friendly terms
   * @param fen - Current board position
   * @param move - Move to explain (in SAN notation)
   * @param options - Coaching options
   * @returns Stream of explanation tokens
   */
  async* explainMove(
    fen: string, 
    move: string,
    options: CoachOptions = {}
  ): AsyncGenerator<string> {
    if (!this.initialized) {
      yield "Coach is not available offline. Please check back later.";
      return;
    }

    const prompt = this.contextTemplate
      .replace('{fen}', fen)
      .replace('{move}', move);

    try {
      // Create chat messages for Mistral
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: prompt
        }
      ];

      // Stream tokens from Mistral
      const stream = mistralWorker.generateStream(messages, {
        maxTokens: options.maxTokens || 60,
        temperature: options.temperature || 0.7,
      });
      
      for await (const token of stream) {
        yield token;
      }
    } catch (error) {
      console.error('Coach error:', error);
      
      // Fallback to mock response if Mistral fails
      if (!mistralWorker.isReady()) {
        const mockResponse = this.getMockExplanation(move);
        for (const word of mockResponse.split(' ')) {
          yield word + ' ';
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else {
        yield "Sorry, I couldn't analyze this move right now.";
      }
    }
  }

  /**
   * Get coaching tips for current position
   */
  async getPositionTips(fen: string): Promise<string[]> {
    if (!this.initialized) {
      // Return generic tips if coach not available
      return [
        "Control the center with your pawns",
        "Develop knights before bishops",
        "Castle early for king safety"
      ];
    }

    try {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: `You are a chess coach. Analyze this position and give 3 short tips:
FEN: ${fen}
Format: Return each tip on a new line, keep them under 10 words each.`
        }
      ];

      const response = await mistralWorker.generate(messages, {
        maxTokens: 100,
        temperature: 0.5,
      });

      // Parse response into tips
      const tips = response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3);

      return tips.length > 0 ? tips : [
        "Control the center with your pawns",
        "Develop knights before bishops",
        "Castle early for king safety"
      ];
    } catch (error) {
      console.error('Failed to get position tips:', error);
      return [
        "Control the center with your pawns",
        "Develop knights before bishops",
        "Castle early for king safety"
      ];
    }
  }

  /**
   * Temporary mock explanations
   */
  private getMockExplanation(move: string): string {
    const explanations = [
      "This develops a piece and controls key central squares.",
      "Excellent! This move improves piece coordination and opens new tactical possibilities.",
      "A solid defensive move that strengthens your position.",
      "This creates attacking chances while maintaining a solid structure.",
      "Good technique! This simplifies the position in your favor."
    ];
    
    return explanations[Math.floor(Math.random() * explanations.length)];
  }

  /**
   * Check if coach is available
   */
  isAvailable(): boolean {
    return this.initialized && mistralWorker.isReady();
  }

  /**
   * Cleanup resources
   */
  async terminate() {
    if (this.initialized) {
      await mistralWorker.release();
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const coach = new CoachService();