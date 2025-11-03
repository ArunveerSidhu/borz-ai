import { SignUpScreen } from '@/screens';
import { GuestGuard } from '@/components';

export default function SignUp() {
  return (
    <GuestGuard>
      <SignUpScreen />
    </GuestGuard>
  );
}

