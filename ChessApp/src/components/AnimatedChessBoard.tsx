/**
 * Animated Chess Board Component
 * Smooth piece animations, interactive highlights, and modern design
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { Chess } from 'chess.js';
import { theme } from '../styles/theme';

const { width: screenWidth } = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 32, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

interface AnimatedChessBoardProps {
  fen: string;
  onMove: (from: string, to: string) => void;
  flipped?: boolean;
  highlightedSquares?: string[];
  lastMove?: { from: string; to: string };
  selectedSquare?: string | null;
  legalMoves?: string[];
  isPlayerTurn: boolean;
}

interface PiecePosition {
  square: string;
  piece: string;
  position: Animated.ValueXY;
}

const pieceUnicode: Record<string, string> = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

export const AnimatedChessBoard: React.FC<AnimatedChessBoardProps> = ({
  fen,
  onMove,
  flipped = false,
  highlightedSquares = [],
  lastMove,
  selectedSquare,
  legalMoves = [],
  isPlayerTurn,
}) => {
  const [pieces, setPieces] = useState<PiecePosition[]>([]);
  const [draggingPiece, setDraggingPiece] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Initialize board animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Parse FEN and create piece positions
  useEffect(() => {
    const chess = new Chess(fen);
    const newPieces: PiecePosition[] = [];
    
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = chess.get(square);
        
        if (piece) {
          const existingPiece = pieces.find(p => p.square === square);
          const position = existingPiece?.position || new Animated.ValueXY(getSquarePosition(square));
          
          newPieces.push({
            square,
            piece: piece.color + piece.type.toUpperCase(),
            position,
          });
        }
      }
    }
    
    setPieces(newPieces);
  }, [fen]);

  const getSquarePosition = (square: string) => {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    
    const x = flipped ? (7 - file) * SQUARE_SIZE : file * SQUARE_SIZE;
    const y = flipped ? (7 - rank) * SQUARE_SIZE : rank * SQUARE_SIZE;
    
    return { x, y };
  };

  const animateMove = (piece: PiecePosition, toSquare: string) => {
    const toPos = getSquarePosition(toSquare);
    
    Animated.parallel([
      Animated.spring(piece.position, {
        toValue: toPos,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 10]);
      }
    });
  };

  const createPanResponder = (piece: PiecePosition) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => isPlayerTurn,
      onMoveShouldSetPanResponder: () => isPlayerTurn,
      
      onPanResponderGrant: () => {
        setDraggingPiece(piece.square);
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }).start();
      },
      
      onPanResponderMove: Animated.event(
        [null, { dx: piece.position.x, dy: piece.position.y }],
        { useNativeDriver: false }
      ),
      
      onPanResponderRelease: (_, gestureState) => {
        const { moveX, moveY } = gestureState;
        const boardX = moveX - 16; // Account for padding
        const boardY = moveY - 100; // Account for header
        
        const file = Math.floor(boardX / SQUARE_SIZE);
        const rank = Math.floor(boardY / SQUARE_SIZE);
        
        const toFile = flipped ? 7 - file : file;
        const toRank = flipped ? 7 - rank : rank;
        
        if (toFile >= 0 && toFile < 8 && toRank >= 0 && toRank < 8) {
          const toSquare = String.fromCharCode(97 + toFile) + (8 - toRank);
          
          if (legalMoves.includes(toSquare)) {
            animateMove(piece, toSquare);
            onMove(piece.square, toSquare);
          } else {
            // Snap back to original position
            Animated.spring(piece.position, {
              toValue: getSquarePosition(piece.square),
              tension: 50,
              friction: 7,
              useNativeDriver: false,
            }).start();
          }
        }
        
        setDraggingPiece(null);
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      },
    });
  };

  const renderSquare = (file: number, rank: number) => {
    const square = String.fromCharCode(97 + file) + (8 - rank);
    const isLight = (file + rank) % 2 === 0;
    const isHighlighted = highlightedSquares.includes(square);
    const isSelected = selectedSquare === square;
    const isLegalMove = legalMoves.includes(square);
    const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
    const hasCheck = false; // TODO: implement check detection
    
    return (
      <Animated.View
        key={square}
        style={[
          styles.square,
          {
            backgroundColor: isLight ? theme.colors.board.light : theme.colors.board.dark,
            opacity: fadeAnim,
          },
          isHighlighted && styles.highlightedSquare,
          isSelected && styles.selectedSquare,
          isLastMoveSquare && styles.lastMoveSquare,
          hasCheck && styles.checkSquare,
        ]}
      >
        {isLegalMove && (
          <Animated.View
            style={[
              styles.legalMoveIndicator,
              {
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </Animated.View>
    );
  };

  const renderPiece = (piece: PiecePosition) => {
    const panResponder = createPanResponder(piece);
    const isDragging = draggingPiece === piece.square;
    
    return (
      <Animated.View
        key={piece.square}
        style={[
          styles.piece,
          {
            transform: [
              { translateX: piece.position.x },
              { translateY: piece.position.y },
              { scale: isDragging ? 1.2 : 1 },
            ],
            zIndex: isDragging ? 100 : 10,
            opacity: fadeAnim,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.Text
          style={[
            styles.pieceText,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {pieceUnicode[piece.piece[1]] || ''}
        </Animated.Text>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.board}>
        {Array.from({ length: 8 }).map((_, rank) =>
          Array.from({ length: 8 }).map((_, file) =>
            renderSquare(file, rank)
          )
        )}
      </View>
      <View style={styles.piecesContainer}>
        {pieces.map(renderPiece)}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    alignSelf: 'center',
    ...theme.elevation[3],
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
  },
  highlightedSquare: {
    backgroundColor: theme.colors.board.highlight,
  },
  selectedSquare: {
    backgroundColor: theme.colors.board.selected,
  },
  lastMoveSquare: {
    backgroundColor: theme.colors.board.lastMove,
  },
  checkSquare: {
    backgroundColor: theme.colors.board.check,
  },
  legalMoveIndicator: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    top: '50%',
    left: '50%',
    marginTop: -SQUARE_SIZE * 0.15,
    marginLeft: -SQUARE_SIZE * 0.15,
  },
  piecesContainer: {
    position: 'absolute',
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
  piece: {
    position: 'absolute',
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceText: {
    fontSize: SQUARE_SIZE * 0.7,
    color: theme.colors.text.primary,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});