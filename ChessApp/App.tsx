import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar, StyleSheet} from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import GameScreen from './src/screens/GameScreen';
import PuzzleScreen from './src/screens/PuzzleScreen';
import SplashScreen from './src/screens/SplashScreen';

// Import context
import {AuthProvider} from './src/context/AuthContext';

const Stack = createStackNavigator();

function App(): JSX.Element {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
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
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});

export default App;