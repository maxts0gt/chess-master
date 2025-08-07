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
  Modal,
} from 'react-native';
import { Chess } from 'chess.js';
import { AnimatedChessBoard } from '../components/AnimatedChessBoard';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { mistralChess } from '../services/mistralService';
import { engine } from '../services/engine';
import { premiumService } from '../services/premiumService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { PremiumScreen } from './PremiumScreen';
import { AICoachChat } from '../components/AICoachChat';

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
  const [showPremium, setShowPremium] = useState(false);
  const [hasAIAccess, setHasAIAccess] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  // Time controls
  const [timeControl, setTimeControl] = useState<{ minutes: number; increment: number }>({ minutes: 10, increment: 0 });
  const [whiteTimeMs, setWhiteTimeMs] = useState(timeControl.minutes * 60 * 1000);
  const [blackTimeMs, setBlackTimeMs] = useState(timeControl.minutes * 60 * 1000);
  const timerRef = useRef<NodeJS.Timer | null>(null);
  
  // Mistake detection
  const [mistakeDelta, setMistakeDelta] = useState<number | null>(null);
  const [mistakeMoveSan, setMistakeMoveSan] = useState<string | null>(null);
  const [showMistakeChip, setShowMistakeChip] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainText, setExplainText] = useState<string>('');
  
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

  // Clock ticking
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = setInterval(() => {
      setWhiteTimeMs(prev => (gameState.turn === 'w' && !gameState.thinking ? Math.max(0, prev - 1000) : prev));
      setBlackTimeMs(prev => (gameState.turn === 'b' && !gameState.thinking ? Math.max(0, prev - 1000) : prev));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.turn, gameState.thinking]);
  
  const initializeEngines = async () => {
    try {
      // Initialize premium service
      await premiumService.initialize();
      setHasAIAccess(premiumService.hasAIAccess());
      
      // Subscribe to premium state changes
      const unsubscribe = premiumService.subscribe((state) => {
        setHasAIAccess(state.hasAICoach && state.isModelDownloaded);
      });
      
      // Initialize engines
      await engine.initialize();
      engine.setStrength(engineStrength);
      
      // Initialize Mistral only if user has access
      if (premiumService.hasAIAccess()) {
        await mistralChess.initialize('mistral-3b-chess');
      }
    } catch (error) {
      console.error('Failed to initialize engines:', error);
    }
  };
  
  // Handle moves
  const handleMove = useCallback(async (from: string, to: string, promotion?: string) => {
    try {
      // Evaluate before move for mistake detection
      const prevFen = chess.fen();
      const prevEval = showAnalysis ? await engine.evaluate(prevFen) : 0;

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
      
      // Add increment to side that just moved
      if (playerColor === 'w') {
        setWhiteTimeMs(t => t + timeControl.increment * 1000);
      } else {
        setBlackTimeMs(t => t + timeControl.increment * 1000);
      }
      
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
        const analysis = await engine.analyze(newFen, 15);
        setGameState(prev => ({
          ...prev,
          evaluation: analysis.evaluation,
          bestMove: analysis.bestMove,
          thinking: false,
        }));
        // Mistake detection
        const delta = prevEval - analysis.evaluation;
        if (delta > 0.7) {
          setMistakeDelta(delta);
          setMistakeMoveSan(move.san);
          setShowMistakeChip(true);
        } else {
          setShowMistakeChip(false);
        }
      } else {
        setGameState(prev => ({ ...prev, thinking: false }));
      }
      
      // AI move if it's AI's turn
      if (chess.turn() !== playerColor) {
        setTimeout(() => makeAIMove(newFen), 400);
      }
      
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  }, [chess, gameState.history, playerColor, showAnalysis, timeControl]);
  
  const makeAIMove = async (fen: string) => {
    try {
      const bestMoveUci = await engine.getBestMove(fen, { timeMs: 1000 });
      if (bestMoveUci) {
        const from = bestMoveUci.substring(0,2);
        const to = bestMoveUci.substring(2,4);
        // Add increment to AI after move completes (handled inside handleMove)
        handleMove(from, to);
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
        if (!hasAIAccess) {
          setShowPremium(true);
          return;
        }
        setShowAIChat(true);
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

  const formatClock = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60).toString();
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const changeTimeControl = (minutes: number, increment: number) => {
    setTimeControl({ minutes, increment });
    setWhiteTimeMs(minutes * 60 * 1000);
    setBlackTimeMs(minutes * 60 * 1000);
    // Reset game state
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
  };

  const renderHeaderClocks = () => (
    <View style={styles.clocksRow}>
      <TouchableOpacity onPress={() => changeTimeControl(3, 2)} style={[styles.tcButton, timeControl.minutes === 3 && timeControl.increment === 2 && styles.tcSelected]}>
        <Text style={styles.tcText}>3+2</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => changeTimeControl(10, 0)} style={[styles.tcButton, timeControl.minutes === 10 && timeControl.increment === 0 && styles.tcSelected]}>
        <Text style={styles.tcText}>10+0</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => changeTimeControl(15, 10)} style={[styles.tcButton, timeControl.minutes === 15 && timeControl.increment === 10 && styles.tcSelected]}>
        <Text style={styles.tcText}>15+10</Text>
      </TouchableOpacity>
      <View style={styles.clockSpacer} />
      <Text style={styles.clockText}>◻ {formatClock(whiteTimeMs)}  |  ◼ {formatClock(blackTimeMs)}</Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Chess Master</Text>
          {hasAIAccess ? (
            <View style={styles.aiIndicator}>
              <Text style={styles.aiIndicatorText}>🤖 AI Active</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => setShowPremium(true)}
            >
              <Text style={styles.upgradeButtonText}>🔓 Unlock AI</Text>
            </TouchableOpacity>
          )}
        </View>
        {renderHeaderClocks()}
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

        {showMistakeChip && mistakeDelta !== null && (
          <View style={styles.mistakeChip}>
            <Text style={styles.mistakeText}>That move lost {mistakeDelta.toFixed(1)} pawns.</Text>
            <TouchableOpacity
              style={styles.mistakeButton}
              onPress={async () => {
                try {
                  setShowExplainModal(true);
                  const text = await mistralChess.explainMove(gameState.fen, mistakeMoveSan || '', 1500);
                  setExplainText(text.trim());
                } catch (e) {
                  setExplainText('Unable to explain right now.');
                }
              }}
            >
              <Text style={styles.mistakeButtonText}>Explain</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {renderMoveHistory()}
      
      <FloatingActionButton
        actions={fabActions}
        mainIcon="⚡"
      />
      
      {showPremium && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showPremium}
          onRequestClose={() => setShowPremium(false)}
        >
          <PremiumScreen onClose={() => setShowPremium(false)} />
        </Modal>
      )}
      
      <AICoachChat
        fen={gameState.fen}
        lastMove={gameState.history[gameState.history.length - 1]}
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
      />

      <Modal
        animationType="fade"
        transparent
        visible={showExplainModal}
        onRequestClose={() => setShowExplainModal(false)}
      >
        <View style={styles.explainOverlay}>
          <View style={styles.explainCard}>
            <Text style={styles.explainTitle}>Coach Explanation</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              <Text style={styles.explainBody}>{explainText}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.mistakeButton, { alignSelf: 'flex-end' }]} onPress={() => setShowExplainModal(false)}>
              <Text style={styles.mistakeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  aiIndicator: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  aiIndicatorText: {
    ...theme.typography.labelMedium,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  upgradeButton: {
    backgroundColor: theme.colors.secondary.main,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  upgradeButtonText: {
    ...theme.typography.labelMedium,
    color: theme.colors.secondary.contrast,
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
  clocksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  tcButton: {
    backgroundColor: theme.colors.surface.container,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
  },
  tcSelected: {
    backgroundColor: theme.colors.primary.main + '22',
  },
  tcText: {
    ...theme.typography.labelSmall,
    color: theme.colors.text.secondary,
  },
  clockSpacer: { flex: 1 },
  clockText: {
    ...theme.typography.labelMedium,
    color: theme.colors.text.primary,
  },
  mistakeChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: theme.colors.error + '20',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mistakeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.error,
  },
  mistakeButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  mistakeButtonText: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary.contrast,
    fontWeight: 'bold',
  },
  explainOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  explainCard: {
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    width: '95%',
    maxWidth: 520,
  },
  explainTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  explainBody: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.secondary,
  },
});