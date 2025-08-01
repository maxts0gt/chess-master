import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface GameScreenProps {
  navigation: any;
}

const GameScreen: React.FC<GameScreenProps> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>♟ Chess Master ♟</Text>
      <Text style={styles.subtitle}>Revolutionary Chess Board</Text>
      
      <View style={styles.boardPlaceholder}>
        <Text style={styles.boardText}>🏆 CHESS BOARD 🏆</Text>
        <Text style={styles.boardSubtext}>Interactive chess board with AI coaching</Text>
      </View>
      
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>🚀 Revolutionary Features:</Text>
        <Text style={styles.feature}>• Real-time AI coaching</Text>
        <Text style={styles.feature}>• Haptic feedback on moves</Text>
        <Text style={styles.feature}>• Visual move indicators</Text>
        <Text style={styles.feature}>• Instant position analysis</Text>
        <Text style={styles.feature}>• Multiple AI personalities</Text>
      </View>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>🎮 Start New Game</Text>
      </TouchableOpacity>
      
      <Text style={styles.comingSoon}>🚧 Advanced chess board coming soon! 🚧</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 30,
  },
  boardPlaceholder: {
    backgroundColor: '#1e293b',
    padding: 40,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  boardText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  boardSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 15,
    textAlign: 'center',
  },
  feature: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 5,
    paddingLeft: 10,
  },
  button: {
    backgroundColor: '#dc2626',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 16,
    color: '#fbbf24',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default GameScreen;