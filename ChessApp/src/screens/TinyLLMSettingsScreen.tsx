import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { tinyLLMExplainer } from '../services/tinyLLM/tinyLLMChessExplainer';
import { CHESS_MODELS } from '../services/onnx/onnxModelService';
import DeviceInfo from 'react-native-device-info';

const TinyLLMSettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState({
    ram: 0,
    storage: 0,
    supportsTinyLLM: false,
  });

  useEffect(() => {
    checkDeviceAndModel();
  }, []);

  const checkDeviceAndModel = async () => {
    // Check device capabilities
    const totalMemory = await DeviceInfo.getTotalMemory();
    const freeDiskStorage = await DeviceInfo.getFreeDiskStorage();
    
    setDeviceInfo({
      ram: Math.round(totalMemory / 1024 / 1024 / 1024 * 10) / 10, // GB
      storage: Math.round(freeDiskStorage / 1024 / 1024 / 1024 * 10) / 10, // GB
      supportsTinyLLM: totalMemory > 2 * 1024 * 1024 * 1024, // 2GB+ RAM
    });

    // Check current model
    const info = tinyLLMExplainer.getModelInfo();
    setModelInfo(info);
  };

  const handleDownloadModel = async (modelKey: 'CHESS_MINI' | 'CHESS_BASE') => {
    setLoading(true);
    setDownloadProgress(0);

    try {
      const success = await tinyLLMExplainer.downloadModel(modelKey);
      
      if (success) {
        Alert.alert(
          'Success!',
          'Tiny LLM model downloaded and loaded successfully. Your chess explanations will now be more natural and conversational!',
          [{ text: 'OK', onPress: checkDeviceAndModel }]
        );
      } else {
        Alert.alert('Error', 'Failed to download model. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to download model');
    } finally {
      setLoading(false);
      setDownloadProgress(0);
    }
  };

  const handleDeleteModel = () => {
    Alert.alert(
      'Delete Model',
      'Are you sure you want to delete the tiny LLM model? You will revert to basic explanations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await tinyLLMExplainer.deleteModel();
            checkDeviceAndModel();
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tiny LLM Settings</Text>
        <Text style={styles.subtitle}>
          Run AI explanations directly on your device
        </Text>
      </View>

      {/* Device Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Capabilities</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>RAM:</Text>
          <Text style={styles.value}>{deviceInfo.ram}GB</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Free Storage:</Text>
          <Text style={styles.value}>{deviceInfo.storage}GB</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Tiny LLM Support:</Text>
          <Text style={[styles.value, { color: deviceInfo.supportsTinyLLM ? '#10b981' : '#ef4444' }]}>
            {deviceInfo.supportsTinyLLM ? '✓ Supported' : '✗ Not Supported'}
          </Text>
        </View>
      </View>

      {/* Current Model */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Model</Text>
        {modelInfo?.hasModel ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Model:</Text>
              <Text style={styles.value}>{modelInfo.modelName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Size:</Text>
              <Text style={styles.value}>{formatBytes(modelInfo.modelSize)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDeleteModel}
            >
              <Text style={styles.buttonText}>Delete Model</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.noModelText}>No model installed</Text>
        )}
      </View>

      {/* Available Models */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Available Models</Text>
        
        {/* Chess Mini */}
        <View style={styles.modelOption}>
          <View style={styles.modelHeader}>
            <Text style={styles.modelName}>Chess Mini (25MB)</Text>
            <Text style={styles.modelSpeed}>⚡ Ultra Fast</Text>
          </View>
          <Text style={styles.modelDescription}>
            Basic conversational explanations. Perfect for quick responses and low-memory devices.
          </Text>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleDownloadModel('CHESS_MINI')}
            disabled={loading || modelInfo?.hasModel}
          >
            <Text style={styles.buttonText}>
              {modelInfo?.modelName === 'chess-mini-onnx' ? 'Installed' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chess Base */}
        <View style={styles.modelOption}>
          <View style={styles.modelHeader}>
            <Text style={styles.modelName}>Chess Base (180MB)</Text>
            <Text style={styles.modelSpeed}>🎯 Balanced</Text>
          </View>
          <Text style={styles.modelDescription}>
            Higher quality explanations with better context understanding. Recommended for most users.
          </Text>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleDownloadModel('CHESS_BASE')}
            disabled={loading || modelInfo?.hasModel}
          >
            <Text style={styles.buttonText}>
              {modelInfo?.modelName === 'chess-base-onnx' ? 'Installed' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>
            {downloadProgress > 0 
              ? `Downloading... ${downloadProgress}%`
              : 'Preparing download...'}
          </Text>
        </View>
      )}

      {/* Benefits */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why Use Tiny LLM?</Text>
        <Text style={styles.benefitItem}>✓ Natural, conversational explanations</Text>
        <Text style={styles.benefitItem}>✓ Works completely offline</Text>
        <Text style={styles.benefitItem}>✓ Privacy - no data leaves device</Text>
        <Text style={styles.benefitItem}>✓ Fast responses (under 1 second)</Text>
        <Text style={styles.benefitItem}>✓ No internet required</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#94a3b8',
  },
  value: {
    fontSize: 16,
    color: '#f1f5f9',
    fontWeight: '500',
  },
  noModelText: {
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
  },
  modelOption: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
    marginTop: 16,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  modelSpeed: {
    fontSize: 14,
    color: '#10b981',
  },
  modelDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  benefitItem: {
    fontSize: 15,
    color: '#cbd5e1',
    marginBottom: 8,
    lineHeight: 22,
  },
});

export default TinyLLMSettingsScreen;