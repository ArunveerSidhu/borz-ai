import { SettingsScreen } from "@/screens";
import { AuthGuard } from "@/components";

export default function Settings() {
  return (
    <AuthGuard>
      <SettingsScreen />
    </AuthGuard>
  );
}

