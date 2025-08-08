export interface ChessAnalysis {
  evaluation: string;
  bestMoves: string[];
  explanation: string;
  strategicAdvice: string;
  tacticalHints: string[];
  difficulty: number;
}

export interface AIModelInfo {
  id: string;
  label: string;
  sizeGB?: number;
  capability: 'light' | 'standard' | 'advanced';
}

export interface AIProvider {
  getName(): string;
  getAvailableModels(): Promise<AIModelInfo[]>;
  setModel(modelId: string): Promise<void>;
  initialize(): Promise<void>;
  isAvailable(): Promise<boolean>;
  analyzePosition(fen: string, lastMove: string | null, playerRating: number): Promise<ChessAnalysis>;
  explainMoveStream(fen: string, moveSan: string, playerLevel: number): AsyncGenerator<string>;
  askQuestionStream(context: string, question: string): AsyncGenerator<string>;
}