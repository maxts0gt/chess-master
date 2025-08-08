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
  Modal,
} from 'react-native';
import { ChessBoard } from './ChessBoard';
import { presidentialGame } from '../services/presidentialGameService';
import { webRTCService } from '../services/webRTCService';
import QRCode from 'react-native-qrcode-svg';

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
  const [showSignalModal, setShowSignalModal] = useState(true);
  const [localSignal, setLocalSignal] = useState('');
  const [remoteSignal, setRemoteSignal] = useState('');
  const [signalStep, setSignalStep] = useState<'offer' | 'answer' | 'complete'>(() => (isHost ? 'offer' : 'answer'));

  useEffect(() => {
    initializeGame();
    return () => {
      presidentialGame.cleanup();
    };
  }, []);

  useEffect(() => {
    // Subscribe to ICE updates to refresh localSignal if needed
    webRTCService.onLocalIceCandidates((cands) => {
      try {
        const current = JSON.parse(localSignal || '{}');
        const updated = { ...current, iceCandidates: cands };
        setLocalSignal(JSON.stringify(updated));
      } catch {
        // ignore
      }
    });
  }, [localSignal]);

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
        onConnectionChange: (state) => {
          setConnectionState(state);
          if (state === 'connected') setShowSignalModal(false);
        },
        onError: (error) => {
          Alert.alert('Error', error.message);
        },
      });

      if (isHost) {
        const pkg = await webRTCService.createOfferPackage();
        setLocalSignal(JSON.stringify(pkg));
        setSignalStep('offer');
      }
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

  const handleApplyRemote = async () => {
    try {
      const pkg = JSON.parse(remoteSignal);
      if (signalStep === 'offer' && !isHost) {
        // We are the joiner: accept offer and produce answer
        const ans = await webRTCService.acceptOfferPackage(pkg);
        setLocalSignal(JSON.stringify(ans));
        setSignalStep('complete');
      } else if (signalStep === 'answer' && isHost) {
        // Host applies answer
        await webRTCService.applyAnswerPackage(pkg);
        setSignalStep('complete');
      }
    } catch (e) {
      Alert.alert('Invalid Signal', 'Please paste a valid JSON package.');
    }
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
          <TouchableOpacity style={styles.modalButton} onPress={() => setShowSignalModal(true)}>
            <Text style={styles.modalButtonText}>Open Manual Signaling</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showSignalModal} transparent animationType="slide" onRequestClose={() => setShowSignalModal(false)}>
          <View style={styles.signalModalOverlay}>
            <View style={styles.signalModalContent}>
              <Text style={styles.modalTitle}>Manual Signaling</Text>
              <Text style={styles.modalSubtitle}>{isHost ? 'Step 1: Share Offer JSON, then paste Answer' : 'Step 1: Paste Offer JSON, then share Answer'}</Text>

              <Text style={styles.signalLabel}>Your {isHost ? 'Offer' : 'Answer'} JSON</Text>
              <ScrollView style={styles.signalBox}>
                <Text style={styles.signalText}>{localSignal || 'Generating...'}</Text>
              </ScrollView>

              <Text style={styles.signalLabel}>Your {isHost ? 'Offer' : 'Answer'} QR</Text>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                {localSignal ? (
                  <QRCode value={localSignal} size={180} />
                ) : null}
              </View>

              <Text style={styles.signalLabel}>Paste Remote {isHost ? 'Answer' : 'Offer'} JSON</Text>
              <TextInput
                style={styles.signalInput}
                multiline
                value={remoteSignal}
                onChangeText={setRemoteSignal}
                placeholder={isHost ? 'Paste answer JSON here' : 'Paste offer JSON here'}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity style={[styles.modalButton, { flex: 1 }]} onPress={handleApplyRemote}>
                  <Text style={styles.modalButtonText}>{signalStep === 'offer' && !isHost ? 'Generate Answer' : 'Apply Remote'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.joinButton, styles.modalButton, { flex: 1 }]} onPress={() => setShowSignalModal(false)}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
              {/* Future: Add QR Scanner button */}
              {/* <TouchableOpacity style={[styles.modalButton, { marginTop: 8 }]} onPress={() => setScannerOpen(true)}>
                <Text style={styles.modalButtonText}>Scan Remote QR</Text>
              </TouchableOpacity> */}
            </View>
          </View>
        </Modal>
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
  signalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  signalModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    width: '95%',
    maxWidth: 520,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  signalLabel: {
    color: '#aaa',
    marginTop: 12,
    marginBottom: 6,
  },
  signalBox: {
    maxHeight: 180,
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    padding: 8,
  },
  signalText: {
    color: '#e0e0e0',
    fontSize: 12,
  },
  signalInput: {
    minHeight: 100,
    backgroundColor: '#1f1f1f',
    color: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    textAlignVertical: 'top',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  joinButton: {
    backgroundColor: '#333',
  },
});