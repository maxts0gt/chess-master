import { aiProviders } from '../ai/ProviderRegistry';

export class CoachFacade {
  private initialized = false;
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await aiProviders.initialize();
    this.initialized = true;
  }

  async *askQuestionStream(context: string, question: string): AsyncGenerator<string> {
    await this.initialize();
    const provider = aiProviders.getCurrent();
    const stream = provider.askQuestionStream(context, question);
    for await (const token of stream) {
      yield token;
    }
  }

  async *explainMoveStream(fen: string, moveSan: string, playerLevel = 1500): AsyncGenerator<string> {
    await this.initialize();
    const provider = aiProviders.getCurrent();
    const stream = provider.explainMoveStream(fen, moveSan, playerLevel);
    for await (const token of stream) {
      yield token;
    }
  }
}

export const coachFacade = new CoachFacade();