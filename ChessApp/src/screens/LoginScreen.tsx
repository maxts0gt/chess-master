import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {useAuth} from '../context/AuthContext';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {login} = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email.trim(), password);
      if (success) {
        navigation.navigate('Home');
      } else {
        Alert.alert('Login Failed', 'Invalid email or password');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back! ♔</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.linkButton}
        onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#dc2626',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#64748b',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 20,
    padding: 10,
  },
  linkText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoginScreen;