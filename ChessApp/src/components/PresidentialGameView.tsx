/**
 * Presidential Game View
 * Ultra-secure P2P chess with encrypted chat
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ChessBoard } from './ChessBoard';
import { presidentialGame } from '../services/presidentialGameService';

interface PresidentialGameViewProps {
  isHost: boolean;
  remoteId: string;
  onBack: () => void;
}

interface ChatMessage {
  text: string;
  from: 'local' | 'remote';
  timestamp: Date;
}

export const PresidentialGameView: React.FC<PresidentialGameViewProps> = ({
  isHost,
  remoteId,
  onBack,
}) => {
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [connectionState, setConnectionState] = useState('connecting');
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [isOurTurn, setIsOurTurn] = useState(isHost);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeGame();
    return () => {
      presidentialGame.cleanup();
    };
  }, []);

  const initializeGame = async () => {
    try {
      await presidentialGame.initialize(isHost, remoteId, {
        onMove: (move) => {
          setFen(presidentialGame.getFen());
          setIsOurTurn(presidentialGame.isOurTurn());
        },
        onChat: (message, from) => {
          setChatMessages(prev => [...prev, {
            text: message,
            from,
            timestamp: new Date(),
          }]);
          scrollViewRef.current?.scrollToEnd();
        },
        onGameEnd: (result) => {
          setGameResult(result);
          showGameEndAlert(result);
        },
        onConnectionChange: setConnectionState,
        onError: (error) => {
          Alert.alert('Error', error.message);
        },
      });
    } catch (error) {
      Alert.alert('Connection Failed', 'Unable to establish secure connection');
      onBack();
    }
  };

  const handleMove = async (move: any) => {
    if (!isOurTurn || gameResult) return;

    const success = await presidentialGame.makeMove(move);
    if (success) {
      setFen(presidentialGame.getFen());
      setIsOurTurn(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;

    await presidentialGame.sendChat(chatInput.trim());
    setChatInput('');
  };

  const showGameEndAlert = (result: 'win' | 'lose' | 'draw') => {
    const titles = {
      win: '🎉 Victory!',
      lose: '😔 Defeat',
      draw: '🤝 Draw',
    };

    const messages = {
      win: 'Congratulations! You have won the game.',
      lose: 'You have lost this game. Better luck next time!',
      draw: 'The game ended in a draw.',
    };

    Alert.alert(
      titles[result],
      messages[result],
      [
        {
          text: 'OK',
          onPress: onBack,
        },
      ],
      { cancelable: false }
    );
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
          onPress: async () => {
            await presidentialGame.resign();
          },
        },
      ]
    );
  };

  if (connectionState === 'connecting') {
    return (
      <View style={styles.container}>
        <View style={styles.connectingView}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.connectingText}>
            Establishing secure connection...
          </Text>
          <Text style={styles.securityText}>
            🔐 Signal Protocol E2E Encryption
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Exit</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Presidential Mode™</Text>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>🔒 E2E</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleResign} style={styles.resignButton}>
          <Text style={styles.resignText}>Resign</Text>
        </TouchableOpacity>
      </View>

      {/* Game Board */}
      <View style={styles.boardContainer}>
        <ChessBoard
          fen={fen}
          onMove={handleMove}
          boardSize={300}
          playable={isOurTurn && !gameResult}
        />
        
        {/* Turn Indicator */}
        <View style={styles.turnIndicator}>
          <Text style={styles.turnText}>
            {isOurTurn ? 'Your Turn' : "Opponent's Turn"}
          </Text>
        </View>
      </View>

      {/* Encrypted Chat */}
      <View style={styles.chatContainer}>
        <Text style={styles.chatTitle}>🔐 Encrypted Chat</Text>
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatMessages}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.chatMessage,
                msg.from === 'local' ? styles.localMessage : styles.remoteMessage,
              ]}
            >
              <Text style={styles.chatMessageText}>{msg.text}</Text>
              <Text style={styles.chatTimestamp}>
                {msg.timestamp.toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Secure message..."
            placeholderTextColor="#666"
            onSubmitEditing={sendChat}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendChat} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>
          {connectionState === 'connected' ? 'Secure Connection' : connectionState}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );

  function getStatusColor() {
    switch (connectionState) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FFC107';
      case 'failed':
      case 'disconnected':
        return '#F44336';
      default:
        return '#999';
    }
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  connectingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
  },
  securityText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  securityBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  securityBadgeText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resignButton: {
    padding: 10,
  },
  resignText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  turnIndicator: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
  },
  turnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chatTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chatMessages: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  chatMessage: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: '80%',
  },
  localMessage: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-end',
  },
  remoteMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  chatMessageText: {
    color: '#fff',
    fontSize: 14,
  },
  chatTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#2a2a2a',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#999',
    fontSize: 12,
  },
});