use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::{AppState, puzzle_database::{PuzzleDatabase, TacticalPuzzle, Difficulty, Theme}};

#[derive(Debug, Deserialize)]
struct PuzzleQuery {
    difficulty: Option<String>,
    theme: Option<String>,
    limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
struct DeathmatchRequest {
    skill_level: String,
    difficulty: String,
    coach_personality: String,
}

#[derive(Debug, Clone, Serialize)]
struct DeathmatchSession {
    session_id: String,
    puzzles: Vec<TacticalPuzzle>,
    time_limit: u32,
    difficulty: String,
    coach_personality: String,
}

#[derive(Debug, Deserialize)]
struct DeathmatchResult {
    session_id: String,
    results: Vec<PuzzleResult>,
}

#[derive(Debug, Deserialize)]
struct PuzzleResult {
    puzzle_id: u32,
    selected_move: String,
    is_correct: bool,
    time_taken: f32,
}

#[derive(Debug, Deserialize)]
struct PuzzleSolutionRequest {
    puzzle_id: u32,
    moves: Vec<String>, // The moves the user made
}

#[derive(Debug, Serialize)]
struct PuzzleSolutionResponse {
    correct: bool,
    rating_change: i32,
    explanation: String,
    time_taken: f32,
    solution_moves: Vec<String>, // The correct solution
    user_moves: Vec<String>,     // What the user tried
}

#[derive(Debug, Serialize)]
struct DeathmatchResponse {
    session_id: String,
    score: u32,
    puzzles_solved: u32,
    accuracy: f32,
    time_taken: f32,
    new_rating: u32,
    performance_analysis: String,
}

#[derive(Debug, Serialize)]
struct TrainingStats {
    total_puzzles: usize,
    puzzles_by_difficulty: HashMap<String, usize>,
    puzzles_by_theme: HashMap<String, usize>,
    user_progress: UserProgress,
}

#[derive(Debug, Serialize)]
struct UserProgress {
    puzzles_completed: u32,
    current_rating: u32,
    accuracy_rate: f32,
    favorite_themes: Vec<String>,
    weak_areas: Vec<String>,
}

#[derive(Debug, Serialize)]
struct UserProgressResponse {
    puzzles_solved: u32,
    current_rating: u32,
    accuracy: f32,
    best_streak: u32,
    current_streak: u32,
    weakest_themes: Vec<String>,
    strongest_themes: Vec<String>,
    total_time_spent: u32, // in seconds
    puzzles_by_difficulty: HashMap<String, u32>,
    recent_performance: Vec<DailyPerformance>,
}

#[derive(Debug, Serialize)]
struct DailyPerformance {
    date: String,
    puzzles_solved: u32,
    accuracy: f32,
    avg_time: f32,
}

// Global puzzle database (in production, this would be in a proper database)
lazy_static::lazy_static! {
    static ref PUZZLE_DB: PuzzleDatabase = PuzzleDatabase::new();
    static ref ACTIVE_SESSIONS: Arc<tokio::sync::RwLock<HashMap<String, DeathmatchSession>>> = 
        Arc::new(tokio::sync::RwLock::new(HashMap::new()));
}

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/puzzles", get(get_tactical_puzzles))
        .route("/puzzles/solve", post(submit_puzzle_solution))
        .route("/deathmatch/start", post(start_deathmatch))
        .route("/deathmatch/submit", post(submit_deathmatch_result))
        .route("/stats", get(get_training_stats))
        .route("/recommendations", get(get_puzzle_recommendations))
        .route("/progress", get(get_user_progress))
}

