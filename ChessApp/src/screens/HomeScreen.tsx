import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {useAuth} from '../context/AuthContext';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {user, logout} = useAuth();

  if (!user) {
    // Guest view
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroSection}>
          <Text style={styles.title}>♔ Chess Master ♛</Text>
          <Text style={styles.subtitle}>Revolutionary AI Training System</Text>
          <Text style={styles.description}>
            Train like Magnus Carlsen with our breakthrough AI coaching technology.
            CS:GO-style rapid improvement system meets chess mastery.
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>🚀 Revolutionary Features:</Text>
          
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>🤖</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>AI Coaching Revolution</Text>
              <Text style={styles.featureDescription}>
                6 unique AI personalities adapt to your learning style
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>⚡</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Deathmatch Training</Text>
              <Text style={styles.featureDescription}>
                CS:GO-style rapid-fire tactical puzzles for lightning improvement
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>🎯</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Adaptive Learning</Text>
              <Text style={styles.featureDescription}>
                AI analyzes your weaknesses and creates personalized training
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Register')}>
            <Text style={styles.primaryButtonText}>🚀 Start Your Journey</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryButtonText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Logged in user view
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome back, {user.username}! 🏆</Text>
        <Text style={styles.subtitle}>Ready to dominate the board?</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user.elo_rating}</Text>
          <Text style={styles.statLabel}>ELO Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user.puzzles_solved}</Text>
          <Text style={styles.statLabel}>Puzzles Solved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{Math.round(user.win_rate * 100)}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Puzzle')}>
          <Text style={styles.actionEmoji}>⚡</Text>
          <Text style={styles.actionTitle}>Puzzle Deathmatch</Text>
          <Text style={styles.actionDescription}>CS:GO-style rapid training</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Training')}>
          <Text style={styles.actionEmoji}>🤖</Text>
          <Text style={styles.actionTitle}>AI Training</Text>
          <Text style={styles.actionDescription}>Personal AI coaching</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Game')}>
          <Text style={styles.actionEmoji}>♟</Text>
          <Text style={styles.actionTitle}>Play Chess</Text>
          <Text style={styles.actionDescription}>Live games with analysis</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.onlineButton]}
          onPress={() => navigation.navigate('LobbyBrowser')}>
          <Text style={styles.actionEmoji}>🌐</Text>
          <Text style={styles.actionTitle}>Play Online</Text>
          <Text style={styles.actionDescription}>Real-time multiplayer</Text>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW!</Text>
          </View>
        </TouchableOpacity>

        {/* Test Connection Button - Remove in production */}
        {__DEV__ && (
          <TouchableOpacity 
            style={[styles.actionButton, {backgroundColor: '#991b1b'}]}
            onPress={() => navigation.navigate('TestConnection')}>
            <Text style={styles.actionEmoji}>🧪</Text>
            <Text style={styles.actionTitle}>Test Backend</Text>
            <Text style={styles.actionDescription}>Debug connection</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    marginVertical: 30,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 30,
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 30,
  },
  primaryButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 30,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 30,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 5,
  },
  actionDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 30,
    padding: 15,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
  },
  onlineButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default HomeScreen;