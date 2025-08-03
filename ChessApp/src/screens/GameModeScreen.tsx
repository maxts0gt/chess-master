import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';

interface GameModeScreenProps {
  navigation: any;
}

const GameModeScreen: React.FC<GameModeScreenProps> = ({ navigation }) => {
  const [selectedMode, setSelectedMode] = useState<'pvp' | 'pvc' | null>(null);
  const [selectedColor, setSelectedColor] = useState<'white' | 'black' | 'random'>('white');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const checkOfflineAI = async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return true; // Offline AI is always available
    }
    return true; // Our chess AI doesn't require internet
  };

  const handleStartGame = async () => {
    if (!selectedMode) {
      Alert.alert('Select Mode', 'Please select a game mode first');
      return;
    }

    if (selectedMode === 'pvc') {
      const aiAvailable = await checkOfflineAI();
      if (!aiAvailable) {
        Alert.alert(
          'AI Not Available',
          'Chess AI is not available. Please check your connection.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Handle random color selection
    let finalColor = selectedColor;
    if (selectedColor === 'random') {
      finalColor = Math.random() < 0.5 ? 'white' : 'black';
    }
    
    // Navigate to game screen with parameters
    navigation.navigate('Game', {
      mode: selectedMode,
      playerColor: finalColor,
      difficulty: selectedDifficulty,
      offlineMode: selectedMode === 'pvc', // AI games are always offline
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>New Game</Text>
        <Text style={styles.subtitle}>Choose your game mode</Text>
      </View>

      <View style={styles.modeContainer}>
        <Text style={styles.sectionTitle}>Game Mode</Text>
        
        <TouchableOpacity
          style={[
            styles.modeCard,
            selectedMode === 'pvp' && styles.selectedCard
          ]}
          onPress={() => setSelectedMode('pvp')}
        >
          <Text style={styles.modeEmoji}>👥</Text>
          <Text style={styles.modeTitle}>Human vs Human</Text>
          <Text style={styles.modeDescription}>
            Play against another person on the same device
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeCard,
            selectedMode === 'pvc' && styles.selectedCard
          ]}
          onPress={() => setSelectedMode('pvc')}
        >
          <Text style={styles.modeEmoji}>🤖</Text>
          <Text style={styles.modeTitle}>Human vs Computer</Text>
          <Text style={styles.modeDescription}>
            Play against our offline AI engine
          </Text>
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>Works Offline</Text>
          </View>
        </TouchableOpacity>
      </View>

      {selectedMode === 'pvc' && (
        <>
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Your Color</Text>
            <View style={styles.colorOptions}>
              <TouchableOpacity
                style={[
                  styles.colorOption,
                  selectedColor === 'white' && styles.selectedOption
                ]}
                onPress={() => setSelectedColor('white')}
              >
                <Text style={styles.pieceIcon}>♔</Text>
                <Text style={styles.optionText}>White</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.colorOption,
                  selectedColor === 'black' && styles.selectedOption
                ]}
                onPress={() => setSelectedColor('black')}
              >
                <Text style={styles.pieceIcon}>♚</Text>
                <Text style={styles.optionText}>Black</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.colorOption,
                  selectedColor === 'random' && styles.selectedOption
                ]}
                onPress={() => setSelectedColor('random')}
              >
                <Text style={styles.pieceIcon}>🎲</Text>
                <Text style={styles.optionText}>Random</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.difficultyOptions}>
              <TouchableOpacity
                style={[
                  styles.difficultyOption,
                  selectedDifficulty === 'easy' && styles.selectedOption
                ]}
                onPress={() => setSelectedDifficulty('easy')}
              >
                <Text style={styles.difficultyEmoji}>🟢</Text>
                <Text style={styles.optionText}>Easy</Text>
                <Text style={styles.difficultyDescription}>Beginner friendly</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.difficultyOption,
                  selectedDifficulty === 'medium' && styles.selectedOption
                ]}
                onPress={() => setSelectedDifficulty('medium')}
              >
                <Text style={styles.difficultyEmoji}>🟡</Text>
                <Text style={styles.optionText}>Medium</Text>
                <Text style={styles.difficultyDescription}>Balanced challenge</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.difficultyOption,
                  selectedDifficulty === 'hard' && styles.selectedOption
                ]}
                onPress={() => setSelectedDifficulty('hard')}
              >
                <Text style={styles.difficultyEmoji}>🔴</Text>
                <Text style={styles.optionText}>Hard</Text>
                <Text style={styles.difficultyDescription}>Expert level</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[
          styles.startButton,
          !selectedMode && styles.disabledButton
        ]}
        onPress={handleStartGame}
        disabled={!selectedMode}
      >
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>ℹ️ About Our AI</Text>
        <Text style={styles.infoText}>
          Our chess AI uses a minimax algorithm with alpha-beta pruning, 
          providing a challenging game without requiring internet connection. 
          Perfect for playing on the go!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  modeContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 15,
  },
  modeCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e293b',
  },
  modeEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 5,
  },
  modeDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  offlineBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  offlineBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionsContainer: {
    marginBottom: 25,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorOption: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pieceIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  optionText: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '600',
  },
  selectedOption: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e293b',
  },
  difficultyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyOption: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyEmoji: {
    fontSize: 20,
    marginBottom: 5,
  },
  difficultyDescription: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  startButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  infoContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});

export default GameModeScreen;