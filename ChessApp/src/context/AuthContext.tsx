import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
  email: string;
  elo_rating: number;
  subscription_tier: 'free' | 'paid' | 'premium';
  games_played: number;
  puzzles_solved: number;
  win_rate: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API Configuration
const BACKEND_URL = __DEV__ 
  ? 'http://localhost:8080/api/v1'  // Development
  : 'https://your-domain.com/api/v1';  // Production

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        return true;
      } else {
        console.error('Login failed:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        return true;
      } else {
        console.error('Registration failed:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};