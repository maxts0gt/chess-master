/**
 * Ultra-Simple Chess App
 * Two buttons: PLAY NOW and ASK COACH
 * That's it.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Chess } from 'chess.js';
import { ChessBoard } from './src/components/ChessBoard';
import { CoachView } from './src/components/CoachView';
import { PresidentialGameView } from './src/components/PresidentialGameView';
import { stockfish } from './src/services/stockfishService';
import { coach } from './src/services/coachService';
import { purchaseService } from './src/services/purchaseService';

type ViewState = 'home' | 'play' | 'coach' | 'loading' | 'presidential';

export default function App() {
  const [view, setView] = useState<ViewState>('loading');
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [isAITurn, setIsAITurn] = useState(false);
  
  // Presidential Mode states
  const [showPresidentialModal, setShowPresidentialModal] = useState(false);
  const [presidentialCode, setPresidentialCode] = useState('');
  const [isPresidentialHost, setIsPresidentialHost] = useState(false);

  // Initialize engines on startup
  useEffect(() => {
    Promise.all([
      stockfish.initialize(),
      coach.initialize()
    ]).then(() => {
      setView('home');
    }).catch(error => {
      console.error('Failed to initialize:', error);
      setView('home'); // Still show home even if init fails
    });
  }, []);

  // Handle player move
  const handleMove = async (move: any) => {
    try {
      // Update game state
      chess.move(move);
      setFen(chess.fen());
      setLastMove(move.san);

      // AI responds immediately
      if (!chess.isGameOver()) {
        setIsAITurn(true);
        const aiMove = await stockfish.getBestMove(chess.fen());
        
        // Convert UCI to move object
        const from = aiMove.substring(0, 2);
        const to = aiMove.substring(2, 4);
        const promotion = aiMove.substring(4, 5);
        
        const moveObj = chess.move({
          from,
          to,
          promotion: promotion || undefined
        });
        
        if (moveObj) {
          setFen(chess.fen());
          setLastMove(moveObj.san);
        }
        setIsAITurn(false);
      }
    } catch (error) {
      console.error('Move error:', error);
      setIsAITurn(false);
    }
  };

  // Reset game
  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setLastMove(null);
    setIsAITurn(false);
  };

  // Presidential Mode handlers
  const handlePresidentialMode = async () => {
    // Check if Pro is unlocked
    const isProUnlocked = purchaseService.isProUnlocked();
    if (!isProUnlocked) {
      Alert.alert(
        'Presidential Mode™',
        'This ultra-secure feature requires Pro Coach unlock.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlock Pro',
            onPress: async () => {
              try {
                const success = await purchaseService.purchasePro();
                if (success) {
                  setShowPresidentialModal(true);
                }
              } catch (error) {
                // User cancelled or error
              }
            },
          },
        ]
      );
    } else {
      setShowPresidentialModal(true);
    }
  };

  const handleHostGame = () => {
    setIsPresidentialHost(true);
    const code = generateGameCode();
    setPresidentialCode(code);
    Alert.alert(
      'Game Code',
      `Share this code with your opponent:\n\n${code}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setShowPresidentialModal(false);
            setView('presidential');
          },
        },
      ]
    );
  };

  const handleJoinGame = () => {
    // Since Alert.prompt is iOS only, we'll use a different approach
    setShowPresidentialModal(false);
    
    // Show join modal with text input
    Alert.alert(
      'Join Game',
      'Enter the 6-character game code in the next screen',
      [
        {
          text: 'OK',
          onPress: () => {
            // For now, use a hardcoded test code
            // In production, implement a proper text input modal
            setIsPresidentialHost(false);
            setPresidentialCode('ABC123');
            setView('presidential');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const generateGameCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Loading screen
  if (view === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Chess Engine...</Text>
      </View>
    );
  }

  // Play view - just the board
  if (view === 'play') {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            setView('home');
            resetGame();
          }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        <ChessBoard
          fen={fen}
          onMove={handleMove}
          boardSize={Dimensions.get('window').width - 40}
          playable={!isAITurn}
        />
        
        {isAITurn && (
          <View style={styles.aiThinking}>
            <ActivityIndicator color="#4CAF50" />
            <Text style={styles.aiThinkingText}>Thinking...</Text>
          </View>
        )}
      </View>
    );
  }

  // Coach view
  if (view === 'coach') {
    return (
      <CoachView
        fen={fen}
        lastMove={lastMove}
        onBack={() => setView('home')}
      />
    );
  }

  // Presidential Mode view
  if (view === 'presidential') {
    return (
      <PresidentialGameView
        isHost={isPresidentialHost}
        remoteId={presidentialCode}
        onBack={() => {
          setView('home');
          setPresidentialCode('');
        }}
      />
    );
  }

  // Home screen - just two giant buttons
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>♔</Text>
      
      <TouchableOpacity
        style={[styles.bigButton, styles.playButton]}
        onPress={() => setView('play')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>PLAY NOW</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.bigButton, styles.coachButton]}
        onPress={() => setView('coach')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>ASK COACH</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.bigButton, styles.presidentialButton]}
        onPress={handlePresidentialMode}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>🔐 PRESIDENTIAL MODE</Text>
      </TouchableOpacity>

      <Text style={styles.tagline}>
        Powered by Stockfish & AI
      </Text>

      {/* Presidential Mode Modal */}
      <Modal
        visible={showPresidentialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPresidentialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Presidential Mode™</Text>
            <Text style={styles.modalSubtitle}>
              Ultra-secure P2P chess with E2E encryption
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleHostGame}
              >
                <Text style={styles.modalButtonText}>Host Game</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.joinButton]}
                onPress={handleJoinGame}
              >
                <Text style={styles.modalButtonText}>Join Game</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowPresidentialModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 100,
    color: '#4CAF50',
    marginBottom: 50,
  },
  bigButton: {
    width: '100%',
    height: 120,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  coachButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  tagline: {
    position: 'absolute',
    bottom: 40,
    color: '#666',
    fontSize: 14,
  },
  loadingText: {
    color: '#4CAF50',
    fontSize: 18,
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiThinking: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  aiThinkingText: {
    color: '#4CAF50',
    fontSize: 16,
    marginLeft: 10,
  },
  presidentialButton: {
    backgroundColor: '#9C27B0',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  modalButtons: {
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  joinButton: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    paddingVertical: 10,
  },
  modalCloseText: {
    color: '#999',
    fontSize: 16,
  },
});