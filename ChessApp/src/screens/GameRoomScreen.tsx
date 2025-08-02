import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ChessBoard from '../components/ChessBoard';
import { Chess } from 'chess.js';
import * as Haptics from 'expo-haptics';
import { useAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface GameRoomScreenProps {
  navigation: any;
  route: {
    params: {
      lobbyId: string;
    };
  };
}

interface Player {
  id: string;
  username: string;
  rating: number;
  avatar?: string;
}

interface GameState {
  fen: string;
  turn: 'w' | 'b';
  moveHistory: string[];
  whiteTime: number;
  blackTime: number;
  result?: string;
}

const GameRoomScreen: React.FC<GameRoomScreenProps> = ({ navigation, route }) => {
  const { lobbyId } = route.params;
  const [chess] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState(chess.fen());
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [whitePlayer, setWhitePlayer] = useState<Player | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<Player | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
  const [blackTime, setBlackTime] = useState(600);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  
  const api = useAPI();
  const { user } = useAuth();

  useEffect(() => {
    initializeGameRoom();
    
    // Cleanup on unmount
    return () => {
      // Leave the game room
      if (connected) {
        api.leaveGameRoom(lobbyId).catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    // Timer countdown
    if (gameStatus === 'playing') {
      const interval = setInterval(() => {
        if (chess.turn() === 'w' && isMyTurn) {
          setWhiteTime(prev => Math.max(0, prev - 1));
        } else if (chess.turn() === 'b' && isMyTurn) {
          setBlackTime(prev => Math.max(0, prev - 1));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameStatus, isMyTurn, chess.turn()]);

  const initializeGameRoom = async () => {
    try {
      setLoading(true);
      
      // For now, simulate joining a game room
      // In production, this would connect to WebSocket and sync game state
      
      // Simulate player data
      setWhitePlayer({
        id: user?.id || '1',
        username: user?.username || 'You',
        rating: user?.elo_rating || 1500,
      });
      
      setBlackPlayer({
        id: '2',
        username: 'Opponent',
        rating: 1520,
      });
      
      setPlayerColor(Math.random() > 0.5 ? 'white' : 'black');
      setIsMyTurn(playerColor === 'white');
      setConnected(true);
      setGameStatus('playing');
      
      // Add welcome message
      setChatMessages(['Game started! Good luck!']);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error initializing game room:', error);
      Alert.alert(
        'Connection Error',
        'Unable to join game room. Please try again.',
        [
          { text: 'Retry', onPress: initializeGameRoom },
          { text: 'Leave', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMove = (move: any) => {
    if (!isMyTurn || gameStatus !== 'playing') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      const result = chess.move(move);
      if (result) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBoardPosition(chess.fen());
        setIsMyTurn(false);
        
        // Check game status
        if (chess.isCheckmate()) {
          endGame('checkmate');
        } else if (chess.isDraw()) {
          endGame('draw');
        } else if (chess.isCheck()) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        
        // In production, send move to server via WebSocket
        // ws.send({ type: 'move', move: result.san, fen: chess.fen() });
        
        // Simulate opponent move after 2 seconds
        if (!chess.isGameOver()) {
          setTimeout(() => makeOpponentMove(), 2000);
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const makeOpponentMove = () => {
    // Simple AI: make a random legal move
    const moves = chess.moves();
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      chess.move(randomMove);
      setBoardPosition(chess.fen());
      setIsMyTurn(true);
      
      if (chess.isCheckmate()) {
        endGame('checkmate');
      } else if (chess.isDraw()) {
        endGame('draw');
      }
    }
  };

  const endGame = (reason: string) => {
    setGameStatus('finished');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    const message = reason === 'checkmate' 
      ? `Checkmate! ${winner} wins!`
      : 'Game ended in a draw!';
    
    Alert.alert(
      'Game Over',
      message,
      [
        { text: 'View Analysis', onPress: () => {} }, // TODO: Implement analysis
        { text: 'New Game', onPress: () => navigation.goBack() },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResign = () => {
    Alert.alert(
      'Resign Game',
      'Are you sure you want to resign?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resign', 
          style: 'destructive',
          onPress: () => {
            setGameStatus('finished');
            Alert.alert('Game Over', 'You resigned the game.');
            navigation.goBack();
          }
        },
      ]
    );
  };

  const handleDrawOffer = () => {
    Alert.alert(
      'Offer Draw',
      'Send a draw offer to your opponent?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Offer', 
          onPress: () => {
            setChatMessages(prev => [...prev, 'You offered a draw']);
            // In production, send draw offer via WebSocket
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Connecting to game...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Opponent info */}
      <View style={styles.playerInfo}>
        <View style={styles.playerDetails}>
          <Text style={styles.playerName}>
            {playerColor === 'white' ? blackPlayer?.username : whitePlayer?.username}
          </Text>
          <Text style={styles.playerRating}>
            ({playerColor === 'white' ? blackPlayer?.rating : whitePlayer?.rating})
          </Text>
        </View>
        <View style={[styles.timer, !isMyTurn && styles.activeTimer]}>
          <Text style={styles.timerText}>
            {formatTime(playerColor === 'white' ? blackTime : whiteTime)}
          </Text>
        </View>
      </View>

      {/* Chess board */}
      <View style={styles.boardContainer}>
        <ChessBoard
          position={boardPosition}
          onMove={handleMove}
          boardOrientation={playerColor}
          highlightSquares={chess.isCheck() ? [chess.turn() === 'w' ? 'e1' : 'e8'] : []}
        />
      </View>

      {/* Game controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.resignButton]}
          onPress={handleResign}
          disabled={gameStatus !== 'playing'}
        >
          <Text style={styles.controlButtonText}>🏳️ Resign</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.drawButton]}
          onPress={handleDrawOffer}
          disabled={gameStatus !== 'playing'}
        >
          <Text style={styles.controlButtonText}>🤝 Draw</Text>
        </TouchableOpacity>
      </View>

      {/* Your info */}
      <View style={styles.playerInfo}>
        <View style={styles.playerDetails}>
          <Text style={styles.playerName}>
            {playerColor === 'white' ? whitePlayer?.username : blackPlayer?.username} (You)
          </Text>
          <Text style={styles.playerRating}>
            ({playerColor === 'white' ? whitePlayer?.rating : blackPlayer?.rating})
          </Text>
        </View>
        <View style={[styles.timer, isMyTurn && styles.activeTimer]}>
          <Text style={styles.timerText}>
            {formatTime(playerColor === 'white' ? whiteTime : blackTime)}
          </Text>
        </View>
      </View>

      {/* Chat/Messages */}
      <View style={styles.chatContainer}>
        <ScrollView style={styles.chatMessages}>
          {chatMessages.map((msg, index) => (
            <Text key={index} style={styles.chatMessage}>{msg}</Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 20,
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1e293b',
  },
  playerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerRating: {
    color: '#94a3b8',
    fontSize: 16,
    marginLeft: 8,
  },
  timer: {
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTimer: {
    backgroundColor: '#dc2626',
  },
  timerText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  boardContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 10,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resignButton: {
    backgroundColor: '#dc2626',
  },
  drawButton: {
    backgroundColor: '#f59e0b',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
    margin: 20,
    borderRadius: 12,
    padding: 10,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessage: {
    color: '#94a3b8',
    fontSize: 14,
    paddingVertical: 4,
  },
});

export default GameRoomScreen;