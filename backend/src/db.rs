use sqlx::{sqlite::SqlitePool, Pool, Sqlite, migrate::MigrateDatabase};
use anyhow::Result;
use tracing::{info, warn};

pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        // Create database if it doesn't exist
        if !Sqlite::database_exists(database_url).await.unwrap_or(false) {
            info!("Creating database {}", database_url);
            Sqlite::create_database(database_url).await?;
        }

        let pool = SqlitePool::connect(database_url).await?;
        
        Ok(Self { pool })
    }

    pub async fn run_migrations(&self) -> Result<()> {
        info!("Running database migrations...");
        
        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY NOT NULL,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                elo_rating INTEGER NOT NULL DEFAULT 1200,
                subscription_tier TEXT NOT NULL DEFAULT 'free',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY NOT NULL,
                white_player_id TEXT,
                black_player_id TEXT,
                pgn TEXT NOT NULL,
                result TEXT,
                time_control TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                finished_at TEXT,
                FOREIGN KEY (white_player_id) REFERENCES users(id),
                FOREIGN KEY (black_player_id) REFERENCES users(id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tactical_puzzles (
                id TEXT PRIMARY KEY NOT NULL,
                fen TEXT NOT NULL,
                solution TEXT NOT NULL,
                rating INTEGER NOT NULL,
                themes TEXT NOT NULL,
                popularity INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS user_progress (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL,
                puzzle_id TEXT NOT NULL,
                solved BOOLEAN NOT NULL,
                time_taken INTEGER,
                attempts INTEGER NOT NULL DEFAULT 1,
                solved_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (puzzle_id) REFERENCES tactical_puzzles(id),
                UNIQUE(user_id, puzzle_id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS training_sessions (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL,
                session_type TEXT NOT NULL,
                puzzles_solved INTEGER NOT NULL,
                accuracy REAL NOT NULL,
                average_time REAL NOT NULL,
                rating_change INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_games_players ON games(white_player_id, black_player_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON tactical_puzzles(rating)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id)")
            .execute(&self.pool)
            .await?;

        info!("Database migrations completed successfully");
        Ok(())
    }

    pub fn pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }

    // Health check
    pub async fn health_check(&self) -> Result<bool> {
        let result = sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await;
        
        Ok(result.is_ok())
    }
}