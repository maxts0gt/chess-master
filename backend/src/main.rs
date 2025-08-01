use axum::{
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod chess_engine;
mod ai;
mod db;
mod models;
mod config;
mod puzzle_database;

use config::AppConfig;
use db::Database;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Database>,
    pub config: Arc<AppConfig>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    timestamp: chrono::DateTime<chrono::Utc>,
}

async fn health_check() -> Result<Json<HealthResponse>, StatusCode> {
    Ok(Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now(),
    }))
}

async fn create_app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .nest("/api/v1", api::create_router())
        .layer(CorsLayer::permissive())
        .with_state(state)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "chess_app=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("🏆 Starting Chess App - The Ultimate Training Platform");

    // Load configuration
    let config = Arc::new(AppConfig::from_env()?);
    info!("📋 Configuration loaded");

    // Initialize database
    let db = Arc::new(Database::new(&config.database_url).await?);
    info!("🗄️ Database connected");

    // Run migrations
    db.run_migrations().await?;
    info!("🔄 Database migrations completed");

    let state = AppState { db, config: config.clone() };

    // Create the application
    let app = create_app(state).await;

    // Start the server
    let host = config.host.as_str();
    let port = config.port;
    let listener = TcpListener::bind(format!("{}:{}", host, port)).await?;
    
    info!("🚀 Chess App server running on http://{}:{}", host, port);
    info!("📱 Ready for mobile connections!");
    info!("🤖 AI coaching system initialized");

    axum::serve(listener, app).await?;

    Ok(())
}
