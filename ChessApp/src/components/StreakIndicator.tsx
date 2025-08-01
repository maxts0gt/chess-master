import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface StreakIndicatorProps {
  streak: number;
  bestStreak: number;
}

const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, bestStreak }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (streak > 0) {
      // Pulse animation when streak increases
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow effect for high streaks
      if (streak >= 5) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      glowAnim.setValue(0);
    }
  }, [streak]);

  const getStreakEmoji = () => {
    if (streak === 0) return '💤';
    if (streak < 3) return '🔥';
    if (streak < 5) return '🔥🔥';
    if (streak < 10) return '🔥🔥🔥';
    return '🌟🔥🌟';
  };

  const getStreakColor = () => {
    if (streak === 0) return '#64748b';
    if (streak < 3) return '#f59e0b';
    if (streak < 5) return '#ef4444';
    if (streak < 10) return '#dc2626';
    return '#fbbf24';
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.streakContainer,
          {
            transform: [{ scale: scaleAnim }],
            backgroundColor: getStreakColor(),
            opacity: Animated.add(0.8, Animated.multiply(glowAnim, 0.2)),
          },
        ]}
      >
        <Text style={styles.streakEmoji}>{getStreakEmoji()}</Text>
        <View style={styles.streakInfo}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>Streak</Text>
        </View>
      </Animated.View>
      
      {streak > 0 && streak >= bestStreak - 2 && (
        <View style={styles.bestStreakAlert}>
          <Text style={styles.bestStreakText}>
            {streak === bestStreak 
              ? '🏆 New Record!' 
              : streak === bestStreak - 1 
              ? '⚡ One away from record!' 
              : '🎯 Close to record!'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  streakEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  streakLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  bestStreakAlert: {
    marginTop: 5,
    backgroundColor: '#1e293b',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  bestStreakText: {
    fontSize: 12,
    color: '#fbbf24',
    fontWeight: 'bold',
  },
});

export default StreakIndicator;