use super::*;
use super::lobby::PlayerInfo;
use serde::{Deserialize, Serialize};
use shakmaty::{Chess, Position, Move, Square};
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct Game {
    pub id: Uuid,
    pub white_player: Uuid,
    pub black_player: Uuid,
    pub position: Chess,
    pub moves: Vec<String>,
    pub time_control: String,
    pub state: GameState,
    pub lobby_id: Uuid,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum GameState {
    Playing,
    Draw,
    WhiteWins,
    BlackWins,
    Aborted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GameMessage {
    GameStarted {
        game_id: Uuid,
        white_player: PlayerInfo,
        black_player: PlayerInfo,
        fen: String,
    },
    MoveMade {
        player_id: Uuid,
        from: String,
        to: String,
        fen: String,
        san: String,
    },
    GameOver {
        winner: Option<Uuid>,
        reason: String,
    },
    InvalidMove {
        reason: String,
    },
}

pub async fn create_game_from_lobby(lobby_id: Uuid, state: &AppState) -> Result<Uuid, String> {
    let lobbies = state.ws_state.lobbies.read().await;
    let lobby = lobbies.get(&lobby_id).ok_or("Lobby not found")?;
    
    if lobby.players.len() < 2 {
        return Err("Not enough players".to_string());
    }
    
    // Get two players for the game
    let white_player = lobby.players[0];
    let black_player = lobby.players[1];
    
    let game_id = Uuid::new_v4();
    let game = Game {
        id: game_id,
        white_player,
        black_player,
        position: Chess::default(),
        moves: Vec::new(),
        time_control: lobby.config.time_control.clone(),
        state: GameState::Playing,
        lobby_id,
    };
    
    // Store game
    state.ws_state.games.write().await.insert(game_id, game.clone());
    
    // Update player statuses
    let mut players = state.ws_state.players.write().await;
    if let Some(p) = players.get_mut(&white_player) {
        p.status = PlayerStatus::InGame(game_id);
    }
    if let Some(p) = players.get_mut(&black_player) {
        p.status = PlayerStatus::InGame(game_id);
    }
    
    // Get player info for broadcast
    let white_info = players.get(&white_player).map(|p| PlayerInfo {
        id: p.id,
        username: p.username.clone(),
        rating: p.rating,
        ready: true,
    });
    let black_info = players.get(&black_player).map(|p| PlayerInfo {
        id: p.id,
        username: p.username.clone(),
        rating: p.rating,
        ready: true,
    });
    drop(players);
    
    // Broadcast game started
    if let (Some(white), Some(black)) = (white_info, black_info) {
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Game(game_id),
            message: WsMessage::GameMessage(GameMessage::GameStarted {
                game_id,
                white_player: white,
                black_player: black,
                fen: format!("{:?}", game.position),
            }),
        });
    }
    
    Ok(game_id)
}

pub async fn make_move(game_id: Uuid, player_id: Uuid, from: String, to: String, state: &AppState) -> Result<(), String> {
    let mut games = state.ws_state.games.write().await;
    let game = games.get_mut(&game_id).ok_or("Game not found")?;
    
    // Check if it's the player's turn
    let is_white_turn = game.position.turn() == shakmaty::Color::White;
    let expected_player = if is_white_turn { game.white_player } else { game.black_player };
    
    if player_id != expected_player {
        return Err("Not your turn".to_string());
    }
    
    // Parse squares
    let from_square = Square::from_str(&from).map_err(|_| "Invalid from square")?;
    let to_square = Square::from_str(&to).map_err(|_| "Invalid to square")?;
    
    // Find the legal move
    let legal_moves = game.position.legal_moves();
    let chess_move = legal_moves.iter().find(|m| {
        match m {
            Move::Normal { from: f, to: t, .. } => *f == from_square && *t == to_square,
            Move::EnPassant { from: f, to: t } => *f == from_square && *t == to_square,
            Move::Castle { king, rook } => {
                (*king == from_square && *rook == to_square) || 
                (*rook == from_square && *king == to_square)
            },
            Move::Put { .. } => false,
        }
    }).ok_or("Illegal move")?;
    
    // Apply the move
    let new_position = game.position.clone().play(chess_move).map_err(|_| "Move application failed")?;
    
    // Update game
    game.position = new_position;
    let move_str = format!("{}{}", from, to);
    game.moves.push(move_str.clone());
    
    // Check game over conditions
    if game.position.is_checkmate() {
        game.state = if is_white_turn { GameState::WhiteWins } else { GameState::BlackWins };
        let winner = if is_white_turn { game.white_player } else { game.black_player };
        
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Game(game_id),
            message: WsMessage::GameMessage(GameMessage::GameOver {
                winner: Some(winner),
                reason: "Checkmate".to_string(),
            }),
        });
    } else if game.position.is_stalemate() {
        game.state = GameState::Draw;
        
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Game(game_id),
            message: WsMessage::GameMessage(GameMessage::GameOver {
                winner: None,
                reason: "Stalemate".to_string(),
            }),
        });
    } else {
        // Broadcast move
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Game(game_id),
            message: WsMessage::GameMessage(GameMessage::MoveMade {
                player_id,
                from,
                to,
                fen: format!("{:?}", game.position),
                san: move_str,
            }),
        });
    }
    
    Ok(())
}