/// Get tactical puzzles based on difficulty and theme
async fn get_tactical_puzzles(
    Query(params): Query<PuzzleQuery>,
) -> Result<Json<Vec<TacticalPuzzle>>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(50); // Cap at 50 puzzles

    let puzzles = if let Some(theme_str) = params.theme {
        // Parse theme
        let theme = match theme_str.to_lowercase().as_str() {
            "fork" => Theme::Fork,
            "pin" => Theme::Pin,
            "skewer" => Theme::Skewer,
            "sacrifice" => Theme::Sacrifice,
            "deflection" => Theme::Deflection,
            "discovery" => Theme::Discovery,
            "doubleattack" => Theme::DoubleAttack,
            "backrankmate" => Theme::BackrankMate,
            "smotheredmate" => Theme::SmotheredMate,
            _ => Theme::Fork, // Default
        };
        
        PUZZLE_DB.get_puzzles_by_theme(&theme, limit)
    } else if let Some(difficulty_str) = params.difficulty {
        // Parse difficulty
        let difficulty = match difficulty_str.to_lowercase().as_str() {
            "beginner" => Difficulty::Beginner,
            "intermediate" => Difficulty::Intermediate,
            "advanced" => Difficulty::Advanced,
            "expert" => Difficulty::Expert,
            _ => Difficulty::Beginner, // Default
        };
        
        PUZZLE_DB.get_deathmatch_puzzles(&difficulty, limit)
    } else {
        // Return a mix of all puzzles
        PUZZLE_DB.get_deathmatch_puzzles(&Difficulty::Beginner, limit)
    };

    Ok(Json(puzzles))
}

