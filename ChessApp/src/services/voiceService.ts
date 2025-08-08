/**
 * Voice Service
 * Text-to-speech for AI coach feedback with multiple voice personalities
 */

import Tts from 'react-native-tts';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VoiceSettings {
  enabled: boolean;
  rate: number;
  pitch: number;
  language: string;
  voiceId?: string;
}

class VoiceService {
  private initialized = false;
  private settings: VoiceSettings = {
    enabled: true,
    rate: 0.5,
    pitch: 1.0,
    language: 'en-US',
  };
  
  private voiceProfiles: Record<string, { rate: number; pitch: number; language: string }> = {
    magnus: { rate: 0.5, pitch: 1.0, language: 'en-US' },
    beth: { rate: 0.9, pitch: 1.2, language: 'en-US' },
    kasparov: { rate: 0.8, pitch: 0.9, language: 'en-US' },
    zen: { rate: 0.7, pitch: 1.0, language: 'en-US' },
    coach: { rate: 0.85, pitch: 1.0, language: 'en-US' },
  };

  private events: Record<string, string> = {
    check: 'Check!',
    checkmate: 'Checkmate!',
    stalemate: 'Stalemate',
    draw: 'Game drawn',
    resign: 'Resignation',
    timeout: 'Time out',
    promotion: 'Promotion!',
    capture: 'Capture',
    blunder: 'Blunder',
    brilliant: 'Brilliant',
    best: 'Best move',
    good: 'Good move',
    inaccuracy: 'Inaccuracy',
    mistake: 'Mistake',
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize TTS
      await Tts.getInitStatus();
      
      // Load saved settings
      const savedSettings = await AsyncStorage.getItem('@ChessApp:VoiceSettings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
      
      // Set default language
      await Tts.setDefaultLanguage(this.settings.language);
      await Tts.setDefaultRate(this.settings.rate);
      await Tts.setDefaultPitch(this.settings.pitch);
      
      // iOS specific settings
      if (Platform.OS === 'ios') {
        Tts.setDucking(true);
        await Tts.setIgnoreSilentSwitch('ignore');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize voice service:', error);
      this.settings.enabled = false;
    }
  }

  /**
   * Speak text with optional personality
   */
  async speak(text: string, personality?: string): Promise<void> {
    if (!this.settings.enabled || !text) return;

    try {
      // Stop any ongoing speech
      await Tts.stop();
      
      // Apply personality profile if provided
      if (personality && this.voiceProfiles[personality]) {
        const profile = this.voiceProfiles[personality];
        await Tts.setDefaultRate(profile.rate);
        await Tts.setDefaultPitch(profile.pitch);
        if (profile.language !== this.settings.language) {
          await Tts.setDefaultLanguage(profile.language);
        }
      }
      
      // Speak the text
      await Tts.speak(text);
      
      // Reset to default settings after speaking
      if (personality) {
        await Tts.setDefaultRate(this.settings.rate);
        await Tts.setDefaultPitch(this.settings.pitch);
        await Tts.setDefaultLanguage(this.settings.language);
      }
    } catch (error) {
      console.error('Speech error:', error);
    }
  }

  /**
   * Speak move notation with chess-specific pronunciation
   */
  async speakMove(move: string): Promise<void> {
    if (!this.settings.enabled) return;

    // Convert chess notation to speakable text
    let speakableMove = move
      .replace('K', 'King ')
      .replace('Q', 'Queen ')
      .replace('R', 'Rook ')
      .replace('B', 'Bishop ')
      .replace('N', 'Knight ')
      .replace('x', ' takes ')
      .replace('+', ' check')
      .replace('#', ' checkmate')
      .replace('O-O-O', 'Castle queenside')
      .replace('O-O', 'Castle kingside')
      .replace(/([a-h])([1-8])/g, '$1 $2');

    await this.speak(speakableMove);
  }

  /**
   * Announce game events
   */
  async announceGameEvent(event: string, details?: string): Promise<void> {
    if (!this.settings.enabled) return;

    const announcement = this.events[event] || event;
    await this.speak(announcement);
  }

  /**
   * Provide tactical hints
   */
  async speakHint(hint: string): Promise<void> {
    if (!this.settings.enabled) return;

    const hintPrefixes = [
      'Consider',
      'Think about',
      'Look at',
      'Don\'t forget',
      'Remember',
    ];

    const prefix = hintPrefixes[Math.floor(Math.random() * hintPrefixes.length)];
    await this.speak(`${prefix} ${hint}`);
  }

  /**
   * Stop any ongoing speech
   */
  async stop(): Promise<void> {
    try {
      await Tts.stop();
    } catch (error) {
      console.error('Failed to stop speech:', error);
    }
  }

  /**
   * Update voice settings
   */
  async updateSettings(settings: Partial<VoiceSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    
    // Save settings
    await AsyncStorage.setItem('@ChessApp:VoiceSettings', JSON.stringify(this.settings));
    
    // Apply new settings
    if (settings.rate !== undefined) {
      await Tts.setDefaultRate(settings.rate);
    }
    if (settings.pitch !== undefined) {
      await Tts.setDefaultPitch(settings.pitch);
    }
    if (settings.language !== undefined) {
      await Tts.setDefaultLanguage(settings.language);
    }
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const voices = await Tts.voices();
      return voices;
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Test voice with sample text
   */
  async testVoice(text = 'Welcome to Chess Master. I am your AI coach.'): Promise<void> {
    await this.speak(text);
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }
}

export const voiceService = new VoiceService();