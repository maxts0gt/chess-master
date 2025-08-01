import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface TrainingScreenProps {
  navigation: any;
}

const TrainingScreen: React.FC<TrainingScreenProps> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚡ Deathmatch Training ⚡</Text>
      <Text style={styles.subtitle}>CS:GO-Style Chess Training</Text>
      
      <View style={styles.modeContainer}>
        <TouchableOpacity style={styles.modeButton}>
          <Text style={styles.modeEmoji}>🔥</Text>
          <Text style={styles.modeTitle}>Tactical Assassin</Text>
          <Text style={styles.modeDescription}>Rapid-fire tactical puzzles</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modeButton}>
          <Text style={styles.modeEmoji}>🏛️</Text>
          <Text style={styles.modeTitle}>Positional Master</Text>
          <Text style={styles.modeDescription}>Strategic planning drills</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modeButton}>
          <Text style={styles.modeEmoji}>🏰</Text>
          <Text style={styles.modeTitle}>Endgame Specialist</Text>
          <Text style={styles.modeDescription}>Technical precision training</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.comingSoon}>🚧 Advanced training modes coming soon! 🚧</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
  },
  modeContainer: {
    marginBottom: 40,
  },
  modeButton: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  modeEmoji: {
    fontSize: 30,
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
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 16,
    color: '#fbbf24',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default TrainingScreen;