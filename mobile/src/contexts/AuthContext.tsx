import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { User, UserRole } from '../types/auth';
import { clearTokens, restoreAccessToken, setUnauthorizedHandler } from '../services/api';
import * as authService from '../services/authService';
import {
  biometricLogin,
  enrollBiometric,
  getBiometricStatus,
  isBiometricEnrolled,
  revokeBiometric,
  shouldOfferBiometricEnrollment,
  dismissBiometricEnrollment,
  BiometricCancelledError,
} from '../services/biometricAuthService';

type AuthContextValue = {
  user: User | null;
  status: 'restoring' | 'signedOut' | 'signedIn';
  biometricEnrollmentPending: boolean;
  /** Standard email + password login. */
  signIn(email: string, password: string, expectedRole?: UserRole): Promise<void>;
  /**
   * True passwordless biometric login.
   * Prompts device biometric, sends device token to backend, issues real session.
   * Throws BiometricCancelledError / BiometricNotEnrolledError / BiometricUnavailableError
   * so the caller can fall back to password gracefully.
   */
  signInWithBiometric(portalName: string, expectedRole?: UserRole): Promise<void>;
  /** Enrol this device for biometric login (call after a successful signIn). */
  enrollBiometric(): Promise<void>;
  /** True when a device token is present in SecureStore. */
  isBiometricEnrolled(): Promise<boolean>;
  /** Remove the device token from SecureStore and revoke it on the backend. */
  revokeBiometric(): Promise<void>;
  dismissBiometricEnrollment(): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const supportedRoles: UserRole[] = ['admin', 'manager', 'factory_manager', 'agent'];

function validateRole(role: UserRole, expectedRole?: UserRole) {
  if (!supportedRoles.includes(role)) {
    throw new Error('This account role is not supported on mobile.');
  }
  if (
    expectedRole &&
    role !== expectedRole &&
    !(expectedRole === 'manager' && role === 'admin')
  ) {
    const portalName =
      expectedRole === 'factory_manager' ? 'Factory'
      : expectedRole === 'manager' ? 'Manager'
      : 'Sales';
    throw new Error(`This account does not belong to the selected ${portalName} Portal.`);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('restoring');
  const [biometricEnrollmentUserId, setBiometricEnrollmentUserId] = useState<string | null>(null);

  const localSignOut = async () => {
    await clearTokens();
    setBiometricEnrollmentUserId(null);
    setUser(null);
    setStatus('signedOut');
  };

  // Restore session on mount
  useEffect(() => {
    setUnauthorizedHandler(() => { void localSignOut(); });
    void restoreAccessToken().then(async (token) => {
      if (!token) return setStatus('signedOut');
      try {
        const restored = await authService.currentUser();
        validateRole(restored.role);
        setUser(restored);
        setStatus('signedIn');
      } catch {
        await localSignOut();
      }
    });
    return () => setUnauthorizedHandler(undefined);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    biometricEnrollmentPending: biometricEnrollmentUserId !== null,

    // ── Standard password login ──────────────────────────────────────────────
    signIn: async (email, password, expectedRole) => {
      const authenticated = await authService.login(email, password);
      try {
        validateRole(authenticated.role, expectedRole);
      } catch (err) {
        await localSignOut();
        throw err;
      }
      setUser(authenticated);
      setStatus('signedIn');
      if (await shouldOfferBiometricEnrollment(authenticated.id)) {
        setTimeout(() => setBiometricEnrollmentUserId(authenticated.id), 350);
      }
    },

    // ── True passwordless biometric login ────────────────────────────────────
    signInWithBiometric: async (portalName, expectedRole) => {
      // biometricLogin handles: device prompt → device token → backend → session
      const authenticated = await biometricLogin(`Sign in to ${portalName}`);
      try {
        validateRole(authenticated.role, expectedRole);
      } catch (err) {
        await localSignOut();
        throw err;
      }
      setUser(authenticated);
      setStatus('signedIn');
    },

    // ── Enrolment (called after password signIn, never from biometric flow) ──
    enrollBiometric: async () => {
      await enrollBiometric();
      setBiometricEnrollmentUserId(null);
    },

    dismissBiometricEnrollment: async () => {
      if (biometricEnrollmentUserId) {
        await dismissBiometricEnrollment(biometricEnrollmentUserId);
      }
      setBiometricEnrollmentUserId(null);
    },

    isBiometricEnrolled,
    revokeBiometric,

    // ── Sign out ─────────────────────────────────────────────────────────────
    signOut: async () => {
      await authService.logout();
      setUser(null);
      setStatus('signedOut');
    },
  }), [user, status, biometricEnrollmentUserId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Re-export for convenience in screens
export { getBiometricStatus, isBiometricEnrolled, BiometricCancelledError };
