use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State, Path},
    response::Response,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock, broadcast};
use uuid::Uuid;
use tracing::{info, warn, error};

use crate::AppState;

#[derive(Debug, Clone)]
pub struct GameRoom {
    pub id: String,
    pub white_player: Option<Player>,
    pub black_player: Option<Player>,
    pub game_state: GameState,
    pub spectators: Vec<String>,
    pub private: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    pub username: String,
    pub rating: i32,
    pub connection_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub fen: String,
    pub moves: Vec<String>,
    pub current_turn: String, // "white" or "black"
    pub time_white: i32, // seconds
    pub time_black: i32,
    pub status: GameStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GameStatus {
    Waiting,
    Active,
    Paused,
    Finished { winner: Option<String>, reason: String },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    CreateRoom {
        time_control: i32, // minutes
        increment: i32,    // seconds
        private: bool,
    },
    JoinRoom {
        room_id: String,
        as_spectator: bool,
    },
    MakeMove {
        from: String,
        to: String,
        promotion: Option<String>,
    },
    OfferDraw,
    AcceptDraw,
    DeclineDraw,
    Resign,
    RequestRematch,
    AcceptRematch,
    SendMessage {
        text: String,
    },
    LeaveRoom,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    RoomCreated {
        room_id: String,
        share_link: String,
    },
    RoomJoined {
        room_id: String,
        game_state: GameState,
        white_player: Option<Player>,
        black_player: Option<Player>,
        your_color: Option<String>,
    },
    PlayerJoined {
        player: Player,
        color: String,
    },
    PlayerLeft {
        player_id: String,
        color: String,
    },
    GameStarted {
        white_player: Player,
        black_player: Player,
    },
    MoveMade {
        from: String,
        to: String,
        promotion: Option<String>,
        fen: String,
        san: String,
        is_check: bool,
        is_checkmate: bool,
        is_stalemate: bool,
        captured_piece: Option<String>,
    },
    TimeUpdate {
        white_time: i32,
        black_time: i32,
    },
    DrawOffered {
        by_color: String,
    },
    DrawDeclined,
    GameEnded {
        winner: Option<String>,
        reason: String,
    },
    RematchOffered {
        by_color: String,
    },
    RematchAccepted {
        new_room_id: String,
    },
    ChatMessage {
        player_id: String,
        username: String,
        text: String,
        timestamp: i64,
    },
    SpectatorJoined {
        spectator_id: String,
        spectator_count: usize,
    },
    SpectatorLeft {
        spectator_id: String,
        spectator_count: usize,
    },
    Error {
        message: String,
    },
}

pub struct MultiplayerHub {
    rooms: Arc<RwLock<HashMap<String, Arc<Mutex<GameRoom>>>>>,
    connections: Arc<RwLock<HashMap<String, broadcast::Sender<ServerMessage>>>>,
}

impl MultiplayerHub {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub async fn handle_connection(
        &self,
        ws: WebSocketUpgrade,
        user_id: String,
        username: String,
        rating: i32,
    ) -> Response {
        let hub = self.clone();
        ws.on_upgrade(move |socket| hub.handle_socket(socket, user_id, username, rating))
    }
    
    async fn handle_socket(
        self,
        socket: WebSocket,
        user_id: String,
        username: String,
        rating: i32,
    ) {
        let (mut sender, mut receiver) = socket.split();
        let connection_id = Uuid::new_v4().to_string();
        
        // Create broadcast channel for this connection
        let (tx, mut rx) = broadcast::channel(100);
        self.connections.write().await.insert(connection_id.clone(), tx.clone());
        
        // Spawn task to handle outgoing messages
        let mut rx_clone = tx.subscribe();
        tokio::spawn(async move {
            while let Ok(msg) = rx_clone.recv().await {
                if let Ok(json) = serde_json::to_string(&msg) {
                    if sender.send(Message::Text(json)).await.is_err() {
                        break;
                    }
                }
            }
        });
        
        // Handle incoming messages
        let hub = self.clone();
        let player = Player {
            id: user_id.clone(),
            username: username.clone(),
            rating,
            connection_id: connection_id.clone(),
        };
        
        while let Some(msg) = receiver.next().await {
            if let Ok(msg) = msg {
                if let Message::Text(text) = msg {
                    if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                        hub.handle_client_message(client_msg, &player, &tx).await;
                    }
                }
            } else {
                break;
            }
        }
        
