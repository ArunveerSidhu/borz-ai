import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  onMenuPress?: () => void;
  onNewChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuPress, onNewChat }) => {
  return (
    <View className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        {onMenuPress && (
          <TouchableOpacity 
            onPress={onMenuPress}
            className="p-2 bg-zinc-800 rounded-lg active:bg-zinc-700 mr-1"
          >
            <Ionicons name="menu" size={24} color="#a1a1aa" />
          </TouchableOpacity>
        )}
        <View className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl items-center justify-center">
          <Text className="text-white text-xl font-bold">B</Text>
        </View>
        <View>
          <Text className="text-white text-xl font-semibold">Borz AI</Text>
          <Text className="text-zinc-400 text-xs">Your intelligent assistant</Text>
        </View>
      </View>
      
      {onNewChat && (
        <TouchableOpacity 
          onPress={onNewChat}
          className="p-2 bg-zinc-800 rounded-lg active:bg-zinc-700"
        >
          <Ionicons name="add" size={24} color="#a1a1aa" />
        </TouchableOpacity>
      )}
    </View>
  );
};

