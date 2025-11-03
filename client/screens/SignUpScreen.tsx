import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '@/context';

export const SignUpScreen: React.FC = () => {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Error', 'Please accept the terms and conditions');
      return;
    }

    setIsLoading(true);
    
    try {
      await signup({ name, email, password });
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/chat' as any) }
      ]);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    router.back();
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
              className="mb-8"
            >
              <Text className="text-white text-3xl font-bold mb-2">Create Account</Text>
              <Text className="text-zinc-400 text-base">
                Sign up to start your AI journey
              </Text>
            </Animated.View>

            {/* Sign Up Form */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(200).springify()}
              className="space-y-4"
            >
              {/* Name Input */}
              <View>
                <Text className="text-zinc-400 text-sm font-medium mb-2 ml-1">
                  Full Name
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                  <Ionicons name="person-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 text-white text-base ml-3"
                    placeholder="Enter your full name"
                    placeholderTextColor="#52525b"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View className='mt-4'>
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
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className='mt-4'>
                <Text className="text-zinc-400 text-sm font-medium mb-2 ml-1">
                  Password
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                  <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 text-white text-base ml-3"
                    placeholder="Create a password"
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
                <Text className="text-zinc-500 text-xs mt-2 ml-1">
                  Must be at least 8 characters
                </Text>
              </View>

              {/* Confirm Password Input */}
              <View className='mt-4'>
                <Text className="text-zinc-400 text-sm font-medium mb-2 ml-1">
                  Confirm Password
                </Text>
                <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                  <Ionicons name="lock-closed-outline" size={20} color="#71717a" />
                  <TextInput
                    className="flex-1 text-white text-base ml-3"
                    placeholder="Confirm your password"
                    placeholderTextColor="#52525b"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="ml-2"
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#71717a"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms and Conditions */}
              <TouchableOpacity
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                className="flex-row items-start mt-4"
              >
                <View className={`w-5 h-5 rounded border-2 ${acceptedTerms ? 'bg-violet-500 border-violet-500' : 'border-zinc-600'} items-center justify-center mr-3 mt-0.5`}>
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text className="flex-1 text-zinc-400 text-sm leading-5 mt-0.5">
                  I agree to the{' '}
                  <Text className="text-violet-400 font-medium">
                    Terms & Conditions
                  </Text>
                  {' '}and{' '}
                  <Text className="text-violet-400 font-medium">
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={handleSignUp}
                disabled={isLoading}
                className={`bg-violet-400 rounded-xl py-4 items-center justify-center mt-6 ${
                  isLoading ? 'opacity-70' : 'active:opacity-80'
                }`}
              >
                <Text className="text-white text-base font-semibold">
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Login Link */}
            <Animated.View 
              entering={FadeInDown.duration(600).delay(400).springify()}
              className="flex-row justify-center items-center mt-6"
            >
              <Text className="text-zinc-400 text-base">
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text className="text-violet-400 text-base font-bold">
                  Sign In
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

