import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIProvider } from './AIProvider';
import { LocalMistralProvider } from './providers/LocalMistralProvider';

const STORAGE_KEY = '@ChessApp:AIProviderSelection';

class ProviderRegistry {
  private providers: Record<string, AIProvider> = {
    'local-mistral': new LocalMistralProvider(),
    // Future: 'local-gguf-llama', 'openai-gpt', 'anthropic-claude', etc.
  };
  private currentKey: string = 'local-mistral';

  async initialize(): Promise<void> {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && this.providers[saved]) {
      this.currentKey = saved;
    }
    await this.getCurrent().initialize();
  }

  list(): string[] { return Object.keys(this.providers); }

  getCurrent(): AIProvider { return this.providers[this.currentKey]; }

  async setCurrent(key: string): Promise<void> {
    if (!this.providers[key]) throw new Error('Unknown AI provider');
    this.currentKey = key;
    await AsyncStorage.setItem(STORAGE_KEY, key);
    await this.getCurrent().initialize();
  }
}

export const aiProviders = new ProviderRegistry();