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
import { Chess } from 'chess.js';
import Chessboard from 'react-native-chessboard';

interface ChessBoardProps {
  fen?: string;
  onMove?: (move: any) => void;
  playable?: boolean;
  showCoordinates?: boolean;
  boardSize?: number;
}

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

  const handleSquarePress = (square: string) => {
    if (!playable) return;

    if (selectedSquare) {
      // Try to make a move
      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q', // Always promote to queen for simplicity
        });

        if (move) {
          setLastMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setValidMoves([]);
          
          // Create a new game instance to trigger re-render
          const newGame = new Chess(game.fen());
          setGame(newGame);
          
          if (onMove) {
            onMove(move);
          }

          // Check game status
          if (newGame.isCheckmate()) {
            Alert.alert('Checkmate!', `${newGame.turn() === 'w' ? 'Black' : 'White'} wins!`);
          } else if (newGame.isDraw()) {
            Alert.alert('Draw!', 'The game is a draw.');
          } else if (newGame.isCheck()) {
            Alert.alert('Check!', `${newGame.turn() === 'w' ? 'White' : 'Black'} is in check.`);
          }
        } else {
          // Invalid move, select new piece if it's the player's piece
          const piece = game.get(square);
          if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            setValidMoves(
              game.moves({ square, verbose: true }).map((m) => m.to)
            );
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
      // Select a piece
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        setValidMoves(
          game.moves({ square, verbose: true }).map((m) => m.to)
        );
      }
    }
  };

  const renderBoard = () => {
    const board = game.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    return (
      <View style={styles.board}>
        {ranks.map((rank, rankIndex) => (
          <View key={rank} style={styles.row}>
            {showCoordinates && (
              <Text style={styles.coordinate}>{rank}</Text>
            )}
            {files.map((file, fileIndex) => {
              const square = `${file}${rank}`;
              const piece = board[rankIndex][fileIndex];
              const isLight = (rankIndex + fileIndex) % 2 === 0;
              const isSelected = selectedSquare === square;
              const isValidMove = validMoves.includes(square);
              const isLastMoveSquare = lastMove?.from === square || lastMove?.to === square;

              return (
                <TouchableOpacity
                  key={square}
                  style={[
                    styles.square,
                    isLight ? styles.lightSquare : styles.darkSquare,
                    isSelected && styles.selectedSquare,
                    isLastMoveSquare && styles.lastMoveSquare,
                  ]}
                  onPress={() => handleSquarePress(square)}
                  activeOpacity={0.8}
                >
                  {piece && (
                    <Text style={styles.piece}>
                      {getPieceSymbol(piece.type, piece.color)}
                    </Text>
                  )}
                  {isValidMove && (
                    <View style={styles.validMoveIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        {showCoordinates && (
          <View style={styles.fileCoordinates}>
            <Text style={styles.coordinate}> </Text>
            {files.map((file) => (
              <Text key={file} style={styles.coordinate}>
                {file}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const getPieceSymbol = (type: string, color: string): string => {
    const pieces: { [key: string]: { w: string; b: string } } = {
      k: { w: '♔', b: '♚' },
      q: { w: '♕', b: '♛' },
      r: { w: '♖', b: '♜' },
      b: { w: '♗', b: '♝' },
      n: { w: '♘', b: '♞' },
      p: { w: '♙', b: '♟' },
    };
    return pieces[type]?.[color] || '';
  };

  return (
    <View style={[styles.container, { width: defaultBoardSize }]}>
      {renderBoard()}
      <View style={styles.turnIndicator}>
        <Text style={styles.turnText}>
          {game.turn() === 'w' ? 'White' : 'Black'} to move
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    backgroundColor: '#1e293b',
    padding: 4,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  square: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightSquare: {
    backgroundColor: '#f0d9b5',
  },
  darkSquare: {
    backgroundColor: '#b58863',
  },
  selectedSquare: {
    backgroundColor: '#646f40',
  },
  lastMoveSquare: {
    backgroundColor: '#a9a938',
  },
  piece: {
    fontSize: 30,
    textAlign: 'center',
  },
  validMoveIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  coordinate: {
    fontSize: 10,
    color: '#94a3b8',
    width: 40,
    textAlign: 'center',
    marginHorizontal: 2,
  },
  fileCoordinates: {
    flexDirection: 'row',
    marginTop: 2,
  },
  turnIndicator: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
  },
  turnText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChessBoard;