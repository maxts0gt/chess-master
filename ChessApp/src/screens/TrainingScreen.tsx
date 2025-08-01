import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAPI, CoachingPersonality, TrainingPlan } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TrainingScreenProps {
  navigation: any;
}

const TrainingScreen: React.FC<TrainingScreenProps> = ({navigation}) => {
  const [personalities, setPersonalities] = useState<CoachingPersonality[]>([]);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('tactical');
  
  const api = useAPI();
  const { user } = useAuth();

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      setLoading(true);
      const [personalitiesData, planData] = await Promise.all([
        api.getCoachingPersonalities(),
        api.getTrainingPlan(),
      ]);
      
      setPersonalities(personalitiesData);
      setTrainingPlan(planData);
    } catch (error) {
      console.error('Error loading training data:', error);
      Alert.alert(
        'Connection Error',
        'Unable to load training data. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const startDeathmatch = async (agentId: string) => {
    try {
      setLoading(true);
      const session = await api.startDeathmatchSession('intermediate');
      
      Alert.alert(
        'Deathmatch Started!',
        `Training session with ${personalities.find(p => p.id === agentId)?.name} has begun!`,
        [
          {
            text: 'Begin Training',
            onPress: () => {
              // Navigate to training session screen
              navigation.navigate('DeathmatchSession', {
                sessionId: session.session_id,
                agent: agentId,
                puzzles: session.puzzles,
                timeLimit: session.time_limit,
              });
            },
          }
        ]
      );
    } catch (error) {
      console.error('Error starting deathmatch:', error);
      Alert.alert(
        'Training Unavailable',
        'Unable to start training session. The feature will be available soon!',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getPuzzle = async (theme?: string) => {
    try {
      const puzzle = await api.getTacticalPuzzle(theme, 'intermediate');
      
      navigation.navigate('TacticalPuzzle', {
        puzzle,
        agent: selectedAgent,
      });
    } catch (error) {
      console.error('Error getting puzzle:', error);
      Alert.alert(
        'Puzzle Unavailable',
        'Unable to load puzzle. The feature will be available soon!',
        [{ text: 'OK' }]
      );
    }
  };

  if (loading && personalities.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Loading training modules...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚡ AI Chess Academy ⚡</Text>
        <Text style={styles.subtitle}>CS:GO-Style Chess Training</Text>
        
        {user && (
          <View style={styles.userStats}>
            <Text style={styles.statText}>
              Rating: {user.elo_rating} | Puzzles: {user.puzzles_solved}
            </Text>
          </View>
        )}
      </View>

      {trainingPlan && (
        <View style={styles.planContainer}>
          <Text style={styles.planTitle}>📊 Your Training Plan</Text>
          <Text style={styles.planText}>
            Daily puzzles: {trainingPlan.daily_puzzles}
          </Text>
          <Text style={styles.planText}>
            Difficulty: {trainingPlan.difficulty_level}
          </Text>
          <Text style={styles.planText}>
            Estimated improvement: {trainingPlan.estimated_improvement}
          </Text>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Quick Training</Text>
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => getPuzzle('tactics')}
        >
          <Text style={styles.quickButtonText}>🧩 Random Tactical Puzzle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI Coaching Personalities</Text>
        <Text style={styles.sectionSubtitle}>
          Choose your training partner:
        </Text>
        
        {personalities.map((personality) => (
          <TouchableOpacity
            key={personality.id}
            style={[
              styles.personalityButton,
              selectedAgent === personality.id && styles.selectedPersonality
            ]}
            onPress={() => setSelectedAgent(personality.id)}
            onLongPress={() => startDeathmatch(personality.id)}
          >
            <View style={styles.personalityHeader}>
              <Text style={styles.personalityEmoji}>
                {getPersonalityEmoji(personality.id)}
              </Text>
              <View style={styles.personalityInfo}>
                <Text style={styles.personalityName}>{personality.name}</Text>
                <Text style={styles.personalityDifficulty}>
                  {personality.difficulty}
                </Text>
              </View>
            </View>
            
            <Text style={styles.personalityDescription}>
              {personality.description}
            </Text>
            
            <Text style={styles.personalitySpecialization}>
              Specialization: {personality.specialization}
            </Text>
            
            <View style={styles.bestForContainer}>
              <Text style={styles.bestForTitle}>Best for:</Text>
              {personality.best_for.map((skill, index) => (
                <Text key={index} style={styles.bestForSkill}>
                  • {skill}
                </Text>
              ))}
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setSelectedAgent(personality.id)}
              >
                <Text style={styles.selectButtonText}>
                  {selectedAgent === personality.id ? '✓ Selected' : 'Select'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deathmatchButton}
                onPress={() => startDeathmatch(personality.id)}
              >
                <Text style={styles.deathmatchButtonText}>
                  🎮 Deathmatch
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.instructions}>
          💡 Tap to select an AI coach, long press or tap Deathmatch for intensive training!
        </Text>
      </View>
    </ScrollView>
  );
};

const getPersonalityEmoji = (id: string): string => {
  const emojiMap: Record<string, string> = {
    tactical: '🔥',
    positional: '🏛️',
    endgame: '🏰',
    opening: '📚',
    blitz: '⚡',
    psychology: '🧠',
  };
  return emojiMap[id] || '🤖';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 15,
  },
  userStats: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  statText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 16,
  },
  planContainer: {
    backgroundColor: '#1e293b',
    margin: 20,
    padding: 15,
    borderRadius: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  planText: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 5,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 15,
  },
  quickButton: {
    backgroundColor: '#dc2626',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  personalityButton: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPersonality: {
    borderColor: '#dc2626',
  },
  personalityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  personalityEmoji: {
    fontSize: 30,
    marginRight: 15,
  },
  personalityInfo: {
    flex: 1,
  },
  personalityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  personalityDifficulty: {
    fontSize: 12,
    color: '#94a3b8',
  },
  personalityDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 10,
  },
  personalitySpecialization: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  bestForContainer: {
    marginBottom: 15,
  },
  bestForTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 5,
  },
  bestForSkill: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  selectButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deathmatchButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  deathmatchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  instructions: {
    fontSize: 14,
    color: '#fbbf24',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TrainingScreen;