import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ChessBoard from '../components/ChessBoard';
import { Chess } from 'chess.js';
import * as Haptics from 'expo-haptics';
import { ChessboardSkeleton } from '../components/SkeletonLoader';

interface DeathmatchSessionScreenProps {
  navigation: any;
  route: {
    params: {
      sessionId: string;
      agent: string;
      puzzles: any[];
      timeLimit: number;
    };
  };
}

const DeathmatchSessionScreen: React.FC<DeathmatchSessionScreenProps> = ({ navigation, route }) => {
  const { sessionId, agent, puzzles = [], timeLimit = 300 } = route.params;
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [chess] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moveIndex, setMoveIndex] = useState(0);
  const [health, setHealth] = useState(100);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Generate puzzles if none provided
  const sessionPuzzles = puzzles.length > 0 ? puzzles : [
    {
      id: 1,
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      solution: ['Bxf7+', 'Kxf7', 'Ng5+'],
      difficulty: 100,
      theme: 'Fork',
    },
    {
      id: 2,
      fen: '2kr1b1r/pp1npppp/2p1bn2/8/3PN3/2N1B3/PPP1BPPP/R3K2R w KQ - 0 1',
      solution: ['Nxf6+', 'gxf6', 'Bh5'],
      difficulty: 150,
      theme: 'Positional',
    },
    {
      id: 3,
      fen: 'r2q1rk1/1b1nbppp/pp2pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKB1R w KQ - 0 1',
      solution: ['c5', 'bxc5', 'Nxd5'],
      difficulty: 200,
      theme: 'Breakthrough',
    },
  ];

  useEffect(() => {
    // Start countdown
    const countdown = setTimeout(() => {
      setLoading(false);
      setIsActive(true);
      loadPuzzle(0);
    }, 3000);

    return () => clearTimeout(countdown);
  }, []);

  useEffect(() => {
    // Timer
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const loadPuzzle = (index: number) => {
    if (index >= sessionPuzzles.length) {
      // No more puzzles, end session
      endSession();
      return;
    }

    const puzzle = sessionPuzzles[index];
    chess.load(puzzle.fen);
    setBoardPosition(chess.fen());
    setMoveIndex(0);
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleMove = (move: any) => {
    const currentPuzzle = sessionPuzzles[currentPuzzleIndex];
    const expectedMove = currentPuzzle.solution[moveIndex];
    const playerMove = move.san || chess.move(move)?.san;

    if (playerMove === expectedMove) {
      // Correct move!
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      chess.move(move);
      setBoardPosition(chess.fen());

      if (moveIndex + 1 >= currentPuzzle.solution.length) {
        // Puzzle solved!
        puzzleSolved();
      } else {
        // Make opponent's response
        setMoveIndex(moveIndex + 1);
        setTimeout(() => {
          const opponentMove = currentPuzzle.solution[moveIndex + 1];
          if (opponentMove && moveIndex + 1 < currentPuzzle.solution.length) {
            chess.move(opponentMove);
            setBoardPosition(chess.fen());
            setMoveIndex(moveIndex + 2);
          }
        }, 300);
      }
    } else {
      // Wrong move!
      wrongMove();
    }
  };

  const puzzleSolved = () => {
    const currentPuzzle = sessionPuzzles[currentPuzzleIndex];
    const points = currentPuzzle.difficulty + (streak * 10);
    
    setScore(score + points);
    setStreak(streak + 1);
    
    // Health regeneration
    setHealth(prev => Math.min(100, prev + 10));
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Quick fade out and load next
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
      loadPuzzle(currentPuzzleIndex + 1);
    });
  };

  const wrongMove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    // Lose health
    const damage = 20;
    setHealth(prev => {
      const newHealth = Math.max(0, prev - damage);
      if (newHealth === 0) {
        endSession();
      }
      return newHealth;
    });
    
    // Reset streak
    setStreak(0);
    
    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Skip to next puzzle
    setTimeout(() => {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
      loadPuzzle(currentPuzzleIndex + 1);
    }, 1000);
  };

  const endSession = () => {
    setIsActive(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    navigation.navigate('SessionComplete', {
      mode: 'deathmatch',
      score: score,
      puzzlesSolved: currentPuzzleIndex,
      accuracy: 0, // Calculate based on moves
      timeSpent: timeLimit - timeLeft,
      bestCombo: streak,
      newBestScore: false, // Check against stored best
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHealthColor = () => {
    if (health > 60) return '#10b981';
    if (health > 30) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.container}
      >
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownTitle}>DEATHMATCH TRAINING</Text>
          <Text style={styles.countdownSubtitle}>Get Ready!</Text>
          <View style={styles.countdownNumber}>
            <Text style={styles.countdownText}>3</Text>
          </View>
          <Text style={styles.countdownAgent}>with {agent}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Stats */}
        <View style={styles.header}>
          <View style={styles.headerStat}>
            <Text style={styles.headerLabel}>TIME</Text>
            <Text style={[styles.headerValue, timeLeft < 30 && styles.urgentText]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
          
          <View style={styles.headerStat}>
            <Text style={styles.headerLabel}>SCORE</Text>
            <Text style={styles.headerValue}>{score}</Text>
          </View>
          
          <View style={styles.headerStat}>
            <Text style={styles.headerLabel}>STREAK</Text>
            <Text style={[styles.headerValue, streak > 0 && styles.streakText]}>
              {streak}x
            </Text>
          </View>
        </View>

        {/* Health Bar */}
        <View style={styles.healthContainer}>
          <Text style={styles.healthLabel}>HEALTH</Text>
          <View style={styles.healthBar}>
            <Animated.View
              style={[
                styles.healthFill,
                {
                  width: `${health}%`,
                  backgroundColor: getHealthColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.healthValue}>{health}%</Text>
        </View>

        {/* Chess Board */}
        <Animated.View
          style={[
            styles.boardContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <ChessBoard
            position={boardPosition}
            onMove={handleMove}
            boardOrientation={chess.turn() === 'w' ? 'white' : 'black'}
          />
        </Animated.View>

        {/* Puzzle Info */}
        <View style={styles.puzzleInfo}>
          <Text style={styles.puzzleNumber}>
            Puzzle {currentPuzzleIndex + 1}/{sessionPuzzles.length}
          </Text>
          <Text style={styles.puzzleTheme}>
            {sessionPuzzles[currentPuzzleIndex]?.theme || 'Tactics'}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={() => {
              setHealth(prev => Math.max(0, prev - 10));
              setCurrentPuzzleIndex(currentPuzzleIndex + 1);
              loadPuzzle(currentPuzzleIndex + 1);
            }}
          >
            <Text style={styles.actionButtonText}>Skip (-10 HP)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.endButton]}
            onPress={endSession}
          >
            <Text style={styles.actionButtonText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  countdownSubtitle: {
    fontSize: 20,
    color: '#94a3b8',
    marginBottom: 40,
  },
  countdownNumber: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  countdownAgent: {
    fontSize: 18,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  headerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  urgentText: {
    color: '#ef4444',
  },
  streakText: {
    color: '#fbbf24',
  },
  healthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  healthLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 10,
  },
  healthBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 10,
  },
  healthValue: {
    fontSize: 14,
    color: '#f8fafc',
    marginLeft: 10,
    minWidth: 40,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  puzzleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  puzzleNumber: {
    fontSize: 16,
    color: '#94a3b8',
  },
  puzzleTheme: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#f59e0b',
  },
  endButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeathmatchSessionScreen;