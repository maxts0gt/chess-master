/**
 * AI Coach Chat Interface
 * Beautiful chat UI with typing animations and smart responses
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';
import { mistralChess } from '../services/mistralService';
import { premiumService } from '../services/premiumService';
import { voiceService } from '../services/voiceService';
import { hapticService } from '../services/hapticService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  typing?: boolean;
}

interface QuickPrompt {
  icon: string;
  text: string;
  prompt: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { icon: '🎯', text: 'Best move?', prompt: "What's the best move in this position?" },
  { icon: '💡', text: 'Give hint', prompt: "Can you give me a hint without revealing the answer?" },
  { icon: '📖', text: 'Explain position', prompt: "Can you explain the key features of this position?" },
  { icon: '⚔️', text: 'Find tactics', prompt: "Are there any tactical opportunities here?" },
  { icon: '🎓', text: 'Teach concept', prompt: "What chess concept should I learn from this position?" },
  { icon: '❓', text: 'Why bad?', prompt: "Why was my last move a mistake?" },
];

interface AICoachChatProps {
  fen: string;
  lastMove?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AICoachChat: React.FC<AICoachChatProps> = ({
  fen,
  lastMove,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: "Hi! I'm your AI chess coach. Ask me anything about your position!",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const typingDots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setHasAccess(premiumService.hasAIAccess());
    
    const unsubscribe = premiumService.subscribe((state) => {
      setHasAccess(state.hasAICoach && state.isModelDownloaded);
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Start typing dots animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingDots, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingDots, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !hasAccess) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Haptic feedback for sending message
    hapticService.uiFeedback();

    // Add typing indicator
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      typing: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Get AI response with context
      const context = `Current position: ${fen}${lastMove ? `\nLast move: ${lastMove}` : ''}`;
      const response = await mistralChess.askQuestion(context, text);

      // Remove typing indicator and add response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.typing);
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: response,
          sender: 'ai',
          timestamp: new Date(),
        };
        
        // Voice feedback for AI response
        if (voiceService.isEnabled()) {
          // Get current AI personality
          const personality = await AsyncStorage.getItem('@ChessApp:AIPersonality') || 'coach';
          voiceService.speak(response, personality);
        }
        
        // Haptic feedback for AI response
        hapticService.aiFeedback();
        
        return [...filtered, aiMessage];
      });
    } catch (error) {
      console.error('AI response error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.typing);
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: "I'm having trouble analyzing this position. Please try again.",
          sender: 'ai',
          timestamp: new Date(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsTyping(false);
    }
  }, [fen, lastMove, hasAccess]);

  const handleQuickPrompt = (prompt: string) => {
    if (hasAccess) {
      sendMessage(prompt);
    }
  };

  const renderMessage = (message: Message) => {
    if (message.typing) {
      return (
        <View key={message.id} style={[styles.messageBubble, styles.aiMessage]}>
          <View style={styles.typingIndicator}>
            <Animated.View
              style={[
                styles.typingDot,
                {
                  opacity: typingDots.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 1, 1, 0.3],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.typingDot,
                {
                  opacity: typingDots.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [0.3, 0.3, 1, 1],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.typingDot,
                {
                  opacity: typingDots.interpolate({
                    inputRange: [0, 0.3, 0.6, 1],
                    outputRange: [1, 0.3, 0.3, 1],
                  }),
                },
              ]}
            />
          </View>
        </View>
      );
    }

    const isUser = message.sender === 'user';
    return (
      <Animated.View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser && styles.userMessageContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateX: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isUser ? 50 : -50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.messageBubble, isUser ? styles.userMessage : styles.aiMessage]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {message.text}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Animated.View>
    );
  };

  if (!isOpen) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🤖</Text>
          <View>
            <Text style={styles.headerTitle}>AI Chess Coach</Text>
            <Text style={styles.headerSubtitle}>
              {hasAccess ? 'Ready to help' : 'Premium feature'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
      </ScrollView>

      {hasAccess ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickPromptsContainer}
            contentContainerStyle={styles.quickPromptsContent}
          >
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickPrompt}
                onPress={() => handleQuickPrompt(prompt.prompt)}
                disabled={isTyping}
              >
                <Text style={styles.quickPromptIcon}>{prompt.icon}</Text>
                <Text style={styles.quickPromptText}>{prompt.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your position..."
              placeholderTextColor={theme.colors.text.hint}
              multiline
              maxLength={500}
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color={theme.colors.primary.contrast} />
              ) : (
                <Text style={styles.sendIcon}>↑</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </>
      ) : (
        <View style={styles.upgradePrompt}>
          <Text style={styles.upgradeIcon}>🔒</Text>
          <Text style={styles.upgradeText}>Unlock AI Coach to get expert analysis</Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade for $9.99</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: theme.colors.background.default,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    ...theme.elevation[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface.container,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.secondary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  closeIcon: {
    fontSize: 24,
    color: theme.colors.text.secondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.lg,
  },
  messageContainer: {
    marginBottom: theme.spacing.md,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  userMessage: {
    backgroundColor: theme.colors.primary.main,
    borderBottomRightRadius: theme.borderRadius.xs,
  },
  aiMessage: {
    backgroundColor: theme.colors.surface.elevated,
    borderBottomLeftRadius: theme.borderRadius.xs,
  },
  messageText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
  },
  userMessageText: {
    color: theme.colors.primary.contrast,
  },
  timestamp: {
    ...theme.typography.labelSmall,
    color: theme.colors.text.hint,
    marginTop: theme.spacing.xs,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.text.secondary,
    marginHorizontal: 2,
  },
  quickPromptsContainer: {
    maxHeight: 60,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface.container,
  },
  quickPromptsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.elevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
  },
  quickPromptIcon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  quickPromptText: {
    ...theme.typography.labelMedium,
    color: theme.colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface.container,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface.container,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    marginRight: theme.spacing.sm,
    maxHeight: 100,
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
    color: theme.colors.primary.contrast,
    fontWeight: 'bold',
  },
  upgradePrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  upgradeIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  upgradeText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  upgradeButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.primary.contrast,
    fontWeight: 'bold',
  },
});