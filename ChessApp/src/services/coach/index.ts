export class CoachFacade {
  private initialized = false;
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const { premiumService } = await import('../premiumService');
      await premiumService.initialize();
      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  async *askQuestionStream(context: string, question: string): AsyncGenerator<string> {
    // Prefer streaming coachService if available
    try {
      const { coach } = await import('../coachService');
      // coachService doesn't expose generic stream; we simulate by calling mistral
      const { mistralChess } = await import('../mistralService');
      const text = await mistralChess.askQuestion(context, question);
      yield text;
      return;
    } catch (e) {
      // Fallback generic
      yield "I'm analyzing this position...";
    }
  }

  async *explainMoveStream(fen: string, moveSan: string, playerLevel = 1500): AsyncGenerator<string> {
    try {
      const { coach } = await import('../coachService');
      // Use coachService streaming if initialized
      const stream = coach.explainMove(fen, moveSan, { maxTokens: 120, temperature: 0.7 });
      for await (const token of stream) {
        yield token;
      }
      return;
    } catch {
      const { mistralChess } = await import('../mistralService');
      const text = await mistralChess.explainMove(fen, moveSan, playerLevel);
      yield text;
    }
  }
}

export const coachFacade = new CoachFacade();