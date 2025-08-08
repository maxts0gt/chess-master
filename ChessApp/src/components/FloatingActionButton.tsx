/**
 * Material Design 3 Floating Action Button
 * Expandable FAB with smooth animations and sub-actions
 */

import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Platform,
  Vibration,
} from 'react-native';
import { theme } from '../styles/theme';

interface FabAction {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FabAction[];
  mainIcon?: string;
  onMainPress?: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions,
  mainIcon = '⚡',
  onMainPress,
}) => {
  const [expanded, setExpanded] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    if (onMainPress && !expanded) {
      onMainPress();
      return;
    }

    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);

    if (Platform.OS === 'ios') {
      Vibration.vibrate([0, 10]);
    }

    Animated.parallel([
      Animated.spring(animatedValue, {
        toValue,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderAction = (action: FabAction, index: number) => {
    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -(60 * (index + 1))],
    });

    const scale = animatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
    });

    const opacity = animatedValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.5, 1],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.actionContainer,
          {
            transform: [{ translateY }, { scale }],
            opacity,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.labelContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateX: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Animated.View>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: action.color || theme.colors.primary.light },
          ]}
          onPress={() => {
            action.onPress();
            toggleExpand();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>{action.icon}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const mainButtonScale = animatedValue.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [1, 1.1, 1],
  });

  return (
    <View style={styles.container}>
      {actions.map((action, index) => renderAction(action, index))}
      
      <TouchableOpacity
        style={styles.mainButton}
        onPress={toggleExpand}
        activeOpacity={0.9}
      >
        <Animated.View
          style={[
            styles.mainButtonInner,
            {
              transform: [
                { rotate: rotation },
                { scale: mainButtonScale },
              ],
            },
          ]}
        >
          <Text style={styles.mainIcon}>{expanded ? '✕' : mainIcon}</Text>
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={toggleExpand}
            activeOpacity={1}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.text.primary,
    zIndex: -1,
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation[4],
  },
  mainButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainIcon: {
    fontSize: 24,
    color: theme.colors.primary.contrast,
  },
  actionContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 56,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    ...theme.elevation[3],
  },
  actionIcon: {
    fontSize: 20,
    color: theme.colors.primary.contrast,
  },
  labelContainer: {
    backgroundColor: theme.colors.surface.elevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    ...theme.elevation[2],
  },
  actionLabel: {
    ...theme.typography.labelLarge,
    color: theme.colors.text.primary,
    fontWeight: '600'
  },
});