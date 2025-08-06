/**
 * Haptic Feedback Service
 * Provides tactile feedback for chess interactions
 */

import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HapticSettings {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'heavy';
  enableForMoves: boolean;
  enableForCaptures: boolean;
  enableForUI: boolean;
  enableForAI: boolean;
}

class HapticService {
  private settings: HapticSettings = {
    enabled: true,
    intensity: 'medium',
    enableForMoves: true,
    enableForCaptures: true,
    enableForUI: true,
    enableForAI: true,
  };

  private hapticOptions = {
    light: {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    },
    medium: {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    },
    heavy: {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    },
  };

  async initialize(): Promise<void> {
    // Load saved settings
    const savedSettings = await AsyncStorage.getItem('@ChessApp:HapticSettings');
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }
  }

  /**
   * Piece movement feedback
   */
  moveFeedback(): void {
    if (!this.settings.enabled || !this.settings.enableForMoves) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate(10);
    }
  }

  /**
   * Piece capture feedback
   */
  captureFeedback(): void {
    if (!this.settings.enabled || !this.settings.enableForCaptures) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactMedium', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate([0, 20, 50, 30]);
    }
  }

  /**
   * Check/Checkmate feedback
   */
  checkFeedback(): void {
    if (!this.settings.enabled) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationWarning', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate([0, 100, 30, 100, 30, 100]);
    }
  }

  /**
   * Game over feedback
   */
  gameOverFeedback(won: boolean): void {
    if (!this.settings.enabled) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger(
        won ? 'notificationSuccess' : 'notificationError',
        this.hapticOptions[this.settings.intensity]
      );
    } else {
      if (won) {
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        Vibration.vibrate([0, 500]);
      }
    }
  }

  /**
   * UI interaction feedback
   */
  uiFeedback(): void {
    if (!this.settings.enabled || !this.settings.enableForUI) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate(5);
    }
  }

  /**
   * AI response feedback
   */
  aiFeedback(): void {
    if (!this.settings.enabled || !this.settings.enableForAI) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate([0, 10, 20, 10]);
    }
  }

  /**
   * Achievement unlocked feedback
   */
  achievementFeedback(): void {
    if (!this.settings.enabled) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationSuccess', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate([0, 100, 50, 100, 50, 200]);
    }
  }

  /**
   * Error feedback
   */
  errorFeedback(): void {
    if (!this.settings.enabled) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationError', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate([0, 300]);
    }
  }

  /**
   * Puzzle solved feedback
   */
  puzzleSolvedFeedback(): void {
    if (!this.settings.enabled) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationSuccess', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate([0, 50, 30, 50, 30, 100]);
    }
  }

  /**
   * Timer tick feedback
   */
  timerTickFeedback(): void {
    if (!this.settings.enabled) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('clockTick', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate(2);
    }
  }

  /**
   * Update haptic settings
   */
  async updateSettings(settings: Partial<HapticSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await AsyncStorage.setItem('@ChessApp:HapticSettings', JSON.stringify(this.settings));
  }

  /**
   * Test haptic feedback
   */
  testFeedback(): void {
    if (!this.settings.enabled) return;

    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactMedium', this.hapticOptions[this.settings.intensity]);
    } else {
      Vibration.vibrate([0, 100, 50, 100]);
    }
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }

  getSettings(): HapticSettings {
    return { ...this.settings };
  }
}

export const hapticService = new HapticService();