import { ResetPasswordScreen } from '@/screens';
import { GuestGuard } from '@/components';

export default function ResetPassword() {
  return (
    <GuestGuard>
      <ResetPasswordScreen />
    </GuestGuard>
  );
}

