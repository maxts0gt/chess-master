use axum::{
    routing::{get, post},
    Router,
};
use crate::AppState;

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/coaching/analyze", post(ai_analyze_game))
        .route("/coaching/suggest", post(ai_suggest_moves))
        .route("/coaching/plan", get(get_training_plan))
        .route("/coaching/personalities", get(get_coaching_personalities))
}

async fn ai_analyze_game() -> &'static str {
    "AI game analysis - coming soon!"
}

async fn ai_suggest_moves() -> &'static str {
    "AI move suggestions - coming soon!"
}

async fn get_training_plan() -> &'static str {
    "Get AI training plan - coming soon!"
}

async fn get_coaching_personalities() -> &'static str {
    "Get coaching personalities - coming soon!"
}