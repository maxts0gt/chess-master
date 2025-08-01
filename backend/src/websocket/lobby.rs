use super::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct Lobby {
    pub id: Uuid,
    pub name: String,
    pub host: Uuid,
    pub config: LobbyConfig,
    pub players: Vec<Uuid>,
    pub state: LobbyState,
    pub created_at: DateTime<Utc>,
    pub game_id: Option<Uuid>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum LobbyState {
    Waiting,
    Starting,
    InProgress,
    Finished,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LobbyMessage {
    LobbyCreated {
        lobby_id: Uuid,
        lobby: LobbyInfo,
    },
    LobbyUpdated {
        lobby: LobbyInfo,
    },
    PlayerJoined {
        player: PlayerInfo,
    },
    PlayerLeft {
        player_id: Uuid,
    },
    GameStarting {
        countdown: u8,
    },
    GameStarted {
        game_id: Uuid,
    },
    LobbyClosed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LobbyInfo {
    pub id: Uuid,
    pub name: String,
    pub host_name: String,
    pub mode: GameMode,
    pub players: Vec<PlayerInfo>,
    pub max_players: u8,
    pub state: LobbyState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerInfo {
    pub id: Uuid,
    pub username: String,
    pub rating: u32,
    pub ready: bool,
}

pub async fn create_lobby(player_id: Uuid, config: LobbyConfig, state: &AppState) {
    let lobby_id = Uuid::new_v4();
    
    // Check if player exists
    let players = state.ws_state.players.read().await;
    let player = match players.get(&player_id) {
        Some(p) => p.clone(),
        None => {
            let _ = state.ws_state.broadcast.send(BroadcastMessage {
                target: BroadcastTarget::Player(player_id),
                message: WsMessage::Error {
                    message: "Player not found".to_string(),
                },
            });
            return;
        }
    };
    drop(players);
    
    // Create lobby
    let lobby = Lobby {
        id: lobby_id,
        name: config.name.clone(),
        host: player_id,
        config,
        players: vec![player_id],
        state: LobbyState::Waiting,
        created_at: Utc::now(),
        game_id: None,
    };
    
    // Add lobby to state
    state.ws_state.lobbies.write().await.insert(lobby_id, lobby.clone());
    
    // Update player status
    let mut players = state.ws_state.players.write().await;
    if let Some(p) = players.get_mut(&player_id) {
        p.status = PlayerStatus::InLobby(lobby_id);
    }
    drop(players);
    
    // Create lobby info
    let lobby_info = create_lobby_info(&lobby, state).await;
    
    // Broadcast lobby created
    let _ = state.ws_state.broadcast.send(BroadcastMessage {
        target: BroadcastTarget::Player(player_id),
        message: WsMessage::LobbyMessage(LobbyMessage::LobbyCreated {
            lobby_id,
            lobby: lobby_info,
        }),
    });
    
    tracing::info!("Lobby {} created by player {}", lobby_id, player_id);
}

pub async fn join_lobby(player_id: Uuid, lobby_id: Uuid, state: &AppState) {
    // Get player info
    let players = state.ws_state.players.read().await;
    let player = match players.get(&player_id) {
        Some(p) => p.clone(),
        None => {
            let _ = state.ws_state.broadcast.send(BroadcastMessage {
                target: BroadcastTarget::Player(player_id),
                message: WsMessage::Error {
                    message: "Player not found".to_string(),
                },
            });
            return;
        }
    };
    drop(players);
    
    // Check and update lobby
    let mut lobbies = state.ws_state.lobbies.write().await;
    let lobby = match lobbies.get_mut(&lobby_id) {
        Some(l) => l,
        None => {
            let _ = state.ws_state.broadcast.send(BroadcastMessage {
                target: BroadcastTarget::Player(player_id),
                message: WsMessage::Error {
                    message: "Lobby not found".to_string(),
                },
            });
            return;
        }
    };
    
    // Check if lobby is full
    if lobby.players.len() >= lobby.config.max_players as usize {
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Player(player_id),
            message: WsMessage::Error {
                message: "Lobby is full".to_string(),
            },
        });
        return;
    }
    
    // Check if player is already in lobby
    if lobby.players.contains(&player_id) {
        return;
    }
    
    // Add player to lobby
    lobby.players.push(player_id);
    drop(lobbies);
    
    // Update player status
    let mut players = state.ws_state.players.write().await;
    if let Some(p) = players.get_mut(&player_id) {
        p.status = PlayerStatus::InLobby(lobby_id);
    }
    drop(players);
    
    // Create player info
    let player_info = PlayerInfo {
        id: player.id,
        username: player.username.clone(),
        rating: player.rating,
        ready: false,
    };
    
    // Broadcast to lobby
    let _ = state.ws_state.broadcast.send(BroadcastMessage {
        target: BroadcastTarget::Lobby(lobby_id),
        message: WsMessage::LobbyMessage(LobbyMessage::PlayerJoined {
            player: player_info,
        }),
    });
    
    // Send lobby info to new player
    let lobbies = state.ws_state.lobbies.read().await;
    if let Some(lobby) = lobbies.get(&lobby_id) {
        let lobby_info = create_lobby_info(lobby, state).await;
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Player(player_id),
            message: WsMessage::LobbyMessage(LobbyMessage::LobbyUpdated {
                lobby: lobby_info,
            }),
        });
    }
    
    tracing::info!("Player {} joined lobby {}", player_id, lobby_id);
}

pub async fn leave_lobby(player_id: Uuid, lobby_id: Uuid, state: &AppState) {
    let mut lobbies = state.ws_state.lobbies.write().await;
    let should_close = if let Some(lobby) = lobbies.get_mut(&lobby_id) {
        // Remove player from lobby
        lobby.players.retain(|&id| id != player_id);
        
        // If host left, assign new host or close lobby
        if lobby.host == player_id {
            if lobby.players.is_empty() {
                true
            } else {
                lobby.host = lobby.players[0];
                false
            }
        } else {
            false
        }
    } else {
        return;
    };
    
    if should_close {
        // Close lobby
        lobbies.remove(&lobby_id);
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Lobby(lobby_id),
            message: WsMessage::LobbyMessage(LobbyMessage::LobbyClosed),
        });
        tracing::info!("Lobby {} closed", lobby_id);
    } else {
        // Notify remaining players
        let _ = state.ws_state.broadcast.send(BroadcastMessage {
            target: BroadcastTarget::Lobby(lobby_id),
            message: WsMessage::LobbyMessage(LobbyMessage::PlayerLeft { player_id }),
        });
    }
    
    // Update player status
    let mut players = state.ws_state.players.write().await;
    if let Some(p) = players.get_mut(&player_id) {
        p.status = PlayerStatus::Online;
    }
}

async fn create_lobby_info(lobby: &Lobby, state: &AppState) -> LobbyInfo {
    let players = state.ws_state.players.read().await;
    
    let player_infos: Vec<PlayerInfo> = lobby.players.iter()
        .filter_map(|&id| {
            players.get(&id).map(|p| PlayerInfo {
                id: p.id,
                username: p.username.clone(),
                rating: p.rating,
                ready: false, // TODO: Track ready state
            })
        })
        .collect();
    
    let host_name = players.get(&lobby.host)
        .map(|p| p.username.clone())
        .unwrap_or_else(|| "Unknown".to_string());
    
    LobbyInfo {
        id: lobby.id,
        name: lobby.name.clone(),
        host_name,
        mode: lobby.config.mode.clone(),
        players: player_infos,
        max_players: lobby.config.max_players,
        state: lobby.state.clone(),
    }
}