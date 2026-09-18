import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const onboarded = useAuthStore((s) => s.onboarded);
  const hydrated = useAuthStore((s) => s.hydrated);
  const authError = useAuthStore((s) => s.authError);
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const resendPasswordReset = useAuthStore((s) => s.resendPasswordReset);
  const verifyPasswordReset = useAuthStore((s) => s.verifyPasswordReset);
  const completePasswordReset = useAuthStore((s) => s.completePasswordReset);
  const cancelPasswordRecovery = useAuthStore((s) => s.cancelPasswordRecovery);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithApple = useAuthStore((s) => s.loginWithApple);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const isDeveloper = !!user?.roles.includes('developer');
  const isAdmin = !!user?.isAdmin;
  return {
    session,
    user,
    onboarded,
    hydrated,
    authError,
    isSignedIn: !!session,
    isDeveloper,
    isAdmin,
    login,
    signup,
    verifyEmail,
    resendVerification,
    passwordRecovery,
    requestPasswordReset,
    resendPasswordReset,
    verifyPasswordReset,
    completePasswordReset,
    cancelPasswordRecovery,
    loginWithGoogle,
    loginWithApple,
    logout,
    deleteAccount,
    completeOnboarding,
    refreshUser,
  };
}
