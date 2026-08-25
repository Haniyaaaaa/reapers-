import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const onboarded = useAuthStore((s) => s.onboarded);
  const hydrated = useAuthStore((s) => s.hydrated);
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const logout = useAuthStore((s) => s.logout);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const isDeveloper = !!user?.roles.includes('developer');
  return {
    token,
    user,
    onboarded,
    hydrated,
    isSignedIn: !!token,
    isDeveloper,
    login,
    signup,
    logout,
    completeOnboarding,
  };
}
