import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useAPI, ChessAnalysis, AICoachingResponse, MoveSuggestions } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChessBoard from '../components/ChessBoard';

interface GameScreenProps {
  navigation: any;
}

const GameScreen: React.FC<GameScreenProps> = ({navigation}) => {
  const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [analysis, setAnalysis] = useState<ChessAnalysis | null>(null);
  const [aiCoaching, setAiCoaching] = useState<AICoachingResponse | null>(null);
  const [moveSuggestions, setMoveSuggestions] = useState<MoveSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('tactical');
  const [gameId, setGameId] = useState<string | null>(null);
  
  const api = useAPI();
  const { user } = useAuth();

  useEffect(() => {
    // Load initial position
    analyzeCurrentPosition();
  }, []);

  const analyzeCurrentPosition = async () => {
    try {
      setLoading(true);
      const [analysisResult, coachingResult, movesResult] = await Promise.all([
        api.analyzePosition(currentFen, 12),
        api.analyzeGameWithAI(currentFen, selectedAgent),
        api.getSuggestedMoves(currentFen, selectedAgent, 3),
      ]);
      
      setAnalysis(analysisResult);
      setAiCoaching(coachingResult);
      setMoveSuggestions(movesResult);
    } catch (error) {
      console.error('Error analyzing position:', error);
      Alert.alert(
        'Analysis Error',
        'Unable to analyze position. Please check your connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const createNewGame = async () => {
    try {
      setLoading(true);
      const game = await api.createGame();
      setGameId(game.game_id);
      setCurrentFen(game.fen);
      
      Alert.alert(
        'New Game Created!',
        `Game ID: ${game.game_id}`,
        [
          {
            text: 'Start Playing',
            onPress: () => analyzeCurrentPosition(),
          }
        ]
      );
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert(
        'Game Creation Failed',
        'Unable to create new game. Feature coming soon!',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const validateAndSetFen = async (fen: string) => {
    try {
      const validation = await api.validateFen(fen);
      if (validation.valid) {
        setCurrentFen(fen);
        analyzeCurrentPosition();
      } else {
        Alert.alert('Invalid FEN', validation.message);
      }
    } catch (error) {
      Alert.alert('Validation Error', 'Unable to validate FEN position.');
    }
  };

  const switchAgent = async (newAgent: string) => {
    setSelectedAgent(newAgent);
    try {
      setLoading(true);
      const [coachingResult, movesResult] = await Promise.all([
        api.analyzeGameWithAI(currentFen, newAgent),
        api.getSuggestedMoves(currentFen, newAgent, 3),
      ]);
      
      setAiCoaching(coachingResult);
      setMoveSuggestions(movesResult);
    } catch (error) {
      console.error('Error switching agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEvaluationColor = (evaluation: number) => {
    if (evaluation > 1) return '#22c55e'; // Green for winning
    if (evaluation > 0.5) return '#84cc16'; // Light green for advantage
    if (evaluation > -0.5) return '#eab308'; // Yellow for equal
    if (evaluation > -1) return '#f97316'; // Orange for disadvantage
    return '#ef4444'; // Red for losing
  };

  const getEvaluationText = (evaluation: number) => {
    if (evaluation > 2) return `White is winning (+${evaluation.toFixed(1)})`;
    if (evaluation > 1) return `White has a big advantage (+${evaluation.toFixed(1)})`;
    if (evaluation > 0.5) return `White is slightly better (+${evaluation.toFixed(1)})`;
    if (evaluation > -0.5) return `Position is equal (${evaluation.toFixed(1)})`;
    if (evaluation > -1) return `Black is slightly better (${evaluation.toFixed(1)})`;
    if (evaluation > -2) return `Black has a big advantage (${evaluation.toFixed(1)})`;
    return `Black is winning (${evaluation.toFixed(1)})`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>♟ Chess Master ♟</Text>
        <Text style={styles.subtitle}>AI-Powered Chess Analysis</Text>
      </View>

      <View style={styles.gameSection}>
        <ChessBoard 
          fen={currentFen}
          onMove={async (move) => {
            // Update FEN after move
            const newFen = move.after;
            setCurrentFen(newFen);
            // Auto-analyze new position
            await analyzeCurrentPosition();
          }}
          playable={true}
          showCoordinates={true}
        />
          
          {gameId && (
            <Text style={styles.gameId}>Game ID: {gameId}</Text>
          )}

        <View style={styles.fenSection}>
          <Text style={styles.fenLabel}>Current Position (FEN):</Text>
          <TextInput
            style={styles.fenInput}
            value={currentFen}
            onChangeText={setCurrentFen}
            placeholder="Enter FEN position..."
            placeholderTextColor="#64748b"
            multiline
          />
          <TouchableOpacity
            style={styles.validateButton}
            onPress={() => validateAndSetFen(currentFen)}
          >
            <Text style={styles.validateButtonText}>🔍 Analyze Position</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gameControls}>
          <TouchableOpacity style={styles.newGameButton} onPress={createNewGame}>
            <Text style={styles.newGameButtonText}>🎮 New Game</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.loadingText}>Analyzing position...</Text>
        </View>
      )}

      {analysis && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>📊 Engine Analysis</Text>
          <View style={styles.analysisCard}>
            <View style={styles.evaluationContainer}>
              <Text 
                style={[
                  styles.evaluationText,
                  { color: getEvaluationColor(analysis.evaluation) }
                ]}
              >
                {getEvaluationText(analysis.evaluation)}
              </Text>
            </View>
            
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Best Move:</Text>
              <Text style={styles.analysisValue}>{analysis.best_move}</Text>
            </View>
            
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Depth:</Text>
              <Text style={styles.analysisValue}>{analysis.depth}</Text>
            </View>
            
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Time:</Text>
              <Text style={styles.analysisValue}>{analysis.time_ms}ms</Text>
            </View>

            {analysis.tactical_patterns.length > 0 && (
              <View style={styles.patternsContainer}>
                <Text style={styles.patternsTitle}>Tactical Patterns:</Text>
                {analysis.tactical_patterns.map((pattern, index) => (
                  <Text key={index} style={styles.patternTag}>
                    {pattern}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.agentSection}>
        <Text style={styles.sectionTitle}>🤖 AI Coach: {selectedAgent}</Text>
        <View style={styles.agentButtons}>
          {['tactical', 'positional', 'endgame', 'opening', 'blitz', 'psychology'].map((agent) => (
            <TouchableOpacity
              key={agent}
              style={[
                styles.agentButton,
                selectedAgent === agent && styles.selectedAgent
              ]}
              onPress={() => switchAgent(agent)}
            >
              <Text style={styles.agentButtonText}>
                {agent.charAt(0).toUpperCase() + agent.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {aiCoaching && (
        <View style={styles.coachingSection}>
          <Text style={styles.sectionTitle}>
            💡 AI Coaching ({aiCoaching.agent_used})
          </Text>
          <View style={styles.coachingCard}>
            <Text style={styles.coachingPersonality}>
              {aiCoaching.personality} (Confidence: {(aiCoaching.confidence * 100).toFixed(0)}%)
            </Text>
            <Text style={styles.coachingAnalysis}>{aiCoaching.analysis}</Text>
            
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              {aiCoaching.suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestion}>
                  • {suggestion}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {moveSuggestions && (
        <View style={styles.movesSection}>
          <Text style={styles.sectionTitle}>
            🎯 Move Suggestions ({moveSuggestions.agent_personality})
          </Text>
          <View style={styles.movesCard}>
            <Text style={styles.movesReasoning}>{moveSuggestions.reasoning}</Text>
            
            {moveSuggestions.moves.map((move, index) => (
              <View key={index} style={styles.moveCard}>
                <View style={styles.moveHeader}>
                  <Text style={styles.moveNotation}>{move.move_notation}</Text>
                  <Text style={styles.moveEvaluation}>
                    {move.evaluation > 0 ? '+' : ''}{move.evaluation.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.moveReasoning}>{move.reasoning}</Text>
                <View style={styles.themesContainer}>
                  {move.tactical_themes.map((theme, themeIndex) => (
                    <Text key={themeIndex} style={styles.themeTag}>
                      {theme}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  gameSection: {
    margin: 20,
  },
  boardPlaceholder: {
    backgroundColor: '#1e293b',
    padding: 40,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  boardText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  boardSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  gameId: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
  },
  fenSection: {
    marginBottom: 20,
  },
  fenLabel: {
    fontSize: 14,
    color: '#f8fafc',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  fenInput: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  validateButton: {
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gameControls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  newGameButton: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 12,
    flex: 1,
  },
  newGameButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 15,
  },
  analysisSection: {
    margin: 20,
  },
  analysisCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  evaluationContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  evaluationText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  analysisLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  analysisValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  patternsContainer: {
    marginTop: 15,
  },
  patternsTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  patternTag: {
    backgroundColor: '#374151',
    color: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  agentSection: {
    margin: 20,
  },
  agentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  agentButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedAgent: {
    backgroundColor: '#dc2626',
  },
  agentButtonText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coachingSection: {
    margin: 20,
  },
  coachingCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  coachingPersonality: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  coachingAnalysis: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionsTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  suggestion: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 4,
  },
  movesSection: {
    margin: 20,
    marginBottom: 40,
  },
  movesCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  movesReasoning: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  moveCard: {
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  moveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moveNotation: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  moveEvaluation: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  moveReasoning: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 8,
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  themeTag: {
    backgroundColor: '#4b5563',
    color: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    marginRight: 4,
    marginBottom: 4,
  },
});

export default GameScreen;