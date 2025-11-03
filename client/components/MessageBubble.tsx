import React, { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  isStreaming?: boolean;
  imageUri?: string;
  documentUri?: string;
  documentName?: string;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ message, isUser, isStreaming = false, imageUri, documentUri, documentName }) => {
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (isStreaming) {
      // Simple cursor blink animation
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(cursorOpacity);
      cursorOpacity.value = 0;
    }
    
    return () => {
      cancelAnimation(cursorOpacity);
    };
  }, [isStreaming]);

  const cursorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  if (isUser) {
    // User message - bubble on the right
    return (
      <Animated.View 
        entering={FadeInDown.duration(150)}
        className="w-full px-4 py-3 flex-row justify-end"
      >
        <View className="max-w-[75%] bg-violet-500 rounded-3xl px-5 py-3">
          {imageUri && (
            <Image 
              source={{ uri: imageUri }}
              className="w-48 h-48 rounded-xl mb-3"
              resizeMode="cover"
            />
          )}
          {documentUri && documentName && (
            <View className="bg-white/10 rounded-xl p-3 mb-3 flex-row items-center gap-2">
              <View className="w-10 h-10 rounded-lg bg-white/20 items-center justify-center">
                <Ionicons name="document-text" size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-medium" numberOfLines={1}>
                  {documentName}
                </Text>
                <Text className="text-white/70 text-xs mt-0.5">
                  Document
                </Text>
              </View>
            </View>
          )}
          <Text className="text-white text-base leading-6">
            {message}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // AI message - formatted with markdown on the left with cursor
  // Don't use entering animation during streaming to avoid flicker
  const AnimatedContainer = isStreaming ? View : Animated.View;
  const animationProps = isStreaming ? {} : { entering: FadeIn.duration(150) };

  return (
    <AnimatedContainer 
      {...animationProps}
      className="w-full px-4 py-3"
    >
      <View className="w-full">
        <Text className="text-zinc-500 text-xs font-medium mb-2 uppercase tracking-wide">
          Borz AI
        </Text>
        {message ? (
          <MarkdownContent content={message} isStreaming={isStreaming} />
        ) : null}
        {isStreaming && (
          <Animated.Text 
            style={[
              { color: '#a78bfa', fontWeight: 'bold', marginTop: 4 },
              cursorAnimatedStyle
            ]}
          >
            ▊
          </Animated.Text>
        )}
      </View>
    </AnimatedContainer>
  );
};

export const MessageBubble = React.memo(
  MessageBubbleComponent,
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    // During streaming, only re-render if message actually changed
    if (nextProps.isStreaming) {
      return (
        prevProps.message === nextProps.message &&
        prevProps.isUser === nextProps.isUser &&
        prevProps.isStreaming === nextProps.isStreaming &&
        prevProps.imageUri === nextProps.imageUri &&
        prevProps.documentUri === nextProps.documentUri &&
        prevProps.documentName === nextProps.documentName
      );
    }
    
    // For non-streaming, prevent re-render if everything is the same
    return (
      prevProps.message === nextProps.message &&
      prevProps.isUser === nextProps.isUser &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.imageUri === nextProps.imageUri &&
      prevProps.documentUri === nextProps.documentUri &&
      prevProps.documentName === nextProps.documentName
    );
  }
);

MessageBubble.displayName = 'MessageBubble';
