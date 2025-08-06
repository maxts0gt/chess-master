# Chess Master Mobile App

The ultimate offline chess experience with local AI coaching and secure P2P multiplayer.

## Features

- 🧠 **Offline AI**: Mistral AI runs entirely on-device
- ♟️ **Stockfish Engine**: World-class chess analysis  
- 🔐 **P2P Multiplayer**: Signal Protocol E2E encryption
- 🎮 **Training Modes**: Puzzles, daily challenges, AI coaching
- 📱 **Mobile First**: Optimized for iOS and Android

## Quick Start

```bash
# Install dependencies
npm install

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## AI Model Setup

Download and place Mistral model in:
- Android: `android/app/src/main/assets/models/`
- iOS: `ios/models/`

## Architecture

- React Native + TypeScript
- Mistral AI via llama.rn
- Stockfish WASM engine
- WebRTC + Signal Protocol
- 100% offline capable

See [Presidential Mode Setup](docs/PRESIDENTIAL_MODE_SETUP.md) for P2P multiplayer details.

---

*No servers. No tracking. Just chess.*