import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SuggestionProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
}

const Suggestion: React.FC<SuggestionProps> = ({ icon, text, onPress }) => (
  <TouchableOpacity 
    onPress={onPress}
    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 active:bg-zinc-800"
  >
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 bg-zinc-800 rounded-xl items-center justify-center">
        <Ionicons name={icon} size={20} color="#a1a1aa" />
      </View>
      <Text className="flex-1 text-zinc-300 text-sm">{text}</Text>
    </View>
  </TouchableOpacity>
);

interface EmptyStateProps {
  onSuggestionPress: (text: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSuggestionPress }) => {
  const suggestions = [
    {
      icon: 'bulb-outline' as keyof typeof Ionicons.glyphMap,
      text: 'Explain quantum computing in simple terms'
    },
    {
      icon: 'code-slash' as keyof typeof Ionicons.glyphMap,
      text: 'Help me debug my React Native code'
    },
    {
      icon: 'book-outline' as keyof typeof Ionicons.glyphMap,
      text: 'Suggest a good book to read this month'
    },
    {
      icon: 'fitness' as keyof typeof Ionicons.glyphMap,
      text: 'Create a 30-day workout plan'
    }
  ];

  return (
    <View className="flex-1 justify-center px-4 pt-16 pb-20">
      <View className="items-center mb-12">
        <View className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl items-center justify-center mb-6">
          <Ionicons name="sparkles" size={40} color="white" />
        </View>
        <Text className="text-white text-3xl font-bold mb-2">Welcome to Borz AI</Text>
        <Text className="text-zinc-400 text-center text-base leading-6">
          Your intelligent assistant is ready to help you with anything you need
        </Text>
      </View>

      <View className="gap-3">
        <Text className="text-zinc-500 text-sm font-medium px-2 mb-1">
          Try asking me about...
        </Text>
        {suggestions.map((suggestion, index) => (
          <Suggestion
            key={index}
            icon={suggestion.icon}
            text={suggestion.text}
            onPress={() => onSuggestionPress(suggestion.text)}
          />
        ))}
      </View>
    </View>
  );
};

