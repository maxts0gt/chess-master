import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface DailyChallengeProps {
  onPress: () => void;
}

interface DailyPuzzle {
  id: string;
  date: string;
  fen: string;
  solution: string[];
  theme: string;
  difficulty: string;
  reward: number;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({ onPress }) => {
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [todaysPuzzle, setTodaysPuzzle] = useState<DailyPuzzle | null>(null);
  const pulseAnim = useState(new Animated.Value(1))[0];
  const shimmerAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    checkDailyStatus();
    loadDailyPuzzle();
    
    // Pulse animation for uncompleted challenge
    if (!completed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
    
    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const checkDailyStatus = async () => {
    try {
      const today = new Date().toDateString();
      const lastCompleted = await AsyncStorage.getItem('lastDailyCompleted');
      const dailyStreak = await AsyncStorage.getItem('dailyStreak');
      
      if (lastCompleted === today) {
        setCompleted(true);
      }
      
      if (dailyStreak) {
        setStreak(parseInt(dailyStreak, 10));
      }
    } catch (error) {
      console.error('Error checking daily status:', error);
    }
  };

  const loadDailyPuzzle = () => {
    // Generate a daily puzzle based on the date
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // In production, this would fetch from server
    // For now, generate a puzzle based on the date
    const puzzles = [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        solution: ['Bxf7+', 'Kxf7', 'Ng5+'],
        theme: 'Fork',
        difficulty: 'Intermediate',
      },
      {
        fen: '2kr1b1r/pp1npppp/2p1bn2/8/3PN3/2N1B3/PPP1BPPP/R3K2R w KQ - 0 1',
        solution: ['Nxf6+', 'gxf6', 'Bh5'],
        theme: 'Positional',
        difficulty: 'Advanced',
      },
      {
        fen: 'r2q1rk1/1b1nbppp/pp2pn2/3p4/2PP4/1PN1PN2/PB3PPP/R2QKB1R w KQ - 0 1',
        solution: ['c5', 'bxc5', 'Nxd5'],
        theme: 'Breakthrough',
        difficulty: 'Expert',
      },
    ];
    
    // Use date to select puzzle deterministically
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const puzzle = puzzles[dayOfYear % puzzles.length];
    
    setTodaysPuzzle({
      id: dateString,
      date: dateString,
      ...puzzle,
      reward: 100 + (streak * 10), // Bonus for streak
    });
  };

  const getTimeUntilNextPuzzle = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      disabled={completed}
    >
      <Animated.View
        style={[
          styles.container,
          !completed && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <LinearGradient
          colors={completed ? ['#10b981', '#059669'] : ['#3b82f6', '#2563eb']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {!completed && (
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            />
          )}
          
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.dailyText}>DAILY</Text>
              <Text style={styles.challengeText}>CHALLENGE</Text>
            </View>
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakNumber}>{streak}</Text>
            </View>
          </View>
          
          <View style={styles.content}>
            {completed ? (
              <>
                <Text style={styles.completedIcon}>✅</Text>
                <Text style={styles.completedText}>Completed!</Text>
                <Text style={styles.nextPuzzleText}>
                  Next puzzle in {getTimeUntilNextPuzzle()}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.puzzleInfo}>
                  <Text style={styles.themeText}>{todaysPuzzle?.theme}</Text>
                  <Text style={styles.difficultyText}>{todaysPuzzle?.difficulty}</Text>
                </View>
                <View style={styles.rewardContainer}>
                  <Text style={styles.rewardIcon}>🏆</Text>
                  <Text style={styles.rewardText}>+{todaysPuzzle?.reward} XP</Text>
                </View>
                <Text style={styles.playText}>TAP TO PLAY</Text>
              </>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    padding: 20,
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  titleContainer: {
    flex: 1,
  },
  dailyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 2,
  },
  challengeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: -2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    alignItems: 'center',
  },
  completedIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  completedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  nextPuzzleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  puzzleInfo: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  themeText: {
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rewardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  rewardText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  playText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
});

export default DailyChallenge;