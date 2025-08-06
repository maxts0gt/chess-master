/**
 * Modern Chess Screen
 * Enhanced UI/UX with Material Design 3 and smooth animations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Chess } from 'chess.js';
import { AnimatedChessBoard } from '../components/AnimatedChessBoard';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { mistralChess } from '../services/mistralService';
import { offlineStockfish } from '../services/offlineStockfishService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GameState {
  fen: string;
  turn: 'w' | 'b';
  moveNumber: number;
  history: string[];
  evaluation: number;
  bestMove?: string;
  thinking: boolean;
}

export const ModernChessScreen: React.FC = () => {
  // Game state
  const [chess] = useState(new Chess());
  const [gameState, setGameState] = useState<GameState>({
    fen: chess.fen(),
    turn: 'w',
    moveNumber: 1,
    history: [],
    evaluation: 0,
    thinking: false,
  });
  
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>();
  
  // UI state
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [engineStrength, setEngineStrength] = useState(15);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Initialize
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(theme.colors.background.default);
    }
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.duration.slow,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    initializeEngines();
  }, []);
  
  const initializeEngines = async () => {
    try {
      await Promise.all([
        mistralChess.initialize('mistral-3b-chess'),
        offlineStockfish.initialize(),
      ]);
      offlineStockfish.setStrength(engineStrength);
    } catch (error) {
      console.error('Failed to initialize engines:', error);
    }
  };
  
  // Handle moves
  const handleMove = useCallback(async (from: string, to: string, promotion?: string) => {
    try {
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return false;
      
      const newFen = chess.fen();
      const newHistory = [...gameState.history, move.san];
      
      setGameState(prev => ({
        ...prev,
        fen: newFen,
        turn: chess.turn(),
        moveNumber: Math.floor(chess.moveNumber() / 2) + 1,
        history: newHistory,
        thinking: true,
      }));
      
      setLastMove({ from, to });
      setSelectedSquare(null);
      setLegalMoves([]);
      
      // Pulse animation for move
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Get evaluation
      if (showAnalysis) {
        const analysis = await offlineStockfish.analyze(newFen, 15);
        setGameState(prev => ({
          ...prev,
          evaluation: analysis.evaluation,
          bestMove: analysis.bestMove,
          thinking: false,
        }));
      }
      
      // AI move if it's AI's turn
      if (chess.turn() !== playerColor) {
        setTimeout(() => makeAIMove(newFen), 500);
      }
      
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  }, [chess, gameState.history, playerColor, showAnalysis]);
  
  const makeAIMove = async (fen: string) => {
    try {
      const analysis = await offlineStockfish.getBestMove(fen, engineStrength);
      if (analysis && analysis.from && analysis.to) {
        handleMove(analysis.from, analysis.to);
      }
    } catch (error) {
      console.error('AI move error:', error);
    }
  };
  
  // FAB actions
  const fabActions = [
    {
      icon: '🔄',
      label: 'New Game',
      onPress: () => {
        chess.reset();
        setGameState({
          fen: chess.fen(),
          turn: 'w',
          moveNumber: 1,
          history: [],
          evaluation: 0,
          thinking: false,
        });
        setLastMove(undefined);
      },
      color: theme.colors.success,
    },
    {
      icon: '↩️',
      label: 'Undo',
      onPress: () => {
        chess.undo();
        chess.undo(); // Undo both player and AI moves
        const newHistory = gameState.history.slice(0, -2);
        setGameState(prev => ({
          ...prev,
          fen: chess.fen(),
          turn: chess.turn(),
          history: newHistory,
        }));
      },
      color: theme.colors.warning,
    },
    {
      icon: '💭',
      label: 'Ask Coach',
      onPress: async () => {
        const response = await mistralChess.askQuestion(
          gameState.fen,
          "What's the best plan in this position?"
        );
        console.log('Coach says:', response);
      },
      color: theme.colors.info,
    },
    {
      icon: '📊',
      label: 'Analysis',
      onPress: () => setShowAnalysis(!showAnalysis),
      color: theme.colors.secondary.main,
    },
  ];
  
  const renderEvaluationBar = () => {
    const evalValue = Math.max(-10, Math.min(10, gameState.evaluation));
    const percentage = ((evalValue + 10) / 20) * 100;
    
    return (
      <Animated.View
        style={[
          styles.evaluationContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.evaluationBar}>
          <Animated.View
            style={[
              styles.evaluationFill,
              {
                width: `${percentage}%`,
                backgroundColor: evalValue > 0.3 
                  ? theme.colors.success
                  : evalValue < -0.3
                  ? theme.colors.error
                  : theme.colors.info,
              },
            ]}
          />
        </View>
        <Text style={styles.evaluationText}>
          {evalValue > 0 ? '+' : ''}{evalValue.toFixed(1)}
        </Text>
      </Animated.View>
    );
  };
  
  const renderMoveHistory = () => {
    return (
      <Animated.View
        style={[
          styles.historyContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.historyTitle}>Moves</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.historyScroll}
        >
          {gameState.history.map((move, index) => (
            <View key={index} style={styles.moveItem}>
              <Text style={styles.moveNumber}>
                {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}
              </Text>
              <Text style={styles.moveText}>{move}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chess Master</Text>
        <View style={styles.turnIndicator}>
          <View style={[
            styles.turnDot,
            { backgroundColor: gameState.turn === 'w' ? '#FFF' : '#000' }
          ]} />
          <Text style={styles.turnText}>
            {gameState.turn === 'w' ? 'White' : 'Black'} to move
          </Text>
        </View>
      </View>
      
      {showAnalysis && renderEvaluationBar()}
      
      <View style={styles.boardContainer}>
        <AnimatedChessBoard
          fen={gameState.fen}
          onMove={handleMove}
          flipped={playerColor === 'b'}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={lastMove}
          isPlayerTurn={gameState.turn === playerColor}
        />
        
        {gameState.thinking && (
          <View style={styles.thinkingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <Text style={styles.thinkingText}>Analyzing...</Text>
          </View>
        )}
      </View>
      
      {renderMoveHistory()}
      
      <FloatingActionButton
        actions={fabActions}
        mainIcon="⚡"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface.elevated,
    ...theme.elevation[2],
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  turnDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.text.secondary,
  },
  turnText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.secondary,
  },
  evaluationContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  evaluationBar: {
    height: 8,
    backgroundColor: theme.colors.surface.container,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
  },
  evaluationFill: {
    height: '100%',
    borderRadius: theme.borderRadius.xs,
  },
  evaluationText: {
    ...theme.typography.labelMedium,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  thinkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thinkingText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  historyContainer: {
    backgroundColor: theme.colors.surface.elevated,
    paddingVertical: theme.spacing.md,
    ...theme.elevation[1],
  },
  historyTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  historyScroll: {
    paddingHorizontal: theme.spacing.lg,
  },
  moveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.container,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  moveNumber: {
    ...theme.typography.labelSmall,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  moveText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
});