import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { user, checkSession } = useAuthStore();
  
  if (user && checkSession()) {
    if (user.role === 'bouncer') return <Redirect href="/(staff)/bouncer/scanner" />;
    if (user.role === 'viewer1' || user.role === 'viewer2') return <Redirect href="/(admin)/tables" />;
    if (user.role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  }
  
  return <Redirect href="/(auth)/login" />;
}
