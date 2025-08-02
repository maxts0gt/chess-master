import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface SessionCompleteScreenProps {
  navigation: any;
  route: {
    params: {
      mode: string;
      score: number;
      puzzlesSolved: number;
      accuracy?: number;
      timeSpent: number;
      bestCombo?: number;
      newBestScore?: boolean;
    };
  };
}

const SessionCompleteScreen: React.FC<SessionCompleteScreenProps> = ({ navigation, route }) => {
  const { mode, score, puzzlesSolved, accuracy = 0, timeSpent, bestCombo = 0, newBestScore = false } = route.params;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const starScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Entry animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(starScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGrade = () => {
    const avgScore = score / Math.max(puzzlesSolved, 1);
    if (avgScore >= 150) return { grade: 'S', color: '#fbbf24' };
    if (avgScore >= 120) return { grade: 'A', color: '#10b981' };
    if (avgScore >= 90) return { grade: 'B', color: '#3b82f6' };
    if (avgScore >= 60) return { grade: 'C', color: '#8b5cf6' };
    return { grade: 'D', color: '#ef4444' };
  };

  const { grade, color } = getGrade();

  const getModeEmoji = () => {
    switch (mode) {
      case 'storm': return '⚡';
      case 'streak': return '🔥';
      default: return '🎯';
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.modeIcon}>{getModeEmoji()}</Text>
            <Text style={styles.title}>Session Complete!</Text>
            {newBestScore && (
              <Animated.Text
                style={[
                  styles.newRecord,
                  { transform: [{ scale: starScale }] },
                ]}
              >
                🌟 NEW RECORD! 🌟
              </Animated.Text>
            )}
          </View>

          <View style={[styles.gradeContainer, { borderColor: color }]}>
            <Text style={[styles.grade, { color }]}>{grade}</Text>
            <Text style={styles.gradeLabel}>Grade</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.primaryStats}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{score.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Score</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{puzzlesSolved}</Text>
                <Text style={styles.statLabel}>Puzzles Solved</Text>
              </View>
            </View>

            <View style={styles.secondaryStats}>
              <View style={styles.statRow}>
                <Text style={styles.statRowLabel}>⏱️ Time</Text>
                <Text style={styles.statRowValue}>{formatTime(timeSpent)}</Text>
              </View>
              {accuracy > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>🎯 Accuracy</Text>
                  <Text style={styles.statRowValue}>{Math.round(accuracy * 100)}%</Text>
                </View>
              )}
              {bestCombo > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>🔥 Best Combo</Text>
                  <Text style={styles.statRowValue}>{bestCombo}x</Text>
                </View>
              )}
              <View style={styles.statRow}>
                <Text style={styles.statRowLabel}>⚡ Avg Score</Text>
                <Text style={styles.statRowValue}>
                  {Math.round(score / Math.max(puzzlesSolved, 1))}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>💡 Insights</Text>
            {accuracy < 0.5 && (
              <Text style={styles.insight}>
                • Focus on accuracy - take your time to find the best moves
              </Text>
            )}
            {puzzlesSolved < 5 && (
              <Text style={styles.insight}>
                • Try to solve more puzzles to improve pattern recognition
              </Text>
            )}
            {bestCombo >= 5 && (
              <Text style={styles.insight}>
                • Great combo streak! You're recognizing patterns well
              </Text>
            )}
            {score >= 1000 && (
              <Text style={styles.insight}>
                • Excellent performance! Ready for harder challenges?
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                navigation.navigate('Puzzle');
              }}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Play Again</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                navigation.navigate('Home');
              }}
            >
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Implement share functionality
            }}
          >
            <Text style={styles.shareButtonText}>📤 Share Results</Text>
          </TouchableOpacity>
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
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modeIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  newRecord: {
    fontSize: 18,
    color: '#fbbf24',
    fontWeight: 'bold',
    marginTop: 10,
  },
  gradeContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#1e293b',
  },
  grade: {
    fontSize: 60,
    fontWeight: 'bold',
  },
  gradeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: -5,
  },
  statsContainer: {
    marginBottom: 30,
  },
  primaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  secondaryStats: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statRowLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  statRowValue: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  insightsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  insight: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  shareButtonText: {
    color: '#3b82f6',
    fontSize: 16,
  },
});

export default SessionCompleteScreen;