use axum::{
    routing::{get, post},
    Router,
};
use crate::AppState;

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/analyze", post(analyze_position))
        .route("/games", post(create_game))
        .route("/games/:id", get(get_game))
        .route("/games/:id/moves", post(make_move))
}

async fn analyze_position() -> &'static str {
    "Chess position analysis - coming soon!"
}

async fn create_game() -> &'static str {
    "Create new chess game - coming soon!"
}

async fn get_game() -> &'static str {
    "Get chess game - coming soon!"
}

async fn make_move() -> &'static str {
    "Make chess move - coming soon!"
}