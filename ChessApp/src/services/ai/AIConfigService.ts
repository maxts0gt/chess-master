import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiProviders } from './ProviderRegistry';

export type AIMode = 'auto' | 'fast' | 'balanced' | 'deep';

const STORAGE_KEY = '@ChessApp:AIMode';

class AIConfigService {
  private mode: AIMode = 'balanced';

  async initialize(): Promise<void> {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'auto' || saved === 'fast' || saved === 'balanced' || saved === 'deep') {
      this.mode = saved;
    }
  }

  getMode(): AIMode { return this.mode; }

  async setMode(mode: AIMode): Promise<void> {
    this.mode = mode;
    await AsyncStorage.setItem(STORAGE_KEY, mode);
    await this.applyBestProvider();
  }

  /**
   * Choose provider/model without exposing technical terms.
   * - auto/balanced: local 3B if available; else prompt download (handled by premium service)
   * - fast: use smallest available local; fall back to basic explanations
   * - deep: prefer 7B if device can handle; else 3B
   */
  async applyBestProvider(): Promise<void> {
    await aiProviders.initialize();
    const provider = aiProviders.getCurrent();
    // Choose model by mode
    try {
      const models = await provider.getAvailableModels();
      let pick = models[0];
      if (this.mode === 'deep') {
        pick = (models.find(m => m.capability === 'advanced') || models[models.length - 1]);
      } else if (this.mode === 'fast') {
        pick = models[0];
      } else {
        // balanced/auto
        pick = (models.find(m => m.capability === 'standard') || models[0]);
      }
      await provider.setModel(pick.id);
      await provider.initialize();
    } catch {
      // Provider/model init failure is non-fatal; coach facade will handle fallback
    }
  }
}

export const aiConfigService = new AIConfigService();