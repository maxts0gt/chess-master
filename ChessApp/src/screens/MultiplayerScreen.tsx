import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Share,
  Clipboard,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface MultiplayerScreenProps {
  navigation: any;
  user: {
    id: string;
    username: string;
    rating: number;
  };
}

const MultiplayerScreen: React.FC<MultiplayerScreenProps> = ({ navigation, user }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [selectedTimeControl, setSelectedTimeControl] = useState(10);
  const [selectedIncrement, setSelectedIncrement] = useState(5);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    connectWebSocket();
    
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);
  
  const connectWebSocket = () => {
    const wsUrl = 'ws://10.0.2.2:8080/ws'; // Android emulator
    // const wsUrl = 'ws://localhost:8080/ws'; // iOS simulator
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      console.log('Connected to multiplayer server');
      setIsConnecting(false);
    };
    
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
    };
    
    ws.current.onclose = () => {
      console.log('Disconnected from server');
      // Attempt to reconnect
      setTimeout(connectWebSocket, 3000);
    };
  };
  
  const handleServerMessage = (message: any) => {
    switch (message.type) {
      case 'room_created':
        setRoomCode(message.room_id);
        setShowCreateModal(false);
        setShowWaitingModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
        
      case 'room_joined':
        navigation.navigate('OnlineGame', {
          roomId: message.room_id,
          gameState: message.game_state,
          playerColor: message.your_color,
        });
        break;
        
      case 'player_joined':
        // Both players ready, start game
        navigation.navigate('OnlineGame', {
          roomId: roomCode,
          playerColor: 'white', // Host is always white
        });
        break;
        
      case 'error':
        Alert.alert('Error', message.message);
        break;
    }
  };
  
  const createRoom = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Connection Error', 'Please wait while we connect to the server...');
      setIsConnecting(true);
      connectWebSocket();
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    ws.current.send(JSON.stringify({
      type: 'create_room',
      time_control: selectedTimeControl,
      increment: selectedIncrement,
      private: true,
    }));
  };
  
  const joinRoom = () => {
    if (!inputRoomCode.trim()) {
      Alert.alert('Error', 'Please enter a room code');
      return;
    }
    
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      Alert.alert('Connection Error', 'Please wait while we connect to the server...');
      setIsConnecting(true);
      connectWebSocket();
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    ws.current.send(JSON.stringify({
      type: 'join_room',
      room_id: inputRoomCode.toUpperCase(),
      as_spectator: false,
    }));
  };
  
  const copyRoomCode = () => {
    Clipboard.setString(roomCode);
    Alert.alert('Copied!', 'Room code copied to clipboard');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  const shareRoomCode = async () => {
    try {
      await Share.share({
        message: `Join my chess game! Room code: ${roomCode}\n\nOpen Chess Master app and enter this code to play.`,
        title: 'Chess Game Invitation',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const formatRoomCode = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length > 5) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
    }
    return cleaned;
  };
  
  const timeControls = [
    { minutes: 1, label: '1 min' },
    { minutes: 3, label: '3 min' },
    { minutes: 5, label: '5 min' },
    { minutes: 10, label: '10 min' },
  ];
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#0f0f23', '#16213e']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.logo}>♚</Text>
          <Text style={styles.title}>Play with Friends</Text>
          <Text style={styles.subtitle}>Create a private room or join with a code</Text>
        </Animated.View>
        
        <View style={styles.optionCards}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.optionIcon}>🏠</Text>
            <Text style={styles.optionTitle}>Create Room</Text>
            <Text style={styles.optionDesc}>Start a new game and invite your friend</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setShowJoinModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.optionIcon}>🔗</Text>
            <Text style={styles.optionTitle}>Join Room</Text>
            <Text style={styles.optionDesc}>Enter a room code to join a game</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>
        
        <TouchableOpacity style={styles.quickPlayButton} activeOpacity={0.8}>
          <Text style={styles.quickPlayIcon}>⚡</Text>
          <Text style={styles.quickPlayText}>Quick Play vs Random Opponent</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <BlurView intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create a Room</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.formLabel}>Time Control</Text>
            <View style={styles.timeControls}>
              {timeControls.map((control) => (
                <TouchableOpacity
                  key={control.minutes}
                  style={[
                    styles.timeButton,
                    selectedTimeControl === control.minutes && styles.timeButtonActive,
                  ]}
                  onPress={() => setSelectedTimeControl(control.minutes)}
                >
                  <Text
                    style={[
                      styles.timeButtonText,
                      selectedTimeControl === control.minutes && styles.timeButtonTextActive,
                    ]}
                  >
                    {control.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.formLabel}>Increment</Text>
            <View style={styles.incrementOptions}>
              {[0, 1, 2, 5, 10].map((inc) => (
                <TouchableOpacity
                  key={inc}
                  style={[
                    styles.incrementButton,
                    selectedIncrement === inc && styles.incrementButtonActive,
                  ]}
                  onPress={() => setSelectedIncrement(inc)}
                >
                  <Text
                    style={[
                      styles.incrementButtonText,
                      selectedIncrement === inc && styles.incrementButtonTextActive,
                    ]}
                  >
                    {inc === 0 ? 'None' : `+${inc}s`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={createRoom}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Private Room</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
      
      {/* Join Room Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <BlurView intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join a Room</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.roomCodeInput}
              placeholder="CHESS-XXXX"
              placeholderTextColor="#7a7a7a"
              value={inputRoomCode}
              onChangeText={(text) => setInputRoomCode(formatRoomCode(text))}
              maxLength={10}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            
            <Text style={styles.inputHint}>Enter the room code shared by your friend</Text>
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={joinRoom}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Join Room</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
      
      {/* Waiting Modal */}
      <Modal
        visible={showWaitingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWaitingModal(false)}
      >
        <BlurView intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.modalTitle}>Room Created!</Text>
            
            <View style={styles.roomCodeContainer}>
              <Text style={styles.roomCodeLabel}>Share this code with your friend:</Text>
              <Text style={styles.roomCodeValue}>{roomCode}</Text>
              
              <View style={styles.shareButtons}>
                <TouchableOpacity style={styles.shareButton} onPress={copyRoomCode}>
                  <Text style={styles.shareButtonIcon}>📋</Text>
                  <Text style={styles.shareButtonText}>Copy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.shareButton} onPress={shareRoomCode}>
                  <Text style={styles.shareButtonIcon}>🔗</Text>
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.waitingAnimation}>
              <ActivityIndicator size="large" color="#5e8bc6" />
              <Text style={styles.waitingText}>Waiting for opponent to join...</Text>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#7a7a7a',
  },
  optionCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  optionCard: {
    flex: 1,
    backgroundColor: 'rgba(39, 37, 34, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#404040',
  },
  optionIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    color: '#7a7a7a',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#404040',
  },
  dividerText: {
    paddingHorizontal: 20,
    color: '#7a7a7a',
    fontSize: 14,
  },
  quickPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#404040',
    borderRadius: 12,
    padding: 16,
  },
  quickPlayIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  quickPlayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#bababa',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#312e2b',
    borderRadius: 20,
    padding: 30,
    width: screenWidth - 40,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    fontSize: 32,
    color: '#7a7a7a',
    paddingLeft: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#bababa',
    marginBottom: 10,
    marginTop: 20,
  },
  timeControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#272522',
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#404040',
  },
  timeButtonActive: {
    backgroundColor: '#5e8bc6',
    borderColor: '#5e8bc6',
  },
  timeButtonText: {
    textAlign: 'center',
    color: '#bababa',
    fontWeight: '500',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  incrementOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  incrementButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#272522',
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#404040',
  },
  incrementButtonActive: {
    backgroundColor: '#5e8bc6',
    borderColor: '#5e8bc6',
  },
  incrementButtonText: {
    color: '#bababa',
    fontWeight: '500',
  },
  incrementButtonTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#5e8bc6',
    borderRadius: 10,
    padding: 16,
    marginTop: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  roomCodeInput: {
    backgroundColor: '#272522',
    borderWidth: 2,
    borderColor: '#404040',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputHint: {
    textAlign: 'center',
    color: '#7a7a7a',
    fontSize: 14,
    marginTop: 10,
  },
  successIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 20,
  },
  roomCodeContainer: {
    backgroundColor: '#272522',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#5e8bc6',
    borderStyle: 'dashed',
  },
  roomCodeLabel: {
    fontSize: 14,
    color: '#7a7a7a',
    textAlign: 'center',
    marginBottom: 10,
  },
  roomCodeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5e8bc6',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 20,
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5e8bc6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  shareButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  waitingAnimation: {
    alignItems: 'center',
    marginTop: 20,
  },
  waitingText: {
    color: '#7a7a7a',
    fontSize: 16,
    marginTop: 15,
  },
});

export default MultiplayerScreen;