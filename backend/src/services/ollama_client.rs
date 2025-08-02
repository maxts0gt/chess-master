use reqwest::{Client, Error};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use async_trait::async_trait;
use tokio::time::timeout;

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<Vec<i32>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaOptions {
    pub temperature: f32,
    pub top_p: f32,
    pub top_k: i32,
    pub num_predict: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaGenerateResponse {
    pub model: String,
    pub response: String,
    pub done: bool,
    pub context: Option<Vec<i32>>,
    pub total_duration: Option<i64>,
    pub eval_count: Option<i32>,
    pub eval_duration: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChessAnalysisRequest {
    pub position: String, // FEN
    pub analysis_type: String,
    pub move_history: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChessAnalysisResponse {
    pub analysis: String,
    pub confidence: f32,
    pub alternatives: Option<Vec<String>>,
    pub duration_ms: u64,
}

pub struct OllamaClient {
    client: Client,
    base_url: String,
    models: OllamaModels,
    timeout_secs: u64,
}

#[derive(Clone)]
pub struct OllamaModels {
    pub general: String,
    pub chess: String,
    pub analysis: String,
}

impl Default for OllamaModels {
    fn default() -> Self {
        Self {
            general: "llama3.2:1b-instruct-q4_0".to_string(),
            chess: "chess-coach:latest".to_string(),
            analysis: "deepseek-coder:1.3b-instruct-q4_0".to_string(),
        }
    }
}

impl OllamaClient {
    pub fn new(base_url: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url,
            models: OllamaModels::default(),
            timeout_secs: 30,
        }
    }

    pub async fn health_check(&self) -> Result<bool, Error> {
        let url = format!("{}/api/tags", self.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.status().is_success())
    }

    pub async fn generate(&self, request: OllamaGenerateRequest) -> Result<OllamaGenerateResponse, Error> {
        let url = format!("{}/api/generate", self.base_url);
        
        let response = timeout(
            Duration::from_secs(self.timeout_secs),
            self.client.post(&url).json(&request).send()
        ).await
        .map_err(|_| Error::builder().build())?;
        
        let response = response?;
        response.json::<OllamaGenerateResponse>().await
    }

    pub async fn analyze_chess_position(&self, request: ChessAnalysisRequest) -> Result<ChessAnalysisResponse, Box<dyn std::error::Error>> {
        let start = std::time::Instant::now();
        
        // Build chess-specific prompt
        let prompt = self.build_chess_prompt(&request);
        
        // Select appropriate model
        let model = match request.analysis_type.as_str() {
            "opening" => &self.models.chess,
            "tactics" => &self.models.analysis,
            "endgame" => &self.models.chess,
            _ => &self.models.general,
        };

        let ollama_request = OllamaGenerateRequest {
            model: model.clone(),
            prompt,
            stream: false,
            options: Some(OllamaOptions {
                temperature: 0.7,
                top_p: 0.9,
                top_k: 40,
                num_predict: 500,
            }),
            context: None,
        };

        let response = self.generate(ollama_request).await?;
        
        Ok(ChessAnalysisResponse {
            analysis: response.response,
            confidence: self.calculate_confidence(&response),
            alternatives: None,
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    fn build_chess_prompt(&self, request: &ChessAnalysisRequest) -> String {
        match request.analysis_type.as_str() {
            "opening" => {
                let moves = request.move_history.as_ref()
                    .map(|m| m.join(" "))
                    .unwrap_or_default();
                format!(
                    "Analyze this chess opening sequence: {}\n\
                    Current position (FEN): {}\n\
                    Identify the opening name, key ideas, and typical plans.",
                    moves, request.position
                )
            },
            "tactics" => {
                format!(
                    "Find tactical opportunities in this chess position (FEN: {}).\n\
                    Look for: forks, pins, skewers, discovered attacks, checkmate patterns.\n\
                    Provide concrete variations with evaluation.",
                    request.position
                )
            },
            "position" => {
                format!(
                    "Analyze this chess position (FEN: {}).\n\
                    Consider: material balance, piece activity, pawn structure, king safety.\n\
                    Provide strategic plans for both sides.",
                    request.position
                )
            },
            "endgame" => {
                format!(
                    "Analyze this endgame position (FEN: {}).\n\
                    Evaluate: winning chances, drawing techniques, key squares.\n\
                    Provide concrete plan to achieve the best result.",
                    request.position
                )
            },
            _ => {
                format!(
                    "Analyze this chess position (FEN: {}).\n\
                    Provide insights and recommendations.",
                    request.position
                )
            }
        }
    }

    fn calculate_confidence(&self, response: &OllamaGenerateResponse) -> f32 {
        // Simple confidence calculation based on response metrics
        if let (Some(eval_count), Some(eval_duration)) = (response.eval_count, response.eval_duration) {
            let tokens_per_second = eval_count as f32 / (eval_duration as f32 / 1_000_000_000.0);
            // Higher tokens/second generally indicates higher confidence
            (tokens_per_second / 50.0).min(1.0).max(0.5)
        } else {
            0.75 // Default confidence
        }
    }
}

// Load balancer for multiple Ollama instances
pub struct OllamaLoadBalancer {
    clients: Vec<OllamaClient>,
    current_index: std::sync::atomic::AtomicUsize,
}

impl OllamaLoadBalancer {
    pub fn new(urls: Vec<String>) -> Self {
        let clients = urls.into_iter()
            .map(|url| OllamaClient::new(url))
            .collect();
        
        Self {
            clients,
            current_index: std::sync::atomic::AtomicUsize::new(0),
        }
    }

    pub async fn analyze_chess_position(&self, request: ChessAnalysisRequest) -> Result<ChessAnalysisResponse, Box<dyn std::error::Error>> {
        // Round-robin load balancing
        let index = self.current_index.fetch_add(1, std::sync::atomic::Ordering::Relaxed) % self.clients.len();
        let client = &self.clients[index];
        
        // Try current client, fallback to next if failed
        match client.analyze_chess_position(request.clone()).await {
            Ok(response) => Ok(response),
            Err(_) => {
                // Try next client
                let next_index = (index + 1) % self.clients.len();
                self.clients[next_index].analyze_chess_position(request).await
            }
        }
    }

    pub async fn health_check_all(&self) -> Vec<(usize, bool)> {
        let mut results = Vec::new();
        for (i, client) in self.clients.iter().enumerate() {
            let is_healthy = client.health_check().await.unwrap_or(false);
            results.push((i, is_healthy));
        }
        results
    }
}

// Cache layer
use lru::LruCache;
use std::sync::Mutex;
use std::num::NonZeroUsize;

pub struct CachedOllamaClient {
    client: OllamaLoadBalancer,
    cache: Mutex<LruCache<String, ChessAnalysisResponse>>,
}

impl CachedOllamaClient {
    pub fn new(urls: Vec<String>, cache_size: usize) -> Self {
        let cache = Mutex::new(LruCache::new(NonZeroUsize::new(cache_size).unwrap()));
        Self {
            client: OllamaLoadBalancer::new(urls),
            cache,
        }
    }

    pub async fn analyze_chess_position(&self, request: ChessAnalysisRequest) -> Result<ChessAnalysisResponse, Box<dyn std::error::Error>> {
        // Create cache key
        let cache_key = format!("{}:{}", request.position, request.analysis_type);
        
        // Check cache
        if let Ok(mut cache) = self.cache.lock() {
            if let Some(cached) = cache.get(&cache_key) {
                return Ok(cached.clone());
            }
        }
        
        // Get fresh analysis
        let response = self.client.analyze_chess_position(request).await?;
        
        // Store in cache
        if let Ok(mut cache) = self.cache.lock() {
            cache.put(cache_key, response.clone());
        }
        
        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ollama_client_creation() {
        let client = OllamaClient::new("http://localhost:11434".to_string());
        assert_eq!(client.base_url, "http://localhost:11434");
    }

    #[tokio::test]
    async fn test_chess_prompt_building() {
        let client = OllamaClient::new("http://localhost:11434".to_string());
        let request = ChessAnalysisRequest {
            position: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string(),
            analysis_type: "opening".to_string(),
            move_history: Some(vec!["e4".to_string(), "e5".to_string()]),
        };
        
        let prompt = client.build_chess_prompt(&request);
        assert!(prompt.contains("opening sequence"));
        assert!(prompt.contains("e4 e5"));
    }
}