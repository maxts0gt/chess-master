use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{error::AppError, AppState};

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/profile/:user_id", get(get_user_profile))
        .route("/settings", put(update_settings))
        .route("/stats/:user_id", get(get_user_stats))
        .route("/achievements/:user_id", get(get_achievements))
        .route("/premium/status/:user_id", get(check_premium_status))
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub email: String,
    pub rating: i32,
    pub games_played: i32,
    pub games_won: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub is_premium: bool,
    pub premium_expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub theme: Option<String>,
    pub sound_enabled: Option<bool>,
    pub notifications_enabled: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct UserStats {
    pub total_games: i32,
    pub wins: i32,
    pub losses: i32,
    pub draws: i32,
    pub win_rate: f32,
    pub average_game_length: i32,
    pub favorite_opening: String,
    pub time_played_minutes: i32,
}

#[derive(Debug, Serialize)]
pub struct Achievement {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub unlocked: bool,
    pub unlocked_at: Option<chrono::DateTime<chrono::Utc>>,
    pub progress: f32,
}

#[derive(Debug, Serialize)]
pub struct PremiumStatus {
    pub is_premium: bool,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub features: Vec<String>,
}

pub async fn get_user_profile(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<UserProfile>, AppError> {
    let profile = sqlx::query_as!(
        UserProfile,
        r#"
        SELECT 
            id,
            username,
            email,
            rating,
            games_played,
            games_won,
            created_at,
            is_premium,
            premium_expires_at
        FROM users
        WHERE id = ?
        "#,
        user_id
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(profile))
}

pub async fn update_settings(
    State(state): State<AppState>,
    Json(settings): Json<UpdateSettingsRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // In a real app, you'd get the user_id from the JWT token
    let user_id = "test-user-001";

    if let Some(theme) = &settings.theme {
        sqlx::query!(
            "UPDATE users SET theme = ? WHERE id = ?",
            theme,
            user_id
        )
        .execute(&state.db)
        .await?;
    }

    Ok(Json(serde_json::json!({
        "message": "Settings updated successfully"
    })))
}

pub async fn get_user_stats(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<UserStats>, AppError> {
    let games = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN (white_player_id = ? AND result = 'white_wins') 
                     OR (black_player_id = ? AND result = 'black_wins') THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN (white_player_id = ? AND result = 'black_wins') 
                     OR (black_player_id = ? AND result = 'white_wins') THEN 1 ELSE 0 END) as losses,
            SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
            AVG(move_count) as avg_moves
        FROM games
        WHERE white_player_id = ? OR black_player_id = ?
        "#,
        user_id, user_id, user_id, user_id, user_id, user_id
    )
    .fetch_one(&state.db)
    .await?;

    let total = games.total as i32;
    let wins = games.wins.unwrap_or(0) as i32;
    let losses = games.losses.unwrap_or(0) as i32;
    let draws = games.draws.unwrap_or(0) as i32;

    let stats = UserStats {
        total_games: total,
        wins,
        losses,
        draws,
        win_rate: if total > 0 { (wins as f32 / total as f32) * 100.0 } else { 0.0 },
        average_game_length: games.avg_moves.unwrap_or(0.0) as i32,
        favorite_opening: "Italian Game".to_string(), // Placeholder
        time_played_minutes: total * 10, // Rough estimate
    };

    Ok(Json(stats))
}

pub async fn get_achievements(
    State(_state): State<AppState>,
    Path(_user_id): Path<String>,
) -> Result<Json<Vec<Achievement>>, AppError> {
    let achievements = vec![
        Achievement {
            id: "first_win".to_string(),
            name: "First Victory".to_string(),
            description: "Win your first game".to_string(),
            icon: "🏆".to_string(),
            unlocked: true,
            unlocked_at: Some(chrono::Utc::now()),
            progress: 1.0,
        },
        Achievement {
            id: "puzzle_master".to_string(),
            name: "Puzzle Master".to_string(),
            description: "Solve 100 puzzles correctly".to_string(),
            icon: "🧩".to_string(),
            unlocked: false,
            unlocked_at: None,
            progress: 0.45,
        },
        Achievement {
            id: "speed_demon".to_string(),
            name: "Speed Demon".to_string(),
            description: "Win a game in under 1 minute".to_string(),
            icon: "⚡".to_string(),
            unlocked: false,
            unlocked_at: None,
            progress: 0.0,
        },
    ];

    Ok(Json(achievements))
}

pub async fn check_premium_status(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<PremiumStatus>, AppError> {
    let user = sqlx::query!(
        r#"
        SELECT is_premium, premium_expires_at
        FROM users
        WHERE id = ?
        "#,
        user_id
    )
    .fetch_optional(&state.db)
    .await?;

    let (is_premium, expires_at) = if let Some(user) = user {
        let is_active = user.is_premium && 
            user.premium_expires_at
                .map(|exp| exp > chrono::Utc::now())
                .unwrap_or(false);
        (is_active, user.premium_expires_at)
    } else {
        (false, None)
    };

    let features = if is_premium {
        vec![
            "Unlimited multiplayer games".to_string(),
            "Advanced AI coaching".to_string(),
            "Detailed game analysis".to_string(),
            "No ads".to_string(),
            "Priority support".to_string(),
            "Exclusive puzzles".to_string(),
            "Custom board themes".to_string(),
        ]
    } else {
        vec![]
    };

    Ok(Json(PremiumStatus {
        is_premium,
        expires_at,
        features,
    }))
}