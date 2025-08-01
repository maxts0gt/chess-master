import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

interface Lobby {
  id: string;
  name: string;
  host_name: string;
  mode: 'Deathmatch' | 'Tournament' | 'Training' | 'Ranked' | 'Custom';
  players: PlayerInfo[];
  max_players: number;
  state: 'Waiting' | 'Starting' | 'InProgress' | 'Finished';
}

interface PlayerInfo {
  id: string;
  username: string;
  rating: number;
  ready: boolean;
}

const LobbyBrowserScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const ws = useWebSocket();
  
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [selectedMode, setSelectedMode] = useState<Lobby['mode']>('Custom');
  const [maxPlayers, setMaxPlayers] = useState('4');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // Connect to WebSocket
    if (ws) {
      ws.onMessage((data) => {
        if (data.type === 'LobbyList') {
          setLobbies(data.lobbies);
          setLoading(false);
        } else if (data.type === 'LobbyMessage') {
          handleLobbyMessage(data.LobbyMessage);
        }
      });

      // Request lobby list
      ws.send({ type: 'GetLobbies' });
    }

    return () => {
      if (ws) {
        ws.send({ type: 'UnsubscribeLobbies' });
      }
    };
  }, [ws]);

  const handleLobbyMessage = (msg: any) => {
    switch (msg.type) {
      case 'LobbyCreated':
        setLobbies(prev => [...prev, msg.lobby]);
        break;
      case 'LobbyUpdated':
        setLobbies(prev => prev.map(l => l.id === msg.lobby.id ? msg.lobby : l));
        break;
      case 'LobbyClosed':
        setLobbies(prev => prev.filter(l => l.id !== msg.lobby_id));
        break;
    }
  };

  const createLobby = () => {
    if (!lobbyName.trim()) {
      Alert.alert('Error', 'Please enter a lobby name');
      return;
    }

    ws?.send({
      type: 'CreateLobby',
      config: {
        name: lobbyName,
        mode: selectedMode,
        max_players: parseInt(maxPlayers),
        time_control: '10+0',
        rated: selectedMode === 'Ranked',
        voice_enabled: false,
      },
    });

    setShowCreateModal(false);
    setLobbyName('');
  };

  const joinLobby = (lobbyId: string) => {
    ws?.send({
      type: 'JoinLobby',
      lobby_id: lobbyId,
    });
    
    navigation.navigate('GameRoom', { lobbyId });
  };

  const onRefresh = () => {
    setRefreshing(true);
    ws?.send({ type: 'GetLobbies' });
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderLobby = ({ item, index }: { item: Lobby; index: number }) => {
    const isFull = item.players.length >= item.max_players;
    const canJoin = item.state === 'Waiting' && !isFull;
    
    const itemAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(itemAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.lobbyCard,
          {
            opacity: itemAnim,
            transform: [
              {
                translateY: itemAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => canJoin && joinLobby(item.id)}
          disabled={!canJoin}
          style={[styles.lobbyContent, !canJoin && styles.disabledLobby]}
        >
          <View style={styles.lobbyHeader}>
            <View style={styles.lobbyInfo}>
              <Text style={styles.lobbyName}>{item.name}</Text>
              <Text style={styles.hostName}>Host: {item.host_name}</Text>
            </View>
            <View style={[styles.modeBadge, { backgroundColor: getModeColor(item.mode) }]}>
              <Text style={styles.modeText}>{item.mode}</Text>
            </View>
          </View>
          
          <View style={styles.lobbyFooter}>
            <View style={styles.playerCount}>
              <Icon name="account-group" size={20} color="#fff" />
              <Text style={styles.playerText}>
                {item.players.length}/{item.max_players}
              </Text>
            </View>
            
            {canJoin ? (
              <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join</Text>
                <Icon name="arrow-right" size={16} color="#000" />
              </TouchableOpacity>
            ) : (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {isFull ? 'Full' : item.state}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const getModeColor = (mode: Lobby['mode']) => {
    switch (mode) {
      case 'Deathmatch': return '#e74c3c';
      case 'Tournament': return '#f39c12';
      case 'Training': return '#3498db';
      case 'Ranked': return '#9b59b6';
      case 'Custom': return '#2ecc71';
      default: return '#34495e';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Game Lobbies</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Icon name="plus-circle" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Finding games...</Text>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <FlatList
            data={lobbies}
            renderItem={renderLobby}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#4CAF50"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chess-knight" size={80} color="#666" />
                <Text style={styles.emptyText}>No active lobbies</Text>
                <Text style={styles.emptySubtext}>Create one to get started!</Text>
              </View>
            }
          />
        </Animated.View>
      )}

      {/* Create Lobby Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Lobby</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Lobby Name"
              placeholderTextColor="#999"
              value={lobbyName}
              onChangeText={setLobbyName}
            />

            <Text style={styles.label}>Game Mode</Text>
            <View style={styles.modeSelector}>
              {(['Custom', 'Deathmatch', 'Tournament', 'Training', 'Ranked'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeOption,
                    selectedMode === mode && styles.selectedMode,
                    { borderColor: getModeColor(mode) },
                  ]}
                  onPress={() => setSelectedMode(mode)}
                >
                  <Text style={[
                    styles.modeOptionText,
                    selectedMode === mode && styles.selectedModeText,
                  ]}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Max Players</Text>
            <View style={styles.playerSelector}>
              {['2', '4', '8', '16'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.playerOption,
                    maxPlayers === num && styles.selectedPlayer,
                  ]}
                  onPress={() => setMaxPlayers(num)}
                >
                  <Text style={[
                    styles.playerOptionText,
                    maxPlayers === num && styles.selectedPlayerText,
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createLobby}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  lobbyCard: {
    marginVertical: 5,
  },
  lobbyContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledLobby: {
    opacity: 0.6,
  },
  lobbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  lobbyInfo: {
    flex: 1,
  },
  lobbyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 14,
    color: '#999',
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  modeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lobbyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  playerCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginRight: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#666',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  modeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  modeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    margin: 4,
  },
  selectedMode: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  modeOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedModeText: {
    fontWeight: 'bold',
  },
  playerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  playerOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  selectedPlayer: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  playerOptionText: {
    color: '#fff',
    fontSize: 18,
  },
  selectedPlayerText: {
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LobbyBrowserScreen;