import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import offlineStorage from './src/services/offlineStorage';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import GameScreen from './src/screens/GameScreen';
import PuzzleScreen from './src/screens/PuzzleScreen';
import SplashScreen from './src/screens/SplashScreen';
import TestConnectionScreen from './src/screens/TestConnectionScreen';
import LobbyBrowserScreen from './src/screens/LobbyBrowserScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SessionCompleteScreen from './src/screens/SessionCompleteScreen';
import GameRoomScreen from './src/screens/GameRoomScreen';
import TacticalPuzzleScreen from './src/screens/TacticalPuzzleScreen';
import DeathmatchSessionScreen from './src/screens/DeathmatchSessionScreen';
import DailyChallengeScreen from './src/screens/DailyChallengeScreen';
import AICoachingScreen from './src/screens/AICoachingScreen';
import GameModeScreen from './src/screens/GameModeScreen';
import TinyLLMSettingsScreen from './src/screens/TinyLLMSettingsScreen';

// Import context
import {AuthProvider} from './src/context/AuthContext';

// Import components
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createStackNavigator();

function App(): JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.initialize().catch(console.error);
    
    // Check if this is the first launch
    checkFirstLaunch();
  }, []);
  
  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched) {
        setIsFirstLaunch(false);
        // Skip splash for returning users
        setShowSplash(false);
      } else {
        // Mark as launched for next time
        await AsyncStorage.setItem('hasLaunched', 'true');
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
    }
  };

  if (showSplash && isFirstLaunch) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar backgroundColor="#1e293b" barStyle="light-content" />
          <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1e293b',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{title: 'Chess Master'}}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{title: 'Login'}}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{title: 'Sign Up'}}
          />
          <Stack.Screen 
            name="Training" 
            component={TrainingScreen}
                          options={{title: 'AI Training'}}
            />
            <Stack.Screen
              name="GameMode"
              component={GameModeScreen}
              options={{title: 'New Game'}}
            />
            <Stack.Screen
              name="TinyLLMSettings"
              component={TinyLLMSettingsScreen}
              options={{title: 'Tiny LLM Settings'}}
            />
            <Stack.Screen 
              name="Game" 
            component={GameScreen}
            options={{title: 'Play Chess'}}
          />
          <Stack.Screen 
            name="Puzzle" 
            component={PuzzleScreen}
            options={{title: 'Puzzle Deathmatch'}}
          />
          <Stack.Screen 
            name="TestConnection" 
            component={TestConnectionScreen}
            options={{title: 'Test Backend Connection'}}
          />
          <Stack.Screen 
            name="LobbyBrowser" 
            component={LobbyBrowserScreen}
            options={{title: 'Online Games'}}
          />
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            options={{
              title: 'Get Started',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="SessionComplete" 
            component={SessionCompleteScreen}
            options={{
              title: 'Results',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="GameRoom" 
            component={GameRoomScreen}
            options={{
              title: 'Game Room',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="TacticalPuzzle" 
            component={TacticalPuzzleScreen}
            options={{
              title: 'Tactical Puzzle',
            }}
          />
          <Stack.Screen 
            name="DeathmatchSession" 
            component={DeathmatchSessionScreen}
            options={{
              title: 'Deathmatch Training',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="DailyChallenge" 
            component={DailyChallengeScreen}
            options={{
              title: 'Daily Challenge',
            }}
          />
          <Stack.Screen 
            name="AICoaching" 
            component={AICoachingScreen}
            options={{
              title: 'AI Chess Coach',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});

export default App;