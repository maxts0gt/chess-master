import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private fadeAnim = new Animated.Value(0);
  private scaleAnim = new Animated.Value(0.9);

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to crash analytics in production
    if (!__DEV__) {
      // Send to your crash reporting service
      // Example: Sentry.captureException(error);
    }

    this.setState({
      error,
      errorInfo,
    });

    // Animate error screen
    Animated.parallel([
      Animated.timing(this.fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(this.scaleAnim, {
        toValue: 1,
        damping: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }

  handleRestart = async () => {
    // Clear cache and restart
    try {
      await AsyncStorage.clear();
      if (Updates.isAvailable) {
        await Updates.reloadAsync();
      } else {
        // For development
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          showDetails: false,
        });
      }
    } catch (e) {
      console.error('Failed to restart:', e);
    }
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Animated.View
          style={[
            styles.container,
            {
              opacity: this.fadeAnim,
              transform: [{ scale: this.scaleAnim }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Icon name="alert-circle" size={80} color="#e74c3c" />
              </View>

              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>
                Don't worry, your game progress has been saved.
              </Text>

              <View style={styles.errorInfo}>
                <Text style={styles.errorMessage}>
                  {this.state.error?.message || 'An unexpected error occurred'}
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={this.handleRestart}
                >
                  <Icon name="restart" size={20} color="#000" />
                  <Text style={styles.primaryButtonText}>Restart App</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={this.toggleDetails}
                >
                  <Text style={styles.secondaryButtonText}>
                    {this.state.showDetails ? 'Hide' : 'Show'} Details
                  </Text>
                  <Icon
                    name={this.state.showDetails ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {this.state.showDetails && (
                <View style={styles.details}>
                  <Text style={styles.detailsTitle}>Error Details</Text>
                  <ScrollView
                    style={styles.detailsScroll}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    <Text style={styles.detailsText}>
                      {this.state.error?.stack}
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo?.componentStack}
                    </Text>
                  </ScrollView>
                </View>
              )}

              <View style={styles.tips}>
                <Text style={styles.tipsTitle}>Quick Fixes:</Text>
                <View style={styles.tip}>
                  <Icon name="wifi" size={16} color="#666" />
                  <Text style={styles.tipText}>Check your internet connection</Text>
                </View>
                <View style={styles.tip}>
                  <Icon name="update" size={16} color="#666" />
                  <Text style={styles.tipText}>Update the app to the latest version</Text>
                </View>
                <View style={styles.tip}>
                  <Icon name="cached" size={16} color="#666" />
                  <Text style={styles.tipText}>Clear app cache in settings</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 30,
    textAlign: 'center',
  },
  errorInfo: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  errorMessage: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginBottom: 30,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#999',
    fontSize: 14,
    marginRight: 5,
  },
  details: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginBottom: 30,
  },
  detailsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailsScroll: {
    maxHeight: 200,
  },
  detailsText: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  tips: {
    width: '100%',
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipText: {
    color: '#999',
    fontSize: 14,
    marginLeft: 10,
  },
});

export default ErrorBoundary;