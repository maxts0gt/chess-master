/**
 * Puzzle Screen
 * CS:GO-style puzzle rush with modern UI and animations
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Chess } from 'chess.js';
import { AnimatedChessBoard } from '../components/AnimatedChessBoard';
import { puzzleService, Puzzle, PuzzleTheme } from '../services/puzzleService';
import { mistralChess } from '../services/mistralService';
import { theme } from '../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

type PuzzleMode = 'daily' | 'themes' | 'rush' | 'training';

interface PuzzleScreenState {
  mode: PuzzleMode;
  currentPuzzle?: Puzzle;
  puzzleQueue: Puzzle[];
  moves: string[];
  startTime: number;
  timeElapsed: number;
  rushStats: {
    solved: number;
    failed: number;
    streak: number;
    timeRemaining: number;
  };
  showHint: boolean;
  hintText?: string;
  loading: boolean;
}

export const PuzzleScreen: React.FC = () => {
  const [state, setState] = useState<PuzzleScreenState>({
    mode: 'daily',
    puzzleQueue: [],
    moves: [],
    startTime: 0,
    timeElapsed: 0,
    rushStats: {
      solved: 0,
      failed: 0,
      streak: 0,
      timeRemaining: 180, // 3 minutes
    },
    showHint: false,
    loading: true,
  });
  
  const [chess] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  // Timer for puzzle rush
  const rushTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const puzzleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    initializePuzzles();
    
    return () => {
      if (rushTimer.current) clearInterval(rushTimer.current as any as number);
      if (puzzleTimer.current) clearInterval(puzzleTimer.current as any as number);
    };
  }, []);
  
  useEffect(() => {
    // Start timers based on mode
    if (state.mode === 'rush' && state.currentPuzzle && state.rushStats.timeRemaining > 0) {
      rushTimer.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          rushStats: {
            ...prev.rushStats,
            timeRemaining: Math.max(0, prev.rushStats.timeRemaining - 1),
          },
        }));
      }, 1000);
    } else if (rushTimer.current) {
      clearInterval(rushTimer.current as any as number);
    }
    
    // Update time elapsed for current puzzle
    if (state.currentPuzzle && state.startTime > 0) {
      puzzleTimer.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeElapsed: Math.floor((Date.now() - prev.startTime) / 1000),
        }));
      }, 100);
    } else if (puzzleTimer.current) {
      clearInterval(puzzleTimer.current as any as number);
    }
    
    return () => {
      if (rushTimer.current) clearInterval(rushTimer.current as any as number);
      if (puzzleTimer.current) clearInterval(puzzleTimer.current as any as number);
    };
  }, [state.mode, state.currentPuzzle, state.startTime, state.rushStats.timeRemaining]);
  
  const initializePuzzles = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await puzzleService.initialize();
      const dailyPuzzle = await puzzleService.getDailyPuzzle();
      
      setState(prev => ({
        ...prev,
        currentPuzzle: dailyPuzzle,
        loading: false,
      }));
      
      setupPuzzle(dailyPuzzle);
      
      // Entrance animation
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
    } catch (error) {
      console.error('Failed to initialize puzzles:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };
  
  const setupPuzzle = (puzzle: Puzzle) => {
    chess.load(puzzle.fen);
    setState(prev => ({
      ...prev,
      currentPuzzle: puzzle,
      moves: [],
      startTime: Date.now(),
      timeElapsed: 0,
      showHint: false,
      hintText: undefined,
    }));
  };
  
  const handleMove = async (from: string, to: string) => {
    if (!state.currentPuzzle) return;
    
    const move = chess.move({ from, to });
    if (!move) {
      // Invalid move - shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    
    const newMoves = [...state.moves, move.san];
    setState(prev => ({ ...prev, moves: newMoves }));
    
    // Check if puzzle is complete
    if (newMoves.length === state.currentPuzzle.moves.length) {
      const result = await puzzleService.submitSolution(
        state.currentPuzzle.id,
        newMoves,
        state.timeElapsed
      );
      
      if (result.correct) {
        handlePuzzleSuccess(result);
      } else {
        handlePuzzleFailure();
      }
    } else {
      // Make opponent's move if needed
      const nextMoveIndex = newMoves.length;
      if (nextMoveIndex < state.currentPuzzle.moves.length) {
        setTimeout(() => {
          const opponentMove = state.currentPuzzle!.moves[nextMoveIndex];
          chess.move(opponentMove);
          setState(prev => ({
            ...prev,
            moves: [...prev.moves, opponentMove],
          }));
        }, 500);
      }
    }
  };
  
  const handlePuzzleSuccess = (result: { ratingChange: number; newStreak: number }) => {
    // Success animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (state.mode === 'rush') {
      setState(prev => ({
        ...prev,
        rushStats: {
          ...prev.rushStats,
          solved: prev.rushStats.solved + 1,
          streak: result.newStreak,
        },
      }));
      
      // Load next puzzle immediately
      setTimeout(() => loadNextPuzzle(), 1000);
    } else {
      // Show success modal
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          currentPuzzle: undefined,
        }));
      }, 2000);
    }
  };
  
  const handlePuzzleFailure = () => {
    // Failure animation
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 20,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -20,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (state.mode === 'rush') {
      setState(prev => ({
        ...prev,
        rushStats: {
          ...prev.rushStats,
          failed: prev.rushStats.failed + 1,
          streak: 0,
        },
      }));
      
      // Show solution briefly then continue
      setTimeout(() => loadNextPuzzle(), 2000);
    }
  };
  
  const loadNextPuzzle = async () => {
    if (state.puzzleQueue.length > 0) {
      const [nextPuzzle, ...remaining] = state.puzzleQueue;
      setState(prev => ({ ...prev, puzzleQueue: remaining }));
      setupPuzzle(nextPuzzle);
    } else {
      const newPuzzle = await puzzleService.generatePuzzle();
      setupPuzzle(newPuzzle);
    }
  };
  
  const startPuzzleRush = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    const rushPuzzles = await puzzleService.getPuzzleRush();
    
    setState(prev => ({
      ...prev,
      mode: 'rush',
      puzzleQueue: rushPuzzles.slice(1),
      rushStats: {
        solved: 0,
        failed: 0,
        streak: 0,
        timeRemaining: 180,
      },
      loading: false,
    }));
    
    setupPuzzle(rushPuzzles[0]);
  };
  
  const getHint = async () => {
    if (!state.currentPuzzle) return;
    
    const hint = await mistralChess.askQuestion(
      chess.fen(),
      "Give me a hint for the best move without revealing it completely."
    );
    
    setState(prev => ({
      ...prev,
      showHint: true,
      hintText: hint,
    }));
  };
  
  const renderModeSelector = () => {
    const modes: { key: PuzzleMode; label: string; icon: string; color: string }[] = [
      { key: 'daily', label: 'Daily', icon: '📅', color: theme.colors.primary.main },
      { key: 'themes', label: 'Themes', icon: '🎯', color: theme.colors.secondary.main },
      { key: 'rush', label: 'Rush', icon: '⚡', color: theme.colors.error },
      { key: 'training', label: 'Training', icon: '🎓', color: theme.colors.success },
    ];
    
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeSelector}
      >
        {modes.map(mode => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeButton,
              state.mode === mode.key && styles.modeButtonActive,
              { borderColor: mode.color },
            ]}
            onPress={() => setState(prev => ({ ...prev, mode: mode.key }))}
          >
            <Text style={styles.modeIcon}>{mode.icon}</Text>
            <Text style={[
              styles.modeLabel,
              state.mode === mode.key && { color: mode.color },
            ]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };
  
  const renderPuzzleInfo = () => {
    if (!state.currentPuzzle) return null;
    
    return (
      <Animated.View
        style={[
          styles.puzzleInfo,
          {
            opacity: fadeAnim,
            transform: [{ translateX: shakeAnim }],
          },
        ]}
      >
        <View style={styles.puzzleHeader}>
          <View style={styles.puzzleRating}>
            <Text style={styles.ratingLabel}>Rating</Text>
            <Text style={styles.ratingValue}>{state.currentPuzzle.rating}</Text>
          </View>
          
          {state.mode === 'rush' && (
            <View style={styles.rushTimer}>
              <Text style={styles.timerLabel}>Time</Text>
              <Text style={[
                styles.timerValue,
                state.rushStats.timeRemaining < 30 && styles.timerCritical,
              ]}>
                {Math.floor(state.rushStats.timeRemaining / 60)}:
                {(state.rushStats.timeRemaining % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}
          
          <View style={styles.puzzleStats}>
            <Text style={styles.statsLabel}>
              {state.mode === 'rush' 
                ? `${state.rushStats.solved}/${state.rushStats.solved + state.rushStats.failed}`
                : `Move ${Math.floor(state.moves.length / 2) + 1}`
              }
            </Text>
          </View>
        </View>
        
        <View style={styles.themes}>
          {state.currentPuzzle.themes.map(theme => (
            <View key={theme} style={styles.themeTag}>
              <Text style={styles.themeText}>{theme.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };
  
  const renderControls = () => {
    return (
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.hintButton]}
          onPress={getHint}
        >
          <Text style={styles.controlIcon}>💡</Text>
          <Text style={styles.controlLabel}>Hint</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.resetButton]}
          onPress={() => state.currentPuzzle && setupPuzzle(state.currentPuzzle)}
        >
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlLabel}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.skipButton]}
          onPress={loadNextPuzzle}
        >
          <Text style={styles.controlIcon}>⏭️</Text>
          <Text style={styles.controlLabel}>Skip</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={styles.loadingText}>Loading puzzles...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {renderModeSelector()}
      {renderPuzzleInfo()}
      
      {state.currentPuzzle && (
        <Animated.View
          style={[
            styles.boardContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <AnimatedChessBoard
            fen={chess.fen()}
            onMove={handleMove}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            isPlayerTurn={true}
          />
        </Animated.View>
      )}
      
      {state.showHint && state.hintText && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{state.hintText}</Text>
        </View>
      )}
      
      {renderControls()}
      
      {state.mode === 'rush' && state.rushStats.timeRemaining === 0 && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.rushResultModal}>
              <Text style={styles.rushResultTitle}>Time's Up!</Text>
              <Text style={styles.rushResultScore}>
                Solved: {state.rushStats.solved}
              </Text>
              <Text style={styles.rushResultStreak}>
                Best Streak: {state.rushStats.streak}
              </Text>
              <TouchableOpacity
                style={styles.rushPlayAgain}
                onPress={startPuzzleRush}
              >
                <Text style={styles.rushPlayAgainText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    fontWeight: '400'
  },
  modeSelector: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.surface.container,
    backgroundColor: theme.colors.surface.elevated,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary.main + '20',
  },
  modeIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  modeLabel: {
    ...(theme.typography.labelLarge as any),
    color: theme.colors.text.primary,
  },
  puzzleInfo: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  puzzleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  puzzleRating: {
    alignItems: 'center',
  },
  ratingLabel: {
    ...(theme.typography.labelSmall as any),
    color: theme.colors.text.secondary,
  },
  ratingValue: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  rushTimer: {
    alignItems: 'center',
  },
  timerLabel: {
    ...(theme.typography.labelSmall as any),
    color: theme.colors.text.secondary,
  },
  timerValue: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  timerCritical: {
    color: theme.colors.error,
  },
  puzzleStats: {
    alignItems: 'center',
  },
  statsLabel: {
    ...(theme.typography.titleMedium as any),
    color: theme.colors.text.primary,
  },
  themes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  themeTag: {
    backgroundColor: theme.colors.primary.main + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  themeText: {
    ...(theme.typography.labelSmall as any),
    color: theme.colors.primary.main,
    textTransform: 'capitalize',
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  hintContainer: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.info + '20',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  hintText: {
    ...(theme.typography.bodyMedium as any),
    color: theme.colors.info,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface.elevated,
    ...theme.elevation[1],
  },
  controlButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  controlLabel: {
    ...(theme.typography.labelMedium as any),
    color: theme.colors.text.secondary,
  },
  hintButton: {},
  resetButton: {},
  skipButton: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rushResultModal: {
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.elevation[4],
  },
  rushResultTitle: {
    ...(theme.typography.headlineMedium as any),
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  rushResultScore: {
    ...theme.typography.displaySmall,
    color: theme.colors.primary.main,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  rushResultStreak: {
    ...(theme.typography.titleLarge as any),
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    fontWeight: '400'
  },
  rushPlayAgain: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  rushPlayAgainText: {
    ...(theme.typography.labelLarge as any),
    color: theme.colors.primary.contrast,
    fontWeight: '600'
  },
  headerTitle: { color: theme.colors.text.primary, fontSize: 18, lineHeight: 22, fontWeight: '700' },
  scoreText: { color: theme.colors.text.primary, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  resultTitle: { color: theme.colors.text.primary, fontSize: 18, lineHeight: 22, fontWeight: '700' },
  resultValue: { color: theme.colors.text.primary, fontSize: 22, lineHeight: 26, fontWeight: '700' },
  hintButtonText: { color: theme.colors.text.primary, fontSize: 14, lineHeight: 18, fontWeight: '500', letterSpacing: 0.2 },
  resetButtonText: { color: theme.colors.text.primary, fontSize: 14, lineHeight: 18, fontWeight: '500', letterSpacing: 0.2 },
  skipButtonText: { color: theme.colors.text.primary, fontSize: 14, lineHeight: 18, fontWeight: '500', letterSpacing: 0.2 },
});