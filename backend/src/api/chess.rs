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
        .route("/validate-move", post(validate_move))
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

#[derive(Deserialize)]
struct ValidateMoveRequest {
    fen: String,
    from: String,
    to: String,
    promotion: Option<String>,
}

#[derive(Serialize)]
struct ValidateMoveResponse {
    valid: bool,
    new_fen: Option<String>,
    is_check: bool,
    is_checkmate: bool,
    is_stalemate: bool,
    is_draw: bool,
    captured_piece: Option<String>,
    san_notation: Option<String>,
    legal_moves: Vec<String>,
    error: Option<String>,
}

async fn validate_move(
    State(_state): State<AppState>,
    Json(request): Json<ValidateMoveRequest>,
) -> Result<Json<ValidateMoveResponse>, StatusCode> {
    use chess::{Board, Square, ChessMove, Piece, MoveGen};
    use std::str::FromStr;
    
    // Parse the FEN
    let board = match Board::from_str(&request.fen) {
        Ok(b) => b,
        Err(e) => {
            return Ok(Json(ValidateMoveResponse {
                valid: false,
                new_fen: None,
                is_check: false,
                is_checkmate: false,
                is_stalemate: false,
                is_draw: false,
                captured_piece: None,
                san_notation: None,
                legal_moves: vec![],
                error: Some(format!("Invalid FEN: {}", e)),
            }));
        }
    };
    
    // Parse squares
    let from_square = match Square::from_str(&request.from) {
        Ok(s) => s,
        Err(_) => {
            return Ok(Json(ValidateMoveResponse {
                valid: false,
                new_fen: None,
                is_check: false,
                is_checkmate: false,
                is_stalemate: false,
                is_draw: false,
                captured_piece: None,
                san_notation: None,
                legal_moves: vec![],
                error: Some(format!("Invalid from square: {}", request.from)),
            }));
        }
    };
    
    let to_square = match Square::from_str(&request.to) {
        Ok(s) => s,
        Err(_) => {
            return Ok(Json(ValidateMoveResponse {
                valid: false,
                new_fen: None,
                is_check: false,
                is_checkmate: false,
                is_stalemate: false,
                is_draw: false,
                captured_piece: None,
                san_notation: None,
                legal_moves: vec![],
                error: Some(format!("Invalid to square: {}", request.to)),
            }));
        }
    };
    
    // Check if there's a piece to capture
    let captured_piece = board.piece_on(to_square).map(|p| format!("{:?}", p));
    
    // Create the move
    let chess_move = if let Some(promo) = &request.promotion {
        let promo_piece = match promo.as_str() {
            "q" | "Q" => Some(Piece::Queen),
            "r" | "R" => Some(Piece::Rook),
            "b" | "B" => Some(Piece::Bishop),
            "n" | "N" => Some(Piece::Knight),
            _ => None,
        };
        
        if let Some(p) = promo_piece {
            ChessMove::new(from_square, to_square, Some(p))
        } else {
            ChessMove::new(from_square, to_square, None)
        }
    } else {
        ChessMove::new(from_square, to_square, None)
    };
    
    // Check if the move is legal
    let movegen = MoveGen::new_legal(&board);
    let legal_moves: Vec<ChessMove> = movegen.collect();
    let is_legal = legal_moves.contains(&chess_move);
    
    if !is_legal {
        // Return all legal moves for the piece on the from square
        let piece_moves: Vec<String> = legal_moves
            .iter()
            .filter(|m| m.get_source() == from_square)
            .map(|m| format!("{}{}", m.get_source(), m.get_dest()))
            .collect();
            
        return Ok(Json(ValidateMoveResponse {
            valid: false,
            new_fen: None,
            is_check: false,
            is_checkmate: false,
            is_stalemate: false,
            is_draw: false,
            captured_piece: None,
            san_notation: None,
            legal_moves: piece_moves,
            error: Some("Illegal move".to_string()),
        }));
    }
    
    // Make the move
    let new_board = board.make_move_new(chess_move);
    
    // Check game status
    let status = new_board.status();
    let is_check = new_board.checkers().popcnt() > 0;
    let is_checkmate = status == chess::BoardStatus::Checkmate;
    let is_stalemate = status == chess::BoardStatus::Stalemate;
    let is_draw = is_stalemate || new_board.can_declare_draw();
    
    // Get all legal moves for the new position
    let next_moves = MoveGen::new_legal(&new_board);
    let legal_move_strings: Vec<String> = next_moves
        .map(|m| format!("{}{}", m.get_source(), m.get_dest()))
        .collect();
    
    // Generate SAN notation (simplified)
    let san_notation = Some(format!("{}{}{}", 
        if let Some(piece) = board.piece_on(from_square) {
            match piece {
                Piece::Knight => "N",
                Piece::Bishop => "B",
                Piece::Rook => "R",
                Piece::Queen => "Q",
                Piece::King => "K",
                Piece::Pawn => "",
            }
        } else { "" },
        if captured_piece.is_some() { "x" } else { "" },
        request.to
    ));
    
    Ok(Json(ValidateMoveResponse {
        valid: true,
        new_fen: Some(format!("{}", new_board)),
        is_check,
        is_checkmate,
        is_stalemate,
        is_draw,
        captured_piece,
        san_notation,
        legal_moves: legal_move_strings,
        error: None,
    }))
}