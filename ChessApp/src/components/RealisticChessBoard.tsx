import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import Sound from 'react-native-sound';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 40, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

// Chess piece components with realistic designs
const ChessPiece = ({ piece, color, size = SQUARE_SIZE * 0.8 }) => {
  const pieces = {
    K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
    k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  };
  
  return (
    <Text style={[
      styles.piece,
      { 
        fontSize: size,
        color: color === 'white' ? '#FFFFFF' : '#1a1a1a',
        textShadowColor: color === 'white' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
      }
    ]}>
      {pieces[piece]}
    </Text>
  );
};

const RealisticChessBoard = ({ 
  onMove, 
  position, 
  playerColor = 'white',
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  const [board, setBoard] = useState(initialBoard);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [isFlipped, setIsFlipped] = useState(playerColor === 'black');
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  
  // Animation values
  const moveAnimation = useRef(new Animated.Value(0)).current;
  const captureAnimation = useRef(new Animated.Value(1)).current;
  const pieceScale = useRef(new Animated.Value(1)).current;
  const boardRotation = useRef(new Animated.Value(0)).current;
  
  // Sound effects
  const sounds = useRef({
    move: null,
    capture: null,
    check: null,
    castle: null,
  }).current;
  
  useEffect(() => {
    // Load sounds
    if (soundEnabled) {
      sounds.move = new Sound('move.mp3', Sound.MAIN_BUNDLE);
      sounds.capture = new Sound('capture.mp3', Sound.MAIN_BUNDLE);
      sounds.check = new Sound('check.mp3', Sound.MAIN_BUNDLE);
      sounds.castle = new Sound('castle.mp3', Sound.MAIN_BUNDLE);
    }
    
    return () => {
      // Clean up sounds
      Object.values(sounds).forEach(sound => sound?.release());
    };
  }, [soundEnabled]);
  
  const playSound = (type) => {
    if (soundEnabled && sounds[type]) {
      sounds[type].play();
    }
  };
  
  const hapticFeedback = (type = 'selection') => {
    if (!hapticEnabled) return;
    
    if (Platform.OS === 'ios') {
      const hapticTypes = {
        selection: 'selection',
        move: 'impactLight',
        capture: 'impactMedium',
        check: 'impactHeavy',
      };
      // React Native doesn't have built-in haptic support, would need expo-haptics
    } else {
      const patterns = {
        selection: 10,
        move: 20,
        capture: [0, 20, 50, 20],
        check: [0, 50, 100, 50],
      };
      Vibration.vibrate(patterns[type] || 10);
    }
  };
  
  const handleSquarePress = (row, col) => {
    hapticFeedback('selection');
    
    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      
      if (isValidMove(fromRow, fromCol, row, col)) {
        animateMove(fromRow, fromCol, row, col);
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } else {
      const piece = board[row][col];
      if (piece && isPlayerPiece(piece)) {
        setSelectedSquare([row, col]);
        setPossibleMoves(calculatePossibleMoves(row, col));
        
        // Animate piece selection
        Animated.sequence([
          Animated.timing(pieceScale, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(pieceScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };
  
  const animateMove = (fromRow, fromCol, toRow, toCol) => {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Animate the move
    Animated.timing(moveAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Make the actual move
      const newBoard = [...board];
      newBoard[toRow][toCol] = piece;
      newBoard[fromRow][fromCol] = null;
      
      setBoard(newBoard);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setLastMove({ from: [fromRow, fromCol], to: [toRow, toCol] });
      
      if (capturedPiece) {
        playSound('capture');
        hapticFeedback('capture');
        
        // Animate capture
        Animated.timing(captureAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setCapturedPieces(prev => ({
            ...prev,
            [piece.toLowerCase() === piece ? 'white' : 'black']: [
              ...prev[piece.toLowerCase() === piece ? 'white' : 'black'],
              capturedPiece,
            ],
          }));
          captureAnimation.setValue(1);
        });
      } else {
        playSound('move');
        hapticFeedback('move');
      }
      
      moveAnimation.setValue(0);
      
      // Notify parent component
      if (onMove) {
        onMove({ from: [fromRow, fromCol], to: [toRow, toCol], piece });
      }
    });
  };
  
  const renderSquare = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare?.[0] === row && selectedSquare?.[1] === col;
    const isPossibleMove = possibleMoves.some(([r, c]) => r === row && c === col);
    const isLastMoveSquare = lastMove && (
      (lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col)
    );
    const piece = board[row][col];
    
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.square,
          isLight ? styles.lightSquare : styles.darkSquare,
          isSelected && styles.selectedSquare,
          isLastMoveSquare && styles.lastMoveSquare,
        ]}
        onPress={() => handleSquarePress(row, col)}
        activeOpacity={0.8}
      >
        {isPossibleMove && (
          <View style={styles.possibleMove}>
            {piece ? (
              <View style={styles.possibleCapture} />
            ) : (
              <View style={styles.possibleDot} />
            )}
          </View>
        )}
        
        {piece && (
          <Animated.View
            style={[
              styles.pieceContainer,
              isSelected && {
                transform: [{ scale: pieceScale }],
              },
            ]}
          >
            <ChessPiece
              piece={piece}
              color={piece.toLowerCase() === piece ? 'black' : 'white'}
            />
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };
  
  const renderBoard = () => {
    const squares = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const displayRow = isFlipped ? 7 - row : row;
        const displayCol = isFlipped ? 7 - col : col;
        squares.push(renderSquare(displayRow, displayCol));
      }
    }
    return squares;
  };
  
  const renderCoordinates = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    return (
      <>
        {files.map((file, index) => (
          <Text
            key={`file-${file}`}
            style={[
              styles.coordinate,
              styles.fileCoordinate,
              { left: index * SQUARE_SIZE + SQUARE_SIZE / 2 - 5 },
            ]}
          >
            {isFlipped ? files[7 - index] : file}
          </Text>
        ))}
        {ranks.map((rank, index) => (
          <Text
            key={`rank-${rank}`}
            style={[
              styles.coordinate,
              styles.rankCoordinate,
              { top: index * SQUARE_SIZE + SQUARE_SIZE / 2 - 10 },
            ]}
          >
            {isFlipped ? ranks[7 - index] : rank}
          </Text>
        ))}
      </>
    );
  };
  
  const flipBoard = () => {
    Animated.timing(boardRotation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped(!isFlipped);
      boardRotation.setValue(0);
    });
  };
  
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.boardContainer,
          {
            transform: [
              {
                rotateY: boardRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.board}>
          {renderBoard()}
        </View>
        {renderCoordinates()}
      </Animated.View>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={flipBoard}>
          <Text style={styles.buttonText}>Flip Board</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.capturedPieces}>
        <View style={styles.capturedRow}>
          <Text style={styles.capturedLabel}>White:</Text>
          {capturedPieces.white.map((piece, index) => (
            <ChessPiece key={index} piece={piece} color="black" size={20} />
          ))}
        </View>
        <View style={styles.capturedRow}>
          <Text style={styles.capturedLabel}>Black:</Text>
          {capturedPieces.black.map((piece, index) => (
            <ChessPiece key={index} piece={piece} color="white" size={20} />
          ))}
        </View>
      </View>
    </View>
  );
};

