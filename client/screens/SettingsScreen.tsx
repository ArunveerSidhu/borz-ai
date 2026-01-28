import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores';

export const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleGoBack = () => {
    router.back();
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          // TODO: Implement clear history
          console.log('Clear history');
        }}
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await logout();
              router.replace('/login' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-6">
      <Text className="text-zinc-500 text-xs font-medium px-4 mb-3 uppercase tracking-wide">
        {title}
      </Text>
      <View className="bg-zinc-900 mx-3 rounded-xl overflow-hidden border border-zinc-800">
        {children}
      </View>
    </View>
  );

  const SettingsItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    rightComponent,
    isLast = false 
  }: { 
    icon: keyof typeof Ionicons.glyphMap; 
    title: string; 
    subtitle?: string; 
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !rightComponent}
      className={`flex-row items-center px-4 py-4 ${!isLast ? 'border-b border-zinc-800' : ''} ${onPress ? 'active:bg-zinc-800' : ''}`}
    >
      <View className="w-10 h-10 rounded-full bg-violet-500/20 items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#8b5cf6" />
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-medium mb-0.5">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-zinc-400 text-sm">
            {subtitle}
          </Text>
        )}
      </View>
      {rightComponent ? (
        rightComponent
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color="#71717a" />
      ) : null}
    </TouchableOpacity>
  );

  const ToggleSwitch = ({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#3f3f46', true: '#8b5cf6' }}
      thumbColor={value ? '#fff' : '#d4d4d8'}
      ios_backgroundColor="#3f3f46"
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-zinc-800 flex-row items-center">
          <TouchableOpacity 
            onPress={handleGoBack}
            className="p-2 bg-zinc-800 rounded-lg active:bg-zinc-700 mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#a1a1aa" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Settings</Text>
        </View>

        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        >
          {/* Profile Section */}
          <SettingsSection title="Profile">
            <SettingsItem
              icon="person-outline"
              title={user?.name || 'User'}
              subtitle={user?.email || 'No email'}
              onPress={() => console.log('Edit profile')}
            />
            <SettingsItem
              icon="key-outline"
              title="API Key"
              subtitle="Configure your Gemini API key"
              onPress={() => console.log('API settings')}
              isLast
            />
          </SettingsSection>

          {/* Preferences Section */}
          <SettingsSection title="Preferences">
            <SettingsItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Enable push notifications"
              showArrow={false}
              rightComponent={
                <ToggleSwitch 
                  value={notificationsEnabled} 
                  onValueChange={setNotificationsEnabled} 
                />
              }
            />
            <SettingsItem
              icon="phone-portrait-outline"
              title="Haptic Feedback"
              subtitle="Vibration on interactions"
              showArrow={false}
              rightComponent={
                <ToggleSwitch 
                  value={hapticFeedback} 
                  onValueChange={setHapticFeedback} 
                />
              }
            />
            <SettingsItem
              icon="moon-outline"
              title="Dark Mode"
              subtitle="Always enabled for better experience"
              showArrow={false}
              rightComponent={
                <ToggleSwitch 
                  value={darkMode} 
                  onValueChange={setDarkMode} 
                />
              }
              isLast
            />
          </SettingsSection>

          {/* AI Settings Section */}
          <SettingsSection title="AI Configuration">
            <SettingsItem
              icon="sparkles-outline"
              title="Model Settings"
              subtitle="Temperature, tokens, and parameters"
              onPress={() => console.log('Model settings')}
            />
            <SettingsItem
              icon="chatbubbles-outline"
              title="Chat Behavior"
              subtitle="Customize AI response style"
              onPress={() => console.log('Chat behavior')}
              isLast
            />
          </SettingsSection>

          {/* Data & Storage Section */}
          <SettingsSection title="Data & Storage">
            <SettingsItem
              icon="save-outline"
              title="Export Chats"
              subtitle="Download your conversation history"
              onPress={() => console.log('Export chats')}
            />
            <SettingsItem
              icon="trash-outline"
              title="Clear History"
              subtitle="Delete all chat conversations"
              onPress={handleClearHistory}
              isLast
            />
          </SettingsSection>

          {/* About Section */}
          <SettingsSection title="About">
            <SettingsItem
              icon="information-circle-outline"
              title="About Borz AI"
              subtitle="Version 1.0.0"
              onPress={() => console.log('About')}
            />
            <SettingsItem
              icon="document-text-outline"
              title="Terms & Privacy"
              subtitle="View our policies"
              onPress={() => console.log('Terms & Privacy')}
            />
            <SettingsItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get assistance"
              onPress={() => console.log('Help')}
              isLast
            />
          </SettingsSection>

          {/* Logout Button */}
          <View className="px-3 mt-4">
            <TouchableOpacity 
              onPress={handleLogout}
              className="bg-red-500/10 border border-red-500/20 rounded-xl py-4 px-4 flex-row items-center justify-center gap-2 active:bg-red-500/20"
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text className="text-red-500 font-semibold text-base">Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center mt-8">
            <View className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl items-center justify-center mb-3">
              <Text className="text-white text-3xl font-bold">B</Text>
            </View>
            <Text className="text-zinc-500 text-sm">
              Powered by Google Gemini
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

