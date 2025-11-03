import { LoginScreen } from '@/screens';
import { GuestGuard } from '@/components';

export default function Login() {
  return (
    <GuestGuard>
      <LoginScreen />
    </GuestGuard>
  );
}