// Helper functions
const initialBoard = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

const isPlayerPiece = (piece) => {
  // Assuming player is white for now
  return piece && piece === piece.toUpperCase();
};

const isValidMove = (fromRow, fromCol, toRow, toCol) => {
  // Simplified validation - would use chess engine in real app
  return true;
};

const calculatePossibleMoves = (row, col) => {
  // Simplified - would use chess engine in real app
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r !== row || c !== col) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  boardContainer: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
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
    backgroundColor: '#fbbf24',
  },
  lastMoveSquare: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
  },
  pieceContainer: {
    position: 'absolute',
  },
  piece: {
    fontSize: SQUARE_SIZE * 0.7,
    fontWeight: 'bold',
  },
  possibleMove: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  possibleDot: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
    backgroundColor: 'rgba(34, 197, 94, 0.5)',
  },
  possibleCapture: {
    width: '90%',
    height: '90%',
    borderRadius: SQUARE_SIZE * 0.45,
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.8)',
  },
  coordinate: {
    position: 'absolute',
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  fileCoordinate: {
    bottom: -20,
  },
  rankCoordinate: {
    left: -20,
  },
  controls: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  capturedPieces: {
    marginTop: 20,
    width: BOARD_SIZE,
  },
  capturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  capturedLabel: {
    color: '#94a3b8',
    marginRight: 10,
    fontSize: 14,
  },
});

export default RealisticChessBoard;