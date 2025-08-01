use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;
use std::collections::HashMap;

pub mod lobby;
pub mod game;
pub mod chat;

use crate::AppState;

#[derive(Debug, Clone)]
pub struct Player {
    pub id: Uuid,
    pub username: String,
    pub rating: u32,
    pub status: PlayerStatus,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PlayerStatus {
    Online,
    InLobby(Uuid), // Lobby ID
    InGame(Uuid),  // Game ID
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    // Connection
    Connect { token: String },
    Connected { player_id: Uuid },
    
    // Lobby
    CreateLobby { config: LobbyConfig },
    JoinLobby { lobby_id: Uuid },
    LeaveLobby,
    StartGame,
    
    // Game
    MakeMove { from: String, to: String },
    OfferDraw,
    Resign,
    
    // Chat
    ChatMessage { text: String },
    
    // System
    Error { message: String },
    Ping,
    Pong,
    
    // Lobby Messages
    LobbyMessage(lobby::LobbyMessage),
    
    // Game Messages
    GameMessage(game::GameMessage),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LobbyConfig {
    pub name: String,
    pub mode: GameMode,
    pub max_players: u8,
    pub time_control: String,
    pub rated: bool,
    pub voice_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameMode {
    Deathmatch,
    Tournament,
    Training,
    Ranked,
    Custom,
}

pub struct WsState {
    pub players: Arc<RwLock<HashMap<Uuid, Player>>>,
    pub lobbies: Arc<RwLock<HashMap<Uuid, lobby::Lobby>>>,
    pub games: Arc<RwLock<HashMap<Uuid, game::Game>>>,
    pub broadcast: broadcast::Sender<BroadcastMessage>,
}

#[derive(Debug, Clone)]
pub struct BroadcastMessage {
    pub target: BroadcastTarget,
    pub message: WsMessage,
}

#[derive(Debug, Clone)]
pub enum BroadcastTarget {
    All,
    Player(Uuid),
    Lobby(Uuid),
    Game(Uuid),
}

impl WsState {
    pub fn new() -> Self {
        let (broadcast, _) = broadcast::channel(1000);
        
        Self {
            players: Arc::new(RwLock::new(HashMap::new())),
            lobbies: Arc::new(RwLock::new(HashMap::new())),
            games: Arc::new(RwLock::new(HashMap::new())),
            broadcast,
        }
    }
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| websocket_connection(socket, state))
}

async fn websocket_connection(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let player_id = Uuid::new_v4();
    
    // Subscribe to broadcasts
    let mut broadcast_rx = state.ws_state.broadcast.subscribe();
    
    // Clone state for the broadcast task
    let broadcast_state = state.clone();
    
    // Spawn task to handle broadcasts
    let broadcast_task = tokio::spawn(async move {
        while let Ok(msg) = broadcast_rx.recv().await {
            match msg.target {
                BroadcastTarget::All => {
                    if let Ok(text) = serde_json::to_string(&msg.message) {
                        let _ = sender.send(Message::Text(text)).await;
                    }
                }
                BroadcastTarget::Player(id) if id == player_id => {
                    if let Ok(text) = serde_json::to_string(&msg.message) {
                        let _ = sender.send(Message::Text(text)).await;
                    }
                }
                BroadcastTarget::Lobby(lobby_id) => {
                    // Check if player is in this lobby
                    let players = broadcast_state.ws_state.players.read().await;
                    if let Some(player) = players.get(&player_id) {
                        if let PlayerStatus::InLobby(id) = player.status {
                            if id == lobby_id {
                                if let Ok(text) = serde_json::to_string(&msg.message) {
                                    let _ = sender.send(Message::Text(text)).await;
                                }
                            }
                        }
                    }
                }
                BroadcastTarget::Game(game_id) => {
                    // Check if player is in this game
                    let players = broadcast_state.ws_state.players.read().await;
                    if let Some(player) = players.get(&player_id) {
                        if let PlayerStatus::InGame(id) = player.status {
                            if id == game_id {
                                if let Ok(text) = serde_json::to_string(&msg.message) {
                                    let _ = sender.send(Message::Text(text)).await;
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    });
    
    // Handle incoming messages
    while let Some(msg) = receiver.next().await {
        if let Ok(msg) = msg {
            match msg {
                Message::Text(text) => {
                    if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                        handle_message(ws_msg, player_id, &state).await;
                    }
                }
                Message::Close(_) => {
                    handle_disconnect(player_id, &state).await;
                    break;
                }
                _ => {}
            }
        }
    }
    
    // Cleanup
    broadcast_task.abort();
    handle_disconnect(player_id, &state).await;
}

async fn handle_message(msg: WsMessage, player_id: Uuid, state: &AppState) {
    match msg {
        WsMessage::Connect { token: _ } => {
            // TODO: Validate token and get user info
            // For now, create a test player
            let player = Player {
                id: player_id,
                username: format!("Player_{}", &player_id.to_string()[..8]),
                rating: 1200,
                status: PlayerStatus::Online,
            };
            
            state.ws_state.players.write().await.insert(player_id, player);
            
            // Send connected confirmation
            let _ = state.ws_state.broadcast.send(BroadcastMessage {
                target: BroadcastTarget::Player(player_id),
                message: WsMessage::Connected { player_id },
            });
        }
        
        WsMessage::CreateLobby { config } => {
            lobby::create_lobby(player_id, config, state).await;
        }
        
        WsMessage::JoinLobby { lobby_id } => {
            lobby::join_lobby(player_id, lobby_id, state).await;
        }
        
        WsMessage::StartGame => {
            // Find player's lobby and start game
            let players = state.ws_state.players.read().await;
            if let Some(player) = players.get(&player_id) {
                if let PlayerStatus::InLobby(lobby_id) = player.status {
                    drop(players);
                    match game::create_game_from_lobby(lobby_id, state).await {
                        Ok(game_id) => {
                            tracing::info!("Game {} started from lobby {}", game_id, lobby_id);
                        }
                        Err(e) => {
                            let _ = state.ws_state.broadcast.send(BroadcastMessage {
                                target: BroadcastTarget::Player(player_id),
                                message: WsMessage::Error { message: e },
                            });
                        }
                    }
                }
            }
        }
        
        WsMessage::MakeMove { from, to } => {
            // Find player's game and make move
            let players = state.ws_state.players.read().await;
            if let Some(player) = players.get(&player_id) {
                if let PlayerStatus::InGame(game_id) = player.status {
                    drop(players);
                    if let Err(e) = game::make_move(game_id, player_id, from, to, state).await {
                        let _ = state.ws_state.broadcast.send(BroadcastMessage {
                            target: BroadcastTarget::Player(player_id),
                            message: WsMessage::GameMessage(game::GameMessage::InvalidMove { reason: e }),
                        });
                    }
                }
            }
        }
        
        WsMessage::Ping => {
            let _ = state.ws_state.broadcast.send(BroadcastMessage {
                target: BroadcastTarget::Player(player_id),
                message: WsMessage::Pong,
            });
        }
        
        _ => {
            tracing::warn!("Unhandled message type from player {}", player_id);
        }
    }
}

async fn handle_disconnect(player_id: Uuid, state: &AppState) {
    // Get player status
    let (should_leave_lobby, lobby_id) = {
        let mut players = state.ws_state.players.write().await;
        if let Some(player) = players.get_mut(&player_id) {
            let result = match &player.status {
                PlayerStatus::InLobby(id) => (true, Some(*id)),
                PlayerStatus::InGame(game_id) => {
                    // Handle game disconnection
                    tracing::info!("Player {} disconnected from game {}", player_id, game_id);
                    (false, None)
                }
                _ => (false, None),
            };
            player.status = PlayerStatus::Offline;
            result
        } else {
            (false, None)
        }
    };
    
    // Leave lobby if needed
    if should_leave_lobby {
        if let Some(id) = lobby_id {
            lobby::leave_lobby(player_id, id, state).await;
        }
    }
    
    // Clone the Arc for the spawned task
    let players_arc = state.ws_state.players.clone();
    
    // Remove player after some time (allow reconnection)
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
        let mut players = players_arc.write().await;
        players.remove(&player_id);
    });
}