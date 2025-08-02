import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface DailyChallengeScreenProps {
  navigation: any;
  route?: {
    params?: {
      puzzle?: any;
    };
  };
}

const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({ navigation, route }) => {
  const [chess] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState('');
  const [moveIndex, setMoveIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [timer, setTimer] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const successAnim = useState(new Animated.Value(0))[0];
  
  // Default daily puzzle (same as in DailyChallenge component)
  const getDailyPuzzle = () => {
    const today = new Date();
    const puzzles = [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        solution: ['Bxf7+', 'Kxf7', 'Ng5+'],
        theme: 'Fork',
        difficulty: 'Intermediate',
        description: 'Win material with a classic fork pattern',
      },
      {
        fen: '2kr1b1r/pp1npppp/2p1bn2/8/3PN3/2N1B3/PPP1BPPP/R3K2R w KQ - 0 1',
        solution: ['Nxf6+', 'gxf6', 'Bh5'],
        theme: 'Positional',
        difficulty: 'Advanced',
        description: 'Improve your position with a key exchange',
      },
      {
        fen: 'r2q1rk1/1b1nbppp/pp2pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKB1R w KQ - 0 1',
        solution: ['c5', 'bxc5', 'Nxd5'],
        theme: 'Breakthrough',
        difficulty: 'Expert',
        description: 'Break through the center with a pawn sacrifice',
      },
    ];
    
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return puzzles[dayOfYear % puzzles.length];
  };
  
  const puzzle = route?.params?.puzzle || getDailyPuzzle();

  useEffect(() => {
    // Initialize puzzle
    chess.load(puzzle.fen);
    setBoardPosition(chess.fen());
    
    // Start timer
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    return () => clearInterval(interval);
  }, []);

  const handleMove = (move: any) => {
    const expectedMove = puzzle.solution[moveIndex];
    const playerMove = move.san || chess.move(move)?.san;
    
    if (playerMove === expectedMove) {
      // Correct move!
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      chess.move(move);
      setBoardPosition(chess.fen());
      
      if (moveIndex + 1 >= puzzle.solution.length) {
        // Puzzle solved!
        puzzleSolved();
      } else {
        // Make opponent's response
        setMoveIndex(moveIndex + 1);
        setTimeout(() => {
          const opponentMove = puzzle.solution[moveIndex + 1];
          if (opponentMove && moveIndex + 1 < puzzle.solution.length) {
            chess.move(opponentMove);
            setBoardPosition(chess.fen());
            setMoveIndex(moveIndex + 2);
          }
        }, 500);
      }
    } else {
      // Wrong move
      wrongMove();
    }
  };

  const wrongMove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setAttempts(attempts + 1);
    
    // Reset position
    setTimeout(() => {
      chess.undo();
      setBoardPosition(chess.fen());
    }, 500);
  };

  const puzzleSolved = async () => {
    setSolved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Success animation
    Animated.spring(successAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    // Calculate score
    const baseScore = 100;
    const timeBonus = Math.max(0, 60 - timer) * 2;
    const attemptPenalty = attempts * 10;
    const totalScore = Math.max(20, baseScore + timeBonus - attemptPenalty);
    
    // Update daily status
    const today = new Date().toDateString();
    await AsyncStorage.setItem('lastDailyCompleted', today);
    
    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastCompleted = await AsyncStorage.getItem('lastDailyCompleted');
    const currentStreak = await AsyncStorage.getItem('dailyStreak') || '0';
    
    let newStreak = 1;
    if (lastCompleted === yesterday.toDateString()) {
      newStreak = parseInt(currentStreak, 10) + 1;
    }
    await AsyncStorage.setItem('dailyStreak', newStreak.toString());
    
    // Show results
    Alert.alert(
      '🎉 Daily Challenge Complete!',
      `Score: ${totalScore}\nTime: ${formatTime(timer)}\nAttempts: ${attempts + 1}\n\nStreak: ${newStreak} days 🔥`,
      [
        {
          text: 'Share',
          onPress: () => {
            // TODO: Implement share
          },
        },
        {
          text: 'Continue',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const getHint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentMove = puzzle.solution[moveIndex];
    const piece = currentMove.charAt(0);
    const hints = {
      'B': 'Look for a bishop move...',
      'N': 'Knight moves can be tricky...',
      'R': 'Rook power on open files...',
      'Q': 'The queen is powerful...',
      'K': 'King safety is important...',
      'default': 'Think about forcing moves...',
    };
    
    Alert.alert(
      '💡 Hint',
      hints[piece] || hints.default,
      [{ text: 'OK' }]
    );
    setShowHint(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.dailyBadge}>DAILY CHALLENGE</Text>
            <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
          </View>

          {/* Puzzle Info */}
          <View style={styles.puzzleInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.themeLabel}>Theme:</Text>
              <Text style={styles.themeValue}>{puzzle.theme}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.difficultyLabel}>Difficulty:</Text>
              <Text style={styles.difficultyValue}>{puzzle.difficulty}</Text>
            </View>
          </View>

          <Text style={styles.description}>{puzzle.description}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatTime(timer)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{attempts}</Text>
              <Text style={styles.statLabel}>Attempts</Text>
            </View>
          </View>

          {/* Chess Board */}
          <View style={styles.boardContainer}>
            <ChessBoard
              position={boardPosition}
              onMove={handleMove}
              boardOrientation={chess.turn() === 'w' ? 'white' : 'black'}
            />
          </View>

          {/* Success Message */}
          {solved && (
            <Animated.View
              style={[
                styles.successMessage,
                {
                  transform: [{ scale: successAnim }],
                  opacity: successAnim,
                },
              ]}
            >
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successText}>Brilliant!</Text>
            </Animated.View>
          )}

          {/* Controls */}
          {!solved && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.hintButton}
                onPress={getHint}
                disabled={showHint}
              >
                <Text style={styles.hintButtonText}>
                  {showHint ? 'Hint Used' : '💡 Get Hint'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  Alert.alert(
                    'Skip Challenge?',
                    'You will lose your daily streak!',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Skip',
                        style: 'destructive',
                        onPress: () => navigation.goBack(),
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
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
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dailyBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 2,
    marginBottom: 5,
  },
  dateText: {
    fontSize: 18,
    color: '#94a3b8',
  },
  puzzleInfo: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  themeLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  themeValue: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  difficultyLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  difficultyValue: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successMessage: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  hintButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  hintButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DailyChallengeScreen;