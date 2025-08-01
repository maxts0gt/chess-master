use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::{AppState, chess_engine::ChessEngine};

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/analyze", post(analyze_position))
        .route("/games", post(create_game))
        .route("/games/:id", get(get_game))
        .route("/games/:id/moves", post(make_move))
        .route("/validate-fen", post(validate_fen))
}

#[derive(Deserialize)]
struct AnalyzeRequest {
    fen: String,
    depth: Option<u8>,
}

#[derive(Serialize)]
struct AnalyzeResponse {
    evaluation: f32,
    best_move: String,
    depth: u8,
    nodes: u64,
    time_ms: u64,
    tactical_patterns: Vec<String>,
}

async fn analyze_position(
    State(_state): State<AppState>,
    Json(request): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, StatusCode> {
    let engine = ChessEngine::new();
    let depth = request.depth.unwrap_or(10);
    
    match engine.analyze_position(&request.fen, depth).await {
        Ok(analysis) => Ok(Json(AnalyzeResponse {
            evaluation: analysis.evaluation,
            best_move: analysis.best_move,
            depth: analysis.depth,
            nodes: analysis.nodes,
            time_ms: analysis.time_ms,
            tactical_patterns: analysis.tactical_patterns,
        })),
        Err(_) => Err(StatusCode::BAD_REQUEST),
    }
}

#[derive(Deserialize)]
struct CreateGameRequest {
    white_player_id: Option<Uuid>,
    black_player_id: Option<Uuid>,
    time_control: Option<String>,
}

#[derive(Serialize)]
struct CreateGameResponse {
    game_id: Uuid,
    fen: String,
    message: String,
}

async fn create_game(
    State(state): State<AppState>,
    Json(request): Json<CreateGameRequest>,
) -> Result<Json<CreateGameResponse>, StatusCode> {
    let game_id = Uuid::new_v4();
    let starting_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    
    // In a real implementation, we'd save this to the database
    // For now, we'll just return the game ID and starting position
    
    Ok(Json(CreateGameResponse {
        game_id,
        fen: starting_fen.to_string(),
        message: "New chess game created successfully".to_string(),
    }))
}

#[derive(Serialize)]
struct GameResponse {
    game_id: String,
    white_player_id: Option<Uuid>,
    black_player_id: Option<Uuid>,
    fen: String,
    pgn: String,
    result: Option<String>,
    time_control: Option<String>,
    created_at: String,
}

async fn get_game(
    State(_state): State<AppState>,
    Path(game_id): Path<String>,
) -> Result<Json<GameResponse>, StatusCode> {
    // In a real implementation, we'd fetch this from the database
    // For now, we'll return a mock game
    
    let starting_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    
    Ok(Json(GameResponse {
        game_id,
        white_player_id: None,
        black_player_id: None,
        fen: starting_fen.to_string(),
        pgn: "".to_string(),
        result: None,
        time_control: Some("10+0".to_string()),
        created_at: chrono::Utc::now().to_rfc3339(),
    }))
}

#[derive(Deserialize)]
struct MakeMoveRequest {
    from: String,
    to: String,
    promotion: Option<String>,
}

#[derive(Serialize)]
struct MakeMoveResponse {
    success: bool,
    new_fen: String,
    move_notation: String,
    is_check: bool,
    is_checkmate: bool,
    is_stalemate: bool,
    message: String,
}

async fn make_move(
    State(_state): State<AppState>,
    Path(_game_id): Path<String>,
    Json(request): Json<MakeMoveRequest>,
) -> Result<Json<MakeMoveResponse>, StatusCode> {
    // In a real implementation, we'd:
    // 1. Load the game from database
    // 2. Validate the move
    // 3. Update the game state
    // 4. Save back to database
    
    // For now, return a success response
    let starting_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    
    Ok(Json(MakeMoveResponse {
        success: true,
        new_fen: starting_fen.to_string(),
        move_notation: format!("{}-{}", request.from, request.to),
        is_check: false,
        is_checkmate: false,
        is_stalemate: false,
        message: "Move executed successfully".to_string(),
    }))
}

#[derive(Deserialize)]
struct ValidateFenRequest {
    fen: String,
}

#[derive(Serialize)]
struct ValidateFenResponse {
    valid: bool,
    message: String,
}

async fn validate_fen(
    State(_state): State<AppState>,
    Json(request): Json<ValidateFenRequest>,
) -> Result<Json<ValidateFenResponse>, StatusCode> {
    match crate::chess_engine::validate_fen(&request.fen) {
        Ok(_) => Ok(Json(ValidateFenResponse {
            valid: true,
            message: "FEN is valid".to_string(),
        })),
        Err(e) => Ok(Json(ValidateFenResponse {
            valid: false,
            message: format!("Invalid FEN: {}", e),
        })),
    }
}