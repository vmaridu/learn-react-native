import { create } from 'zustand';

import { secureStorage, STORAGE_KEYS } from '~/lib/storage';
import { resetDb } from '~/mock/db';
import type { AuthStatus, Session } from './types';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  restore: () => Promise<void>;
  setSession: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Client state only — the session token and the restore lifecycle.
 * Everything the server "owns" (the member record, dues, reservations) is
 * TanStack Query's job, never Zustand's.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  session: null,

  async restore() {
    const raw = await secureStorage.get(STORAGE_KEYS.session);
    if (!raw) {
      set({ status: 'signedOut', session: null });
      return;
    }
    try {
      const session = JSON.parse(raw) as Session;
      set({ status: 'signedIn', session });
    } catch {
      await secureStorage.remove(STORAGE_KEYS.session);
      set({ status: 'signedOut', session: null });
    }
  },

  async setSession(session) {
    await secureStorage.set(STORAGE_KEYS.session, JSON.stringify(session));
    set({ status: 'signedIn', session });
  },

  async signOut() {
    await secureStorage.remove(STORAGE_KEYS.session);
    // A mockup signs out of a pretend community — put the demo data back so the
    // next sign-in starts from a known state.
    resetDb();
    set({ status: 'signedOut', session: null });
  },
}));
