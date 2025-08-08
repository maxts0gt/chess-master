import { AIProvider, AIModelInfo, ChessAnalysis } from '../AIProvider';
import { mistralChess } from '../../mistralService';

export class LocalMistralProvider implements AIProvider {
  private currentModel: string = 'mistral-3b-chess';

  getName(): string { return 'local-mistral'; }

  async getAvailableModels(): Promise<AIModelInfo[]> {
    return [
      { id: 'mistral-3b-chess', label: 'Mistral 3B (Chess)', sizeGB: 1.8, capability: 'standard' },
      { id: 'mistral-7b-chess', label: 'Mistral 7B (Chess)', sizeGB: 4.2, capability: 'advanced' },
    ];
  }

  async setModel(modelId: string): Promise<void> {
    this.currentModel = modelId;
  }

  async initialize(): Promise<void> {
    await mistralChess.initialize(this.currentModel as any);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async analyzePosition(fen: string, lastMove: string | null, playerRating: number): Promise<ChessAnalysis> {
    return mistralChess.analyzePosition(fen, lastMove, playerRating);
  }

  async *explainMoveStream(fen: string, moveSan: string, playerLevel: number): AsyncGenerator<string> {
    const text = await mistralChess.explainMove(fen, moveSan, playerLevel);
    yield text;
  }

  async *askQuestionStream(context: string, question: string): AsyncGenerator<string> {
    const text = await mistralChess.askQuestion(context, question);
    yield text;
  }
}