/**
 * Premium AI Coach Screen
 * Beautiful upgrade screen for $9.99 one-time purchase
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { premiumService } from '../services/premiumService';
import { theme } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: '🧠',
    title: 'AI Grandmaster Coach',
    description: '2700+ rated AI explains every move in plain English',
  },
  {
    icon: '✈️',
    title: 'Works Offline Forever',
    description: 'No internet needed after download - perfect for travel',
  },
  {
    icon: '♾️',
    title: 'Unlimited Analysis',
    description: 'Analyze all your games with no limits or restrictions',
  },
  {
    icon: '🎯',
    title: 'Personalized Training',
    description: 'AI adapts to your playing style and weaknesses',
  },
  {
    icon: '💬',
    title: 'Natural Conversations',
    description: 'Ask questions and get explanations like a real coach',
  },
  {
    icon: '🔒',
    title: 'Complete Privacy',
    description: 'Your data never leaves your device - ever',
  },
];

const TESTIMONIALS = [
  {
    rating: '⭐⭐⭐⭐⭐',
    text: 'Better than paying $50/hour for coaching!',
    author: 'ChessPlayer2024',
  },
  {
    rating: '⭐⭐⭐⭐⭐',
    text: 'The AI explains concepts I never understood before',
    author: 'QueenGambit88',
  },
  {
    rating: '⭐⭐⭐⭐⭐',
    text: 'Worth every penny - improved 200 rating points!',
    author: 'KnightRider',
  },
];

export const PremiumScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [premiumState, setPremiumState] = useState(premiumService.getState());
  const [productInfo, setProductInfo] = useState<{ price: string; description: string } | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Initialize premium service
    initializePremium();
    
    // Subscribe to state changes
    const unsubscribe = premiumService.subscribe(setPremiumState);
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for CTA button
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
    
    return unsubscribe;
  }, []);
  
  const initializePremium = async () => {
    await premiumService.initialize();
    const info = premiumService.getAICoachProduct();
    setProductInfo(info);
  };
  
  const handlePurchase = async () => {
    setLoading(true);
    const success = await premiumService.purchaseAICoach();
    setLoading(false);
    
    if (success) {
      // Close screen after successful purchase
      setTimeout(onClose, 2000);
    }
  };
  
  const handleRestore = async () => {
    setLoading(true);
    await premiumService.restorePurchases();
    setLoading(false);
  };
  
  if (premiumState.hasAICoach && premiumState.isModelDownloaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>AI Coach Active!</Text>
          <Text style={styles.successMessage}>
            Your AI coach is ready to help you improve
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Start Playing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  if (premiumState.hasAICoach && premiumState.downloadProgress > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.downloadContainer}>
          <Text style={styles.downloadTitle}>Downloading AI Coach...</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${premiumState.downloadProgress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(premiumState.downloadProgress * 100)}%
          </Text>
          <Text style={styles.downloadTip}>
            Connect to WiFi for faster download
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.aiIcon}>🤖</Text>
          <Text style={styles.title}>Unlock AI Chess Coach</Text>
          <Text style={styles.subtitle}>
            Your personal grandmaster, available 24/7
          </Text>
        </Animated.View>
        
        {/* Price Badge */}
        <Animated.View
          style={[
            styles.priceBadge,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.priceText}>
            {productInfo?.price || '$9.99'}
          </Text>
          <Text style={styles.priceSubtext}>One-time payment</Text>
          <Text style={styles.priceComparison}>
            vs. Chess.com: $168/year
          </Text>
        </Animated.View>
        
        {/* Features */}
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={index}
              style={[
                styles.featureCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50 * (index % 2 === 0 ? -1 : 1), 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
        
        {/* Testimonials */}
        <View style={styles.testimonialsContainer}>
          <Text style={styles.testimonialsTitle}>What Players Say</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialsScroll}
          >
            {TESTIMONIALS.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <Text style={styles.testimonialRating}>
                  {testimonial.rating}
                </Text>
                <Text style={styles.testimonialText}>
                  "{testimonial.text}"
                </Text>
                <Text style={styles.testimonialAuthor}>
                  - {testimonial.author}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
        
        {/* Value Props */}
        <View style={styles.valueContainer}>
          <View style={styles.valueItem}>
            <Text style={styles.valueNumber}>∞</Text>
            <Text style={styles.valueLabel}>Unlimited Sessions</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueNumber}>24/7</Text>
            <Text style={styles.valueLabel}>Always Available</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueNumber}>0</Text>
            <Text style={styles.valueLabel}>Internet Required</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* CTA Section */}
      <View style={styles.ctaContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={handlePurchase}
            disabled={loading}
          >
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.purchaseGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.purchaseButtonText}>
                    Get AI Coach - {productInfo?.price || '$9.99'}
                  </Text>
                  <Text style={styles.purchaseButtonSubtext}>
                    One-time purchase • Lifetime access
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading}
        >
          <Text style={styles.restoreButtonText}>Restore Purchase</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  closeIcon: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  closeText: {
    fontSize: 24,
    color: theme.colors.text.secondary,
  },
  aiIcon: {
    fontSize: 80,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...(theme.typography.headlineLarge as any),
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...(theme.typography.bodyLarge as any),
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontWeight: '400'
  },
  priceBadge: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary.main + '10',
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  priceText: {
    ...theme.typography.displayMedium,
    color: theme.colors.primary.main,
    fontWeight: '700',
  },
  priceSubtext: {
    ...theme.typography.titleMedium,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
    fontWeight: '500'
  },
  priceComparison: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    fontWeight: '400'
  },
  featuresContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface.elevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.elevation[1],
  },
  featureIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...(theme.typography.titleMedium as any),
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontWeight: '600'
  },
  featureDescription: {
    ...(theme.typography.bodyMedium as any),
    color: theme.colors.text.secondary,
    fontWeight: '400'
  },
  testimonialsContainer: {
    marginTop: theme.spacing.xl,
  },
  testimonialsTitle: {
    ...(theme.typography.headlineSmall as any),
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  testimonialsScroll: {
    paddingHorizontal: theme.spacing.lg,
  },
  testimonialCard: {
    backgroundColor: theme.colors.surface.elevated,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    width: screenWidth * 0.8,
    ...theme.elevation[1],
  },
  testimonialRating: {
    fontSize: 16,
    marginBottom: theme.spacing.sm,
  },
  testimonialText: {
    ...(theme.typography.bodyLarge as any),
    color: theme.colors.text.primary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
  },
  testimonialAuthor: {
    ...(theme.typography.bodyMedium as any),
    color: theme.colors.text.secondary,
    fontWeight: '400'
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  valueItem: {
    alignItems: 'center',
  },
  valueNumber: {
    ...(theme.typography.headlineLarge as any),
    color: theme.colors.primary.main,
    fontWeight: '700',
  },
  valueLabel: {
    ...(theme.typography.labelMedium as any),
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500'
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background.default,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.elevation[3],
  },
  purchaseButton: {
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  purchaseGradient: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  purchaseButtonText: {
    ...(theme.typography.titleLarge as any),
    color: 'white',
    fontWeight: '700',
  },
  purchaseButtonSubtext: {
    ...(theme.typography.bodyMedium as any),
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: theme.spacing.xs,
    fontWeight: '400'
  },
  restoreButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  restoreButtonText: {
    ...(theme.typography.labelLarge as any),
    color: theme.colors.primary.main,
    fontWeight: '600'
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: theme.spacing.lg,
  },
  successTitle: {
    ...(theme.typography.headlineLarge as any),
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontWeight: '700'
  },
  successMessage: {
    ...(theme.typography.bodyLarge as any),
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontWeight: '400'
  },
  closeButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  closeButtonText: {
    ...(theme.typography.labelLarge as any),
    color: 'white',
    fontWeight: '700',
  },
  downloadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  downloadTitle: {
    ...(theme.typography.headlineMedium as any),
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    fontWeight: '700'
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: theme.colors.surface.container,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.main,
  },
  progressText: {
    ...(theme.typography.titleLarge as any),
    color: theme.colors.text.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  downloadTip: {
    ...(theme.typography.bodyMedium as any),
    color: theme.colors.text.secondary,
    fontWeight: '400'
  },
  paywallTitle: { color: theme.colors.text.primary, textAlign: 'center', fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: 0.3 },
  paywallSubtitle: { color: theme.colors.text.secondary, textAlign: 'center', fontSize: 14, lineHeight: 18, fontWeight: '400', letterSpacing: 0.2 },
  ctaText: { color: theme.colors.primary.contrast, fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center' },
  restoreText: { color: theme.colors.text.secondary, textAlign: 'center', fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.2 },
  sectionTitle: { color: theme.colors.text.primary, fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: 0.2 },
});