/**
 * Onboarding Screen
 * Stunning first-time user experience showcasing AI capabilities
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  demo?: React.ReactNode;
  gradient: string[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    icon: '♔',
    title: 'Welcome to Chess Master',
    description: 'The only chess app with a real AI coach in your pocket',
    gradient: ['#1565C0', '#0D47A1'],
  },
  {
    id: 'ai-demo',
    icon: '🤖',
    title: 'Meet Your AI Coach',
    description: 'Ask questions in plain English and get grandmaster-level insights',
    gradient: ['#00796B', '#004D40'],
    demo: (
      <View style={styles.demoContainer}>
        <View style={styles.chatBubbleUser}>
          <Text style={styles.chatTextUser}>Why did I lose this game?</Text>
        </View>
        <View style={styles.chatBubbleAI}>
          <Text style={styles.chatTextAI}>
            You missed a tactical opportunity on move 15. Your opponent's king was vulnerable to a discovered check...
          </Text>
        </View>
      </View>
    ),
  },
  {
    id: 'offline',
    icon: '✈️',
    title: '100% Offline',
    description: 'Works everywhere - plane, subway, or remote cabin. No internet needed!',
    gradient: ['#E65100', '#BF360C'],
  },
  {
    id: 'privacy',
    icon: '🔒',
    title: 'Your Games Stay Private',
    description: 'No data leaves your device. Ever. We respect your privacy.',
    gradient: ['#4A148C', '#311B92'],
  },
  {
    id: 'value',
    icon: '💎',
    title: 'Incredible Value',
    description: 'One-time purchase. Lifetime access. No subscriptions.',
    gradient: ['#F57C00', '#E65100'],
    demo: (
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonTitle}>Chess Coach</Text>
          <Text style={styles.comparisonPrice}>$50/hour</Text>
        </View>
        <View style={styles.comparisonVs}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonTitle}>Our AI Coach</Text>
          <Text style={styles.comparisonPrice}>$9.99 forever</Text>
        </View>
      </View>
    ),
  },
];

interface OnboardingScreenProps {
  onComplete: (showPremium: boolean) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Set status bar
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  const animateSlideChange = (index: number) => {
    // Fade out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentSlide(index);
      
      // Fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      animateSlideChange(currentSlide + 1);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('@ChessApp:OnboardingComplete', 'true');
    onComplete(false);
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('@ChessApp:OnboardingComplete', 'true');
    
    // Pulse animation before completing
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
    ]).start(() => {
      onComplete(true); // Show premium screen after onboarding
    });
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => {
          const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: index === currentSlide ? '#FFF' : 'rgba(255,255,255,0.5)',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const currentSlideData = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <LinearGradient
      colors={currentSlideData.gradient}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {!isLastSlide && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <Text style={styles.icon}>{currentSlideData.icon}</Text>
          <Text style={styles.title}>{currentSlideData.title}</Text>
          <Text style={styles.description}>{currentSlideData.description}</Text>
          
          {currentSlideData.demo && (
            <Animated.View
              style={[
                styles.demoWrapper,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {currentSlideData.demo}
            </Animated.View>
          )}
        </Animated.View>

        <View style={styles.bottomContainer}>
          {renderDots()}
          
          <TouchableOpacity
            style={[styles.button, isLastSlide && styles.getStartedButton]}
            onPress={isLastSlide ? handleGetStarted : handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isLastSlide ? 'Get Started with AI Coach' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 100,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },
  demoWrapper: {
    marginTop: 40,
    width: '100%',
  },
  demoContainer: {
    paddingHorizontal: 20,
  },
  chatBubbleUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  chatBubbleAI: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  chatTextUser: {
    color: '#FFF',
    fontSize: 16,
  },
  chatTextAI: {
    color: '#333',
    fontSize: 16,
    lineHeight: 22,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  comparisonItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 20,
    borderRadius: 15,
    minWidth: 120,
  },
  comparisonTitle: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 10,
  },
  comparisonPrice: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  comparisonVs: {
    paddingHorizontal: 15,
  },
  vsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomContainer: {
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  getStartedButton: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});