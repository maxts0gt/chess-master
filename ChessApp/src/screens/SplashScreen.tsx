import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Chess pieces animations
  const kingAnim = useRef(new Animated.Value(-width)).current;
  const queenAnim = useRef(new Animated.Value(width)).current;
  const knightAnim = useRef(new Animated.Value(-height)).current;
  const rookAnim = useRef(new Animated.Value(height)).current;
  
  // Glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    
    // Main logo animation sequence
    Animated.sequence([
      // Phase 1: Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Chess pieces slide in
      Animated.parallel([
        Animated.spring(kingAnim, {
          toValue: -width * 0.3,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(queenAnim, {
          toValue: width * 0.3,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(knightAnim, {
          toValue: 0,
          friction: 5,
          tension: 40,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.spring(rookAnim, {
          toValue: 0,
          friction: 5,
          tension: 40,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 3: Glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
    ]).start();

    // Text animation
    Animated.sequence([
      Animated.delay(800),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            // Fade out animation
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => {
              onFinish();
            });
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Background chess pieces */}
        <Animated.Text
          style={[
            styles.backgroundPiece,
            styles.king,
            { transform: [{ translateX: kingAnim }] },
          ]}
        >
          ♔
        </Animated.Text>
        
        <Animated.Text
          style={[
            styles.backgroundPiece,
            styles.queen,
            { transform: [{ translateX: queenAnim }] },
          ]}
        >
          ♕
        </Animated.Text>
        
        <Animated.Text
          style={[
            styles.backgroundPiece,
            styles.knight,
            { transform: [{ translateY: knightAnim }] },
          ]}
        >
          ♘
        </Animated.Text>
        
        <Animated.Text
          style={[
            styles.backgroundPiece,
            styles.rook,
            { transform: [{ translateY: rookAnim }] },
          ]}
        >
          ♜
        </Animated.Text>

        {/* Main logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: scaleAnim },
                { rotate: spin },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoGlow,
              { opacity: glowOpacity },
            ]}
          />
          <Text style={styles.logo}>♚</Text>
        </Animated.View>
        
        {/* App name and tagline */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>CHESS MASTER</Text>
          <Text style={styles.subtitle}>Deathmatch Edition</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Train Like a Grandmaster</Text>
          <Text style={styles.tagline2}>Play Like a Champion</Text>
        </Animated.View>

        {/* Loading progress */}
        <View style={styles.loadingContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Loading {loadingProgress}%</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>⚡ Powered by AI Coaching ⚡</Text>
          <Text style={styles.version}>Version 2.0</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPiece: {
    position: 'absolute',
    fontSize: 80,
    color: '#1e293b',
    opacity: 0.3,
  },
  king: {
    top: height * 0.1,
    left: width * 0.8,
  },
  queen: {
    top: height * 0.2,
    right: width * 0.8,
  },
  knight: {
    top: height * 0.7,
    left: width * 0.1,
  },
  rook: {
    bottom: height * 0.1,
    right: width * 0.1,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 10,
  },
  logo: {
    fontSize: 140,
    color: '#f8fafc',
    textShadowColor: '#3b82f6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 8,
    letterSpacing: 4,
    textShadowColor: '#3b82f6',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#3b82f6',
    marginBottom: 20,
    fontWeight: '600',
    letterSpacing: 2,
  },
  divider: {
    width: 80,
    height: 3,
    backgroundColor: '#3b82f6',
    marginBottom: 16,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  tagline2: {
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: height * 0.2,
    alignItems: 'center',
  },
  progressBar: {
    width: width * 0.6,
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    color: '#334155',
  },
});

export default SplashScreen;