// MIT Licensed Chess AI for Offline Play
// This is a simple chess engine implementation using minimax with alpha-beta pruning
// Suitable for beginner to intermediate level play

import { Chess } from 'chess.js';

interface MoveEvaluation {
  move: string;
  evaluation: number;
}

export class ChessAI {
  private pieceValues = {
    p: 1,    // pawn
    n: 3,    // knight
    b: 3,    // bishop
    r: 5,    // rook
    q: 9,    // queen
    k: 90    // king
  };

  private positionBonus = {
    // Pawn position bonus (encourage center control and advancement)
    p: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 5, 5, 5, 5, 5, 5, 5],
      [1, 1, 2, 3, 3, 2, 1, 1],
      [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5],
      [0, 0, 0, 2, 2, 0, 0, 0],
      [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5],
      [0.5, 1, 1, -2, -2, 1, 1, 0.5],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    // Knight position bonus (prefer center)
    n: [
      [-5, -4, -3, -3, -3, -3, -4, -5],
      [-4, -2, 0, 0, 0, 0, -2, -4],
      [-3, 0, 1, 1.5, 1.5, 1, 0, -3],
      [-3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3],
      [-3, 0, 1.5, 2, 2, 1.5, 0, -3],
      [-3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3],
      [-4, -2, 0, 0.5, 0.5, 0, -2, -4],
      [-5, -4, -3, -3, -3, -3, -4, -5]
    ],
    // Bishop position bonus
    b: [
      [-2, -1, -1, -1, -1, -1, -1, -2],
      [-1, 0, 0, 0, 0, 0, 0, -1],
      [-1, 0, 0.5, 1, 1, 0.5, 0, -1],
      [-1, 0.5, 0.5, 1, 1, 0.5, 0.5, -1],
      [-1, 0, 1, 1, 1, 1, 0, -1],
      [-1, 1, 1, 1, 1, 1, 1, -1],
      [-1, 0.5, 0, 0, 0, 0, 0.5, -1],
      [-2, -1, -1, -1, -1, -1, -1, -2]
    ],
    // Rook position bonus
    r: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0.5, 1, 1, 1, 1, 1, 1, 0.5],
      [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
      [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
      [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
      [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
      [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
      [0, 0, 0, 0.5, 0.5, 0, 0, 0]
    ],
    // Queen position bonus
    q: [
      [-2, -1, -1, -0.5, -0.5, -1, -1, -2],
      [-1, 0, 0, 0, 0, 0, 0, -1],
      [-1, 0, 0.5, 0.5, 0.5, 0.5, 0, -1],
      [-0.5, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
      [0, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
      [-1, 0.5, 0.5, 0.5, 0.5, 0.5, 0, -1],
      [-1, 0, 0.5, 0, 0, 0, 0, -1],
      [-2, -1, -1, -0.5, -0.5, -1, -1, -2]
    ],
    // King position bonus (early/mid game)
    k: [
      [-3, -4, -4, -5, -5, -4, -4, -3],
      [-3, -4, -4, -5, -5, -4, -4, -3],
      [-3, -4, -4, -5, -5, -4, -4, -3],
      [-3, -4, -4, -5, -5, -4, -4, -3],
      [-2, -3, -3, -4, -4, -3, -3, -2],
      [-1, -2, -2, -2, -2, -2, -2, -1],
      [2, 2, 0, 0, 0, 0, 2, 2],
      [2, 3, 1, 0, 0, 1, 3, 2]
    ]
  };

  constructor(private maxDepth: number = 3) {}

  // Get the best move for the current position
  getBestMove(fen: string, timeLimit?: number): string | null {
    const chess = new Chess(fen);
    const startTime = Date.now();
    
    // Adjust depth based on number of pieces (endgame = deeper search)
    const pieceCount = this.countPieces(chess);
    const depth = pieceCount < 10 ? Math.min(this.maxDepth + 2, 5) : this.maxDepth;
    
    const isMaximizing = chess.turn() === 'w';
    const { move } = this.minimax(
      chess, 
      depth, 
      -Infinity, 
      Infinity, 
      isMaximizing,
      timeLimit ? startTime + timeLimit : undefined
    );
    
    return move;
  }

  // Minimax with alpha-beta pruning
  private minimax(
    chess: Chess, 
    depth: number, 
    alpha: number, 
    beta: number, 
    isMaximizing: boolean,
    timeLimit?: number
  ): { evaluation: number; move: string | null } {
    // Check time limit
    if (timeLimit && Date.now() > timeLimit) {
      return { evaluation: this.evaluatePosition(chess), move: null };
    }

    // Terminal node
    if (depth === 0 || chess.isGameOver()) {
      return { evaluation: this.evaluatePosition(chess), move: null };
    }

    const moves = chess.moves();
    let bestMove = moves[0] || null;
    let bestEval = isMaximizing ? -Infinity : Infinity;

    // Order moves for better alpha-beta pruning
    const orderedMoves = this.orderMoves(chess, moves);

    for (const move of orderedMoves) {
      chess.move(move);
      
      const { evaluation } = this.minimax(
        chess, 
        depth - 1, 
        alpha, 
        beta, 
        !isMaximizing,
        timeLimit
      );
      
      chess.undo();

      if (isMaximizing) {
        if (evaluation > bestEval) {
          bestEval = evaluation;
          bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
      } else {
        if (evaluation < bestEval) {
          bestEval = evaluation;
          bestMove = move;
        }
        beta = Math.min(beta, evaluation);
      }

      // Alpha-beta pruning
      if (beta <= alpha) {
        break;
      }
    }

    return { evaluation: bestEval, move: bestMove };
  }

  // Evaluate the current position
  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -9999 : 9999;
    }
    
    if (chess.isDraw()) {
      return 0;
    }

    let evaluation = 0;
    const board = chess.board();

    // Material and position evaluation
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const pieceType = piece.type;
          const pieceColor = piece.color;
          const value = this.pieceValues[pieceType];
          const posBonus = this.getPositionBonus(pieceType, i, j, pieceColor);
          
          if (pieceColor === 'w') {
            evaluation += value + posBonus;
          } else {
            evaluation -= value + posBonus;
          }
        }
      }
    }

    // Additional positional factors
    evaluation += this.evaluateMobility(chess) * 0.1;
    evaluation += this.evaluateKingSafety(chess) * 0.2;
    evaluation += this.evaluatePawnStructure(chess) * 0.15;

    return evaluation;
  }

  // Get position bonus for a piece
  private getPositionBonus(
    pieceType: string, 
    row: number, 
    col: number, 
    color: string
  ): number {
    const bonus = this.positionBonus[pieceType];
    if (!bonus) return 0;
    
    // Flip the board for black pieces
    const r = color === 'w' ? row : 7 - row;
    return bonus[r][col] || 0;
  }

  // Evaluate mobility (number of legal moves)
  private evaluateMobility(chess: Chess): number {
    const currentTurn = chess.turn();
    const whiteMoves = currentTurn === 'w' ? chess.moves().length : 0;
    
    // Switch turn to count opponent moves
    const fen = chess.fen();
    const parts = fen.split(' ');
    parts[1] = currentTurn === 'w' ? 'b' : 'w';
    const oppChess = new Chess(parts.join(' '));
    const blackMoves = oppChess.moves().length;
    
    return whiteMoves - blackMoves;
  }

  // Basic king safety evaluation
  private evaluateKingSafety(chess: Chess): number {
    let safety = 0;
    const board = chess.board();
    
    // Find kings
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k') {
          // Penalty for exposed king
          const shields = this.countKingShields(board, i, j, piece.color);
          safety += piece.color === 'w' ? shields : -shields;
        }
      }
    }
    
    return safety;
  }

  // Count pawns shielding the king
  private countKingShields(
    board: any[][], 
    kingRow: number, 
    kingCol: number, 
    color: string
  ): number {
    let shields = 0;
    const pawnRow = color === 'w' ? kingRow - 1 : kingRow + 1;
    
    if (pawnRow >= 0 && pawnRow < 8) {
      for (let col = Math.max(0, kingCol - 1); col <= Math.min(7, kingCol + 1); col++) {
        const piece = board[pawnRow][col];
        if (piece && piece.type === 'p' && piece.color === color) {
          shields++;
        }
      }
    }
    
    return shields;
  }

  // Basic pawn structure evaluation
  private evaluatePawnStructure(chess: Chess): number {
    let structure = 0;
    const board = chess.board();
    const pawnsByFile = { w: new Array(8).fill(0), b: new Array(8).fill(0) };
    
    // Count pawns by file
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'p') {
          pawnsByFile[piece.color][j]++;
        }
      }
    }
    
    // Penalize doubled pawns
    for (let file = 0; file < 8; file++) {
      if (pawnsByFile.w[file] > 1) structure -= (pawnsByFile.w[file] - 1) * 0.5;
      if (pawnsByFile.b[file] > 1) structure += (pawnsByFile.b[file] - 1) * 0.5;
    }
    
    return structure;
  }

  // Order moves for better alpha-beta pruning
  private orderMoves(chess: Chess, moves: string[]): string[] {
    const moveScores: MoveEvaluation[] = [];
    
    for (const move of moves) {
      let score = 0;
      const moveObj = chess.move(move);
      
      // Prioritize captures
      if (moveObj.captured) {
        score += this.pieceValues[moveObj.captured] * 10;
      }
      
      // Prioritize checks
      if (chess.inCheck()) {
        score += 50;
      }
      
      // Prioritize center moves
      const to = moveObj.to;
      const file = to.charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = parseInt(to[1]) - 1;
      if (file >= 3 && file <= 4 && rank >= 3 && rank <= 4) {
        score += 10;
      }
      
      chess.undo();
      moveScores.push({ move, evaluation: score });
    }
    
    // Sort moves by score (descending)
    moveScores.sort((a, b) => b.evaluation - a.evaluation);
    return moveScores.map(ms => ms.move);
  }

  // Count pieces on the board
  private countPieces(chess: Chess): number {
    const board = chess.board();
    let count = 0;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (board[i][j]) count++;
      }
    }
    
    return count;
  }

  // Set AI difficulty (depth)
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
    switch (difficulty) {
      case 'easy':
        this.maxDepth = 2;
        break;
      case 'medium':
        this.maxDepth = 3;
        break;
      case 'hard':
        this.maxDepth = 4;
        break;
    }
  }
}

// Singleton instance
export const chessAI = new ChessAI();