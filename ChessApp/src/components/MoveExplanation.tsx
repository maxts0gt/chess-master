import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';

interface MoveExplanationProps {
  move: string;
  piece: string;
  type: string;
  explanation: string;
  learningPoints: string[];
  strategicValue: string;
  threats?: string[];
  opportunities?: string[];
  isAIMove?: boolean;
  explanationType?: 'ai' | 'rule-based' | 'tiny-llm';
}

const MoveExplanation: React.FC<MoveExplanationProps> = ({
  move,
  piece,
  type,
  explanation,
  learningPoints,
  strategicValue,
  threats = [],
  opportunities = [],
  isAIMove = false,
  explanationType = 'rule-based',
}) => {
  const [expanded, setExpanded] = useState(true);
  const animatedHeight = useState(new Animated.Value(1))[0];

  const toggleExpanded = () => {
    Animated.timing(animatedHeight, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.container, isAIMove && styles.aiMoveContainer]}>
      <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.moveInfo}>
            <Text style={styles.moveNotation}>{move}</Text>
            <Text style={styles.pieceType}>{piece}</Text>
          </View>
          <View style={styles.headerRight}>
            {explanationType === 'ai' && (
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI Teacher</Text>
              </View>
            )}
            {explanationType === 'tiny-llm' && (
              <View style={[styles.aiBadge, styles.tinyLLMBadge]}>
                <Text style={styles.aiBadgeText}>AI Lite</Text>
              </View>
            )}
            <Text style={styles.strategicValue}>{strategicValue}</Text>
            <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.content,
          {
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
            opacity: animatedHeight,
          },
        ]}
      >
        <Text style={styles.explanation}>{explanation}</Text>

        {learningPoints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Learning Points</Text>
            {learningPoints.map((point, index) => (
              <Text key={index} style={styles.learningPoint}>
                {point}
              </Text>
            ))}
          </View>
        )}

        {threats.length > 0 && (
          <View style={[styles.section, styles.threatsSection]}>
            <Text style={styles.sectionTitle}>⚠️ Watch Out!</Text>
            {threats.map((threat, index) => (
              <Text key={index} style={styles.threat}>
                {threat}
              </Text>
            ))}
          </View>
        )}

        {opportunities.length > 0 && (
          <View style={[styles.section, styles.opportunitiesSection]}>
            <Text style={styles.sectionTitle}>💡 Opportunities</Text>
            {opportunities.map((opportunity, index) => (
              <Text key={index} style={styles.opportunity}>
                {opportunity}
              </Text>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiMoveContainer: {
    backgroundColor: '#1e3a8a',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moveInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  moveNotation: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  pieceType: {
    fontSize: 14,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  strategicValue: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 12,
    color: '#64748b',
  },
  content: {
    overflow: 'hidden',
  },
  explanation: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
    marginTop: 12,
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  learningPoint: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  threatsSection: {
    borderTopColor: '#dc2626',
  },
  threat: {
    fontSize: 14,
    color: '#fca5a5',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  opportunitiesSection: {
    borderTopColor: '#10b981',
  },
  opportunity: {
    fontSize: 14,
    color: '#86efac',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  aiBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tinyLLMBadge: {
    backgroundColor: '#06b6d4',
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MoveExplanation;