        // Clean up on disconnect
        hub.handle_disconnect(&connection_id).await;
    }
    
    async fn handle_client_message(
        &self,
        msg: ClientMessage,
        player: &Player,
        tx: &broadcast::Sender<ServerMessage>,
    ) {
        match msg {
            ClientMessage::CreateRoom { time_control, increment, private } => {
                let room_id = if private {
                    // Generate a readable room code for private rooms
                    generate_room_code()
                } else {
                    // Use UUID for public rooms
                    Uuid::new_v4().to_string()
                };
                
                let game_room = GameRoom {
                    id: room_id.clone(),
                    white_player: Some(player.clone()),
                    black_player: None,
                    game_state: GameState {
                        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string(),
                        moves: vec![],
                        current_turn: "white".to_string(),
                        time_white: time_control * 60,
                        time_black: time_control * 60,
                        status: GameStatus::Waiting,
                    },
                    spectators: vec![],
                    private,
                };
                
                self.rooms.write().await.insert(
                    room_id.clone(),
                    Arc::new(Mutex::new(game_room)),
                );
                
                let share_link = format!("/play/room/{}", room_id);
                
                let _ = tx.send(ServerMessage::RoomCreated {
                    room_id: room_id.clone(),
                    share_link,
                });
                
                let _ = tx.send(ServerMessage::RoomJoined {
                    room_id,
                    game_state: GameState {
                        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string(),
                        moves: vec![],
                        current_turn: "white".to_string(),
                        time_white: time_control * 60,
                        time_black: time_control * 60,
                        status: GameStatus::Waiting,
                    },
                    white_player: Some(player.clone()),
                    black_player: None,
                    your_color: Some("white".to_string()),
                });
            }
            
            ClientMessage::JoinRoom { room_id, as_spectator } => {
                if let Some(room_arc) = self.rooms.read().await.get(&room_id) {
                    let mut room = room_arc.lock().await;
                    
                    if as_spectator {
                        room.spectators.push(player.id.clone());
                        
                        let _ = tx.send(ServerMessage::RoomJoined {
                            room_id: room.id.clone(),
                            game_state: room.game_state.clone(),
                            white_player: room.white_player.clone(),
                            black_player: room.black_player.clone(),
                            your_color: None,
                        });
                        
                        // Notify others
                        self.broadcast_to_room(&room_id, ServerMessage::SpectatorJoined {
                            spectator_id: player.id.clone(),
                            spectator_count: room.spectators.len(),
                        }).await;
                    } else {
                        // Try to join as player
                        let your_color = if room.white_player.is_none() {
                            room.white_player = Some(player.clone());
                            Some("white".to_string())
                        } else if room.black_player.is_none() {
                            room.black_player = Some(player.clone());
                            room.game_state.status = GameStatus::Active;
                            Some("black".to_string())
                        } else {
                            None
                        };
                        
                        if let Some(color) = your_color.clone() {
                            let _ = tx.send(ServerMessage::RoomJoined {
                                room_id: room.id.clone(),
                                game_state: room.game_state.clone(),
                                white_player: room.white_player.clone(),
                                black_player: room.black_player.clone(),
                                your_color,
                            });
                            
                            // Notify others
                            self.broadcast_to_room(&room_id, ServerMessage::PlayerJoined {
                                player: player.clone(),
                                color: color.clone(),
                            }).await;
                            
                            // If game is now full, start it
                            if room.white_player.is_some() && room.black_player.is_some() {
                                self.broadcast_to_room(&room_id, ServerMessage::GameStarted {
                                    white_player: room.white_player.clone().unwrap(),
                                    black_player: room.black_player.clone().unwrap(),
                                }).await;
                            }
                        } else {
                            let _ = tx.send(ServerMessage::Error {
                                message: "Room is full. Joining as spectator.".to_string(),
                            });
                            
                            // Join as spectator instead
                            room.spectators.push(player.id.clone());
                            
                            let _ = tx.send(ServerMessage::RoomJoined {
                                room_id: room.id.clone(),
                                game_state: room.game_state.clone(),
                                white_player: room.white_player.clone(),
                                black_player: room.black_player.clone(),
                                your_color: None,
                            });
                        }
                    }
                } else {
                    let _ = tx.send(ServerMessage::Error {
                        message: "Room not found".to_string(),
                    });
                }
            }
            
            ClientMessage::MakeMove { from, to, promotion } => {
                // Find which room the player is in
                if let Some((room_id, _)) = self.find_player_room(&player.id).await {
                    if let Some(room_arc) = self.rooms.read().await.get(&room_id) {
                        let mut room = room_arc.lock().await;
                        
                        // Validate it's the player's turn
                        let is_white_turn = room.game_state.current_turn == "white";
                        let is_white_player = room.white_player.as_ref()
                            .map(|p| p.id == player.id)
                            .unwrap_or(false);
                        let is_black_player = room.black_player.as_ref()
                            .map(|p| p.id == player.id)
                            .unwrap_or(false);
                        
                        if (is_white_turn && is_white_player) || (!is_white_turn && is_black_player) {
                            // Here you would validate the move using chess engine
                            // For now, we'll assume the move is valid
                            
                            // Update game state
                            room.game_state.moves.push(format!("{}{}", from, to));
                            room.game_state.current_turn = if is_white_turn { "black" } else { "white" }.to_string();
                            
                            // Broadcast move to all players in room
                            self.broadcast_to_room(&room_id, ServerMessage::MoveMade {
                                from,
                                to,
                                promotion,
                                fen: room.game_state.fen.clone(), // Would be updated by chess engine
                                san: "e4".to_string(), // Placeholder
                                is_check: false,
                                is_checkmate: false,
                                is_stalemate: false,
                                captured_piece: None,
                            }).await;
                        } else {
                            let _ = tx.send(ServerMessage::Error {
                                message: "Not your turn".to_string(),
                            });
                        }
                    }
                }
            }
            
            ClientMessage::SendMessage { text } => {
                // Find which room the player is in
                if let Some((room_id, _)) = self.find_player_room(&player.id).await {
                    self.broadcast_to_room(&room_id, ServerMessage::ChatMessage {
                        player_id: player.id.clone(),
                        username: player.username.clone(),
                        text,
                        timestamp: chrono::Utc::now().timestamp(),
                    }).await;
                }
            }
            
            _ => {
                // Handle other message types
                info!("Unhandled message type: {:?}", msg);
            }
        }
    }
    