/// Submit a puzzle solution and check if it's correct
async fn submit_puzzle_solution(
    State(_state): State<AppState>,
    Json(request): Json<PuzzleSolutionRequest>,
) -> Result<Json<PuzzleSolutionResponse>, StatusCode> {
    // Get the puzzle from database
    let puzzles = PUZZLE_DB.get_deathmatch_puzzles(&Difficulty::Beginner, 50);
    let puzzle = puzzles.iter()
        .find(|p| p.id == request.puzzle_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    
    // Check if the moves match the solution
    let correct = request.moves == puzzle.solution;
    
    // Calculate rating change based on puzzle difficulty and correctness
    let rating_change = if correct {
        match puzzle.difficulty {
            Difficulty::Beginner => 5,
            Difficulty::Intermediate => 10,
            Difficulty::Advanced => 15,
            Difficulty::Expert => 20,
        }
    } else {
        -3 // Small penalty for wrong answer
    };
    
    // Generate explanation
    let explanation = if correct {
        format!(
            "Excellent! You found the {:?} pattern. {}",
            puzzle.theme,
            puzzle.description
        )
    } else {
        format!(
            "Not quite right. This puzzle demonstrates a {:?} pattern. The correct solution is: {}. {}",
            puzzle.theme,
            puzzle.solution.join(" "),
            puzzle.description
        )
    };
    
    // Mock time taken (in real app, this would be tracked client-side)
    let time_taken = 8.5;
    
    let response = PuzzleSolutionResponse {
        correct,
        rating_change,
        explanation,
        time_taken,
        solution_moves: puzzle.solution.clone(),
        user_moves: request.moves,
    };
    
    tracing::info!(
        "Puzzle {} solution submitted: {} (rating change: {})",
        request.puzzle_id,
        if correct { "correct" } else { "incorrect" },
        rating_change
    );
    
    Ok(Json(response))
}

/// Start a deathmatch training session (CS:GO style)
async fn start_deathmatch(
    State(_state): State<AppState>,
    Json(request): Json<DeathmatchRequest>,
) -> Result<Json<DeathmatchSession>, StatusCode> {
    let session_id = Uuid::new_v4().to_string();
    
    // Parse difficulty
    let difficulty = match request.difficulty.to_lowercase().as_str() {
        "easy" => Difficulty::Beginner,
        "medium" => Difficulty::Intermediate,
        "hard" => Difficulty::Advanced,
        "expert" => Difficulty::Expert,
        _ => Difficulty::Beginner,
    };

    // Get 20 puzzles for deathmatch (CS:GO style rapid-fire)
    let puzzles = PUZZLE_DB.get_deathmatch_puzzles(&difficulty, 20);
    
    let session = DeathmatchSession {
        session_id: session_id.clone(),
        puzzles: puzzles.clone(),
        time_limit: 10, // 10 seconds per puzzle
        difficulty: request.difficulty,
        coach_personality: request.coach_personality,
    };

    // Store session for later result submission
    {
        let mut sessions = ACTIVE_SESSIONS.write().await;
        sessions.insert(session_id.clone(), session.clone());
    }

    tracing::info!("Started deathmatch session: {}", session_id);
    
    Ok(Json(session))
}

/// Submit deathmatch training results
async fn submit_deathmatch_result(
    State(_state): State<AppState>,
    Json(request): Json<DeathmatchResult>,
) -> Result<Json<DeathmatchResponse>, StatusCode> {
    // Retrieve session
    let session = {
        let sessions = ACTIVE_SESSIONS.read().await;
        sessions.get(&request.session_id).cloned()
    };

    let session = match session {
        Some(s) => s,
        None => return Err(StatusCode::NOT_FOUND),
    };

    // Calculate performance metrics
    let total_puzzles = request.results.len() as u32;
    let correct_count = request.results.iter().filter(|r| r.is_correct).count() as u32;
    let accuracy = if total_puzzles > 0 {
        (correct_count as f32 / total_puzzles as f32) * 100.0
    } else {
        0.0
    };
    
    let total_time: f32 = request.results.iter().map(|r| r.time_taken).sum();
    let avg_time_per_puzzle = if total_puzzles > 0 {
        total_time / total_puzzles as f32
    } else {
        0.0
    };

    // Calculate score (CS:GO style scoring)
    let base_score = correct_count * 100;
    let time_bonus = if avg_time_per_puzzle < 5.0 {
        ((5.0 - avg_time_per_puzzle) * 50.0) as u32
    } else {
        0
    };
    let streak_bonus = calculate_streak_bonus(&request.results);
    
    let total_score = base_score + time_bonus + streak_bonus;

    // Calculate new rating (simplified ELO-like system)
    let rating_change = calculate_rating_change(accuracy, avg_time_per_puzzle, &session.difficulty);
    let new_rating = (1200 + rating_change).max(0) as u32; // Assuming 1200 base rating

    // Performance analysis
    let performance_analysis = generate_performance_analysis(
        accuracy,
        avg_time_per_puzzle,
        &request.results,
        &session.coach_personality,
    );

    let response = DeathmatchResponse {
        session_id: request.session_id.clone(),
        score: total_score,
        puzzles_solved: total_puzzles,
        accuracy,
        time_taken: total_time,
        new_rating,
        performance_analysis,
    };

    // Clean up session
    {
        let mut sessions = ACTIVE_SESSIONS.write().await;
        sessions.remove(&request.session_id);
    }

    tracing::info!(
        "Deathmatch completed: {} - Score: {}, Accuracy: {:.1}%",
        request.session_id,
        total_score,
        accuracy
    );

    Ok(Json(response))
}

/// Get training statistics
async fn get_training_stats(
    State(_state): State<AppState>,
) -> Result<Json<TrainingStats>, StatusCode> {
    let puzzle_stats = PUZZLE_DB.get_puzzle_stats();
    
    let mut puzzles_by_difficulty = HashMap::new();
    let mut puzzles_by_theme = HashMap::new();
    
    let total_puzzles = puzzle_stats.get("total_puzzles").copied().unwrap_or(0);
    
    for (key, value) in &puzzle_stats {
        if key.contains("beginner") || key.contains("intermediate") || 
           key.contains("advanced") || key.contains("expert") {
            puzzles_by_difficulty.insert(key.clone(), *value);
        } else if key != "total_puzzles" {
            puzzles_by_theme.insert(key.clone(), *value);
        }
    }

    let stats = TrainingStats {
        total_puzzles,
        puzzles_by_difficulty,
        puzzles_by_theme,
        user_progress: UserProgress {
            puzzles_completed: 0, // Would come from database
            current_rating: 1200,
            accuracy_rate: 0.0,
            favorite_themes: vec!["fork".to_string(), "pin".to_string()],
            weak_areas: vec!["endgame".to_string()],
        },
    };

    Ok(Json(stats))
}

/// Get personalized puzzle recommendations
async fn get_puzzle_recommendations(
    State(_state): State<AppState>,
) -> Result<Json<Vec<TacticalPuzzle>>, StatusCode> {
    // In a real app, this would analyze user's performance
    let user_rating = 1200; // Would come from user session
    let weak_themes = vec![Theme::Fork, Theme::Pin]; // Would come from analysis
    
    let recommendations = PUZZLE_DB.get_recommended_puzzles(user_rating, weak_themes, 10);
    
    Ok(Json(recommendations))
}

/// Get user progress for training
async fn get_user_progress(
    State(_state): State<AppState>,
) -> Result<Json<UserProgressResponse>, StatusCode> {
    // In production, this would fetch from database based on user ID from auth token
    // For now, returning mock data that shows realistic progress
    
    let progress = UserProgressResponse {
        puzzles_solved: 247,
        current_rating: 1350,
        accuracy: 78.5,
        best_streak: 15,
        current_streak: 3,
        weakest_themes: vec![
            "Endgame".to_string(),
            "Positional".to_string(),
            "Sacrifice".to_string(),
        ],
        strongest_themes: vec![
            "Fork".to_string(),
            "Pin".to_string(),
            "Back Rank Mate".to_string(),
        ],
        total_time_spent: 3600, // 1 hour in seconds
        puzzles_by_difficulty: HashMap::from([
            ("Beginner".to_string(), 150),
            ("Intermediate".to_string(), 80),
            ("Advanced".to_string(), 17),
            ("Expert".to_string(), 0),
        ]),
        recent_performance: vec![
            DailyPerformance {
                date: "2025-08-01".to_string(),
                puzzles_solved: 15,
                accuracy: 80.0,
                avg_time: 4.5,
            },
            DailyPerformance {
                date: "2025-07-31".to_string(),
                puzzles_solved: 22,
                accuracy: 77.3,
                avg_time: 5.2,
            },
            DailyPerformance {
                date: "2025-07-30".to_string(),
                puzzles_solved: 18,
                accuracy: 83.3,
                avg_time: 4.1,
            },
        ],
    };
    
    Ok(Json(progress))
}

// Helper functions

fn calculate_streak_bonus(results: &[PuzzleResult]) -> u32 {
    let mut max_streak = 0;
    let mut current_streak = 0;
    
    for result in results {
        if result.is_correct {
            current_streak += 1;
            max_streak = max_streak.max(current_streak);
        } else {
            current_streak = 0;
        }
    }
    
    // Bonus for streaks (CS:GO style)
    match max_streak {
        0..=2 => 0,
        3..=5 => 50,
        6..=10 => 150,
        11..=15 => 300,
        _ => 500,
    }
}

fn calculate_rating_change(accuracy: f32, avg_time: f32, difficulty: &str) -> i32 {
    let base_change = match difficulty {
        "easy" => (accuracy - 70.0) as i32,
        "medium" => (accuracy - 60.0) as i32 * 2,
        "hard" => (accuracy - 50.0) as i32 * 3,
        "expert" => (accuracy - 40.0) as i32 * 4,
        _ => 0,
    };
    
    let time_modifier = if avg_time < 5.0 { 10 } else { -5 };
    
    (base_change + time_modifier).clamp(-100, 100)
}

fn generate_performance_analysis(
    accuracy: f32,
    avg_time: f32,
    _results: &[PuzzleResult],
    coach_personality: &str,
) -> String {
    let performance_level = match accuracy {
        90.0..=100.0 => "LEGENDARY",
        80.0..=89.9 => "EXCELLENT",
        70.0..=79.9 => "GOOD",
        60.0..=69.9 => "AVERAGE",
        _ => "NEEDS_WORK",
    };

    let speed_analysis = if avg_time < 3.0 {
        "Lightning fast reflexes!"
    } else if avg_time < 5.0 {
        "Great speed and accuracy balance"
    } else if avg_time < 7.0 {
        "Take more time to think"
    } else {
        "Focus on pattern recognition"
    };

    match coach_personality {
        "TacticalAssassin" => format!(
            "⚔️ {} PERFORMANCE! {} Your tactical vision is {}. Keep training to dominate!",
            performance_level, speed_analysis, if accuracy > 75.0 { "sharp" } else { "developing" }
        ),
        "PositionalMaster" => format!(
            "🏛️ {} showing. {} Remember: patience and calculation win games. Accuracy: {:.1}%",
            performance_level, speed_analysis, accuracy
        ),
        "EndgameSpecialist" => format!(
            "🏰 {} technique. {} In endgames, precision matters more than speed. Keep practicing!",
            performance_level, speed_analysis
        ),
        _ => format!(
            "Performance: {} | Speed: {} | Accuracy: {:.1}%",
            performance_level, speed_analysis, accuracy
        ),
    }
}