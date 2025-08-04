# Technical Implementation Guide: Chess App Revamp

## 🎯 Goal: From Complex to Simple in 6 Weeks

### Current State → Target State
```
BEFORE: 10+ screens, server-dependent, complex
AFTER:  1 screen, 2 buttons, fully offline
```

## 📦 Week 1-2: Stockfish Integration

### Step 1: Clean House
```bash
# Remove unnecessary files
rm -rf src/services/ollamaService.ts
rm -rf src/services/tinyLLM/
rm -rf src/services/onnx/
rm -rf src/screens/GameModeScreen.tsx
rm -rf src/screens/TinyLLMSettingsScreen.tsx
rm -rf src/agents/
```

### Step 2: Install Stockfish Dependencies
```bash
npm install stockfish.js stockfish.wasm
# OR for native integration
npm install react-native-stockfish
```

### Step 3: Create Stockfish Service
```typescript
// src/services/stockfishService.ts
import { NativeModules } from 'react-native';

class StockfishService {
  private engine: any;
  
  async initialize() {
    // Load WASM or native module
    this.engine = await this.loadEngine();
  }
  
  async getBestMove(fen: string, depth: number = 12): Promise<string> {
    // UCI protocol implementation
    await this.engine.postMessage(`position fen ${fen}`);
    await this.engine.postMessage(`go depth ${depth}`);
    // Return best move in <200ms
  }
}

export const stockfish = new StockfishService();
```

## 🤖 Week 3-4: Mistral 7B Integration

### Step 1: Install llama.cpp React Native bindings
```bash
npm install react-native-llama
# OR
npm install @llama.rn/react-native
```

### Step 2: Download Quantized Model
```bash
# Download Mistral-7B-Instruct Q4_0 GGUF (~3.5GB)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_0.gguf
```

### Step 3: Create Coach Service
```typescript
// src/services/coachService.ts
class CoachService {
  private model: any;
  private contextTemplate = `You are a friendly chess coach. 
    The position is: {fen}
    The last move was: {move}
    Explain this move in 50 words or less, focusing on strategy.`;
  
  async initialize() {
    this.model = await loadModel('mistral-7b-q4.gguf');
  }
  
  async explainMove(fen: string, move: string): Promise<AsyncGenerator<string>> {
    const prompt = this.contextTemplate
      .replace('{fen}', fen)
      .replace('{move}', move);
    
    // Stream tokens for typewriter effect
    yield* this.model.complete(prompt, {
      max_tokens: 60,
      temperature: 0.7
    });
  }
}

export const coach = new CoachService();
```

## 🎨 Week 5: Two-Tap UX

### New App Structure
```
App.tsx (single file, ~300 lines total)
├── SplashScreen (2s while loading engines)
├── MainScreen
│   ├── PlayButton
│   ├── CoachButton
│   └── ActiveView (Board or Coach)
```

### Complete App.tsx Rewrite
```typescript
// App.tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChessBoard } from './src/components/ChessBoard';
import { CoachView } from './src/components/CoachView';
import { stockfish } from './src/services/stockfishService';
import { coach } from './src/services/coachService';

export default function App() {
  const [view, setView] = useState<'home' | 'play' | 'coach'>('home');
  const [fen, setFen] = useState('startpos');
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize engines on app start
    Promise.all([
      stockfish.initialize(),
      coach.initialize()
    ]).then(() => setLoading(false));
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  if (view === 'play') {
    return (
      <ChessBoard
        fen={fen}
        onMove={async (move) => {
          setLastMove(move);
          const aiMove = await stockfish.getBestMove(fen);
          setFen(/* new fen after AI move */);
        }}
        onBack={() => setView('home')}
      />
    );
  }

  if (view === 'coach') {
    return (
      <CoachView
        fen={fen}
        lastMove={lastMove}
        onBack={() => setView('home')}
      />
    );
  }

  // Home screen - just two buttons
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => setView('play')}
      >
        <Text style={styles.buttonText}>PLAY NOW</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => setView('coach')}
      >
        <Text style={styles.buttonText}>ASK COACH</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#1a1a1a'
  },
  button: {
    height: 120,
    backgroundColor: '#2e7d32',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20
  },
  buttonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white'
  }
});
```

