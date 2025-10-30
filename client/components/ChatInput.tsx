import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <View className="bg-zinc-950 border-t border-zinc-800">
      <View className="px-4 py-4 items-center">
        <View className="w-full max-w-3xl flex-row items-end gap-3">
          <View className="flex-1 bg-zinc-800 rounded-3xl px-5 py-3 flex-row items-center border border-zinc-700">
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Message Borz AI..."
              placeholderTextColor="#71717a"
              multiline
              maxLength={2000}
              className="flex-1 text-white text-base py-0 max-h-32"
              editable={!disabled}
              onSubmitEditing={handleSend}
            />
          </View>
          
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!message.trim() || disabled}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              message.trim() && !disabled
                ? 'bg-violet-500 active:bg-violet-600' 
                : 'bg-zinc-800'
            }`}
          >
            <Ionicons 
              name="arrow-up" 
              size={22} 
              color={message.trim() && !disabled ? 'white' : '#52525b'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

