import React from 'react';
import { View, Text } from 'react-native';

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isUser,
  isStreaming = false
}) => {
  if (isUser) {
    // User message - bubble on the right
    return (
      <View className="w-full px-4 py-3 flex-row justify-end">
        <View className="max-w-[75%] bg-violet-500 rounded-3xl px-5 py-3">
          <Text className="text-white text-base leading-6">
            {message}
          </Text>
        </View>
      </View>
    );
  }

  // AI message - plain text on the left
  return (
    <View className="w-full px-4 py-3 flex-row justify-start">
      <View className="max-w-[85%]">
        <Text className="text-zinc-500 text-xs font-medium mb-2 uppercase tracking-wide">
          Borz AI
        </Text>
        <Text className="text-zinc-200 text-base leading-7">
          {message}
          {isStreaming && (
            <Text className="text-violet-500"> |</Text>
          )}
        </Text>
      </View>
    </View>
  );
};

