# Store Setup for In-App Purchases

## iOS App Store Configuration

1. **Create IAP Product in App Store Connect:**
   - Log into App Store Connect
   - Navigate to your app
   - Go to "In-App Purchases" → "+"
   - Select "Non-Consumable"
   - Product ID: `com.chessapp.procoach`
   - Reference Name: "Pro Coach Unlock"
   - Price: Tier 15 ($14.99)
   - Localized Display Name: "Pro Coach"
   - Description: "Unlock unlimited AI coaching to master chess"

2. **Add Required Capabilities:**
   - Open Xcode project
   - Select your target
   - Go to "Signing & Capabilities"
   - Add "In-App Purchase" capability

3. **Info.plist Updates:**
   ```xml
   <key>SKAdNetworkItems</key>
   <array>
     <dict>
       <key>SKAdNetworkIdentifier</key>
       <string>cstr6suwn9.skadnetwork</string>
     </dict>
   </array>
   ```

## Android Google Play Configuration

1. **Create IAP Product in Google Play Console:**
   - Log into Google Play Console
   - Navigate to your app
   - Go to "Monetize" → "In-app products"
   - Click "Create product"
   - Product ID: `pro_coach_unlock`
   - Name: "Pro Coach Unlock"
   - Description: "Unlock unlimited AI coaching"
   - Price: $14.99

2. **Update AndroidManifest.xml:**
   ```xml
   <uses-permission android:name="com.android.vending.BILLING" />
   ```

3. **Update build.gradle:**
   ```gradle
   dependencies {
     implementation 'com.android.billingclient:billing:6.0.0'
   }
   ```

## Testing

### iOS Testing:
1. Create Sandbox test accounts in App Store Connect
2. Sign out of production App Store account on device
3. Sign in with Sandbox account when prompted during purchase

### Android Testing:
1. Add test email addresses in Google Play Console
2. Upload signed APK to internal testing track
3. Test accounts can make purchases without charges

## Revenue Configuration

- **Apple Commission**: 15% (Small Business Program) or 30%
- **Google Commission**: 15% for first $1M/year, then 30%
- **Estimated Net Revenue**: ~$11-13 per sale

## Important Notes

1. **Product IDs must match** exactly in code and stores
2. **Wait 24-48 hours** after creating products for propagation
3. **Test thoroughly** before production release
4. **Keep receipts** for validation (handled by react-native-iap)