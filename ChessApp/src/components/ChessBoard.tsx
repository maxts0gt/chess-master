import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { Chess, Square } from 'chess.js';

interface ChessBoardProps {
  fen?: string;
  onMove?: (move: any) => void;
  playable?: boolean;
  showCoordinates?: boolean;
  boardSize?: number;
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
  boardSize,
}) => {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const windowWidth = Dimensions.get('window').width;
  const defaultBoardSize = boardSize || windowWidth - 32;
  const squareSize = defaultBoardSize / 8;

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

  const getSquareHighlight = (square: string): string | undefined => {
    if (selectedSquare === square) return 'rgba(255, 255, 0, 0.5)';
    if (validMoves.includes(square)) return 'rgba(0, 255, 0, 0.3)';
    if (lastMove?.from === square || lastMove?.to === square) return 'rgba(255, 255, 0, 0.2)';
    return undefined;
  };

  const squareToIndices = (square: string): { row: number; col: number } => {
    const col = square.charCodeAt(0) - 97;
    const row = 8 - parseInt(square[1]);
    return { row, col };
  };

  const indicesToSquare = (row: number, col: number): string => {
    const file = String.fromCharCode(97 + col);
    const rank = (8 - row).toString();
    return file + rank;
  };

  const handleSquarePress = (square: string) => {
    if (!playable) return;

    const piece = game.get(square as Square);
    
    if (selectedSquare) {
      // Try to move
      try {
        const move = game.move({
          from: selectedSquare as Square,
          to: square as Square,
          promotion: 'q', // Always promote to queen for simplicity
        } as any);

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
            const moves = game.moves({ square: square as Square, verbose: true } as any) as any[];
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
        const moves = game.moves({ square: square as Square, verbose: true } as any) as any[];
        setValidMoves(moves.map(m => m.to));
      }
    }
  };

  const renderSquare = (row: number, col: number) => {
    const square = indicesToSquare(row, col);
    const piece = game.get(square as Square);
    const highlight = getSquareHighlight(square);

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.square,
          {
            backgroundColor: getSquareColor(row, col),
            width: squareSize,
            height: squareSize,
          },
          highlight && { backgroundColor: highlight },
        ]}
        onPress={() => handleSquarePress(square)}
        activeOpacity={0.8}
      >
        {piece && (
          <Text style={[styles.piece, { fontSize: squareSize * 0.7 }]}>
            {PIECE_SYMBOLS[piece.color + piece.type.toUpperCase()]}
          </Text>
        )}
        {showCoordinates && row === 7 && (
          <Text style={[styles.fileLabel, { bottom: 2, left: 2 }]}>
            {String.fromCharCode(97 + col)}
          </Text>
        )}
        {showCoordinates && col === 0 && (
          <Text style={[styles.rankLabel, { top: 2, left: 2 }]}>
            {8 - row}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderBoard = () => {
    const board = [];
    for (let row = 0; row < 8; row++) {
      const rowSquares = [];
      for (let col = 0; col < 8; col++) {
        rowSquares.push(renderSquare(row, col));
      }
      board.push(
        <View key={row} style={styles.row}>
          {rowSquares}
        </View>
      );
    }
    return board;
  };

  return (
    <View style={[styles.container, { width: defaultBoardSize, height: defaultBoardSize }]}>
      {renderBoard()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: '#333',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  piece: {
    color: '#000',
    fontWeight: '700',
  },
  fileLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
  },
  rankLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
  },
});

export { ChessBoard };