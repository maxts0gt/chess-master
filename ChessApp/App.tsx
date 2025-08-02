import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar, StyleSheet} from 'react-native';
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

// Import context
import {AuthProvider} from './src/context/AuthContext';

// Import components
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createStackNavigator();

function App(): JSX.Element {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.initialize().catch(console.error);
  }, []);

  if (showSplash) {
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