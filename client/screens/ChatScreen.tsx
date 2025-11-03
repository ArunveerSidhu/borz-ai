import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MessageBubble, ChatInput, EmptyState, Sidebar, AttachmentBottomSheet } from '@/components';
import { useChatContext } from '@/context';
import type { Message } from '@/context';

// Dummy AI responses for prototype
const dummyResponses = [
  "I'm Borz AI, your intelligent assistant. How can I help you today?",
  "That's an interesting question! Based on my understanding, here's what I think...",
  "I'd be happy to help you with that. Let me break it down for you.",
  "Great question! Here's a comprehensive answer to help you out.",
  "I understand what you're asking. Here's my take on it.",
  "That's a fascinating topic! Let me share some insights with you.",
  "I'm here to assist you. Based on your question, I'd recommend...",
  "Excellent question! Let me provide you with a detailed response.",
  "I see what you're getting at. Here's how I would approach this...",
  "Thanks for asking! I think the best way to look at this is..."
];

const getRandomResponse = () => {
  return dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
};

const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const ChatScreen: React.FC = () => {
  const { currentChat, sendMessage, createNewChat } = useChatContext();
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const attachmentBottomSheetRef = useRef<BottomSheetModal>(null);

  const messages = currentChat?.messages || [];

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, streamingMessage]);

  const handleSend = async (text: string) => {
    try {
      setIsTyping(true);
      setIsStreaming(true);
      setStreamingMessage('');

      // Send message with streaming callback
      await sendMessage(text, (chunk) => {
        setStreamingMessage(prev => prev + chunk);
      });

      // Clear streaming state after completion
      setStreamingMessage('');
      setIsStreaming(false);
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      setIsStreaming(false);
      setStreamingMessage('');
      // You might want to show an error message to the user
    }
  };

  const handleSuggestionPress = (text: string) => {
    handleSend(text);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleOpenAttachments = () => {
    attachmentBottomSheetRef.current?.present();
  };

  const handleAttachmentSelect = (optionId: string) => {
    // TODO: Implement attachment handling for camera, photos, and files
    console.log('Selected attachment option:', optionId);
  };

  // Animated keyboard handling - only for input
  const keyboard = useAnimatedKeyboard();
  const inputAnimatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      <View className="flex-1">
        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        
        {/* Floating Menu Button */}
        <TouchableOpacity
          onPress={toggleSidebar}
          className="absolute top-4 left-4 z-50 p-3 bg-zinc-800 rounded-xl active:bg-zinc-700"
          style={{ 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Ionicons name="menu" size={24} color="#a1a1aa" />
        </TouchableOpacity>
        
        {/* Chat Content - stays in place */}
        {messages.length === 0 ? (
          <EmptyState onSuggestionPress={handleSuggestionPress} />
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ paddingTop: 60, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message.text}
                isUser={message.isUser}
              />
            ))}
            
            {isTyping && !isStreaming && (
              <View className="w-full px-4 py-3 flex-row justify-start">
                <View className="max-w-[85%]">
                  <Text className="text-zinc-500 text-xs font-medium mb-2 uppercase tracking-wide">
                    Borz AI
                  </Text>
                  <View className="flex-row gap-1.5">
                    <View className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" />
                    <View className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <View className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </View>
                </View>
              </View>
            )}
            
            {isStreaming && streamingMessage && (
              <MessageBubble
                message={streamingMessage}
                isUser={false}
                isStreaming={true}
              />
            )}
          </ScrollView>
        )}
        
        {/* Input - moves up with keyboard */}
        <Animated.View style={inputAnimatedStyles}>
          <ChatInput 
            onSend={handleSend} 
            disabled={isTyping}
            onAttachmentPress={handleOpenAttachments}
          />
        </Animated.View>

        {/* Attachment Bottom Sheet */}
        <AttachmentBottomSheet 
          ref={attachmentBottomSheetRef}
          onOptionSelect={handleAttachmentSelect}
        />
      </View>
    </SafeAreaView>
  );
};

