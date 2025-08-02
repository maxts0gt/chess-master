use axum::Router;

use crate::AppState;

pub mod auth;
pub mod chess;
pub mod training;
pub mod ai;
pub mod users;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth::create_router())
        .nest("/chess", chess::create_router())
        .nest("/training", training::create_router())
        .nest("/ai", ai::create_router())
        .nest("/users", users::create_router())
}

// Export websocket handler
pub use crate::websocket::multiplayer::MultiplayerHub;