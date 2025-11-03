import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ChatProvider, AuthProvider } from "@/context";
import "../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <AuthProvider>
          <ChatProvider>
            <StatusBar style="light" backgroundColor="#09090b" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#09090b" },
                animation: "fade",
              }}
            />
          </ChatProvider>
        </AuthProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
