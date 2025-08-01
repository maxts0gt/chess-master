# 🔗 Frontend-Backend Connection Guide

## ✅ Connection Setup Complete!

The frontend and backend are now configured to work together. Here's how to test everything:

## 🚀 Quick Start

### 1. Start the Backend
```bash
cd backend
./target/release/chess-app
```
You should see:
```
🚀 Chess App server running on http://0.0.0.0:8080
📱 Ready for mobile connections!
🤖 AI coaching system initialized
```

### 2. Start the Frontend
```bash
cd ChessApp
npm start
# Then press 'a' for Android or 'i' for iOS
```

## 📱 Testing Instructions

### Android Emulator (Recommended for Testing)
- Backend URL: `http://10.0.2.2:8080/api/v1`
- Already configured as default
- Just run the app!

### iOS Simulator
- Backend URL: `http://localhost:8080/api/v1`
- Update in `src/services/api.ts` if needed

### Physical Device
1. Find your computer's IP address
2. Update `BACKEND_URL` in `src/services/api.ts`
3. Ensure device is on same WiFi network

## 🧪 Test Flow

### 1. Test Connection Screen
- Open the app
- Navigate to "Test Backend" (red button at bottom)
- Test each endpoint:
  - ✅ Health Check - Should show backend version
  - ✅ Registration - Creates new test user
  - ✅ Chess Analysis - Tests engine integration

### 2. Test User Flow
1. **Register New User**
   - Tap "Get Started" on splash screen
   - Enter username, email, password
   - Should navigate to home screen

2. **Login Existing User**
   - Use email and password
   - Should see user stats on home screen

3. **Test Features**
   - **Puzzle Deathmatch**: Rapid tactical puzzles
   - **AI Training**: Select AI personality and get coaching
   - **Play Chess**: Interactive chess board

## 🔧 Troubleshooting

### Connection Refused
```
Error: Network request failed
```
**Solution**: 
- Check backend is running
- Verify correct IP/URL
- Check firewall settings

### CORS Issues
```
Error: CORS policy blocked
```
**Solution**: Backend already has permissive CORS enabled

### Authentication Errors
```
Error: Invalid token
```
**Solution**: 
- Clear app data
- Login again
- Check JWT_SECRET matches

### Database Errors
```
Error: Database connection failed
```
**Solution**:
- Check `chess.db` exists in backend folder
- Run migrations: `cd backend && cargo run`

## 📊 What's Working

### ✅ Implemented Features
- User registration and login
- JWT authentication
- Chess position analysis
- User profile and stats
- Basic game creation
- AI personality selection

### 🚧 In Progress
- Real puzzle database
- Multiplayer games
- Advanced AI coaching
- Opening book
- Tournament mode

## 🎮 Demo Scenarios

### Scenario 1: New Player Experience
1. Register new account
2. Complete onboarding
3. Try first puzzle
4. Get AI coaching feedback

### Scenario 2: Training Session
1. Login existing user
2. Select "Puzzle Deathmatch"
3. Solve rapid puzzles
4. View improvement stats

### Scenario 3: AI Coaching
1. Navigate to AI Training
2. Select personality (e.g., Tactical Assassin)
3. Analyze current position
4. Get personalized tips

## 🚀 Next Steps

1. **Add Real Puzzles**: Connect to Lichess puzzle API
2. **Implement WebSocket**: For real-time games
3. **Add Stockfish**: For deeper analysis
4. **Deploy Beta**: Get user feedback
5. **Monetization**: Implement premium features

## 📱 App Store Preparation

When ready for production:
1. Update `BACKEND_URL` to production server
2. Remove test connection screen
3. Add proper error handling
4. Implement offline mode
5. Add analytics

## 🎉 Success!

Your chess app now has:
- ✅ Working authentication
- ✅ Backend API integration  
- ✅ Chess engine connectivity
- ✅ User progress tracking
- ✅ AI coaching system

The foundation is solid and ready for feature expansion!