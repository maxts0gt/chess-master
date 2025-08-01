#!/bin/bash

echo "🔧 Chess App Backend Connection Setup"
echo "===================================="

# Get the local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    echo "⚠️  Please manually set your IP address"
    LOCAL_IP="YOUR_IP_HERE"
fi

echo ""
echo "📱 Connection Instructions:"
echo ""
echo "1. For Android Emulator:"
echo "   - URL: http://10.0.2.2:8080/api/v1"
echo "   - No changes needed (default configuration)"
echo ""
echo "2. For iOS Simulator:"
echo "   - URL: http://localhost:8080/api/v1"
echo "   - Update BACKEND_URL in src/services/api.ts"
echo ""
echo "3. For Physical Device:"
echo "   - Your IP: $LOCAL_IP"
echo "   - URL: http://$LOCAL_IP:8080/api/v1"
echo "   - Update BACKEND_URL in src/services/api.ts"
echo ""
echo "4. Make sure backend is running:"
echo "   cd ../backend && ./target/release/chess-app"
echo ""
echo "5. For network issues:"
echo "   - Ensure device is on same WiFi network"
echo "   - Check firewall settings"
echo "   - Try disabling VPN if connected"
echo ""

# Ask if user wants to update the config
read -p "Do you want to update the API config now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Select your testing environment:"
    echo "1) Android Emulator (default)"
    echo "2) iOS Simulator"
    echo "3) Physical Device"
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        2)
            sed -i '' "s|http://10.0.2.2:8080/api/v1|http://localhost:8080/api/v1|g" src/services/api.ts
            echo "✅ Updated for iOS Simulator"
            ;;
        3)
            sed -i '' "s|http://10.0.2.2:8080/api/v1|http://$LOCAL_IP:8080/api/v1|g" src/services/api.ts
            echo "✅ Updated for Physical Device (IP: $LOCAL_IP)"
            ;;
        *)
            echo "✅ Keeping Android Emulator configuration"
            ;;
    esac
fi

echo ""
echo "🚀 Ready to test! Run 'npm start' to begin."