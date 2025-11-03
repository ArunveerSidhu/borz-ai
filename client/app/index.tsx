import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
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
