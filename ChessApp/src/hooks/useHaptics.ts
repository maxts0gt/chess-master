import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const useHaptics = () => {
  const impact = useCallback(async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.impactAsync(style);
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
      }
    }
  }, []);

  const notification = useCallback(async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.notificationAsync(type);
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
      }
    }
  }, []);

  const selection = useCallback(async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
      }
    }
  }, []);

  return {
    // Piece interactions
    piecePickup: () => impact(Haptics.ImpactFeedbackStyle.Medium),
    pieceDrop: () => impact(Haptics.ImpactFeedbackStyle.Light),
    pieceCapture: () => impact(Haptics.ImpactFeedbackStyle.Heavy),
    
    // Game events
    moveSuccess: () => notification(Haptics.NotificationFeedbackType.Success),
    moveError: () => notification(Haptics.NotificationFeedbackType.Error),
    gameWon: () => notification(Haptics.NotificationFeedbackType.Success),
    gameLost: () => notification(Haptics.NotificationFeedbackType.Error),
    
    // UI interactions
    buttonPress: () => impact(Haptics.ImpactFeedbackStyle.Light),
    toggleSwitch: () => selection(),
    
    // Custom patterns
    puzzleSolved: async () => {
      await impact(Haptics.ImpactFeedbackStyle.Light);
      await new Promise(resolve => setTimeout(resolve, 100));
      await impact(Haptics.ImpactFeedbackStyle.Heavy);
    },
    
    countdown: async () => {
      for (let i = 0; i < 3; i++) {
        await impact(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      await impact(Haptics.ImpactFeedbackStyle.Heavy);
    },
  };
};