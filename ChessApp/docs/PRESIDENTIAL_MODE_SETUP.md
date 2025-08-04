# Presidential Mode™ - Technical Setup Guide

## Overview

Presidential Mode™ is an ultra-secure P2P chess feature designed for high-profile users who require:
- Complete privacy (no servers involved)
- End-to-end encryption (Signal Protocol)
- Auto-burn after game completion
- Encrypted in-game chat

## Technical Architecture

### 1. P2P Connection (WebRTC)
- Direct peer-to-peer connection
- STUN servers for NAT traversal
- No TURN servers (pure P2P only)
- Data channel for moves and chat

### 2. E2E Encryption (Signal Protocol)
- Signal Protocol for all communications
- 256-bit encryption keys
- Perfect forward secrecy
- Identity verification via out-of-band exchange

### 3. Connection Flow
```
Player A (Host)              Player B (Join)
     |                            |
     |-- Generate Code -->        |
     |                            |
     |<-- Exchange via secure --> |
     |     channel (QR/NFC)       |
     |                            |
     |-- WebRTC Offer -->         |
     |<-- WebRTC Answer --        |
     |                            |
     |-- Signal Bundle -->        |
     |<-- Signal Bundle --        |
     |                            |
     |===== Encrypted P2P ======= |
```

## iOS Setup

### 1. Info.plist Additions
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access for QR code scanning in Presidential Mode</string>

<key>NSLocalNetworkUsageDescription</key>
<string>Local network access for P2P chess connections</string>
```

### 2. Capabilities
- Enable "Network Extensions" for P2P
- Enable "Background Modes" → "Voice over IP"

### 3. Pod Installation
```bash
cd ios && pod install
```

## Android Setup

### 1. AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

### 2. ProGuard Rules
```
-keep class org.webrtc.** { *; }
-keep class com.oney.WebRTCModule.** { *; }
```

## Security Features

### 1. Connection Security
- Game codes are single-use
- Codes expire after 5 minutes
- No codes stored on any server

### 2. Data Security
- All game data encrypted with Signal Protocol
- Chess moves validated on both sides
- Anti-cheat via Stockfish validation

### 3. Privacy Features
- No user data collected
- No game history saved
- Auto-burn on disconnect
- No reconnection possible

## Monetization

Presidential Mode™ is a premium feature:
- Requires Pro Coach unlock ($14.99)
- Positioned as "executive-level security"
- Perfect for:
  - Government officials
  - Corporate executives
  - Privacy-conscious users

## Testing

### 1. Local Testing
```javascript
// Test with two devices on same network
// Device 1: Host game, get code
// Device 2: Join with code
```

### 2. Security Testing
- Verify E2E encryption with packet inspection
- Test auto-burn on disconnect
- Verify no data persistence

## Troubleshooting

### Connection Issues
1. Ensure both devices on same network (for testing)
2. Check firewall settings
3. Verify WebRTC permissions granted

### Encryption Issues
1. Clear Signal Protocol data
2. Regenerate identity keys
3. Exchange new game codes

## Future Enhancements

1. **QR Code Exchange**: Scan codes instead of manual entry
2. **NFC Pairing**: Tap phones to connect
3. **TURN Server Option**: For guaranteed connectivity
4. **Voice Chat**: Encrypted voice during games
5. **Tournament Mode**: Secure multi-player tournaments