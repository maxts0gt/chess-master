/**
 * Model Download Screen
 * Beautiful UI for downloading the AI model with network awareness
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { premiumService } from '../services/premiumService';
import { theme } from '../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

interface ModelDownloadScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const ModelDownloadScreen: React.FC<ModelDownloadScreenProps> = ({
  onComplete,
  onSkip,
}) => {
  const [downloadState, setDownloadState] = useState<'waiting' | 'downloading' | 'complete'>('waiting');
  const [progress, setProgress] = useState(0);
  const [networkType, setNetworkType] = useState<string>('unknown');
  const [isConnected, setIsConnected] = useState(true);
  const [downloadSpeed, setDownloadSpeed] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Check network status
    checkNetwork();
    
    // Subscribe to premium state
    const unsubscribe = premiumService.subscribe((state) => {
      setProgress(state.downloadProgress);
      
      if (state.isModelDownloaded) {
        setDownloadState('complete');
        setTimeout(onComplete, 1500);
      }
    });
    
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Calculate time remaining (rough estimate)
    if (progress > 0 && progress < 1) {
      const mbDownloaded = 1500 * progress; // 1.5GB = 1500MB
      const mbRemaining = 1500 * (1 - progress);
      // Assume ~2MB/s on WiFi, 0.5MB/s on cellular
      const speedMBps = networkType === 'wifi' ? 2 : 0.5;
      const secondsRemaining = mbRemaining / speedMBps;
      
      if (secondsRemaining < 60) {
        setTimeRemaining(`${Math.round(secondsRemaining)}s remaining`);
      } else {
        setTimeRemaining(`${Math.round(secondsRemaining / 60)}m remaining`);
      }
      
      setDownloadSpeed(`${speedMBps} MB/s`);
    }
  }, [progress, networkType]);
  
  const checkNetwork = async () => {
    const state = await NetInfo.fetch();
    setNetworkType(state.type);
    setIsConnected(state.isConnected || false);
  };
  
  const handleDownload = () => {
    setDownloadState('downloading');
    premiumService.downloadAIModel();
  };
  
  const renderNetworkWarning = () => {
    if (!isConnected) {
      return (
        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>📶</Text>
          <Text style={styles.warningTitle}>No Internet Connection</Text>
          <Text style={styles.warningText}>
            Connect to the internet to download your AI coach
          </Text>
        </View>
      );
    }
    
    if (networkType === 'cellular') {
      return (
        <View style={[styles.warningBox, styles.cellularWarning]}>
          <Text style={styles.warningIcon}>📱</Text>
          <Text style={styles.warningTitle}>Cellular Data Warning</Text>
          <Text style={styles.warningText}>
            This 1.5GB download may use your data allowance and incur charges
          </Text>
        </View>
      );
    }
    
    return (
      <View style={[styles.warningBox, styles.wifiBox]}>
        <Text style={styles.warningIcon}>✅</Text>
        <Text style={styles.warningTitle}>WiFi Connected</Text>
        <Text style={styles.warningText}>
          Perfect! You're ready to download
        </Text>
      </View>
    );
  };
  
  const renderContent = () => {
    if (downloadState === 'complete') {
      return (
        <Animated.View
          style={[
            styles.completeContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.completeIcon}>✨</Text>
          <Text style={styles.completeTitle}>AI Coach Ready!</Text>
          <Text style={styles.completeText}>
            Your personal chess coach is ready to help you improve
          </Text>
        </Animated.View>
      );
    }
    
    if (downloadState === 'downloading') {
      return (
        <View style={styles.downloadingContainer}>
          <Text style={styles.downloadIcon}>🤖</Text>
          <Text style={styles.downloadTitle}>Downloading AI Coach</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          
          <View style={styles.downloadStats}>
            <Text style={styles.downloadStat}>{downloadSpeed}</Text>
            <Text style={styles.downloadStat}>•</Text>
            <Text style={styles.downloadStat}>{timeRemaining}</Text>
          </View>
          
          {verifying && (
            <View style={{ marginTop: 8 }}>
              <ActivityIndicator color={theme.colors.primary.main} />
              <Text style={styles.downloadTip}>Verifying checksum…</Text>
            </View>
          )}
          {verified && (
            <Text style={[styles.downloadTip, { color: theme.colors.success }]}>Checksum verified ✓</Text>
          )}
          
          <Text style={styles.downloadTip}>
            Keep the app open while downloading
          </Text>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              premiumService.cancelDownload();
              setDownloadState('waiting');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel Download</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.waitingContainer}>
        <Animated.Text
          style={[
            styles.modelIcon,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          🧠
        </Animated.Text>
        <Text style={styles.modelTitle}>AI Coach Download</Text>
        <Text style={styles.modelSize}>1.5 GB</Text>
        
        {renderNetworkWarning()}
        
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureText}>Natural language coaching</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Personalized insights</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✈️</Text>
            <Text style={styles.featureText}>Works completely offline</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.downloadButton,
            (!isConnected || networkType === 'cellular') && styles.downloadButtonWarning,
          ]}
          onPress={handleDownload}
          disabled={!isConnected}
        >
          <LinearGradient
            colors={
              !isConnected 
                ? ['#999', '#666'] 
                : networkType === 'cellular'
                ? ['#FF6B6B', '#FF5252']
                : ['#4CAF50', '#45A049']
            }
            style={styles.downloadGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.downloadButtonText}>
              {!isConnected 
                ? 'No Internet Connection' 
                : networkType === 'cellular'
                ? 'Download on Cellular'
                : 'Download on WiFi'
              }
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Download Later</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {renderContent()}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  waitingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  modelIcon: {
    fontSize: 100,
    marginBottom: theme.spacing.lg,
  },
  modelTitle: {
    ...theme.typography.headlineLarge,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  modelSize: {
    ...theme.typography.titleLarge,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
  },
  warningBox: {
    backgroundColor: theme.colors.surface.elevated,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...theme.elevation[2],
  },
  cellularWarning: {
    backgroundColor: theme.colors.warning + '20',
  },
  wifiBox: {
    backgroundColor: theme.colors.success + '20',
  },
  warningIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  warningTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  warningText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  features: {
    marginBottom: theme.spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  featureText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.primary,
  },
  downloadButton: {
    width: '100%',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  downloadButtonWarning: {
    opacity: 0.9,
  },
  downloadGradient: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  downloadButtonText: {
    ...theme.typography.titleMedium,
    color: 'white',
    fontWeight: 'bold',
  },
  skipButton: {
    padding: theme.spacing.md,
  },
  skipButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.text.secondary,
  },
  downloadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  downloadIcon: {
    fontSize: 80,
    marginBottom: theme.spacing.lg,
  },
  downloadTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xl,
  },
  progressContainer: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.surface.container,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.main,
  },
  progressText: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  downloadStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  downloadStat: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.secondary,
    marginHorizontal: theme.spacing.sm,
  },
  downloadTip: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  cancelButton: {
    padding: theme.spacing.md,
  },
  cancelButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.error,
  },
  completeContainer: {
    alignItems: 'center',
  },
  completeIcon: {
    fontSize: 100,
    marginBottom: theme.spacing.lg,
  },
  completeTitle: {
    ...theme.typography.headlineLarge,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  completeText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});