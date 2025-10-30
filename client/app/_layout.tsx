import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChatProvider } from "@/context";
import "../global.css";

export default function RootLayout() {
  return (
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
  );
}
