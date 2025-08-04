/**
 * Pro Upgrade Modal
 * Beautiful upgrade experience for Pro Coach
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { purchaseService } from '../services/purchaseService';

interface ProUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  visible,
  onClose,
  onPurchaseComplete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [price, setPrice] = useState('$14.99');

  useEffect(() => {
    // Get localized price
    const loadPrice = async () => {
      await purchaseService.initialize();
      setPrice(purchaseService.getProPrice());
    };
    loadPrice();
  }, []);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const success = await purchaseService.purchasePro();
      if (success) {
        onPurchaseComplete();
        Alert.alert(
          '🎉 Welcome to Pro!',
          'Unlimited AI coaching is now unlocked. Enjoy improving your chess game!',
          [{ text: 'Awesome!', onPress: onClose }]
        );
      }
    } catch (error: any) {
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Purchase Failed',
          'Unable to complete purchase. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const restored = await purchaseService.restorePurchases();
      if (restored) {
        onPurchaseComplete();
        Alert.alert(
          'Purchases Restored',
          'Your Pro Coach access has been restored!',
          [{ text: 'Great!', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>🎓</Text>
              <Text style={styles.title}>Unlock Pro Coach</Text>
              <Text style={styles.subtitle}>
                Get unlimited AI coaching to master chess
              </Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              <FeatureItem
                emoji="♾️"
                title="Unlimited Coaching"
                description="Ask as many questions as you want"
              />
              <FeatureItem
                emoji="🧠"
                title="Advanced Analysis"
                description="Deep insights powered by Mistral 7B"
              />
              <FeatureItem
                emoji="🚀"
                title="Instant Responses"
                description="Get explanations in seconds"
              />
              <FeatureItem
                emoji="🔒"
                title="100% Private"
                description="Everything runs on your device"
              />
              <FeatureItem
                emoji="📱"
                title="Works Offline"
                description="No internet required after setup"
              />
            </View>

            {/* Price */}
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>One-time purchase</Text>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.priceNote}>Pay once, use forever</Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.purchaseButton, isLoading && styles.disabled]}
              onPress={handlePurchase}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.purchaseButtonText}>Unlock Pro Coach</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isLoading}
            >
              <Text style={styles.restoreButtonText}>Restore Purchase</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.closeButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const FeatureItem: React.FC<{
  emoji: string;
  title: string;
  description: string;
}> = ({ emoji, title, description }) => (
  <View style={styles.feature}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  features: {
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureEmoji: {
    fontSize: 32,
    marginRight: 16,
    width: 40,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#999',
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  priceLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 14,
    color: '#999',
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  restoreButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  disabled: {
    opacity: 0.6,
  },
});