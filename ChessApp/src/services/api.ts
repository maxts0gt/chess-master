// API Service for Chess App Backend Communication
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
export const BACKEND_URL = __DEV__ 
  ? 'http://localhost:8080/api/v1'  // Development
  : 'https://your-domain.com/api/v1';  // Production

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  elo_rating: number;
  subscription_tier: 'free' | 'paid' | 'premium';
  games_played: number;
  puzzles_solved: number;
  win_rate: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

export interface ChessAnalysis {
  evaluation: number;
  best_move: string;
  depth: number;
  nodes: number;
  time_ms: number;
  tactical_patterns: string[];
}

export interface AICoachingResponse {
  analysis: string;
  suggestions: string[];
  personality: string;
  confidence: number;
  agent_used: string;
}

export interface MoveAnalysis {
  move_notation: string;
  evaluation: number;
  reasoning: string;
  tactical_themes: string[];
}

export interface MoveSuggestions {
  moves: MoveAnalysis[];
  reasoning: string;
  agent_personality: string;
}

export interface CoachingPersonality {
  id: string;
  name: string;
  description: string;
  personality: string;
  specialization: string;
  difficulty: string;
  best_for: string[];
}

export interface TrainingPlan {
  daily_puzzles: number;
  focus_areas: string[];
  difficulty_level: string;
  estimated_improvement: string;
  agent_recommendations: {
    agent: string;
    description: string;
    best_for: string[];
  }[];
}

