import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MessageBubble, ChatInput, EmptyState, Sidebar, AttachmentBottomSheet } from '@/components';
import { useChatStore } from '@/stores';
import type { Message } from '@/stores';

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
  const currentChat = useChatStore(state => state.currentChat());
  const sendMessage = useChatStore(state => state.sendMessage);
  const sendMessageWithImage = useChatStore(state => state.sendMessageWithImage);
  const sendMessageWithDocument = useChatStore(state => state.sendMessageWithDocument);
  const refreshChats = useChatStore(state => state.refreshChats);
  const isThinking = useChatStore(state => state.isThinking);
  const isStreaming = useChatStore(state => state.isStreaming);
  const streamingMessage = useChatStore(state => state.streamingMessage);
  
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; type: 'camera' | 'photos' } | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const attachmentBottomSheetRef = useRef<BottomSheetModal>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStreamingRef = useRef(isStreaming);

  const messages = currentChat?.messages || [];

  // Load chats on mount
  useEffect(() => {
    refreshChats();
  }, []);

  // Track streaming state
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const scrollToBottom = (animated: boolean = true) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 50);
  };

  // Scroll on messages change
  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  // Smooth scroll during streaming with throttling
  useEffect(() => {
    if (isStreaming && streamingMessage) {
      scrollToBottom(false); // No animation during streaming for smoothness
    }
  }, [streamingMessage, isStreaming]);

  // Scroll when thinking starts
  useEffect(() => {
    if (isThinking) {
      scrollToBottom(true);
    }
  }, [isThinking]);

  const handleSend = async (text: string) => {
    try {
      if (selectedImage) {
        // Send message with image
        await sendMessageWithImage(text, selectedImage.uri);
        setSelectedImage(null);
      } else if (selectedDocument) {
        // Send message with document
        await sendMessageWithDocument(text, selectedDocument.uri, selectedDocument.name);
        setSelectedDocument(null);
      } else {
        // Send regular text message
        await sendMessage(text);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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

  const handleImageSelected = (uri: string, type: 'camera' | 'photos') => {
    console.log('Image selected:', uri, type);
    setSelectedImage({ uri, type });
  };

  const handleDocumentSelected = (uri: string, name: string, mimeType?: string) => {
    console.log('Document selected:', uri, name, mimeType);
    setSelectedDocument({ uri, name, mimeType });
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  const clearSelectedDocument = () => {
    setSelectedDocument(null);
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
            removeClippedSubviews={true}
          >
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.text}
                isUser={message.isUser}
                isStreaming={false}
                imageUri={message.imageUri}
                documentUri={message.documentUri}
                documentName={message.documentName}
              />
            ))}
            
            {/* Thinking indicator - shows before streaming starts */}
            {isThinking && (
              <View className="w-full px-4 py-3 flex-row justify-start">
                <View className="max-w-[85%]">
                  <Text className="text-zinc-500 text-xs font-medium mb-2 uppercase tracking-wide">
                    Borz AI
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 bg-violet-400 rounded-full opacity-100 animate-pulse" />
                    <View className="w-2 h-2 bg-violet-400 rounded-full opacity-75 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <View className="w-2 h-2 bg-violet-400 rounded-full opacity-50 animate-pulse" style={{ animationDelay: '300ms' }} />
                    <Text className="text-zinc-400 text-sm ml-1">Thinking...</Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Streaming message - shows during AI response */}
            {isStreaming && (
              <MessageBubble
                key="streaming-message"
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
            disabled={isThinking || isStreaming}
            onAttachmentPress={handleOpenAttachments}
            selectedImage={selectedImage}
            selectedDocument={selectedDocument}
            onClearImage={clearSelectedImage}
            onClearDocument={clearSelectedDocument}
          />
        </Animated.View>

        {/* Attachment Bottom Sheet */}
        <AttachmentBottomSheet 
          ref={attachmentBottomSheetRef}
          onImageSelected={handleImageSelected}
          onDocumentSelected={handleDocumentSelected}
        />
      </View>
    </SafeAreaView>
  );
};

