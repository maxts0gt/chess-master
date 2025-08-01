import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAPI } from '../services/api';
import { BACKEND_URL } from '../services/api';

const TestConnectionScreen = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({});
  const api = useAPI();

  const testHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await api.healthCheck();
      setResults(prev => ({ ...prev, health: { success: true, data: result } }));
      Alert.alert('Success', 'Health check passed!');
    } catch (error) {
      setResults(prev => ({ ...prev, health: { success: false, error: error.message } }));
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  const testRegistration = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const result = await api.register(
        `testuser${timestamp}`,
        `test${timestamp}@example.com`,
        'password123'
      );
      setResults(prev => ({ ...prev, register: { success: true, data: result } }));
      Alert.alert('Success', 'Registration successful!');
    } catch (error) {
      setResults(prev => ({ ...prev, register: { success: false, error: error.message } }));
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  const testAnalysis = async () => {
    setLoading(true);
    try {
      const result = await api.analyzePosition(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
      setResults(prev => ({ ...prev, analysis: { success: true, data: result } }));
      Alert.alert('Success', 'Position analysis complete!');
    } catch (error) {
      setResults(prev => ({ ...prev, analysis: { success: false, error: error.message } }));
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backend Connection Test</Text>
        <Text style={styles.url}>URL: {BACKEND_URL}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.healthButton]}
          onPress={testHealthCheck}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Health Check</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={testRegistration}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Registration</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.analysisButton]}
          onPress={testAnalysis}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Chess Analysis</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#60a5fa" style={styles.loader} />
      )}

      <View style={styles.results}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {Object.entries(results).map(([key, value]: [string, any]) => (
          <View key={key} style={styles.resultItem}>
            <Text style={styles.resultKey}>{key}:</Text>
            <Text style={[
              styles.resultValue,
              value.success ? styles.success : styles.error
            ]}>
              {value.success ? 'Success' : 'Failed'}
            </Text>
            {value.error && (
              <Text style={styles.errorText}>{value.error}</Text>
            )}
            {value.data && (
              <Text style={styles.dataText}>
                {JSON.stringify(value.data, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 10,
  },
  url: {
    fontSize: 14,
    color: '#94a3b8',
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  healthButton: {
    backgroundColor: '#10b981',
  },
  registerButton: {
    backgroundColor: '#3b82f6',
  },
  analysisButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  results: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 15,
  },
  resultItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  resultKey: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginBottom: 5,
  },
  resultValue: {
    fontSize: 14,
  },
  success: {
    color: '#10b981',
  },
  error: {
    color: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    marginTop: 5,
    fontSize: 12,
  },
  dataText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default TestConnectionScreen;