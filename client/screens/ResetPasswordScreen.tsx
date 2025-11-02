import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export const ResetPasswordScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    // TODO: Implement actual password reset logic
    setTimeout(() => {
      setIsLoading(false);
      setIsEmailSent(true);
      console.log('Reset password for:', email);
    }, 1500);
  };

  const handleBackToLogin = () => {
    router.back();
  };

  if (isEmailSent) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950" edges={['top', 'bottom']}>
        <View className="flex-1 px-6 justify-center">
          <Animated.View 
            entering={FadeInUp.duration(600).springify()}
            className="items-center"
          >
            {/* Success Icon */}
            <View className="w-24 h-24 bg-violet-500/20 rounded-full items-center justify-center mb-6">
              <View className="w-20 h-20 bg-violet-500/30 rounded-full items-center justify-center">
                <Ionicons name="mail-outline" size={40} color="#8b5cf6" />
              </View>
            </View>

            {/* Success Message */}
            <Text className="text-white text-2xl font-bold mb-3 text-center">
              Check Your Email
            </Text>
            <Text className="text-zinc-400 text-base text-center mb-2">
              We've sent a password reset link to
            </Text>
            <Text className="text-violet-400 text-base font-medium mb-8 text-center">
              {email}
            </Text>
            <Text className="text-zinc-500 text-sm text-center px-4 mb-8">
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </Text>

            {/* Resend Email Button */}
            <TouchableOpacity
              onPress={() => {
                setIsEmailSent(false);
                handleResetPassword();
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-8 mb-4 active:bg-zinc-800"
            >
              <Text className="text-white text-base font-semibold">
                Resend Email
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={handleBackToLogin}
              className="mt-4"
            >
              <Text className="text-violet-400 text-base font-medium">
                Back to Login
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

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
            {/* Back Button */}
            <Animated.View 
              entering={FadeInUp.duration(400)}
              className="mb-6"
            >
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-zinc-900 rounded-xl items-center justify-center border border-zinc-800"
              >
                <Ionicons name="arrow-back" size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </Animated.View>

            {/* Header Section */}
            <Animated.View 
              entering={FadeInUp.duration(600).delay(100).springify()}
              className="items-center mb-8"
            >
              {/* Icon */}
              <View className="w-20 h-20 bg-violet-500/20 rounded-full items-center justify-center mb-6">
                <Ionicons name="lock-closed-outline" size={36} color="#8b5cf6" />
              </View>

              <Text className="text-white text-3xl font-bold mb-3 text-center">
                Forgot Password?
              </Text>
              <Text className="text-zinc-400 text-base text-center px-4">
                No worries! Enter your email and we'll send you reset instructions
              </Text>
            </Animated.View>

            {/* Reset Form */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(200).springify()}
              className="space-y-6"
            >
              {/* Email Input */}
              <View>
                <Text className="text-zinc-400 text-sm font-medium mb-2 ml-1">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
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
                    autoFocus
                  />
                </View>
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isLoading}
                className={`bg-violet-400 rounded-xl py-4 items-center justify-center mt-4 ${
                  isLoading ? 'opacity-70' : 'active:scale-[0.98]'
                }`}
              >
                <Text className="text-white text-base font-semibold">
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>

              {/* Info Card */}
              <View className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mt-6">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#8b5cf6" className="mt-0.5" />
                  <View className="flex-1 ml-3">
                    <Text className="text-violet-300 text-sm font-medium mb-1">
                      Password Reset Tips
                    </Text>
                    <Text className="text-violet-200/70 text-xs leading-5">
                      • Check your spam/junk folder{'\n'}
                      • The link expires in 1 hour{'\n'}
                      • Contact support if you need help
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Back to Login Link */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(400).springify()}
              className="flex-row justify-center items-center mt-8"
            >
              <Ionicons name="arrow-back-outline" size={16} color="#71717a" />
              <TouchableOpacity onPress={handleBackToLogin} className="ml-2">
                <Text className="text-zinc-400 text-base">
                  Back to{' '}
                  <Text className="text-violet-400 font-bold">
                    Login
                  </Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

