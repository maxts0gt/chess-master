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
import { LinearGradient } from 'expo-linear-gradient';
import ChessBoard from '../components/ChessBoard';
import { Chess } from 'chess.js';
import { ChessMultiAgentSystem } from '../agents/ChessAgentSystem';
import { ollamaService } from '../services/ollamaService';
import * as Haptics from 'expo-haptics';

interface AICoachingScreenProps {
  navigation: any;
}

interface AnalysisResult {
  source: 'multiagent' | 'ollama';
  type: string;
  content: any;
  timestamp: Date;
}

const AICoachingScreen: React.FC<AICoachingScreenProps> = ({ navigation }) => {
  const [chess] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState(chess.fen());
  const [multiAgentSystem] = useState(new ChessMultiAgentSystem());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['tactical', 'positional']);
  const [userQuestion, setUserQuestion] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');

  useEffect(() => {
    checkOllamaAvailability();
  }, []);

  const checkOllamaAvailability = async () => {
    const available = await ollamaService.checkAvailability();
    setOllamaAvailable(available);
    
    if (available) {
      // Pull required models if not available
      const models = ['llama3.2:latest'];
      for (const model of models) {
        if (!ollamaService.isModelAvailable(model)) {
          Alert.alert(
            'Download Model',
            `Would you like to download ${model} for enhanced AI analysis?`,
            [
              { text: 'No', style: 'cancel' },
              { 
                text: 'Yes', 
                onPress: async () => {
                  await ollamaService.pullModel(model);
                }
              },
            ]
          );
        }
      }
    }
  };

  const handleMove = async (move: any) => {
    try {
      const result = chess.move(move);
      if (result) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBoardPosition(chess.fen());
        setMoveHistory([...moveHistory, result.san]);
        
        // Automatically analyze after each move
        analyzeMove(result.san);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const analyzePosition = async () => {
    setIsAnalyzing(true);
    const results: AnalysisResult[] = [];

    try {
      // Multi-agent analysis
      const multiAgentAnalysis = await multiAgentSystem.analyzePosition(
        boardPosition,
        moveHistory
      );
      
      results.push({
        source: 'multiagent',
        type: 'comprehensive',
        content: multiAgentAnalysis,
        timestamp: new Date(),
      });

      // Ollama analysis if available
      if (ollamaAvailable) {
        const ollamaAnalysis = await ollamaService.analyzeChessPosition({
          position: boardPosition,
          gameHistory: moveHistory,
          analysisType: 'position',
        });

        if (ollamaAnalysis) {
          results.push({
            source: 'ollama',
            type: 'position',
            content: ollamaAnalysis,
            timestamp: new Date(),
          });
        }

        // Multi-agent Ollama analysis
        const agentResults = await ollamaService.multiAgentAnalysis(
          boardPosition,
          selectedAgents
        );

        agentResults.forEach((analysis, agent) => {
          results.push({
            source: 'ollama',
            type: `agent-${agent}`,
            content: analysis,
            timestamp: new Date(),
          });
        });
      }

      setAnalysisResults([...results, ...analysisResults]);
    } catch (error) {
      Alert.alert('Analysis Error', 'Failed to analyze position');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeMove = async (move: string) => {
    if (!ollamaAvailable) return;

    try {
      const analysis = await ollamaService.analyzeChessPosition({
        position: boardPosition,
        move,
        gameHistory: moveHistory,
        analysisType: 'move',
      });

      if (analysis) {
        setAnalysisResults([{
          source: 'ollama',
          type: 'move',
          content: {
            move,
            ...analysis,
          },
          timestamp: new Date(),
        }, ...analysisResults]);
      }
    } catch (error) {
      console.error('Move analysis error:', error);
    }
  };

  const askQuestion = async () => {
    if (!userQuestion.trim() || !ollamaAvailable) return;

    setStreamingResponse('');
    const prompt = `
    Chess position (FEN: ${boardPosition})
    Move history: ${moveHistory.join(' ')}
    
    Question: ${userQuestion}
    
    Please provide a detailed chess-focused answer.
    `;

    try {
      await ollamaService.streamAnalysis(prompt, (chunk) => {
        setStreamingResponse(prev => prev + chunk);
      });

      setAnalysisResults([{
        source: 'ollama',
        type: 'question',
        content: {
          question: userQuestion,
          answer: streamingResponse,
        },
        timestamp: new Date(),
      }, ...analysisResults]);

      setUserQuestion('');
    } catch (error) {
      Alert.alert('Error', 'Failed to get answer');
    }
  };

  const renderAnalysisResult = (result: AnalysisResult, index: number) => {
    return (
      <View key={index} style={styles.analysisCard}>
        <View style={styles.analysisHeader}>
          <Text style={styles.analysisSource}>
            {result.source === 'multiagent' ? '🤖 Multi-Agent' : '🦙 Ollama'}
          </Text>
          <Text style={styles.analysisType}>{result.type}</Text>
        </View>
        
        {result.type === 'comprehensive' && (
          <View style={styles.comprehensiveAnalysis}>
            {result.content.position && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Position Evaluation</Text>
                <Text style={styles.sectionContent}>
                  Score: {result.content.position.evaluation?.score || 'N/A'}
                </Text>
                <Text style={styles.sectionContent}>
                  {result.content.position.evaluation?.summary}
                </Text>
              </View>
            )}
            
            {result.content.tactics && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tactical Analysis</Text>
                {result.content.tactics.tactics?.map((tactic: any, i: number) => (
                  <Text key={i} style={styles.tacticItem}>
                    • {tactic.type}: {tactic.description}
                  </Text>
                ))}
              </View>
            )}
            
            {result.content.opening && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Opening</Text>
                <Text style={styles.sectionContent}>
                  {result.content.opening.opening?.name} ({result.content.opening.opening?.eco})
                </Text>
              </View>
            )}
          </View>
        )}
        
        {(result.type === 'position' || result.type === 'move' || result.type.startsWith('agent-')) && (
          <Text style={styles.analysisText}>
            {result.content.analysis || result.content.answer}
          </Text>
        )}
        
        {result.type === 'question' && (
          <View>
            <Text style={styles.questionText}>Q: {result.content.question}</Text>
            <Text style={styles.analysisText}>A: {result.content.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  const toggleAgent = (agent: string) => {
    if (selectedAgents.includes(agent)) {
      setSelectedAgents(selectedAgents.filter(a => a !== agent));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🤖 AI Chess Coach</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: '#10b981' }]} />
            <Text style={styles.statusText}>Multi-Agent: Active</Text>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: ollamaAvailable ? '#10b981' : '#ef4444' }
            ]} />
            <Text style={styles.statusText}>
              Ollama: {ollamaAvailable ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.boardContainer}>
          <ChessBoard
            position={boardPosition}
            onMove={handleMove}
          />
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]}
            onPress={analyzePosition}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>🔍 Analyze Position</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              chess.reset();
              setBoardPosition(chess.fen());
              setMoveHistory([]);
              setAnalysisResults([]);
            }}
          >
            <Text style={styles.buttonText}>🔄 Reset Board</Text>
          </TouchableOpacity>
        </View>

        {ollamaAvailable && (
          <>
            <View style={styles.agentSelector}>
              <Text style={styles.agentSelectorTitle}>Select AI Agents:</Text>
              <View style={styles.agentButtons}>
                {['tactical', 'positional', 'opening', 'endgame', 'psychological'].map(agent => (
                  <TouchableOpacity
                    key={agent}
                    style={[
                      styles.agentButton,
                      selectedAgents.includes(agent) && styles.selectedAgentButton
                    ]}
                    onPress={() => toggleAgent(agent)}
                  >
                    <Text style={[
                      styles.agentButtonText,
                      selectedAgents.includes(agent) && styles.selectedAgentButtonText
                    ]}>
                      {agent.charAt(0).toUpperCase() + agent.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.questionContainer}>
              <TextInput
                style={styles.questionInput}
                placeholder="Ask a chess question..."
                placeholderTextColor="#64748b"
                value={userQuestion}
                onChangeText={setUserQuestion}
                multiline
              />
              <TouchableOpacity
                style={styles.askButton}
                onPress={askQuestion}
              >
                <Text style={styles.buttonText}>Ask AI</Text>
              </TouchableOpacity>
            </View>

            {streamingResponse && (
              <View style={styles.streamingContainer}>
                <Text style={styles.streamingText}>{streamingResponse}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Analysis History</Text>
          {analysisResults.length === 0 ? (
            <Text style={styles.noResults}>
              Make moves or tap "Analyze Position" to see AI insights
            </Text>
          ) : (
            analysisResults.map((result, index) => renderAnalysisResult(result, index))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    gap: 10,
  },
  analyzeButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#64748b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  agentSelector: {
    marginBottom: 20,
  },
  agentSelectorTitle: {
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 10,
  },
  agentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  agentButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedAgentButton: {
    backgroundColor: '#3b82f6',
  },
  agentButtonText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  selectedAgentButtonText: {
    color: '#ffffff',
  },
  questionContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  questionInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 50,
  },
  askButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10,
  },
  streamingContainer: {
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  streamingText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 15,
  },
  noResults: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  analysisCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  analysisSource: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  analysisType: {
    color: '#64748b',
    fontSize: 14,
  },
  comprehensiveAnalysis: {
    gap: 15,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionContent: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  tacticItem: {
    color: '#cbd5e1',
    fontSize: 14,
    marginLeft: 10,
    marginTop: 5,
  },
  analysisText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  questionText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default AICoachingScreen;