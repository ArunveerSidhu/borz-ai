import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores';

export default function Index() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // User is authenticated, go to chat
        router.replace('/chat' as any);
      } else {
        // User is not authenticated, go to login
        router.replace('/login' as any);
      }
    }
  }, [isAuthenticated, isLoading]);

  // Show loading screen while checking authentication
  return (
    <View className="flex-1 bg-zinc-950 items-center justify-center">
      <ActivityIndicator size="large" color="#8b5cf6" />
    </View>
  );
}
