/**
 * Mistral 7B Worker
 * Handles LLM inference for chess coaching
 */

import { initLlama, LlamaContext } from 'llama.rn';

export interface MistralOptions {
  modelPath: string;
  contextSize?: number;
  gpuLayers?: number;
  threads?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class MistralWorker {
  private context: LlamaContext | null = null;
  private modelPath: string = '';
  private initialized = false;
  
  // Chess coaching system prompt
  private readonly systemPrompt = `You are a friendly chess coach helping players improve their game.
Keep explanations concise (under 60 words) and focus on key strategic concepts.
Use simple language that beginners can understand.
Be encouraging and positive in your feedback.`;

  async initialize(options: MistralOptions): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Mistral 7B...');
      
      this.modelPath = options.modelPath;
      
      // Initialize llama.cpp context
      this.context = await initLlama({
        model: this.modelPath,
        use_mlock: true, // Keep model in RAM
        n_ctx: options.contextSize || 2048,
        n_batch: 512,
        n_threads: options.threads || 4,
        // GPU acceleration (iOS Metal)
        n_gpu_layers: options.gpuLayers || 0,
      });
      
      this.initialized = true;
      console.log('Mistral 7B initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mistral:', error);
      throw error;
    }
  }

  /**
   * Generate streaming response for a prompt
   */
  async* generateStream(
    messages: ChatMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      stopWords?: string[];
    } = {}
  ): AsyncGenerator<string> {
    if (!this.context || !this.initialized) {
      throw new Error('Mistral not initialized');
    }

    try {
      // Format messages for Mistral
      const prompt = this.formatPrompt(messages);
      
      // Default stop words
      const stopWords = options.stopWords || [
        '</s>',
        '<|im_end|>',
        '[/INST]',
        'User:',
        'Human:',
      ];
      
      // Start completion with streaming
      const response = await this.context.completion(
        {
          prompt,
          n_predict: options.maxTokens || 200,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          stop: stopWords,
        },
        (tokenData) => {
          // This callback is called for each token
          return tokenData;
        }
      );
      
      // Stream tokens
      const text = response.text || '';
      const words = text.split(' ');
      
      for (const word of words) {
        yield word + ' ';
        // Small delay for natural streaming effect
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  /**
   * Generate complete response (non-streaming)
   */
  async generate(
    messages: ChatMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    } = {}
  ): Promise<string> {
    if (!this.context || !this.initialized) {
      throw new Error('Mistral not initialized');
    }

    try {
      const prompt = this.formatPrompt(messages);
      
      const response = await this.context.completion({
        prompt,
        n_predict: options.maxTokens || 200,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        stop: ['</s>', '[/INST]'],
      });
      
      return response.text?.trim() || '';
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  /**
   * Format messages into Mistral prompt format
   */
  private formatPrompt(messages: ChatMessage[]): string {
    let prompt = '';
    
    // Add system prompt if not present
    const hasSystem = messages.some(m => m.role === 'system');
    if (!hasSystem) {
      prompt += `<s>[INST] ${this.systemPrompt} [/INST]</s>\n`;
    }
    
    // Format messages in Mistral format
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `<s>[INST] ${message.content} [/INST]</s>\n`;
          break;
        case 'user':
          prompt += `<s>[INST] ${message.content} [/INST]`;
          break;
        case 'assistant':
          prompt += ` ${message.content}</s>\n`;
          break;
      }
    }
    
    return prompt;
  }

  /**
   * Get token count for a text
   */
  async tokenize(text: string): Promise<number[]> {
    if (!this.context) {
      throw new Error('Mistral not initialized');
    }
    
    const result = await this.context.tokenize(text);
    return result.tokens;
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.initialized && this.context !== null;
  }

  /**
   * Get model info
   */
  async getModelInfo(): Promise<any> {
    if (!this.context) {
      throw new Error('Mistral not initialized');
    }
    
    return {
      modelPath: this.modelPath,
      contextSize: 2048,
      ready: this.initialized,
    };
  }

  /**
   * Release resources
   */
  async release(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.initialized = false;
    }
  }
}

export const mistralWorker = new MistralWorker();