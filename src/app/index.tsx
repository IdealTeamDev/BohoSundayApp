import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { user, checkSession } = useAuthStore();
  
  if (user && checkSession()) {
    if (user.role === 'bouncer') return <Redirect href="/(staff)/bouncer/scanner" />;
    if (user.role === 'waiter') return <Redirect href="/(staff)/waiter/map" />;
    if (user.role === 'viewer') return <Redirect href="/(admin)/tables" />;
  }
  
  return <Redirect href="/(auth)/login" />;
}
