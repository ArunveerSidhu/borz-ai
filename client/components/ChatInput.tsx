import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onAttachmentPress?: () => void;
  selectedImage?: { uri: string; type: 'camera' | 'photos' } | null;
  selectedDocument?: { uri: string; name: string; mimeType?: string } | null;
  onClearImage?: () => void;
  onClearDocument?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled, 
  onAttachmentPress,
  selectedImage,
  selectedDocument,
  onClearImage,
  onClearDocument 
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if ((message.trim() || selectedImage || selectedDocument) && !disabled) {
      const defaultText = selectedImage ? 'Analyze this image' : selectedDocument ? 'Analyze this document' : '';
      onSend(message.trim() || defaultText);
      setMessage('');
    }
  };

  const hasAttachment = selectedImage || selectedDocument;

  return (
    <View className="bg-zinc-950 border-t border-zinc-800">
      <View className="px-4 py-4 mb-4 items-center">
        <View className="w-full max-w-3xl gap-3">
          {/* Image Preview */}
          {selectedImage && (
            <View className="flex-row items-center gap-2 bg-zinc-800 rounded-2xl p-3 border border-zinc-700">
              <Image 
                source={{ uri: selectedImage.uri }} 
                className="w-16 h-16 rounded-lg"
                resizeMode="cover"
              />
              <View className="flex-1">
                <Ionicons name="image" size={16} color="#a1a1aa" />
              </View>
              <TouchableOpacity
                onPress={onClearImage}
                className="w-8 h-8 rounded-full bg-zinc-700 items-center justify-center active:bg-zinc-600"
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Document Preview */}
          {selectedDocument && (
            <View className="flex-row items-center gap-3 bg-zinc-800 rounded-2xl p-3 border border-zinc-700">
              <View className="w-12 h-12 rounded-lg bg-cyan-500/20 items-center justify-center">
                <Ionicons name="document-text" size={24} color="#06b6d4" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-medium" numberOfLines={1}>
                  {selectedDocument.name}
                </Text>
                <Text className="text-zinc-400 text-xs mt-0.5">
                  Document attachment
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClearDocument}
                className="w-8 h-8 rounded-full bg-zinc-700 items-center justify-center active:bg-zinc-600"
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Row */}
          <View className="flex-row items-end gap-3">
            <View className="flex-1 bg-zinc-800 rounded-3xl px-4 py-3 flex-row items-center gap-2 border border-zinc-700">
              <TouchableOpacity 
                onPress={onAttachmentPress}
                className="rounded-full active:bg-zinc-700"
                disabled={disabled}
              >
                <Ionicons 
                  name="add-circle" 
                  size={24} 
                  color={disabled ? '#52525b' : '#a1a1aa'} 
                />
              </TouchableOpacity>
              
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Message Borz AI..."
                placeholderTextColor="#71717a"
                multiline
                maxLength={2000}
                className="flex-1 text-white text-base py-0 max-h-32 leading-tight"
                editable={!disabled}
                onSubmitEditing={handleSend}
              />
            </View>
            
            <TouchableOpacity 
              onPress={handleSend}
              disabled={(!message.trim() && !hasAttachment) || disabled}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                (message.trim() || hasAttachment) && !disabled
                  ? 'bg-violet-500 active:bg-violet-600' 
                  : 'bg-zinc-800'
              }`}
            >
              <Ionicons 
                name="arrow-up" 
                size={22} 
                color={(message.trim() || hasAttachment) && !disabled ? 'white' : '#52525b'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

