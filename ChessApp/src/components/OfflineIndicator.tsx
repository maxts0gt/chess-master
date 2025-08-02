import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import * as Haptics from 'expo-haptics';

interface OfflineIndicatorProps {
  onPress?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onPress }) => {
  const networkStatus = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const previousConnectionStatus = useRef(networkStatus.isConnected);

  useEffect(() => {
    if (!networkStatus.isConnected) {
      // Show offline indicator
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Hide offline indicator
      if (!previousConnectionStatus.current && networkStatus.isConnected) {
        // Just came back online
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    previousConnectionStatus.current = networkStatus.isConnected;
  }, [networkStatus.isConnected, slideAnim, pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.icon}>📡</Text>
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Offline Mode</Text>
          <Text style={styles.subtitle}>Training available offline</Text>
        </View>
        {onPress && <Text style={styles.arrow}>›</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Minimal offline badge for specific screens
export const OfflineBadge: React.FC = () => {
  const networkStatus = useNetworkStatus();
  
  if (networkStatus.isConnected) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>Offline</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingTop: 50, // Account for status bar
  },
  content: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fecaca',
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: '#ffffff',
    fontSize: 24,
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default OfflineIndicator;