    async fn handle_disconnect(&self, connection_id: &str) {
        // Remove from connections
        self.connections.write().await.remove(connection_id);
        
        // Handle player leaving rooms
        // Implementation depends on your disconnect handling strategy
    }
    
    async fn find_player_room(&self, player_id: &str) -> Option<(String, String)> {
        let rooms = self.rooms.read().await;
        for (room_id, room_arc) in rooms.iter() {
            let room = room_arc.lock().await;
            
            if let Some(white) = &room.white_player {
                if white.id == player_id {
                    return Some((room_id.clone(), "white".to_string()));
                }
            }
            
            if let Some(black) = &room.black_player {
                if black.id == player_id {
                    return Some((room_id.clone(), "black".to_string()));
                }
            }
            
            if room.spectators.contains(&player_id.to_string()) {
                return Some((room_id.clone(), "spectator".to_string()));
            }
        }
        None
    }
    
    async fn broadcast_to_room(&self, room_id: &str, message: ServerMessage) {
        if let Some(room_arc) = self.rooms.read().await.get(room_id) {
            let room = room_arc.lock().await;
            let connections = self.connections.read().await;
            
            // Send to white player
            if let Some(white) = &room.white_player {
                if let Some(tx) = connections.get(&white.connection_id) {
                    let _ = tx.send(message.clone());
                }
            }
            
            // Send to black player
            if let Some(black) = &room.black_player {
                if let Some(tx) = connections.get(&black.connection_id) {
                    let _ = tx.send(message.clone());
                }
            }
            
            // Send to spectators
            for spectator_id in &room.spectators {
                // Note: You'd need to track spectator connection IDs
                // This is simplified for demonstration
            }
        }
    }
}

impl Clone for MultiplayerHub {
    fn clone(&self) -> Self {
        Self {
            rooms: Arc::clone(&self.rooms),
            connections: Arc::clone(&self.connections),
        }
    }
}

// Generate a readable room code like "CHESS-ABCD"
fn generate_room_code() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".chars().collect();
    let code: String = (0..4)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect();
    format!("CHESS-{}", code)
}