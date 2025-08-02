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
use sqlx::SqlitePool;
use chrono::{DateTime, Utc, NaiveDate};

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
    State(state): State<AppState>,
    Json(request): Json<PuzzleSolutionRequest>,
) -> Result<Json<PuzzleSolutionResponse>, StatusCode> {
    // TODO: Extract user_id from JWT token
    let user_id = "test-user-001";
    
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
    
    // Save puzzle attempt to database
    let pool = &state.db_pool;
    let time_taken = 30; // TODO: Get actual time from frontend
    
    // Insert puzzle attempt
    sqlx::query!(
        r#"
        INSERT INTO puzzles_solved (user_id, puzzle_id, solved, time_taken_seconds, attempts)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(user_id, puzzle_id) DO UPDATE SET
            solved = CASE WHEN excluded.solved THEN 1 ELSE puzzles_solved.solved END,
            attempts = puzzles_solved.attempts + 1,
            time_taken_seconds = excluded.time_taken_seconds
        "#,
        user_id,
        request.puzzle_id as i32,
        correct,
        time_taken
    )
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to save puzzle attempt: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    // Update user stats
    if correct {
        // Update streak and puzzle count
        sqlx::query!(
            r#"
            INSERT INTO user_stats (user_id, puzzles_solved, puzzles_attempted, current_puzzle_streak, best_puzzle_streak, total_training_time)
            VALUES (?, 1, 1, 1, 1, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                puzzles_solved = user_stats.puzzles_solved + 1,
                puzzles_attempted = user_stats.puzzles_attempted + 1,
                current_puzzle_streak = user_stats.current_puzzle_streak + 1,
                best_puzzle_streak = MAX(user_stats.best_puzzle_streak, user_stats.current_puzzle_streak + 1),
                total_training_time = user_stats.total_training_time + ?,
                updated_at = CURRENT_TIMESTAMP
            "#,
            user_id,
            time_taken,
            time_taken
        )
        .execute(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update user stats: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        
        // Update user rating
        sqlx::query!(
            r#"
            UPDATE users 
            SET rating = rating + ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
            rating_change,
            user_id
        )
        .execute(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update user rating: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    } else {
        // Reset streak on wrong answer
        sqlx::query!(
            r#"
            INSERT INTO user_stats (user_id, puzzles_attempted, current_puzzle_streak, total_training_time)
            VALUES (?, 1, 0, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                puzzles_attempted = user_stats.puzzles_attempted + 1,
                current_puzzle_streak = 0,
                total_training_time = user_stats.total_training_time + ?,
                updated_at = CURRENT_TIMESTAMP
            "#,
            user_id,
            time_taken,
            time_taken
        )
        .execute(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update user stats: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }
    
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
    
    let response = PuzzleSolutionResponse {
        correct,
        rating_change,
        explanation,
        time_taken: time_taken as f32,
        solution_moves: puzzle.solution.clone(),
        user_moves: request.moves,
    };
    
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
    State(state): State<AppState>,
) -> Result<Json<UserProgressResponse>, StatusCode> {
    // TODO: In production, extract user_id from JWT token in header
    // For now, using a test user ID or creating one if none exists
    let test_user_id = "test-user-001";
    
    // Get database pool
    let pool = &state.db_pool;
    
    // Fetch user stats from database
    let user_stats = sqlx::query!(
        r#"
        SELECT 
            COALESCE(us.puzzles_solved, 0) as puzzles_solved,
            COALESCE(us.puzzles_attempted, 0) as puzzles_attempted,
            COALESCE(us.best_puzzle_streak, 0) as best_streak,
            COALESCE(us.current_puzzle_streak, 0) as current_streak,
            COALESCE(us.total_training_time, 0) as total_time,
            COALESCE(u.rating, 1200) as rating
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        WHERE u.id = ?
        "#,
        test_user_id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    let (puzzles_solved, puzzles_attempted, best_streak, current_streak, total_time, rating) = 
        if let Some(stats) = user_stats {
            (
                stats.puzzles_solved as u32,
                stats.puzzles_attempted as u32,
                stats.best_streak as u32,
                stats.current_streak as u32,
                stats.total_time as u32,
                stats.rating as u32,
            )
        } else {
            // Default values for new users
            (0, 0, 0, 0, 0, 1200)
        };
    
    // Calculate accuracy
    let accuracy = if puzzles_attempted > 0 {
        (puzzles_solved as f32 / puzzles_attempted as f32) * 100.0
    } else {
        0.0
    };
    
    // Fetch puzzle performance by theme
    let theme_performance = sqlx::query!(
        r#"
        SELECT 
            theme,
            COUNT(*) as attempts,
            SUM(CASE WHEN solved THEN 1 ELSE 0 END) as solved
        FROM (
            SELECT 
                ps.solved,
                'Fork' as theme  -- TODO: Add theme to puzzles_solved table
            FROM puzzles_solved ps
            WHERE ps.user_id = ?
        )
        GROUP BY theme
        "#,
        test_user_id
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    
    // Calculate weakest and strongest themes
    let mut theme_accuracies: Vec<(String, f32)> = theme_performance
        .iter()
        .map(|tp| {
            let accuracy = if tp.attempts > 0 {
                (tp.solved.unwrap_or(0) as f32 / tp.attempts as f32) * 100.0
            } else {
                0.0
            };
            (tp.theme.clone().unwrap_or_default(), accuracy)
        })
        .collect();
    
    theme_accuracies.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
    
    let weakest_themes: Vec<String> = theme_accuracies
        .iter()
        .take(3)
        .map(|(theme, _)| theme.clone())
        .collect();
    
    let strongest_themes: Vec<String> = theme_accuracies
        .iter()
        .rev()
        .take(3)
        .map(|(theme, _)| theme.clone())
        .collect();
    
    // Fetch puzzle count by difficulty
    let difficulty_stats = sqlx::query!(
        r#"
        SELECT 
            CASE 
                WHEN puzzle_id % 4 = 0 THEN 'Expert'
                WHEN puzzle_id % 4 = 1 THEN 'Advanced'
                WHEN puzzle_id % 4 = 2 THEN 'Intermediate'
                ELSE 'Beginner'
            END as difficulty,
            COUNT(*) as count
        FROM puzzles_solved
        WHERE user_id = ? AND solved = 1
        GROUP BY difficulty
        "#,
        test_user_id
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    
    let mut puzzles_by_difficulty = HashMap::new();
    for stat in difficulty_stats {
        puzzles_by_difficulty.insert(
            stat.difficulty.unwrap_or("Unknown".to_string()),
            stat.count as u32,
        );
    }
    
    // Ensure all difficulties are represented
    for difficulty in ["Beginner", "Intermediate", "Advanced", "Expert"] {
        puzzles_by_difficulty.entry(difficulty.to_string()).or_insert(0);
    }
    
    // Fetch recent performance (last 7 days)
    let recent_performance = sqlx::query!(
        r#"
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as total,
            SUM(CASE WHEN solved THEN 1 ELSE 0 END) as solved,
            AVG(time_taken_seconds) as avg_time
        FROM puzzles_solved
        WHERE user_id = ? AND created_at >= date('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
        "#,
        test_user_id
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|day| {
        let accuracy = if day.total > 0 {
            (day.solved.unwrap_or(0) as f32 / day.total as f32) * 100.0
        } else {
            0.0
        };
        
        DailyPerformance {
            date: day.date.unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string()),
            puzzles_solved: day.solved.unwrap_or(0) as u32,
            accuracy,
            avg_time: day.avg_time.unwrap_or(0.0) as f32,
        }
    })
    .collect();
    
    // If weakest/strongest themes are empty, provide defaults
    let weakest_themes = if weakest_themes.is_empty() {
        vec!["Endgame".to_string(), "Positional".to_string(), "Sacrifice".to_string()]
    } else {
        weakest_themes
    };
    
    let strongest_themes = if strongest_themes.is_empty() {
        vec!["Fork".to_string(), "Pin".to_string(), "Back Rank Mate".to_string()]
    } else {
        strongest_themes
    };
    
    let progress = UserProgressResponse {
        puzzles_solved,
        current_rating: rating,
        accuracy,
        best_streak,
        current_streak,
        weakest_themes,
        strongest_themes,
        total_time_spent: total_time,
        puzzles_by_difficulty,
        recent_performance,
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