## 💰 Week 6: Monetization

### Step 1: Install IAP Library
```bash
npm install react-native-iap
```

### Step 2: Create Purchase Service
```typescript
// src/services/purchaseService.ts
import { 
  initConnection,
  purchaseUpdatedListener,
  requestPurchase,
  getProducts,
  getPurchaseHistory
} from 'react-native-iap';

const PRODUCT_ID = 'com.yourapp.chess.pro';

class PurchaseService {
  async initialize() {
    await initConnection();
    
    // Check if user already purchased
    const history = await getPurchaseHistory();
    const hasPro = history.some(p => p.productId === PRODUCT_ID);
    
    // Store in secure storage
    await SecureStore.setItemAsync('hasPro', hasPro.toString());
  }
  
  async purchasePro() {
    try {
      await requestPurchase({ sku: PRODUCT_ID });
      await SecureStore.setItemAsync('hasPro', 'true');
      return true;
    } catch (err) {
      return false;
    }
  }
  
  async restorePurchases() {
    const history = await getPurchaseHistory();
    const hasPro = history.some(p => p.productId === PRODUCT_ID);
    await SecureStore.setItemAsync('hasPro', hasPro.toString());
    return hasPro;
  }
}
```

### Step 3: Add Coach Limit for Free Users
```typescript
// In CoachView component
const [dailyQuestions, setDailyQuestions] = useState(0);
const [isPro, setIsPro] = useState(false);

const handleAskCoach = async () => {
  if (!isPro && dailyQuestions >= 3) {
    // Show upgrade prompt
    Alert.alert(
      'Unlock Unlimited Coaching',
      'Get unlimited chess insights for just $14.99 - one time!',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Unlock Now', onPress: purchasePro }
      ]
    );
    return;
  }
  
  // Process coach request
  const explanation = coach.explainMove(fen, lastMove);
  // ... stream response
};
```

## 🚀 Performance Optimizations

### 1. Model Loading
```typescript
// Lazy load models
let stockfishInstance: any = null;
let coachInstance: any = null;

const getStockfish = async () => {
  if (!stockfishInstance) {
    stockfishInstance = await loadStockfish();
  }
  return stockfishInstance;
};
```

### 2. Memory Management
```typescript
// Unload coach model when not in use
const unloadCoach = () => {
  if (coachInstance && Date.now() - lastCoachUse > 60000) {
    coachInstance.unload();
    coachInstance = null;
  }
};
```

### 3. Battery Optimization
```typescript
// Limit CPU cores for chess engine
stockfish.setOptions({
  threads: 4, // Use only 4 cores
  hash: 128,  // Limit hash table size
});
```

## 📱 Platform-Specific Setup

### iOS
```xml
<!-- Info.plist -->
<key>UIRequiredDeviceCapabilities</key>
<array>
  <string>armv7</string>
  <string>metal</string>
</array>
```

### Android
```gradle
// android/app/build.gradle
android {
  packagingOptions {
    pickFirst '**/libc++_shared.so'
    pickFirst '**/libjsc.so'
  }
}
```

## ✅ Launch Checklist

- [ ] Stockfish responds in <200ms
- [ ] Coach first token in <1s
- [ ] Two-button UI works perfectly
- [ ] IAP tested on both platforms
- [ ] Restore purchases works
- [ ] App size <150MB (without model)
- [ ] Model downloads on first coach use
- [ ] Memory usage <1.5GB with model loaded
- [ ] Battery drain <10% per hour
- [ ] Works offline 100%

## 🎯 Success Criteria

1. **Speed**: Move in <200ms, coach in <1s first token
2. **Simplicity**: 2 taps to everything
3. **Reliability**: Works offline always
4. **Quality**: GM-level play, human-like coaching
5. **Monetization**: 3-5% conversion to Pro

This is how we build the chess app that beats all others: by doing less, but doing it perfectly.