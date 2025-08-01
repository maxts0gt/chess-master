use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{post},
    Router,
};
use serde_json::json;
use uuid::Uuid;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, Header, EncodingKey};
use chrono::{Utc, Duration};
use tracing::{info, warn};

use crate::{AppState, models::{CreateUserRequest, LoginRequest, AuthResponse, UserProfile, SubscriptionTier}};

#[derive(serde::Serialize, serde::Deserialize)]
struct Claims {
    sub: String, // user_id
    exp: usize,
}

#[derive(sqlx::FromRow)]
struct UserRecord {
    id: String,
    username: String,
    email: String,
    password_hash: String,
    elo_rating: i32,
    subscription_tier: String,
}

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
}

async fn register(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let user_id = Uuid::new_v4();
    
    // Hash password
    let password_hash = hash(&payload.password, DEFAULT_COST)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Insert user into database
    let query_result = sqlx::query(
        r#"
        INSERT INTO users (id, username, email, password_hash, elo_rating, subscription_tier)
        VALUES (?1, ?2, ?3, ?4, 1200, 'free')
        "#
    )
    .bind(user_id.to_string())
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .execute(state.db.pool())
    .await;

    match query_result {
        Ok(_) => {
            info!("New user registered: {} ({})", payload.username, payload.email);
            
            // Generate JWT token
            let token = generate_token(&user_id.to_string(), &state)?;
            
            let user_profile = UserProfile {
                id: user_id,
                username: payload.username,
                email: payload.email,
                elo_rating: 1200,
                subscription_tier: SubscriptionTier::Free,
                games_played: 0,
                puzzles_solved: 0,
                win_rate: 0.0,
            };

            Ok(Json(AuthResponse { token, user: user_profile }))
        }
        Err(sqlx::Error::Database(db_err)) if db_err.is_unique_violation() => {
            warn!("Registration failed: user already exists");
            Err(StatusCode::CONFLICT)
        }
        Err(e) => {
            warn!("Registration failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    // Find user by email  
    let user_result = sqlx::query_as::<_, UserRecord>(
        "SELECT id, username, email, password_hash, elo_rating, subscription_tier FROM users WHERE email = ?"
    )
    .bind(&payload.email)
    .fetch_optional(state.db.pool())
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user = match user_result {
        Some(user) => user,
        None => {
            warn!("Login failed: user not found for email {}", payload.email);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Verify password
    let is_valid = verify(&payload.password, &user.password_hash)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !is_valid {
        warn!("Login failed: invalid password for {}", payload.email);
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Generate JWT token
    let token = generate_token(&user.id, &state)?;

    info!("User logged in: {} ({})", user.username, user.email);

    // Get user stats (simplified for now)
    let games_played: i64 = 0; // TODO: Implement proper query
    let puzzles_solved: i64 = 0; // TODO: Implement proper query

    let subscription_tier = match user.subscription_tier.as_str() {
        "paid" => SubscriptionTier::Paid,
        "premium" => SubscriptionTier::Premium,
        _ => SubscriptionTier::Free,
    };

    let user_profile = UserProfile {
        id: Uuid::parse_str(&user.id).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
        username: user.username,
        email: user.email,
        elo_rating: user.elo_rating,
        subscription_tier,
        games_played: games_played as i32,
        puzzles_solved: puzzles_solved as i32,
        win_rate: 0.0, // TODO: Calculate actual win rate
    };

    Ok(Json(AuthResponse { token, user: user_profile }))
}

fn generate_token(user_id: &str, state: &AppState) -> Result<String, StatusCode> {
    let exp = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_ref()),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}