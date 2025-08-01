use axum::{
    routing::{get, put},
    Router,
};
use crate::AppState;

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/profile", get(get_profile))
        .route("/profile", put(update_profile))
        .route("/stats", get(get_stats))
}

async fn get_profile() -> &'static str {
    "Get user profile - coming soon!"
}

async fn update_profile() -> &'static str {
    "Update user profile - coming soon!"
}

async fn get_stats() -> &'static str {
    "Get user statistics - coming soon!"
}