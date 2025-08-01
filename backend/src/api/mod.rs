use axum::{routing::get, Router};
use crate::AppState;

pub mod auth;
pub mod chess;
pub mod training;
pub mod users;
pub mod ai;

pub fn create_router() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth::create_router())
        .nest("/chess", chess::create_router())
        .nest("/training", training::create_router())
        .nest("/users", users::create_router())
        .nest("/ai", ai::create_router())
        .route("/ping", get(ping))
}

async fn ping() -> &'static str {
    "pong"
}