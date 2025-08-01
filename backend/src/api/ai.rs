use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use crate::{AppState, ai::{AICoachingSystem, CoachingAgent, MoveAnalysis}};

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/coaching/analyze", post(ai_analyze_game))
        .route("/coaching/suggest", post(ai_suggest_moves))
        .route("/coaching/plan", get(get_training_plan))
        .route("/coaching/personalities", get(get_coaching_personalities))
}

#[derive(Deserialize)]
struct AnalyzeGameRequest {
    fen: String,
    agent: Option<String>,
}

#[derive(Serialize)]
struct AnalyzeGameResponse {
    analysis: String,
    suggestions: Vec<String>,
    personality: String,
    confidence: f32,
    agent_used: String,
}

async fn ai_analyze_game(
    State(state): State<AppState>,
    Json(request): Json<AnalyzeGameRequest>,
) -> Result<Json<AnalyzeGameResponse>, StatusCode> {
    let ai_system = AICoachingSystem::new((*state.config).clone());
    
    // Parse agent or default to TacticalAssassin
    let agent = match request.agent.as_deref() {
        Some("tactical") => CoachingAgent::TacticalAssassin,
        Some("positional") => CoachingAgent::PositionalMaster,
        Some("endgame") => CoachingAgent::EndgameSpecialist,
        Some("opening") => CoachingAgent::OpeningExplorer,
        Some("blitz") => CoachingAgent::BlitzTrainer,
        Some("psychology") => CoachingAgent::PsychologyCoach,
        _ => CoachingAgent::TacticalAssassin,
    };
    
    match ai_system.analyze_position(&request.fen, agent.clone(), &state.config.ai_tier).await {
        Ok(analysis) => Ok(Json(AnalyzeGameResponse {
            analysis: analysis.analysis,
            suggestions: analysis.suggestions,
            personality: analysis.personality,
            confidence: analysis.confidence,
            agent_used: format!("{:?}", agent),
        })),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
struct SuggestMovesRequest {
    fen: String,
    move_count: Option<u8>,
    agent: Option<String>,
}

#[derive(Serialize)]
struct SuggestMovesResponse {
    moves: Vec<MoveAnalysis>,
    reasoning: String,
    agent_personality: String,
}

// Using MoveAnalysis from ai module

async fn ai_suggest_moves(
    State(state): State<AppState>,
    Json(request): Json<SuggestMovesRequest>,
) -> Result<Json<SuggestMovesResponse>, StatusCode> {
    let ai_system = AICoachingSystem::new((*state.config).clone());
    
    // Parse agent
    let agent = match request.agent.as_deref() {
        Some("tactical") => CoachingAgent::TacticalAssassin,
        Some("positional") => CoachingAgent::PositionalMaster,
        Some("endgame") => CoachingAgent::EndgameSpecialist,
        Some("opening") => CoachingAgent::OpeningExplorer,
        Some("blitz") => CoachingAgent::BlitzTrainer,
        Some("psychology") => CoachingAgent::PsychologyCoach,
        _ => CoachingAgent::TacticalAssassin,
    };
    
    // Generate AI-powered move suggestions
    match ai_system.suggest_moves(&request.fen, agent.clone(), request.move_count.unwrap_or(3)).await {
        Ok(suggestions) => Ok(Json(SuggestMovesResponse {
            moves: suggestions.moves,
            reasoning: suggestions.reasoning,
            agent_personality: format!("{:?}", agent),
        })),
        Err(_) => {
            // Fallback response
            Ok(Json(SuggestMovesResponse {
                moves: vec![
                    MoveAnalysis {
                        move_notation: "e2e4".to_string(),
                        evaluation: 0.5,
                        reasoning: "Control the center".to_string(),
                        tactical_themes: vec!["center_control".to_string()],
                    }
                ],
                reasoning: "Basic move suggestion - AI temporarily unavailable".to_string(),
                agent_personality: format!("{:?}", agent),
            }))
        }
    }
}

#[derive(Serialize)]
struct TrainingPlan {
    daily_puzzles: u32,
    focus_areas: Vec<String>,
    difficulty_level: String,
    estimated_improvement: String,
    agent_recommendations: Vec<AgentRecommendation>,
}

#[derive(Serialize)]
struct AgentRecommendation {
    agent: String,
    description: String,
    best_for: Vec<String>,
}

async fn get_training_plan(
    State(_state): State<AppState>,
) -> Result<Json<TrainingPlan>, StatusCode> {
    Ok(Json(TrainingPlan {
        daily_puzzles: 20,
        focus_areas: vec![
            "Tactical patterns".to_string(),
            "Endgame technique".to_string(),
            "Opening principles".to_string(),
        ],
        difficulty_level: "Intermediate".to_string(),
        estimated_improvement: "200-300 ELO points in 3 months".to_string(),
        agent_recommendations: vec![
            AgentRecommendation {
                agent: "TacticalAssassin".to_string(),
                description: "Aggressive tactical training".to_string(),
                best_for: vec!["Pattern recognition".to_string(), "Calculation".to_string()],
            },
            AgentRecommendation {
                agent: "PositionalMaster".to_string(),
                description: "Strategic understanding".to_string(),
                best_for: vec!["Long-term planning".to_string(), "Positional play".to_string()],
            },
            AgentRecommendation {
                agent: "BlitzTrainer".to_string(),
                description: "Fast decision making".to_string(),
                best_for: vec!["Time management".to_string(), "Intuition".to_string()],
            },
        ],
    }))
}

#[derive(Serialize)]
struct CoachingPersonality {
    id: String,
    name: String,
    description: String,
    personality: String,
    specialization: String,
    difficulty: String,
    best_for: Vec<String>,
}

async fn get_coaching_personalities(
    State(_state): State<AppState>,
) -> Result<Json<Vec<CoachingPersonality>>, StatusCode> {
    let personalities = vec![
        CoachingPersonality {
            id: "tactical".to_string(),
            name: "Tactical Assassin".to_string(),
            description: "Master of combinations and tactical fury".to_string(),
            personality: "Aggressive, direct feedback".to_string(),
            specialization: "Tactical patterns, combinations, sacrifices".to_string(),
            difficulty: "Intermediate to Advanced".to_string(),
            best_for: vec![
                "Improving calculation".to_string(),
                "Pattern recognition".to_string(),
                "Attacking play".to_string(),
            ],
        },
        CoachingPersonality {
            id: "positional".to_string(),
            name: "Positional Master".to_string(),
            description: "The strategist who sees the big picture".to_string(),
            personality: "Patient, educational".to_string(),
            specialization: "Strategic planning, pawn structures, piece coordination".to_string(),
            difficulty: "Beginner to Advanced".to_string(),
            best_for: vec![
                "Understanding strategy".to_string(),
                "Long-term planning".to_string(),
                "Positional play".to_string(),
            ],
        },
        CoachingPersonality {
            id: "endgame".to_string(),
            name: "Endgame Specialist".to_string(),
            description: "Precision in the final phase".to_string(),
            personality: "Technical, precise".to_string(),
            specialization: "Endgame technique, theoretical positions".to_string(),
            difficulty: "Intermediate to Advanced".to_string(),
            best_for: vec![
                "Endgame technique".to_string(),
                "Theoretical knowledge".to_string(),
                "Converting advantages".to_string(),
            ],
        },
        CoachingPersonality {
            id: "opening".to_string(),
            name: "Opening Explorer".to_string(),
            description: "Navigator of the opening labyrinth".to_string(),
            personality: "Theoretical, systematic".to_string(),
            specialization: "Opening theory, repertoire building".to_string(),
            difficulty: "Beginner to Advanced".to_string(),
            best_for: vec![
                "Opening preparation".to_string(),
                "Repertoire building".to_string(),
                "Understanding principles".to_string(),
            ],
        },
        CoachingPersonality {
            id: "blitz".to_string(),
            name: "Blitz Trainer".to_string(),
            description: "Speed and intuition in fast games".to_string(),
            personality: "Fast-paced, practical".to_string(),
            specialization: "Time management, quick decisions, intuition".to_string(),
            difficulty: "All levels".to_string(),
            best_for: vec![
                "Time management".to_string(),
                "Quick decision making".to_string(),
                "Developing intuition".to_string(),
            ],
        },
        CoachingPersonality {
            id: "psychology".to_string(),
            name: "Psychology Coach".to_string(),
            description: "Mental strength and confidence building".to_string(),
            personality: "Supportive, motivational".to_string(),
            specialization: "Mental preparation, confidence, pressure handling".to_string(),
            difficulty: "All levels".to_string(),
            best_for: vec![
                "Competition nerves".to_string(),
                "Building confidence".to_string(),
                "Mental resilience".to_string(),
            ],
        },
    ];

    Ok(Json(personalities))
}