// Chess Engine Module - Chess.rs Integration
// This contains chess engine logic and position analysis

use serde::{Serialize, Deserialize};
use anyhow::{Result, anyhow};
use chess::{Board, ChessMove, Square, Piece, Color, Rank, MoveGen};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineAnalysis {
    pub evaluation: f32,
    pub best_move: String,
    pub depth: u8,
    pub nodes: u64,
    pub time_ms: u64,
    pub tactical_patterns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TacticalPattern {
    pub pattern_type: String,
    pub description: String,
    pub squares: Vec<String>,
}

pub struct ChessEngine {
    // For now we'll use the chess.rs library for basic analysis
    // In production, this could integrate with Stockfish
}

impl ChessEngine {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn analyze_position(&self, fen: &str, depth: u8) -> Result<EngineAnalysis> {
        let start_time = std::time::Instant::now();
        
        // Parse the position
        let board = Board::from_str(fen)
            .map_err(|e| anyhow!("Invalid FEN: {}", e))?;
        
        // Basic evaluation and best move calculation
        let (evaluation, best_move) = self.evaluate_position(&board)?;
        
        // Find tactical patterns
        let tactical_patterns = self.find_tactical_patterns_internal(&board)?;
        
        let elapsed = start_time.elapsed();
        
        Ok(EngineAnalysis {
            evaluation,
            best_move,
            depth,
            nodes: self.count_legal_moves(&board) as u64,
            time_ms: elapsed.as_millis() as u64,
            tactical_patterns,
        })
    }

    pub async fn find_tactical_patterns(&self, fen: &str) -> Result<Vec<String>> {
        let board = Board::from_str(fen)
            .map_err(|e| anyhow!("Invalid FEN: {}", e))?;
        
        self.find_tactical_patterns_internal(&board)
    }

    fn evaluate_position(&self, board: &Board) -> Result<(f32, String)> {
        let mut best_move = "e2e4".to_string();
        let mut best_eval = if board.side_to_move() == Color::White { -1000.0 } else { 1000.0 };
        
        // Simple material evaluation
        let mut material_eval = 0.0;
        
        for square in chess::ALL_SQUARES.iter() {
            if let Some(piece) = board.piece_on(*square) {
                let value = match piece {
                    Piece::Pawn => 1.0,
                    Piece::Knight => 3.0,
                    Piece::Bishop => 3.0,
                    Piece::Rook => 5.0,
                    Piece::Queen => 9.0,
                    Piece::King => 0.0,
                };
                
                match board.color_on(*square) {
                    Some(Color::White) => material_eval += value,
                    Some(Color::Black) => material_eval -= value,
                    None => {}
                }
            }
        }

        // Simple move evaluation - pick a legal move using MoveGen
        let movegen = MoveGen::new_legal(board);
        let legal_moves: Vec<ChessMove> = movegen.collect();
        
        if !legal_moves.is_empty() {
            // Pick first legal move for now (in real engine, we'd search deeper)
            best_move = format!("{}{}", 
                legal_moves[0].get_source().to_string().to_lowercase(),
                legal_moves[0].get_dest().to_string().to_lowercase()
            );
            
            // Adjust evaluation based on position
            best_eval = material_eval + self.positional_evaluation(board);
        }

        Ok((best_eval, best_move))
    }

    fn positional_evaluation(&self, board: &Board) -> f32 {
        let mut eval = 0.0;
        
        // Center control bonus
        let center_squares = [
            Square::D4, Square::D5, Square::E4, Square::E5
        ];
        
        for &square in center_squares.iter() {
            if let Some(piece) = board.piece_on(square) {
                if let Some(color) = board.color_on(square) {
                    let bonus = match piece {
                        Piece::Pawn => 0.5,
                        Piece::Knight => 0.3,
                        Piece::Bishop => 0.2,
                        _ => 0.1,
                    };
                    
                    match color {
                        Color::White => eval += bonus,
                        Color::Black => eval -= bonus,
                    }
                }
            }
        }
        
        // King safety - penalty for exposed king
        for color in [Color::White, Color::Black].iter() {
            let king_square = self.find_king_square(board, *color);
            if let Some(king_square) = king_square {
                let safety_bonus = self.evaluate_king_safety(board, king_square, *color);
                match color {
                    Color::White => eval += safety_bonus,
                    Color::Black => eval -= safety_bonus,
                }
            }
        }
        
        eval
    }

    fn find_king_square(&self, board: &Board, color: Color) -> Option<Square> {
        for square in chess::ALL_SQUARES.iter() {
            if board.piece_on(*square) == Some(Piece::King) && 
               board.color_on(*square) == Some(color) {
                return Some(*square);
            }
        }
        None
    }

    fn evaluate_king_safety(&self, board: &Board, king_square: Square, color: Color) -> f32 {
        let mut safety = 0.0;
        
        // Check if king is on back rank (safer)
        let back_rank = match color {
            Color::White => Rank::First,
            Color::Black => Rank::Eighth,
        };
        
        if king_square.get_rank() == back_rank {
            safety += 0.5;
        }
        
        // Check for pawn shield
        let pawn_rank = match color {
            Color::White => Rank::Second,
            Color::Black => Rank::Seventh,
        };
        
        // Check for pawn shield (simplified)
        let king_file = king_square.get_file();
        let king_square_for_pawn = Square::make_square(pawn_rank, king_file);
        if board.piece_on(king_square_for_pawn) == Some(Piece::Pawn) && 
           board.color_on(king_square_for_pawn) == Some(color) {
            safety += 0.3;
        }
        
        safety
    }

    fn find_tactical_patterns_internal(&self, board: &Board) -> Result<Vec<String>> {
        let mut patterns = Vec::new();
        
        // Check for pins
        if self.has_pins(board) {
            patterns.push("pin".to_string());
        }
        
        // Check for forks
        if self.has_forks(board) {
            patterns.push("fork".to_string());
        }
        
        // Check for skewers
        if self.has_skewers(board) {
            patterns.push("skewer".to_string());
        }
        
        // Check for discovered attacks
        if self.has_discovered_attacks(board) {
            patterns.push("discovered_attack".to_string());
        }
        
        // Check if king is in check
        if board.checkers().popcnt() > 0 {
            patterns.push("check".to_string());
        }
        
        // Check for checkmate - no legal moves and in check
        let movegen = MoveGen::new_legal(board);
        let legal_moves_count = movegen.len();
        
        if legal_moves_count == 0 && board.checkers().popcnt() > 0 {
            patterns.push("checkmate".to_string());
        }
        
        // Check for stalemate - no legal moves and not in check
        if legal_moves_count == 0 && board.checkers().popcnt() == 0 {
            patterns.push("stalemate".to_string());
        }
        
        Ok(patterns)
    }

    fn has_pins(&self, board: &Board) -> bool {
        // Check for pieces that are pinned to the king
        let pinned = board.pinned();
        if pinned.popcnt() > 0 {
            return true;
        }
        false
    }

    fn has_forks(&self, board: &Board) -> bool {
        // Check for knight forks (attacking multiple pieces)
        for square in chess::ALL_SQUARES.iter() {
            if board.piece_on(*square) == Some(Piece::Knight) {
                if let Some(color) = board.color_on(*square) {
                    let attacks = chess::get_knight_moves(*square);
                    let mut target_count = 0;
                    
                    for target_square in attacks {
                        if let Some(_target_piece) = board.piece_on(target_square) {
                            if let Some(target_color) = board.color_on(target_square) {
                                if target_color != color {
                                    target_count += 1;
                                    if target_count >= 2 {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        false
    }

    fn has_skewers(&self, _board: &Board) -> bool {
        // Simplified skewer detection - check for pieces in line with valuable pieces
        // This is complex to implement fully, so we'll use a simplified version
        false // Placeholder for now
    }

    fn has_discovered_attacks(&self, _board: &Board) -> bool {
        // Check for potential discovered attacks
        // This is complex to implement fully, so we'll use a simplified version
        false // Placeholder for now
    }

    fn count_legal_moves(&self, board: &Board) -> usize {
        let movegen = MoveGen::new_legal(board);
        movegen.len()
    }
}

// Helper function to validate FEN strings
pub fn validate_fen(fen: &str) -> Result<()> {
    Board::from_str(fen)
        .map_err(|e| anyhow!("Invalid FEN: {}", e))?;
    Ok(())
}