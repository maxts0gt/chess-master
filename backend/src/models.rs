use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub elo_rating: i32,
    pub subscription_tier: SubscriptionTier,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "subscription_tier", rename_all = "lowercase")]
pub enum SubscriptionTier {
    Free,
    Paid,
    Premium,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Game {
    pub id: Uuid,
    pub white_player_id: Option<Uuid>,
    pub black_player_id: Option<Uuid>,
    pub pgn: String,
    pub result: Option<GameResult>,
    pub time_control: Option<String>,
    pub created_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "game_result", rename_all = "lowercase")]
pub enum GameResult {
    WhiteWins,  // 1-0
    BlackWins,  // 0-1
    Draw,       // 1/2-1/2
    Ongoing,    // *
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TacticalPuzzle {
    pub id: Uuid,
    pub fen: String,
    pub solution: String, // JSON array of moves
    pub rating: i32,
    pub themes: String,   // JSON array of tactical themes
    pub popularity: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserProgress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub puzzle_id: Uuid,
    pub solved: bool,
    pub time_taken: Option<i32>, // milliseconds
    pub attempts: i32,
    pub solved_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TrainingSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub session_type: TrainingType,
    pub puzzles_solved: i32,
    pub accuracy: f32,
    pub average_time: f32,
    pub rating_change: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "training_type", rename_all = "snake_case")]
pub enum TrainingType {
    TacticalDeathmatch,
    PatternRecognition,
    EndgameTraining,
    OpeningPractice,
    PositionalAnalysis,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AICoachingResponse {
    pub analysis: String,
    pub suggestions: Vec<String>,
    pub personality: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub elo_rating: i32,
    pub subscription_tier: SubscriptionTier,
    pub games_played: i32,
    pub puzzles_solved: i32,
    pub win_rate: f32,
}

// Chess-specific models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyzePositionRequest {
    pub fen: String,
    pub depth: Option<u8>,
    pub ai_coaching: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionAnalysis {
    pub evaluation: f32,
    pub best_move: String,
    pub principal_variation: Vec<String>,
    pub tactical_themes: Vec<String>,
    pub ai_coaching: Option<AICoachingResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TacticalPuzzleRequest {
    pub rating_range: Option<(i32, i32)>,
    pub themes: Option<Vec<String>>,
    pub count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PuzzleSolutionRequest {
    pub puzzle_id: Uuid,
    pub moves: Vec<String>,
    pub time_taken: i32,
}