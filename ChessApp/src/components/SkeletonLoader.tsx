import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'chessboard';
}

const { width: screenWidth } = Dimensions.get('window');

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height,
  borderRadius = 4,
  style,
  variant = 'rect',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'text':
        return {
          width: width || '100%',
          height: height || 16,
          borderRadius: 4,
        };
      case 'circle':
        return {
          width: width || 50,
          height: height || 50,
          borderRadius: 25,
        };
      case 'card':
        return {
          width: width || '100%',
          height: height || 200,
          borderRadius: 12,
        };
      case 'chessboard':
        return {
          width: width || screenWidth - 40,
          height: height || screenWidth - 40,
          borderRadius: 8,
        };
      default:
        return {
          width: width || '100%',
          height: height || 100,
          borderRadius: borderRadius,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[
        styles.container,
        variantStyles,
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
};

// Preset skeleton components
export const TextSkeleton: React.FC<{ lines?: number; style?: ViewStyle }> = ({
  lines = 3,
  style,
}) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        variant="text"
        width={index === lines - 1 ? '80%' : '100%'}
        style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
      />
    ))}
  </View>
);

export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <SkeletonLoader variant="rect" height={150} style={{ marginBottom: 12 }} />
    <SkeletonLoader variant="text" height={20} style={{ marginBottom: 8 }} />
    <SkeletonLoader variant="text" height={16} width="80%" />
  </View>
);

export const ChessboardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.chessboardContainer, style]}>
    <SkeletonLoader variant="chessboard" />
    <View style={styles.chessboardInfo}>
      <SkeletonLoader variant="text" height={24} style={{ marginBottom: 8 }} />
      <SkeletonLoader variant="text" height={16} width="60%" />
    </View>
  </View>
);

export const ListItemSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.listItem, style]}>
    <SkeletonLoader variant="circle" width={50} height={50} />
    <View style={styles.listItemContent}>
      <SkeletonLoader variant="text" height={18} style={{ marginBottom: 6 }} />
      <SkeletonLoader variant="text" height={14} width="70%" />
    </View>
  </View>
);

export const PuzzleStatsSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.statsContainer, style]}>
    {Array.from({ length: 3 }).map((_, index) => (
      <View key={index} style={styles.statBox}>
        <SkeletonLoader variant="text" height={28} width={60} style={{ marginBottom: 4 }} />
        <SkeletonLoader variant="text" height={14} width={50} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  chessboardContainer: {
    alignItems: 'center',
    padding: 20,
  },
  chessboardInfo: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f172a',
    marginBottom: 1,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statBox: {
    alignItems: 'center',
  },
});

export default SkeletonLoader;