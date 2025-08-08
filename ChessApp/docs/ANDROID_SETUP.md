# Android Setup (Camera + QR + WebRTC)

Add the following to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest ...>
  <uses-permission android:name="android.permission.CAMERA" />
  <application ...>
    <!-- If using file provider for RNFS, ensure provider is configured here -->
  </application>
</manifest>
```

ProGuard/R8 rules in `android/app/proguard-rules.pro`:

```
-keep class org.webrtc.** { *; }
-keep class com.oney.WebRTCModule.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class org.reactnative.camera.** { *; }
-keep class com.reactnativecommunity.** { *; }
```

Gradle dependencies (auto-linked by RN >=0.60):
- react-native-qrcode-scanner
- react-native-permissions
- react-native-camera (or vision-camera alternative)
- react-native-svg

Notes
- On Android 12+, include `android:exported` where required.
- If shrinking is enabled, confirm QR scanner and WebRTC work in release builds.