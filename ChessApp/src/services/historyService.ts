import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MoveReviewItem {
  index: number; // ply index starting from 1
  moveSan: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number; // pawns
  evalAfter: number; // pawns
  delta: number; // evalAfter - evalBefore from side-to-move perspective
  isBlunder: boolean;
}

export interface GameReview {
  id: string;
  createdAt: number;
  result: 'win' | 'loss' | 'draw';
  moves: MoveReviewItem[];
  notes?: string;
}

const STORAGE_KEY = '@ChessApp:GameReviews';

class HistoryService {
  async saveReview(review: GameReview): Promise<void> {
    const existing = await this.getReviews();
    existing.push(review);
    // keep last 20
    const trimmed = existing.slice(-20);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }

  async getReviews(): Promise<GameReview[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as GameReview[]; } catch { return []; }
  }
}

export const historyService = new HistoryService();