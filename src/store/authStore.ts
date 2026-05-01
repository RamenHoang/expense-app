import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  clearPasswordRecovery: () => void;
  setPasswordRecovery: (value: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isPasswordRecovery: false,

  setUser: (user) => set({ user }),

  setSession: (session) => set({ session, user: session?.user ?? null }),

  clearPasswordRecovery: () => set({ isPasswordRecovery: false }),
  setPasswordRecovery: (value) => set({ isPasswordRecovery: value }),

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, isLoading: false });

      // Unsubscribe any previous listener before registering a new one
      authSubscription?.unsubscribe();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          set({ session, user: session?.user ?? null, isPasswordRecovery: true });
        } else {
          set({ session, user: session?.user ?? null, isPasswordRecovery: false });
        }
      });
      authSubscription = data.subscription;
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      // Do NOT unsubscribe here — the listener must remain active to catch
      // the next SIGNED_IN event after a fresh login.
      set({ user: null, session: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));
