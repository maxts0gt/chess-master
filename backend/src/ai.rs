// AI Coaching Module - MCP Protocol & Multi-Agent System
use serde::Serialize;
use anyhow::Result;
use reqwest::Client;
use crate::config::{AppConfig, AITier};
use crate::models::AICoachingResponse;

#[derive(Debug, Clone)]
pub enum CoachingAgent {
    TacticalAssassin,
    PositionalMaster,
    EndgameSpecialist,
    OpeningExplorer,
    BlitzTrainer,
    PsychologyCoach,
}

impl CoachingAgent {
    pub fn personality(&self) -> &'static str {
        match self {
            CoachingAgent::TacticalAssassin => "Aggressive, direct feedback",
            CoachingAgent::PositionalMaster => "Patient, educational",
            CoachingAgent::EndgameSpecialist => "Technical, precise",
            CoachingAgent::OpeningExplorer => "Theoretical, systematic",
            CoachingAgent::BlitzTrainer => "Fast-paced, practical",
            CoachingAgent::PsychologyCoach => "Supportive, motivational",
        }
    }
}

#[derive(Serialize)]
pub struct MoveAnalysis {
    pub move_notation: String,
    pub evaluation: f32,
    pub reasoning: String,
    pub tactical_themes: Vec<String>,
}

#[derive(Serialize)]
pub struct MoveSuggestions {
    pub moves: Vec<MoveAnalysis>,
    pub reasoning: String,
}

pub struct AICoachingSystem {
    client: Client,
    config: AppConfig,
}

impl AICoachingSystem {
    pub fn new(config: AppConfig) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    pub async fn analyze_position(
        &self,
        fen: &str,
        agent: CoachingAgent,
        user_tier: &AITier,
    ) -> Result<AICoachingResponse> {
        match user_tier {
            AITier::Free => self.basic_analysis(fen).await,
            AITier::Paid => self.ai_analysis(fen, agent).await,
            AITier::Premium => self.premium_analysis(fen, agent).await,
        }
    }

    pub async fn suggest_moves(
        &self,
        fen: &str,
        agent: CoachingAgent,
        move_count: u8,
    ) -> Result<MoveSuggestions> {
        let prompt = format!(
            "Suggest {} chess moves for this position from the perspective of a {}: {}. 
            Position FEN: {}. 
            For each move, provide: move notation, evaluation score, reasoning, and tactical themes.",
            move_count,
            agent.personality(),
            match agent {
                CoachingAgent::TacticalAssassin => "Focus on aggressive, tactical moves",
                CoachingAgent::PositionalMaster => "Focus on positional, strategic moves",
                CoachingAgent::EndgameSpecialist => "Focus on precise, technical moves",
                CoachingAgent::OpeningExplorer => "Focus on sound opening principles",
                CoachingAgent::BlitzTrainer => "Focus on practical, intuitive moves",
                CoachingAgent::PsychologyCoach => "Focus on confidence-building moves",
            },
            fen
        );

        // Try to get AI analysis, fallback to basic analysis
        match self.call_ollama_for_moves(&prompt, move_count).await {
            Ok(suggestions) => Ok(suggestions),
            Err(_) => {
                // Fallback to basic move suggestions
                Ok(MoveSuggestions {
                    moves: self.basic_move_suggestions(move_count),
                    reasoning: format!(
                        "Basic move suggestions from {} perspective. AI coaching temporarily unavailable.",
                        agent.personality()
                    ),
                })
            }
        }
    }

    async fn basic_analysis(&self, _fen: &str) -> Result<AICoachingResponse> {
        // Algorithm-based coaching for free users
        Ok(AICoachingResponse {
            analysis: "This position offers interesting possibilities. Focus on piece development and center control.".to_string(),
            suggestions: vec![
                "Develop knights before bishops".to_string(),
                "Control the center with pawns".to_string(),
                "Castle early for king safety".to_string(),
            ],
            personality: "Basic Coach".to_string(),
            confidence: 0.7,
        })
    }

    async fn ai_analysis(&self, fen: &str, agent: CoachingAgent) -> Result<AICoachingResponse> {
        // Multi-agent AI coaching for paid users
        let prompt = format!(
            "Analyze this chess position from the perspective of a {}: {}. Position FEN: {}
            
            Provide:
            1. Deep analysis of the position
            2. 3-5 specific suggestions
            3. Key strategic/tactical themes
            4. Confidence level in your assessment",
            agent.personality(),
            match agent {
                CoachingAgent::TacticalAssassin => "Focus on tactical opportunities, combinations, and aggressive moves",
                CoachingAgent::PositionalMaster => "Focus on positional understanding, long-term planning, and strategic concepts",
                CoachingAgent::EndgameSpecialist => "Focus on endgame technique, precision, and theoretical knowledge",
                CoachingAgent::OpeningExplorer => "Focus on opening principles, theory, and repertoire building",
                CoachingAgent::BlitzTrainer => "Focus on practical decisions, time management, and intuitive play",
                CoachingAgent::PsychologyCoach => "Focus on confidence building, mental approach, and pressure handling",
            },
            fen
        );

        self.call_ollama(&prompt).await
    }

