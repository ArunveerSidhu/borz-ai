import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useChatContext } from '@/context';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.85;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { chats, currentChatId, createNewChat, switchChat, deleteChat } = useChatContext();
  const [isAnimating, setIsAnimating] = useState(false);
  const translateX = useSharedValue(-SIDEBAR_WIDTH);

  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      translateX.value = withTiming(-SIDEBAR_WIDTH, { duration: 250 }, () => {
        runOnJS(setIsAnimating)(false);
      });
    }
  }, [visible]);

  const handleChatSelect = (chatId: string) => {
    switchChat(chatId);
    onClose();
  };

  const handleNewChat = () => {
    createNewChat();
    onClose();
  };

  const handleDeleteChat = (chatId: string, e: any) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Pan gesture for dragging the sidebar
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow dragging to the left (closing direction)
      const newTranslateX = Math.min(0, event.translationX);
      translateX.value = newTranslateX;
    })
    .onEnd((event) => {
      const dragDistance = Math.abs(event.translationX);
      const dragPercentage = dragDistance / SIDEBAR_WIDTH;
      
      // If dragged more than 30% or velocity is high enough, close the sidebar
      if (dragPercentage > 0.3 || event.velocityX < -500) {
        translateX.value = withTiming(-SIDEBAR_WIDTH, { duration: 200 });
        runOnJS(onClose)();
      } else {
        // Otherwise, snap back to open position
        translateX.value = withTiming(0, { duration: 200 });
      }
    })
    .enabled(visible);

  // Animated styles for sidebar
  const sidebarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Animated styles for backdrop with opacity following the translation
  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SIDEBAR_WIDTH, 0],
      [0, 1],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  if (!visible && !isAnimating) {
    return null;
  }

  return (
    <View 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 1000 
      }}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
          backdropAnimatedStyle,
        ]}
      >
        <Pressable 
          style={{ flex: 1 }}
          onPress={onClose}
        />
      </Animated.View>

      {/* Sidebar with Gesture Handler */}
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={[
            { 
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: SIDEBAR_WIDTH,
            },
            sidebarAnimatedStyle,
          ]}
        >
        <SafeAreaView className="flex-1 bg-zinc-900 border-r border-zinc-800" edges={['bottom', 'left']}>
          <View className="flex-1">
            {/* Header */}
            <View className="px-4 py-4 border-b border-zinc-800">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl items-center justify-center">
                    <Text className="text-white text-xl font-bold">B</Text>
                  </View>
                  <Text className="text-white text-xl font-semibold">Borz AI</Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  className="p-2 bg-zinc-800 rounded-lg active:bg-zinc-700"
                >
                  <Ionicons name="close" size={24} color="#a1a1aa" />
                </TouchableOpacity>
              </View>
              
              {/* New Chat Button */}
              <TouchableOpacity 
                onPress={handleNewChat}
                className="bg-violet-500 rounded-xl py-3 px-4 flex-row items-center justify-center gap-2 active:bg-violet-600"
              >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-semibold text-base">New Chat</Text>
              </TouchableOpacity>
            </View>

            {/* Chat History */}
            <ScrollView 
              className="flex-1 px-2 py-2"
              showsVerticalScrollIndicator={false}
            >
              {chats.length === 0 ? (
                <View className="flex-1 items-center justify-center py-20">
                  <Ionicons name="chatbubbles-outline" size={48} color="#52525b" />
                  <Text className="text-zinc-500 text-center text-base mt-4">
                    No chat history yet
                  </Text>
                  <Text className="text-zinc-600 text-center text-sm mt-2 px-8">
                    Start a new conversation to see it here
                  </Text>
                </View>
              ) : (
                <View>
                  <Text className="text-zinc-500 text-xs font-medium px-3 mb-2">
                    RECENT CHATS
                  </Text>
                  {chats.map((chat) => (
                    <TouchableOpacity
                      key={chat.id}
                      onPress={() => handleChatSelect(chat.id)}
                      className={`mx-1 mb-1 p-3 rounded-xl flex-row items-center justify-between ${
                        currentChatId === chat.id 
                          ? 'bg-violet-500/20 border border-violet-500/30' 
                          : 'bg-zinc-800/50 active:bg-zinc-800'
                      }`}
                    >
                      <View className="flex-1 mr-2">
                        <Text 
                          className={`text-base font-medium mb-1 ${
                            currentChatId === chat.id ? 'text-violet-300' : 'text-zinc-200'
                          }`}
                          numberOfLines={1}
                        >
                          {chat.title}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-zinc-500 text-xs">
                            {chat.messages.length} {chat.messages.length === 1 ? 'message' : 'messages'}
                          </Text>
                          <Text className="text-zinc-600">•</Text>
                          <Text className="text-zinc-500 text-xs">
                            {formatDate(chat.updatedAt)}
                          </Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        onPress={(e) => handleDeleteChat(chat.id, e)}
                        className="p-2 rounded-lg active:bg-zinc-700"
                      >
                        <Ionicons name="trash-outline" size={18} color="#71717a" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* User Profile Footer */}
            <View className="px-3 py-3 border-t border-zinc-800">
              <TouchableOpacity 
                className="flex-row items-center gap-3 p-3 rounded-xl bg-zinc-800/50 active:bg-zinc-800"
                onPress={() => {
                  onClose();
                  router.push('./settings' as any);
                }}
              >
                {/* Avatar */}
                <View className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 items-center justify-center">
                  <Text className="text-white text-lg font-bold">JD</Text>
                </View>
                
                {/* User Info */}
                <View className="flex-1">
                  <Text className="text-white text-base font-semibold mb-0.5">
                    John Doe
                  </Text>
                  <Text className="text-zinc-400 text-xs">
                    john.doe@example.com
                  </Text>
                </View>
                
                {/* Settings Icon */}
                <Ionicons name="settings-outline" size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

