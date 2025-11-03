import { ChatScreen } from '@/screens';
import { AuthGuard } from '@/components';

export default function Chat() {
  return (
    <AuthGuard>
      <ChatScreen />
    </AuthGuard>
  );
}

