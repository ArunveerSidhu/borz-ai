import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuthStore } from '@/stores';

export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      await login({ email, password });
      router.replace('/chat' as any);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/reset-password' as any);
  };

  const handleSignUp = () => {
    router.push('/signup' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 justify-center py-8">
            {/* Logo/Brand Section */}
            <Animated.View 
              entering={FadeInUp.duration(600).springify()}
              className="items-center mb-12"
            >
              <View className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl items-center justify-center mb-4 shadow-lg shadow-violet-500/50">
                <Text className="text-white text-5xl font-bold">B</Text>
              </View>
              <Text className="text-white text-3xl font-bold mb-2">Welcome Back</Text>
              <Text className="text-zinc-400 text-base text-center">
                Sign in to continue your AI conversations
              </Text>
            </Animated.View>

            {/* Login Form */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(200).springify()}
              className="space-y-5"
            >
              {/* Email Input */}
              <View>
                <Text className="text-zinc-400 text-sm font-medium mb-2 ml-1">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-1">
                  <Ionicons name="mail-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 text-white text-base ml-3"
                    placeholder="Enter your email"
                    placeholderTextColor="#52525b"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className='mt-4'>
                <Text className="text-zinc-400 text-sm font-medium mb-2 ml-1">
                  Password
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-1">
                  <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 text-white text-base ml-3"
                    placeholder="Enter your password"
                    placeholderTextColor="#52525b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="ml-2"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#71717a"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                className="self-end mt-4"
              >
                <Text className="text-violet-400 text-sm font-medium">
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                className={`bg-violet-400 rounded-xl py-4 items-center justify-center mt-6 ${
                  isLoading ? 'opacity-70' : 'active:opacity-80'
                }`}
              >
                <Text className="text-white text-base font-semibold">
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Sign Up Link */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(400).springify()}
              className="flex-row justify-center items-center mt-8"
            >
              <Text className="text-zinc-400 text-base">
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text className="text-violet-400 text-base font-bold">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

