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
} from 'react-native';
import { Chess } from 'chess.js';
import { ChessBoard } from './src/components/ChessBoard';
import { CoachView } from './src/components/CoachView';
import { stockfish } from './src/services/stockfishService';
import { coach } from './src/services/coachService';

type ViewState = 'home' | 'play' | 'coach' | 'loading';

export default function App() {
  const [view, setView] = useState<ViewState>('loading');
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [isAITurn, setIsAITurn] = useState(false);

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

      <Text style={styles.tagline}>
        Powered by Stockfish & AI
      </Text>
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
});