// API Client Class
class ChessAPIClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Authentication API
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async refreshToken(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
  }

  // Chess Engine API
  async analyzePosition(fen: string, depth?: number): Promise<ChessAnalysis> {
    return this.request<ChessAnalysis>('/chess/analyze', {
      method: 'POST',
      body: JSON.stringify({ fen, depth }),
    });
  }

  async validateFen(fen: string): Promise<{ valid: boolean; message: string }> {
    return this.request<{ valid: boolean; message: string }>('/chess/validate-fen', {
      method: 'POST',
      body: JSON.stringify({ fen }),
    });
  }

  async createGame(white_player_id?: string, black_player_id?: string): Promise<{
    game_id: string;
    fen: string;
    message: string;
  }> {
    return this.request('/chess/games', {
      method: 'POST',
      body: JSON.stringify({ white_player_id, black_player_id }),
    });
  }

  async getGame(gameId: string): Promise<{
    game_id: string;
    white_player_id?: string;
    black_player_id?: string;
    fen: string;
    pgn: string;
    result?: string;
    time_control?: string;
    created_at: string;
  }> {
    return this.request(`/chess/games/${gameId}`, {
      method: 'GET',
    });
  }

  async makeMove(gameId: string, from: string, to: string, promotion?: string): Promise<{
    success: boolean;
    new_fen: string;
    move_notation: string;
    is_check: boolean;
    is_checkmate: boolean;
    is_stalemate: boolean;
    message: string;
  }> {
    return this.request(`/chess/games/${gameId}/moves`, {
      method: 'POST',
      body: JSON.stringify({ from, to, promotion }),
    });
  }

  // AI Coaching API
  async getCoachingPersonalities(): Promise<CoachingPersonality[]> {
    return this.request<CoachingPersonality[]>('/ai/coaching/personalities', {
      method: 'GET',
    });
  }

  async analyzeGameWithAI(fen: string, agent?: string): Promise<AICoachingResponse> {
    return this.request<AICoachingResponse>('/ai/coaching/analyze', {
      method: 'POST',
      body: JSON.stringify({ fen, agent }),
    });
  }

  async getSuggestedMoves(
    fen: string, 
    agent?: string, 
    moveCount?: number
  ): Promise<MoveSuggestions> {
    return this.request<MoveSuggestions>('/ai/coaching/suggest', {
      method: 'POST',
      body: JSON.stringify({ fen, agent, move_count: moveCount }),
    });
  }

  async getTrainingPlan(): Promise<TrainingPlan> {
    return this.request<TrainingPlan>('/ai/coaching/plan', {
      method: 'GET',
    });
  }

  // Training API
  async getTacticalPuzzle(theme?: string, difficulty?: string): Promise<{
    id: number;
    fen: string;
    solution: string[];
    theme: string;
    difficulty: string;
    rating: number;
  }> {
    const params = new URLSearchParams();
    if (theme) params.append('theme', theme);
    if (difficulty) params.append('difficulty', difficulty);
    
    return this.request(`/training/puzzles?${params.toString()}`, {
      method: 'GET',
    });
  }

  async submitPuzzleSolution(puzzleId: number, moves: string[]): Promise<{
    correct: boolean;
    rating_change: number;
    explanation: string;
    time_taken: number;
  }> {
    return this.request('/training/puzzles/solve', {
      method: 'POST',
      body: JSON.stringify({ puzzle_id: puzzleId, moves }),
    });
  }

  async startDeathmatchSession(skillLevel: string): Promise<{
    session_id: string;
    puzzles: any[];
    time_limit: number;
  }> {
    return this.request('/training/deathmatch/start', {
      method: 'POST',
      body: JSON.stringify({ skill_level: skillLevel }),
    });
  }

  async submitDeathmatchResult(sessionId: string, results: any[]): Promise<{
    score: number;
    accuracy: number;
    time_bonus: number;
    rating_change: number;
    next_level: string;
  }> {
    return this.request('/training/deathmatch/submit', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, results }),
    });
  }

  // User Progress API
  async getUserProgress(): Promise<{
    puzzles_solved: number;
    current_rating: number;
    accuracy: number;
    best_streak: number;
    weakest_themes: string[];
    strongest_themes: string[];
  }> {
    return this.request('/training/progress', {
      method: 'GET',
    });
  }

  async getUserStats(): Promise<{
    total_games: number;
    wins: number;
    losses: number;
    draws: number;
    win_rate: number;
    average_game_time: number;
    favorite_openings: string[];
    time_spent_training: number;
  }> {
    return this.request('/users/stats', {
      method: 'GET',
    });
  }

  // Health Check
  async healthCheck(): Promise<{
    status: string;
    version: string;
    timestamp: string;
  }> {
    return this.request('/health', {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const apiClient = new ChessAPIClient();

// Convenience functions for React components
export const useAPI = () => {
  return {
    // Auth
    login: apiClient.login.bind(apiClient),
    register: apiClient.register.bind(apiClient),
    
    // Chess
    analyzePosition: apiClient.analyzePosition.bind(apiClient),
    validateFen: apiClient.validateFen.bind(apiClient),
    createGame: apiClient.createGame.bind(apiClient),
    getGame: apiClient.getGame.bind(apiClient),
    makeMove: apiClient.makeMove.bind(apiClient),
    
    // AI Coaching
    getCoachingPersonalities: apiClient.getCoachingPersonalities.bind(apiClient),
    analyzeGameWithAI: apiClient.analyzeGameWithAI.bind(apiClient),
    getSuggestedMoves: apiClient.getSuggestedMoves.bind(apiClient),
    getTrainingPlan: apiClient.getTrainingPlan.bind(apiClient),
    
    // Training
    getTacticalPuzzle: apiClient.getTacticalPuzzle.bind(apiClient),
    submitPuzzleSolution: apiClient.submitPuzzleSolution.bind(apiClient),
    startDeathmatchSession: apiClient.startDeathmatchSession.bind(apiClient),
    submitDeathmatchResult: apiClient.submitDeathmatchResult.bind(apiClient),
    
    // Progress
    getUserProgress: apiClient.getUserProgress.bind(apiClient),
    getUserStats: apiClient.getUserStats.bind(apiClient),
    
    // Health
    healthCheck: apiClient.healthCheck.bind(apiClient),
  };
};