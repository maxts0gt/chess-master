import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface OnboardingScreenProps {
  navigation: any;
}

const { width, height } = Dimensions.get('window');

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userPreferences, setUserPreferences] = useState({
    skillLevel: '',
    playStyle: '',
    goals: [],
    timeCommitment: '',
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Chess Master',
      subtitle: 'Your journey to mastery begins here',
      icon: '♚',
    },
    {
      id: 'skillLevel',
      title: 'What\'s your skill level?',
      subtitle: 'This helps us personalize your experience',
      options: [
        { value: 'beginner', label: 'Beginner', desc: 'Just learning the rules', icon: '🌱' },
        { value: 'intermediate', label: 'Intermediate', desc: 'Know basics, want to improve', icon: '📈' },
        { value: 'advanced', label: 'Advanced', desc: 'Tournament player', icon: '🏆' },
        { value: 'expert', label: 'Expert', desc: 'Rated 2000+', icon: '👑' },
      ],
    },
    {
      id: 'playStyle',
      title: 'How do you like to play?',
      subtitle: 'We\'ll match you with the right AI coach',
      options: [
        { value: 'aggressive', label: 'Aggressive', desc: 'Attack at all costs', icon: '⚔️' },
        { value: 'positional', label: 'Positional', desc: 'Strategic and patient', icon: '🏛️' },
        { value: 'tactical', label: 'Tactical', desc: 'Love combinations', icon: '💥' },
        { value: 'balanced', label: 'Balanced', desc: 'Adapt to the position', icon: '⚖️' },
      ],
    },
    {
      id: 'goals',
      title: 'What are your chess goals?',
      subtitle: 'Select all that apply',
      multiSelect: true,
      options: [
        { value: 'rating', label: 'Increase Rating', icon: '📊' },
        { value: 'tactics', label: 'Improve Tactics', icon: '🎯' },
        { value: 'openings', label: 'Learn Openings', icon: '📚' },
        { value: 'endgames', label: 'Master Endgames', icon: '🏰' },
        { value: 'fun', label: 'Just Have Fun!', icon: '🎮' },
      ],
    },
    {
      id: 'commitment',
      title: 'How much time can you practice?',
      subtitle: 'We\'ll create a realistic training plan',
      options: [
        { value: '15min', label: '15 min/day', desc: 'Quick daily sessions', icon: '⚡' },
        { value: '30min', label: '30 min/day', desc: 'Focused practice', icon: '⏱️' },
        { value: '1hour', label: '1 hour/day', desc: 'Serious improvement', icon: '💪' },
        { value: 'flexible', label: 'Flexible', desc: 'Practice when I can', icon: '🌊' },
      ],
    },
  ];

  const animateTransition = (nextStep: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(50);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: (nextStep + 1) / steps.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleOptionSelect = (stepId: string, value: string) => {
    if (stepId === 'goals') {
      const currentGoals = userPreferences.goals || [];
      const newGoals = currentGoals.includes(value)
        ? currentGoals.filter(g => g !== value)
        : [...currentGoals, value];
      
      setUserPreferences({
        ...userPreferences,
        goals: newGoals,
      });
    } else {
      setUserPreferences({
        ...userPreferences,
        [stepId]: value,
      });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateTransition(currentStep + 1);
    } else {
      // Complete onboarding
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Home');
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Home');
  };

  const isStepComplete = () => {
    const step = steps[currentStep];
    if (step.id === 'welcome') return true;
    if (step.id === 'goals') return userPreferences.goals.length > 0;
    return userPreferences[step.id] !== '';
  };

  const renderStep = () => {
    const step = steps[currentStep];

    if (step.id === 'welcome') {
      return (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeIcon}>{step.icon}</Text>
          <Text style={styles.welcomeTitle}>{step.title}</Text>
          <Text style={styles.welcomeSubtitle}>{step.subtitle}</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureText}>Puzzle Storm Training</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🤖</Text>
              <Text style={styles.featureText}>6 AI Coaches</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎮</Text>
              <Text style={styles.featureText}>CS:GO Style Gameplay</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

        <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
          {step.options?.map((option) => {
            const isSelected = step.multiSelect
              ? userPreferences.goals.includes(option.value)
              : userPreferences[step.id] === option.value;

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => handleOptionSelect(step.id, option.value)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  {option.desc && (
                    <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>
                      {option.desc}
                    </Text>
                  )}
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
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
          {currentStep > 0 && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderStep()}
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => animateTransition(currentStep - 1)}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              !isStepComplete() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isStepComplete()}
          >
            <LinearGradient
              colors={isStepComplete() ? ['#3b82f6', '#2563eb'] : ['#334155', '#1e293b']}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>
                {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
              </Text>
            </LinearGradient>
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  skipButton: {
    marginLeft: 20,
  },
  skipText: {
    color: '#64748b',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIcon: {
    fontSize: 100,
    color: '#3b82f6',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 40,
    textAlign: 'center',
  },
  featuresList: {
    marginTop: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 18,
    color: '#94a3b8',
  },
  stepContainer: {
    flex: 1,
    paddingTop: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 30,
  },
  optionsContainer: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e293b',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#3b82f6',
  },
  optionDesc: {
    fontSize: 14,
    color: '#64748b',
  },
  optionDescSelected: {
    color: '#94a3b8',
  },
  checkmark: {
    fontSize: 24,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  backText: {
    color: '#64748b',
    fontSize: 18,
  },
  nextButton: {
    flex: 1,
    marginLeft: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;