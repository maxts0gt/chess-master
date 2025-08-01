import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import ChessBoard from '../components/ChessBoard';
import { useAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PuzzleScreenProps {
  navigation: any;
}

interface Puzzle {
  id: number;
  fen: string;
  solution: string[];
  description: string;
  difficulty: string;
  theme: string;
  rating: number;
}

const PuzzleScreen: React.FC<PuzzleScreenProps> = ({ navigation }) => {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [timer, setTimer] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const shakeAnim = useState(new Animated.Value(0))[0];
  
  const api = useAPI();
  const { user } = useAuth();

  useEffect(() => {
    loadNextPuzzle();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadNextPuzzle = async () => {
    try {
      setLoading(true);
      setShowHint(false);
      setMoveIndex(0);
      
      // For now, generate a mock puzzle
      const mockPuzzle: Puzzle = {
        id: Math.floor(Math.random() * 1000),
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        solution: ['Bxf7+', 'Kxf7', 'Ng5+'],
        description: 'White to play and win material',
        difficulty: 'Intermediate',
        theme: 'Fork',
        rating: 1400,
      };
      
      setCurrentPuzzle(mockPuzzle);
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading puzzle:', error);
      Alert.alert('Error', 'Failed to load puzzle');
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (move: any) => {
    if (!currentPuzzle) return;
    
    const expectedMove = currentPuzzle.solution[moveIndex];
    const playerMove = move.san;
    
    if (playerMove === expectedMove) {
      // Correct move!
      setMoveIndex(moveIndex + 1);
      
      if (moveIndex + 1 >= currentPuzzle.solution.length) {
        // Puzzle solved!
        puzzleSolved();
      } else {
        // More moves to go
        showSuccess('Correct! Keep going...');
      }
    } else {
      // Wrong move
      wrongMove();
    }
  };

  const puzzleSolved = () => {
    setScore(score + 100 + Math.floor(1000 / timer));
    setStreak(streak + 1);
    setPuzzlesSolved(puzzlesSolved + 1);
    
    if (streak + 1 > bestStreak) {
      setBestStreak(streak + 1);
    }
    
    showSuccess('🎉 Puzzle Solved! +' + (100 + Math.floor(1000 / timer)) + ' points');
    
    setTimeout(() => {
      loadNextPuzzle();
    }, 1500);
  };

  const wrongMove = () => {
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
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setStreak(0);
    Alert.alert(
      'Wrong Move!',
      'Try again or get a hint',
      [
        { text: 'Try Again', style: 'cancel' },
        { text: 'Show Hint', onPress: () => setShowHint(true) },
        { text: 'Skip Puzzle', onPress: loadNextPuzzle },
      ]
    );
  };

  const showSuccess = (message: string) => {
    Alert.alert('Success!', message, [{ text: 'OK' }]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !currentPuzzle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading puzzle...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚡ Puzzle Deathmatch ⚡</Text>
        <Text style={styles.subtitle}>CS:GO-style rapid chess improvement</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{score}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatTime(timer)}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{puzzlesSolved}</Text>
          <Text style={styles.statLabel}>Solved</Text>
        </View>
      </View>

      <Animated.View 
        style={[
          styles.puzzleContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateX: shakeAnim }]
          }
        ]}
      >
        <View style={styles.puzzleInfo}>
          <Text style={styles.puzzleTheme}>{currentPuzzle.theme}</Text>
          <Text style={styles.puzzleDifficulty}>{currentPuzzle.difficulty} • {currentPuzzle.rating}</Text>
        </View>

        <Text style={styles.puzzleDescription}>{currentPuzzle.description}</Text>

        <View style={styles.boardContainer}>
          <ChessBoard
            fen={currentPuzzle.fen}
            onMove={handleMove}
            playable={true}
            showCoordinates={true}
          />
        </View>

        {showHint && currentPuzzle && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              💡 Hint: Look for {currentPuzzle.solution[moveIndex].slice(0, 2)}...
            </Text>
          </View>
        )}

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${(moveIndex / currentPuzzle.solution.length) * 100}%` }
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          Move {moveIndex + 1} of {currentPuzzle.solution.length}
        </Text>
      </Animated.View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={loadNextPuzzle}
        >
          <Text style={styles.skipButtonText}>Skip Puzzle →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hintButton}
          onPress={() => setShowHint(true)}
        >
          <Text style={styles.hintButtonText}>💡 Show Hint</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.achievementSection}>
        <Text style={styles.achievementTitle}>🏆 Achievements</Text>
        <View style={styles.achievementGrid}>
          <View style={[styles.achievement, bestStreak >= 5 && styles.achievementUnlocked]}>
            <Text style={styles.achievementEmoji}>🔥</Text>
            <Text style={styles.achievementText}>5 Streak</Text>
          </View>
          <View style={[styles.achievement, bestStreak >= 10 && styles.achievementUnlocked]}>
            <Text style={styles.achievementEmoji}>⚡</Text>
            <Text style={styles.achievementText}>10 Streak</Text>
          </View>
          <View style={[styles.achievement, puzzlesSolved >= 50 && styles.achievementUnlocked]}>
            <Text style={styles.achievementEmoji}>🎯</Text>
            <Text style={styles.achievementText}>50 Solved</Text>
          </View>
          <View style={[styles.achievement, score >= 10000 && styles.achievementUnlocked]}>
            <Text style={styles.achievementEmoji}>👑</Text>
            <Text style={styles.achievementText}>10K Score</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  puzzleContainer: {
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  puzzleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  puzzleTheme: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  puzzleDifficulty: {
    fontSize: 14,
    color: '#64748b',
  },
  puzzleDescription: {
    fontSize: 16,
    color: '#f1f5f9',
    marginBottom: 16,
    textAlign: 'center',
  },
  boardContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  hintBox: {
    backgroundColor: '#1e3a8a',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  hintText: {
    color: '#93bbfc',
    fontSize: 14,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  skipButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  hintButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  hintButtonText: {
    color: '#93bbfc',
    fontSize: 16,
    fontWeight: '600',
  },
  achievementSection: {
    padding: 20,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 16,
    textAlign: 'center',
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  achievement: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 8,
    opacity: 0.5,
    minWidth: 80,
  },
  achievementUnlocked: {
    opacity: 1,
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  achievementEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default PuzzleScreen;