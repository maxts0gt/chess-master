/**
 * Coach View Component
 * Displays AI coaching explanations with typewriter effect
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { coach } from '../services/coachService';
import { purchaseService } from '../services/purchaseService';
import { ProUpgradeModal } from './ProUpgradeModal';

interface CoachViewProps {
  fen: string;
  lastMove: string | null;
  onBack: () => void;
}

export const CoachView: React.FC<CoachViewProps> = ({ fen, lastMove, onBack }) => {
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [isProUnlocked, setIsProUnlocked] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);

  useEffect(() => {
    // Check Pro status on mount
    checkProStatus();
  }, []);

  useEffect(() => {
    if (lastMove) {
      explainLastMove();
    } else {
      getGeneralTips();
    }
  }, [lastMove, fen]);

  const checkProStatus = async () => {
    await purchaseService.initialize();
    setIsProUnlocked(purchaseService.isProUnlocked());
  };

  const explainLastMove = async () => {
    if (!lastMove) return;
    
    // Check if user has Pro or free questions remaining
    if (!isProUnlocked && questionsAsked >= 3) {
      setShowUpgradeModal(true);
      return;
    }
    
    setIsLoading(true);
    setExplanation('');
    
    // Increment questions asked if not Pro
    if (!isProUnlocked) {
      setQuestionsAsked(prev => prev + 1);
    }
    
    try {
      // Stream explanation with typewriter effect
      for await (const token of coach.explainMove(fen, lastMove)) {
        setExplanation(prev => prev + token);
      }
    } catch (error) {
      console.error('Coach error:', error);
      setExplanation('Unable to analyze this move right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGeneralTips = async () => {
    try {
      const positionTips = await coach.getPositionTips(fen);
      setTips(positionTips);
    } catch (error) {
      console.error('Tips error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.coachIcon}>🎓</Text>
        <Text style={styles.title}>Chess Coach</Text>
        {isProUnlocked ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        ) : (
          <View style={styles.freeCounter}>
            <Text style={styles.freeCounterText}>
              {3 - questionsAsked} free questions left
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {lastMove ? (
          <View style={styles.explanationBox}>
            <Text style={styles.moveLabel}>Analyzing: {lastMove}</Text>
            {isLoading && !explanation && (
              <ActivityIndicator color="#2196F3" style={styles.loader} />
            )}
            <Text style={styles.explanation}>{explanation}</Text>
          </View>
        ) : (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Position Tips</Text>
            {tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {coach.isAvailable() 
            ? 'AI Coach powered by Mistral 7B' 
            : 'Coach loading...'}
        </Text>
      </View>

      <ProUpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onPurchaseComplete={() => {
          setIsProUnlocked(true);
          setQuestionsAsked(0);
          checkProStatus();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backText: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    marginTop: 100,
    alignItems: 'center',
    marginBottom: 30,
  },
  coachIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  proBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  proBadgeText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  freeCounter: {
    marginTop: 8,
  },
  freeCounterText: {
    color: '#999',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  explanationBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    minHeight: 150,
  },
  moveLabel: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  explanation: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 28,
    fontFamily: 'System',
  },
  loader: {
    marginVertical: 20,
  },
  tipsBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
  },
  tipsTitle: {
    color: '#2196F3',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tipBullet: {
    color: '#2196F3',
    fontSize: 18,
    marginRight: 10,
  },
  tipText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
});