    async fn premium_analysis(&self, fen: &str, agent: CoachingAgent) -> Result<AICoachingResponse> {
        // Custom API integration for premium users
        // For now, use enhanced AI analysis
        self.ai_analysis(fen, agent).await
    }

    async fn call_ollama(&self, prompt: &str) -> Result<AICoachingResponse> {
        // Local Ollama integration for development
        let response = self
            .client
            .post(&format!("{}/api/generate", self.config.ollama_host))
            .json(&serde_json::json!({
                "model": "llama3.1:8b",
                "prompt": prompt,
                "stream": false,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 500
                }
            }))
            .send()
            .await?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json().await?;
            let analysis = result["response"]
                .as_str()
                .unwrap_or("Analysis not available")
                .to_string();

            // Parse the AI response to extract suggestions
            let suggestions = self.extract_suggestions(&analysis);

            Ok(AICoachingResponse {
                analysis,
                suggestions,
                personality: "AI Coach".to_string(),
                confidence: 0.8,
            })
        } else {
            // Fallback to basic analysis if Ollama is not available
            Ok(AICoachingResponse {
                analysis: "AI coaching temporarily unavailable. The position shows typical middlegame characteristics.".to_string(),
                suggestions: vec![
                    "Consider piece activity and coordination".to_string(),
                    "Look for tactical opportunities".to_string(),
                    "Improve your worst-placed piece".to_string(),
                ],
                personality: "Fallback Coach".to_string(),
                confidence: 0.5,
            })
        }
    }

    async fn call_ollama_for_moves(&self, prompt: &str, move_count: u8) -> Result<MoveSuggestions> {
        let response = self
            .client
            .post(&format!("{}/api/generate", self.config.ollama_host))
            .json(&serde_json::json!({
                "model": "llama3.1:8b",
                "prompt": prompt,
                "stream": false,
                "options": {
                    "temperature": 0.5,
                    "top_p": 0.8,
                    "max_tokens": 400
                }
            }))
            .send()
            .await?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json().await?;
            let analysis = result["response"]
                .as_str()
                .unwrap_or("No moves available")
                .to_string();

            // Parse AI response to extract move suggestions
            let moves = self.parse_move_suggestions(&analysis, move_count);
            
            Ok(MoveSuggestions {
                moves,
                reasoning: analysis,
            })
        } else {
            Err(anyhow::anyhow!("Failed to get AI move suggestions"))
        }
    }

    fn extract_suggestions(&self, analysis: &str) -> Vec<String> {
        // Simple extraction of suggestions from AI response
        // In a production system, this would be more sophisticated
        let lines: Vec<&str> = analysis.lines().collect();
        let mut suggestions = Vec::new();
        
        for line in lines {
            let line = line.trim();
            if line.starts_with("-") || line.starts_with("•") || line.starts_with("*") {
                suggestions.push(line.trim_start_matches(&['-', '•', '*', ' ']).to_string());
            }
        }
        
        if suggestions.is_empty() {
            suggestions.push("Continue developing pieces".to_string());
            suggestions.push("Look for tactical opportunities".to_string());
        }
        
        suggestions.truncate(5); // Limit to 5 suggestions
        suggestions
    }

    fn parse_move_suggestions(&self, analysis: &str, move_count: u8) -> Vec<MoveAnalysis> {
        // Simple parsing of move suggestions from AI response
        // In production, this would use more sophisticated NLP
        let basic_moves = self.basic_move_suggestions(move_count);
        
        // Try to extract moves from AI response
        let lines: Vec<&str> = analysis.lines().collect();
        let mut moves = Vec::new();
        
        for line in lines {
            if line.contains("e4") || line.contains("d4") || line.contains("Nf3") {
                // This is a very basic pattern - in production, use proper chess move parsing
                let move_notation = if line.contains("e4") {
                    "e2e4"
                } else if line.contains("d4") {
                    "d2d4"
                } else {
                    "g1f3"
                };
                
                moves.push(MoveAnalysis {
                    move_notation: move_notation.to_string(),
                    evaluation: 0.5,
                    reasoning: line.trim().to_string(),
                    tactical_themes: vec!["center_control".to_string()],
                });
                
                if moves.len() >= move_count as usize {
                    break;
                }
            }
        }
        
        // Fallback to basic moves if parsing failed
        if moves.is_empty() {
            basic_moves
        } else {
            moves
        }
    }

    fn basic_move_suggestions(&self, move_count: u8) -> Vec<MoveAnalysis> {
        let basic_moves = vec![
            MoveAnalysis {
                move_notation: "e2e4".to_string(),
                evaluation: 0.3,
                reasoning: "Control center and open lines for development".to_string(),
                tactical_themes: vec!["center_control".to_string(), "development".to_string()],
            },
            MoveAnalysis {
                move_notation: "d2d4".to_string(),
                evaluation: 0.3,
                reasoning: "Solid center control and space advantage".to_string(),
                tactical_themes: vec!["center_control".to_string(), "space".to_string()],
            },
            MoveAnalysis {
                move_notation: "g1f3".to_string(),
                evaluation: 0.2,
                reasoning: "Develop knight toward center".to_string(),
                tactical_themes: vec!["development".to_string(), "piece_activity".to_string()],
            },
        ];
        
        basic_moves.into_iter().take(move_count as usize).collect()
    }
}