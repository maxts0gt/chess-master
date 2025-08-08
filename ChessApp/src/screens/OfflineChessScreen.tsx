/**
 * Offline Chess Screen
 * Complete chess experience with Mistral AI coaching and Stockfish analysis
 * Works 100% offline on mobile devices
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';
import { mistralChess } from '../services/mistralService';
import { offlineStockfish } from '../services/offlineStockfishService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Move {
  from: string;
  to: string;
  san: string;
  fen: string;
  evaluation?: number;
  aiComment?: string;
}

export const OfflineChessScreen: React.FC = () => {
  // Game state
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [moves, setMoves] = useState<Move[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  
  // AI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [mistralReady, setMistralReady] = useState(false);
  const [stockfishReady, setStockfishReady] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  
  // UI state
  const [showMoveList, setShowMoveList] = useState(true);
  const [engineStrength, setEngineStrength] = useState(15); // 0-20
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Initialize AI engines
  useEffect(() => {
    initializeEngines();
  }, []);

  const initializeEngines = async () => {
    try {
      // Initialize Mistral
      await mistralChess.initialize('mistral-3b-chess');
      setMistralReady(true);
      
      // Initialize Stockfish
      await offlineStockfish.initialize();
      offlineStockfish.setStrength(engineStrength);
      setStockfishReady(true);
      
      // Show ready animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to initialize engines:', error);
    }
  };

  // Handle square selection
  const handleSquarePress = useCallback((square: string) => {
    if (selectedSquare === null) {
      const piece = chess.get(square as Square);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
        const moves = chess.moves({ square: square as Square, verbose: true } as any) as any[];
        setLegalMoves(moves.map(m => m.to));
      }
    } else {
      if (legalMoves.includes(square)) {
        makeMove(selectedSquare, square);
      }
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [selectedSquare, legalMoves, chess]);

  const makeMove = async (from: string, to: string) => {
    const move = chess.move({ from, to, promotion: 'q' });
    if (move) {
      const newFen = chess.fen();
      setFen(newFen);
      
      // Store move
      const moveData: Move = {
        from,
        to,
        san: move.san,
        fen: newFen,
      };
      
      setMoves(prev => [...prev, moveData]);
      
      // Auto-analyze if enabled
      if (autoAnalyze && stockfishReady && mistralReady) {
        analyzePosition(newFen, move.san);
      }
      
      // Check game end
      if (chess.isGameOver()) {
        handleGameEnd();
      } else if (chess.turn() === 'b') {
        // AI move
        setTimeout(() => makeAIMove(), 500);
      }
    }
  };

  const makeAIMove = async () => {
    if (!stockfishReady) return;
    
    setIsAnalyzing(true);
    
    try {
      // Get best move from Stockfish
      const bestMove = await offlineStockfish.getBestMove(chess.fen(), 1000);
      
      // Parse and make the move
      const from = bestMove.substring(0, 2);
      const to = bestMove.substring(2, 4);
      const promotion = bestMove.substring(4, 5) || undefined;
      
      const move = chess.move({ from, to, promotion });
      if (move) {
        const newFen = chess.fen();
        setFen(newFen);
        
        // Get AI commentary from Mistral
        const comment = await mistralChess.explainMove(
          chess.fen(),
          move.san,
          1500
        );
        
        const moveData: Move = {
          from,
          to,
          san: move.san,
          fen: newFen,
          aiComment: comment,
        };
        
        setMoves(prev => [...prev, moveData]);
      }
    } catch (error) {
      console.error('AI move failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzePosition = async (fen: string, lastMove: string) => {
    setIsAnalyzing(true);
    
    try {
      // Get both engine evaluation and AI analysis
      const [stockfishEval, mistralAnalysis] = await Promise.all([
        offlineStockfish.evaluatePosition(fen),
        mistralChess.analyzePosition(fen, lastMove, 1500)
      ]);
      
      setCurrentAnalysis({
        ...mistralAnalysis,
        evaluation: stockfishEval,
      });
      
      // Update last move with evaluation
      setMoves(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].evaluation = stockfishEval;
        }
        return updated;
      });
      
      // Save analysis for offline access
      await mistralChess.saveAnalysisHistory(mistralAnalysis, fen);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGameEnd = () => {
    let result = '';
    if (chess.isCheckmate()) {
      result = chess.turn() === 'w' ? 'Black wins!' : 'White wins!';
    } else if (chess.isDraw()) {
      result = 'Draw!';
    }
    
    // Show result
    // You can add a nice modal here
    console.log('Game ended:', result);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !mistralReady) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    
    // Get AI response
    try {
      let response = '';
      
      if (userMessage.toLowerCase().includes('opening')) {
        response = await mistralChess.getOpeningAdvice(
          chess.fen(),
          moves.map(m => m.san)
        );
      } else if (userMessage.toLowerCase().includes('hint') || userMessage.toLowerCase().includes('tactic')) {
        response = await mistralChess.getTacticalHint(chess.fen(), 'general');
      } else {
        // General position question
        const analysis = await mistralChess.analyzePosition(chess.fen(), null, 1500);
        response = analysis.explanation;
      }
      
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        text: 'Sorry, I had trouble analyzing that. Please try again.' 
      }]);
    }
  };

  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setMoves([]);
    setCurrentAnalysis(null);
    setChatHistory([]);
  };

  const undoMove = () => {
    chess.undo();
    chess.undo(); // Undo both player and AI move
    setFen(chess.fen());
    setMoves(prev => prev.slice(0, -2));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Offline Chess Master</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, mistralReady && styles.statusActive]} />
          <Text style={styles.statusText}>Mistral AI</Text>
          <View style={[styles.statusIndicator, stockfishReady && styles.statusActive]} />
          <Text style={styles.statusText}>Stockfish</Text>
        </View>
      </View>

      {/* Chess Board */}
      <Animated.View style={[styles.boardContainer, { opacity: fadeAnim }]}>
        <ChessBoard
          fen={fen}
          onMove={(move: any) => {
            // assuming move contains from/to
            if (move && move.from && move.to) {
              makeMove(move.from, move.to);
            }
          }}
          playable={true}
          showCoordinates={true}
        />
      </Animated.View>

      {/* Analysis Panel */}
      {currentAnalysis && (
        <View style={styles.analysisPanel}>
          <Text style={styles.evaluationText}>
            Eval: {currentAnalysis.evaluation > 0 ? '+' : ''}{currentAnalysis.evaluation.toFixed(2)}
          </Text>
          {/* Detailed analysis text */}
          <Text style={styles.analysisText}>{String(currentAnalysis.evaluation)}</Text>
          <ScrollView horizontal style={styles.bestMovesRow}>
            {currentAnalysis.bestMoves.map((move: string, idx: number) => (
              <TouchableOpacity key={idx} style={styles.moveChip}>
                <Text style={styles.moveChipText}>{move}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={undoMove}>
          <Text style={styles.controlButtonText}>↶ Undo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={resetGame}>
          <Text style={styles.controlButtonText}>⟲ New</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, autoAnalyze && styles.activeButton]} 
          onPress={() => setAutoAnalyze(!autoAnalyze)}
        >
          <Text style={styles.controlButtonText}>🔍 Auto</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => setShowAIChat(true)}
        >
          <Text style={styles.controlButtonText}>💬 Ask</Text>
        </TouchableOpacity>
      </View>

      {/* Move List */}
      {showMoveList && (
        <ScrollView style={styles.moveList}>
          {moves.map((move, idx) => (
            <View key={idx} style={styles.moveItem}>
              <Text style={styles.moveNumber}>{Math.floor(idx / 2) + 1}.</Text>
              <Text style={styles.moveText}>{move.san}</Text>
              {move.evaluation !== undefined && (
                <Text style={[
                  styles.moveEval,
                  move.evaluation > 0.3 && styles.goodMove,
                  move.evaluation < -0.3 && styles.badMove
                ]}>
                  {move.evaluation > 0 ? '+' : ''}{move.evaluation.toFixed(1)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* AI Chat Modal */}
      <Modal
        visible={showAIChat}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAIChat(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.chatModal}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Ask Mistral Chess Coach</Text>
              <TouchableOpacity onPress={() => setShowAIChat(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.chatHistory}>
              {chatHistory.map((msg, idx) => (
                <View key={idx} style={[
                  styles.chatMessage,
                  msg.role === 'user' ? styles.userMessage : styles.aiMessage
                ]}>
                  <Text style={styles.chatMessageText}>{msg.text}</Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about the position..."
                placeholderTextColor="#666"
                onSubmitEditing={handleChatSubmit}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleChatSubmit}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading Indicator */}
      {isAnalyzing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Analyzing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginHorizontal: 5,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#64748b',
    fontSize: 12,
    marginRight: 10,
  },
  boardContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  analysisPanel: {
    backgroundColor: '#1e293b',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  evaluationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  analysisText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  bestMovesRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  moveChip: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  moveChipText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  controlButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#3b82f6',
  },
  controlButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  moveList: {
    flex: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  moveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moveNumber: {
    color: '#64748b',
    fontSize: 14,
    width: 30,
  },
  moveText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  moveEval: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 10,
  },
  goodMove: {
    color: '#10b981',
  },
  badMove: {
    color: '#ef4444',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatModal: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.7,
    padding: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  closeButton: {
    fontSize: 24,
    color: '#64748b',
  },
  chatHistory: {
    flex: 1,
    marginBottom: 20,
  },
  chatMessage: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
  },
  chatMessageText: {
    color: '#f8fafc',
    fontSize: 14,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sendButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#f8fafc',
    marginTop: 10,
    fontSize: 16,
  },
});