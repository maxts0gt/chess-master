import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import './ChessBoard.css';

interface ChessBoardProps {
  fen?: string;
  onMove?: (move: any) => void;
  playable?: boolean;
  showCoordinates?: boolean;
}

// Chess piece unicode symbols
const PIECE_SYMBOLS: { [key: string]: string } = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  onMove,
  playable = true,
  showCoordinates = true,
}) => {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    if (fen) {
      try {
        const newGame = new Chess(fen);
        setGame(newGame);
      } catch (error) {
        console.error('Invalid FEN:', error);
      }
    }
  }, [fen]);

  const getSquareColor = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 0;
    return isLight ? '#F0D9B5' : '#B58863';
  };

  const indicesToSquare = (row: number, col: number): string => {
    const file = String.fromCharCode(97 + col);
    const rank = (8 - row).toString();
    return file + rank;
  };

  const handleSquareClick = (square: string) => {
    if (!playable) return;

    const piece = game.get(square);
    
    if (selectedSquare) {
      // Try to move
      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q',
        });

        if (move) {
          setLastMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setValidMoves([]);
          if (onMove) {
            onMove(move);
          }
        } else {
          // Invalid move, select new piece if it's the player's
          if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true });
            setValidMoves(moves.map(m => m.to));
          } else {
            setSelectedSquare(null);
            setValidMoves([]);
          }
        }
      } catch (error) {
        console.error('Move error:', error);
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      // Select piece
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setValidMoves(moves.map(m => m.to));
      }
    }
  };

  const renderSquare = (row: number, col: number) => {
    const square = indicesToSquare(row, col);
    const piece = game.get(square);
    const isSelected = selectedSquare === square;
    const isValidMove = validMoves.includes(square);
    const isLastMove = lastMove?.from === square || lastMove?.to === square;

    return (
      <div
        key={`${row}-${col}`}
        className={`square ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${isLastMove ? 'last-move' : ''}`}
        style={{ backgroundColor: getSquareColor(row, col) }}
        onClick={() => handleSquareClick(square)}
      >
        {piece && (
          <div className="piece">
            {PIECE_SYMBOLS[piece.color + piece.type.toUpperCase()]}
          </div>
        )}
        {showCoordinates && row === 7 && (
          <div className="file-label">{String.fromCharCode(97 + col)}</div>
        )}
        {showCoordinates && col === 0 && (
          <div className="rank-label">{8 - row}</div>
        )}
      </div>
    );
  };

  const renderBoard = () => {
    const board = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        board.push(renderSquare(row, col));
      }
    }
    return board;
  };

  return (
    <div className="chess-board">
      {renderBoard()}
    </div>
  );
};

export default ChessBoard;