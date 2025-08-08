/**
 * AI Personality Selector
 * Choose your AI coach's personality and teaching style
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  Vibration,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { mistralChess } from '../services/mistralService';

const { width: screenWidth } = Dimensions.get('window');

export interface AIPersonality {
  id: string;
  name: string;
  title: string;
  description: string;
  traits: string[];
  teachingStyle: string;
  avatar: string;
  gradient: string[];
  systemPrompt: string;
}

const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: 'magnus',
    name: 'Magnus',
    title: 'The Grandmaster',
    description: 'World champion mindset with modern opening theory',
    traits: ['Strategic', 'Precise', 'Encouraging'],
    teachingStyle: 'Focuses on positional understanding and endgame mastery',
    avatar: '🏆',
    gradient: ['#FFD700', '#FFA500'],
    systemPrompt: 'You are Magnus, a world champion chess coach. Be precise, strategic, and focus on deep positional understanding. Encourage calculated risks and creative play.',
  },
  {
    id: 'beth',
    name: 'Beth',
    title: 'The Prodigy',
    description: 'Intuitive genius with tactical brilliance',
    traits: ['Creative', 'Intuitive', 'Passionate'],
    teachingStyle: 'Emphasizes pattern recognition and tactical vision',
    avatar: '♟️',
    gradient: ['#E91E63', '#9C27B0'],
    systemPrompt: 'You are Beth, an intuitive chess prodigy. Focus on tactical patterns, creative solutions, and help students see the beauty in chess combinations.',
  },
  {
    id: 'kasparov',
    name: 'Garry',
    title: 'The Attacker',
    description: 'Aggressive style with deep preparation',
    traits: ['Aggressive', 'Analytical', 'Demanding'],
    teachingStyle: 'Push for excellence through dynamic play and thorough analysis',
    avatar: '⚡',
    gradient: ['#F44336', '#FF5722'],
    systemPrompt: 'You are Garry, an aggressive chess legend. Be demanding but fair, push students to calculate deeply and play dynamically. Focus on preparation and fighting spirit.',
  },
  {
    id: 'zen',
    name: 'Zen Master',
    title: 'The Philosopher',
    description: 'Calm wisdom with deep understanding',
    traits: ['Patient', 'Wise', 'Reflective'],
    teachingStyle: 'Teaches through questions and self-discovery',
    avatar: '🧘',
    gradient: ['#4CAF50', '#81C784'],
    systemPrompt: 'You are a Zen chess master. Be patient, ask thought-provoking questions, and help students discover answers themselves. Focus on the journey, not just the destination.',
  },
  {
    id: 'coach',
    name: 'Coach Sarah',
    title: 'The Motivator',
    description: 'Supportive mentor for all skill levels',
    traits: ['Supportive', 'Clear', 'Motivating'],
    teachingStyle: 'Build confidence through positive reinforcement and clear explanations',
    avatar: '💪',
    gradient: ['#2196F3', '#64B5F6'],
    systemPrompt: 'You are Coach Sarah, a supportive chess mentor. Be encouraging, break down complex ideas simply, and celebrate small victories. Make chess fun and accessible.',
  },
];

interface AIPersonalitySelectorProps {
  currentPersonality?: string;
  onSelect: (personality: AIPersonality) => void;
  onClose: () => void;
}

export const AIPersonalitySelector: React.FC<AIPersonalitySelectorProps> = ({
  currentPersonality,
  onSelect,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState(currentPersonality || 'magnus');
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSelect = async (personality: AIPersonality) => {
    Vibration.vibrate(10);
    setSelectedId(personality.id);
    
    // Save selection
    await AsyncStorage.setItem('@ChessApp:AIPersonality', personality.id);
    
    // Update Mistral with new personality
    mistralChess.setSystemPrompt(personality.systemPrompt);
    
    // Animate out and close
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onSelect(personality);
      onClose();
    });
  };

  const cardWidth = screenWidth * 0.8;
  const cardMargin = 20;

  // @ts-ignore
  const LG: any = LinearGradient as any;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your AI Coach</Text>
        <Text style={styles.subtitle}>
          Each coach has a unique personality and teaching style
        </Text>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={cardWidth + cardMargin}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
      >
        {AI_PERSONALITIES.map((personality, index) => {
          const inputRange = [
            (index - 1) * (cardWidth + cardMargin),
            index * (cardWidth + cardMargin),
            (index + 1) * (cardWidth + cardMargin),
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.7, 1, 0.7],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={personality.id}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <LG
                colors={personality.gradient}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.avatar}>{personality.avatar}</Text>
                  <Text style={styles.personalityName}>{personality.name}</Text>
                  <Text style={styles.personalityTitle}>{personality.title}</Text>
                  <Text style={styles.description}>{personality.description}</Text>
                  
                  <View style={styles.traitsContainer}>
                    {personality.traits.map((trait, idx) => (
                      <View key={idx} style={styles.traitBadge}>
                        <Text style={styles.traitText}>{trait}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.teachingStyleContainer}>
                    <Text style={styles.teachingStyleLabel}>Teaching Style:</Text>
                    <Text style={styles.teachingStyle}>{personality.teachingStyle}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.selectButton,
                      selectedId === personality.id && styles.selectedButton,
                    ]}
                    onPress={() => handleSelect(personality)}
                  >
                    <Text style={styles.selectButtonText}>
                      {selectedId === personality.id ? 'Selected' : 'Choose Coach'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LG>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.pagination}>
        {AI_PERSONALITIES.map((_, index) => {
          const inputRange = [
            (index - 1) * (cardWidth + cardMargin),
            index * (cardWidth + cardMargin),
            (index + 1) * (cardWidth + cardMargin),
          ];

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
                styles.paginationDot,
                {
                  width: dotWidth,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Maybe Later</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  title: { ...theme.typography.titleLarge, color: theme.colors.text.primary, fontWeight: '700' },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: '#aaa',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  footer: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: (Dimensions.get('window').width * 0.1) / 2,
  },
  card: {
    height: 500,
    marginHorizontal: 10,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.elevation[4],
  },
  cardGradient: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    fontSize: 80,
    marginBottom: theme.spacing.md,
  },
  personalityName: {
    ...theme.typography.headlineMedium,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  personalityTitle: {
    ...theme.typography.titleMedium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing.lg,
  },
  description: {
    ...theme.typography.bodyLarge,
    color: 'white',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  traitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    margin: theme.spacing.xs,
  },
  traitText: {
    ...theme.typography.labelMedium,
    color: 'white',
    fontWeight: '600',
  },
  teachingStyleContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  teachingStyleLabel: {
    ...theme.typography.labelLarge,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.xs,
  },
  teachingStyle: {
    ...theme.typography.bodyMedium,
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  selectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    minWidth: 150,
  },
  selectedButton: {
    backgroundColor: 'white',
  },
  selectButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary.main,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary.main,
    marginHorizontal: 4,
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
  },
  closeButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.text.secondary,
  },
});