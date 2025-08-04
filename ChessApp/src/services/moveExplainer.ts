// Move Explainer Service
// Provides human-friendly explanations for chess moves
import { Chess } from 'chess.js';
import { ollamaService } from './ollamaService';
import { offlineTeacher } from './offlineChessTeacher';

interface MoveExplanation {
  move: string;
  piece: string;
  type: string;
  explanation: string;
  learningPoints: string[];
  strategicValue: string;
  threats?: string[];
  opportunities?: string[];
  explanationType?: 'ai' | 'rule-based';
}

export class MoveExplainer {
  private chess: Chess;
  private useAIExplanations: boolean = true;

  constructor() {
    this.chess = new Chess();
    this.checkAIAvailability();
  }

  private async checkAIAvailability() {
    const available = await ollamaService.checkAvailability();
    this.useAIExplanations = available;
  }

  private determineGamePhase(chess: Chess): 'opening' | 'middlegame' | 'endgame' {
    const history = chess.history();
    const board = chess.board();
    
    // Count pieces
    let pieceCount = 0;
    let queenCount = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (board[i][j]) {
          pieceCount++;
          if (board[i][j].type === 'q') queenCount++;
        }
      }
    }
    
    // Determine phase
    if (history.length < 10) return 'opening';
    if (pieceCount < 14 || queenCount === 0) return 'endgame';
    return 'middlegame';
  }

  private async getAIExplanation(fen: string, moveObj: any, chess: Chess): Promise<MoveExplanation | null> {
    const prompt = `You are a friendly chess teacher explaining a move to a student. 

Position before move (FEN): ${fen}
Move played: ${moveObj.san} (${this.getPieceName(moveObj.piece, moveObj.color)} from ${moveObj.from} to ${moveObj.to})
${moveObj.captured ? `Captured: ${this.getPieceName(moveObj.captured, moveObj.color === 'w' ? 'b' : 'w')}` : ''}
${chess.inCheck() ? 'This move gives check!' : ''}
${chess.isCheckmate() ? 'This is checkmate!' : ''}

Please provide:
1. A conversational explanation of why this move is good (2-3 sentences, as if talking to a student)
2. Three specific learning points from this move
3. A strategic assessment (one short phrase with an emoji)
4. Any immediate threats the opponent should watch for
5. Any opportunities this move creates

Format your response as JSON:
{
  "explanation": "conversational explanation here",
  "learningPoints": ["point 1", "point 2", "point 3"],
  "strategicValue": "assessment with emoji",
  "threats": ["threat 1", "threat 2"],
  "opportunities": ["opportunity 1", "opportunity 2"]
}`;

    try {
      const response = await ollamaService.generate(prompt, ollamaService.config.models.general);
      if (!response) return null;

      // Parse the AI response
      const aiResponse = response.response;
      
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON, try to parse the text response
        return this.parseTextResponse(aiResponse, moveObj);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        move: moveObj.san,
        piece: this.getPieceName(moveObj.piece, moveObj.color),
        type: this.getMoveType(moveObj),
        explanation: parsed.explanation || this.generateExplanation(moveObj, chess),
        learningPoints: parsed.learningPoints || this.getLearningPoints(moveObj, chess),
        strategicValue: parsed.strategicValue || this.assessStrategicValue(moveObj, chess),
        threats: parsed.threats || this.identifyThreats(chess),
        opportunities: parsed.opportunities || this.identifyOpportunities(chess),
        explanationType: 'ai'
      };
    } catch (error) {
      console.error('Error getting AI explanation:', error);
      return null;
    }
  }

  private parseTextResponse(text: string, moveObj: any): MoveExplanation {
    // Fallback parser for non-JSON responses
    const lines = text.split('\n').filter(line => line.trim());
    
    return {
      move: moveObj.san,
      piece: this.getPieceName(moveObj.piece, moveObj.color),
      type: this.getMoveType(moveObj),
      explanation: lines[0] || "The AI is analyzing this move...",
      learningPoints: lines.slice(1, 4).filter(l => l.length > 0),
      strategicValue: "AI Analysis 🤖",
      threats: [],
      opportunities: [],
      explanationType: 'ai'
    };
  }

  async explainMove(fen: string, move: string | any): Promise<MoveExplanation> {
    // Set up the position
    this.chess.load(fen);
    
    // Make the move to analyze it
    const moveObj = typeof move === 'string' ? this.chess.move(move) : this.chess.move(move);
    if (!moveObj) {
      return this.getDefaultExplanation(move);
    }

    // Try AI explanation first if available
    if (this.useAIExplanations && ollamaService.isAvailable) {
      try {
        const aiExplanation = await this.getAIExplanation(fen, moveObj, this.chess);
        if (aiExplanation) {
          // Undo the move to restore original position
          this.chess.undo();
          return aiExplanation;
        }
      } catch (error) {
        console.log('AI explanation failed, falling back to rule-based');
      }
    }

    // Use enhanced offline teacher for more natural explanations
    const pieceName = this.getPieceName(moveObj.piece, moveObj.color);
    const moveType = this.getMoveType(moveObj);
    const gamePhase = this.determineGamePhase(this.chess);
    
    // Get natural explanation from offline teacher
    const explanation = offlineTeacher.explainMove(moveObj, this.chess, gamePhase);
    const learningPoints = offlineTeacher.getLearningPoints(moveObj, gamePhase);
    const strategicValue = offlineTeacher.getStrategicAssessment();
    
    // Still use our methods for threats and opportunities
    const threats = this.identifyThreats(this.chess);
    const opportunities = this.identifyOpportunities(this.chess);

    // Undo the move to restore original position
    this.chess.undo();

    return {
      move: moveObj.san,
      piece: pieceName,
      type: moveType,
      explanation,
      learningPoints,
      strategicValue,
      threats,
      opportunities,
      explanationType: 'rule-based'
    };
  }

  private getPieceName(piece: string, color: string): string {
    const pieceNames: Record<string, string> = {
      p: 'pawn',
      n: 'knight',
      b: 'bishop',
      r: 'rook',
      q: 'queen',
      k: 'king'
    };
    const colorName = color === 'w' ? 'White' : 'Black';
    return `${colorName} ${pieceNames[piece.toLowerCase()]}`;
  }

  private getMoveType(move: any): string {
    if (move.flags.includes('k')) return 'kingside castle';
    if (move.flags.includes('q')) return 'queenside castle';
    if (move.flags.includes('e')) return 'en passant capture';
    if (move.flags.includes('p')) return 'pawn promotion';
    if (move.captured) return 'capture';
    return 'normal move';
  }

  private generateExplanation(move: any, chess: Chess): string {
    const explanations: string[] = [];

    // Basic move description
    if (move.flags.includes('k')) {
      explanations.push("Castling kingside to secure the king's safety and activate the rook");
    } else if (move.flags.includes('q')) {
      explanations.push("Castling queenside to secure the king and activate the rook");
    } else if (move.captured) {
      explanations.push(`Capturing the ${this.getPieceName(move.captured, move.color === 'w' ? 'b' : 'w')}`);
    } else {
      explanations.push(`Moving the ${this.getPieceName(move.piece, move.color)} from ${move.from} to ${move.to}`);
    }

    // Check/Checkmate
    if (chess.isCheckmate()) {
      explanations.push("Delivering checkmate! The game is won!");
    } else if (chess.inCheck()) {
      explanations.push("Putting the opponent's king in check");
    }

    // Piece-specific explanations
    const pieceExplanation = this.getPieceSpecificExplanation(move, chess);
    if (pieceExplanation) {
      explanations.push(pieceExplanation);
    }

    // Position evaluation
    const positionExplanation = this.getPositionalExplanation(move, chess);
    if (positionExplanation) {
      explanations.push(positionExplanation);
    }

    return explanations.join('. ') + '.';
  }

  private getPieceSpecificExplanation(move: any, chess: Chess): string {
    switch (move.piece.toLowerCase()) {
      case 'p':
        return this.getPawnExplanation(move, chess);
      case 'n':
        return this.getKnightExplanation(move, chess);
      case 'b':
        return this.getBishopExplanation(move, chess);
      case 'r':
        return this.getRookExplanation(move, chess);
      case 'q':
        return this.getQueenExplanation(move, chess);
      case 'k':
        return this.getKingExplanation(move, chess);
      default:
        return '';
    }
  }

  private getPawnExplanation(move: any, chess: Chess): string {
    const file = move.to[0];
    const rank = move.to[1];
    
    if (rank === '4' && move.color === 'w' || rank === '5' && move.color === 'b') {
      return "Advancing the pawn to control the center";
    }
    if (rank === '7' && move.color === 'w' || rank === '2' && move.color === 'b') {
      return "Pushing the pawn close to promotion";
    }
    if (move.captured) {
      return "Pawn captures are often good for opening lines and gaining material";
    }
    return "Pawns are the soul of chess - controlling space and supporting pieces";
  }

  private getKnightExplanation(move: any, chess: Chess): string {
    const centralSquares = ['e4', 'e5', 'd4', 'd5', 'c5', 'c4', 'f4', 'f5'];
    if (centralSquares.includes(move.to)) {
      return "Centralizing the knight where it controls many squares";
    }
    if (move.to[1] === '6' || move.to[1] === '3') {
      return "Knights on the rim are dim - but this outpost might be strong";
    }
    return "Knights are excellent for tactics and controlling key squares";
  }

  private getBishopExplanation(move: any, chess: Chess): string {
    const longDiagonals = ['a1', 'a8', 'h1', 'h8'];
    if (move.captured) {
      return "Bishops are powerful when they have open diagonals";
    }
    return "Developing the bishop to an active diagonal";
  }

  private getRookExplanation(move: any, chess: Chess): string {
    const file = move.to[0];
    const rank = move.to[1];
    
    if (rank === '7' && move.color === 'w' || rank === '2' && move.color === 'b') {
      return "Rook on the seventh rank is very powerful";
    }
    if (file === 'd' || file === 'e') {
      return "Centralizing the rook on an open or semi-open file";
    }
    return "Rooks are most effective on open files and ranks";
  }

  private getQueenExplanation(move: any, chess: Chess): string {
    if (move.to[1] === '1' || move.to[1] === '2' || move.to[1] === '7' || move.to[1] === '8') {
      return "Be careful not to develop the queen too early where it can be attacked";
    }
    return "The queen is the most powerful piece - use it wisely";
  }

  private getKingExplanation(move: any, chess: Chess): string {
    if (chess.history().length < 20) {
      return "King safety is crucial in the opening and middlegame";
    }
    return "In the endgame, the king becomes an active piece";
  }

  private getPositionalExplanation(move: any, chess: Chess): string {
    const explanations: string[] = [];
    
    // Center control
    const centralSquares = ['e4', 'e5', 'd4', 'd5'];
    if (centralSquares.includes(move.to)) {
      explanations.push("Controlling the center is a key strategic principle");
    }

    // Development
    if (chess.history().length < 10 && ['n', 'b'].includes(move.piece.toLowerCase())) {
      explanations.push("Good development - bringing pieces into the game");
    }

    return explanations.join('. ');
  }

  private getLearningPoints(move: any, chess: Chess): string[] {
    const points: string[] = [];

    // Opening principles
    if (chess.history().length < 15) {
      if (['n', 'b'].includes(move.piece.toLowerCase())) {
        points.push("✓ Develop knights and bishops early");
      }
      if (move.flags.includes('k') || move.flags.includes('q')) {
        points.push("✓ Castle early to secure your king");
      }
      if (move.piece === 'p' && ['e', 'd'].includes(move.to[0])) {
        points.push("✓ Control the center with pawns");
      }
    }

    // Tactical themes
    if (move.captured) {
      points.push("✓ Look for captures that win material");
    }
    if (chess.inCheck()) {
      points.push("✓ Checks can force your opponent to respond");
    }

    // General principles
    if (move.piece === 'n' && !['a', 'h'].includes(move.to[0])) {
      points.push("✓ Knights are strongest in the center");
    }
    if (move.piece === 'r' && (move.to[1] === '7' || move.to[1] === '2')) {
      points.push("✓ Rooks on the 7th rank are powerful");
    }

    return points.slice(0, 3); // Limit to 3 most relevant points
  }

  private assessStrategicValue(move: any, chess: Chess): string {
    if (chess.isCheckmate()) {
      return "Winning move! 🏆";
    }
    if (chess.inCheck()) {
      return "Aggressive - putting pressure on the king! ⚔️";
    }
    if (move.captured) {
      const capturedValue = this.getPieceValue(move.captured);
      const pieceValue = this.getPieceValue(move.piece);
      if (capturedValue > pieceValue) {
        return "Excellent trade - winning material! 📈";
      } else if (capturedValue === pieceValue) {
        return "Equal trade - maintaining balance ⚖️";
      } else {
        return "Sacrificing material - make sure you have compensation! ⚠️";
      }
    }
    if (move.flags.includes('k') || move.flags.includes('q')) {
      return "Safety first - securing the king! 🛡️";
    }
    if (chess.history().length < 10) {
      return "Developing pieces - building your position 🏗️";
    }
    return "Solid move - improving piece coordination 📊";
  }

  private getPieceValue(piece: string): number {
    const values: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 100
    };
    return values[piece.toLowerCase()] || 0;
  }

  private identifyThreats(chess: Chess): string[] {
    const threats: string[] = [];
    
    // Check if we're in check
    if (chess.inCheck()) {
      threats.push("Your king is in check! You must get out of check.");
    }

    // Look for hanging pieces (simplified)
    const moves = chess.moves({ verbose: true });
    const captures = moves.filter(m => m.captured);
    if (captures.length > 0) {
      const pieces = new Set(captures.map(m => this.getPieceName(m.captured!, chess.turn() === 'w' ? 'b' : 'w')));
      if (pieces.size > 0) {
        threats.push(`Opponent can capture: ${Array.from(pieces).join(', ')}`);
      }
    }

    return threats.slice(0, 2);
  }

  private identifyOpportunities(chess: Chess): string[] {
    const opportunities: string[] = [];
    
    // Look for captures
    const moves = chess.moves({ verbose: true });
    const captures = moves.filter(m => m.captured);
    if (captures.length > 0) {
      opportunities.push(`You can capture pieces on: ${captures.map(m => m.to).slice(0, 3).join(', ')}`);
    }

    // Check if we can give check
    const checkMoves = moves.filter(m => {
      chess.move(m);
      const inCheck = chess.inCheck();
      chess.undo();
      return inCheck;
    });
    if (checkMoves.length > 0) {
      opportunities.push("You can give check!");
    }

    // Castling availability
    if (chess.history().length < 20) {
      if ((chess.turn() === 'w' && (chess.getCastlingRights('w').includes('k') || chess.getCastlingRights('w').includes('q'))) ||
          (chess.turn() === 'b' && (chess.getCastlingRights('b').includes('k') || chess.getCastlingRights('b').includes('q')))) {
        opportunities.push("Castling is still available");
      }
    }

    return opportunities.slice(0, 2);
  }

  private getDefaultExplanation(move: string): MoveExplanation {
    return {
      move: typeof move === 'string' ? move : 'Invalid',
      piece: 'Unknown',
      type: 'unknown',
      explanation: 'This move could not be analyzed.',
      learningPoints: [],
      strategicValue: 'Unable to evaluate',
      threats: [],
      opportunities: []
    };
  }

  // Get explanation for AI moves
  async explainAIMove(fen: string, move: string, evaluation?: number): Promise<MoveExplanation> {
    const basicExplanation = await this.explainMove(fen, move);
    
    // Add AI-specific insights
    if (evaluation !== undefined) {
      if (evaluation > 1) {
        basicExplanation.explanation += " The AI believes this gives a significant advantage.";
      } else if (evaluation < -1) {
        basicExplanation.explanation += " The AI is trying to defend a difficult position.";
      } else {
        basicExplanation.explanation += " The AI evaluates this as roughly equal.";
      }
    }

    // Add learning tip about why AI chose this move
    if (basicExplanation.explanationType === 'rule-based') {
      basicExplanation.learningPoints.push("💡 The AI considered multiple moves and chose this as the best option");
    }

    return basicExplanation;
  }
}

// Singleton instance
export const moveExplainer = new MoveExplainer();