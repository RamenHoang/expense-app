import { create } from 'zustand';
import { Family, FamilyMember, FamilyInvitation } from '../types/family';
import { familyService } from '../services/familyService';

interface FamilyState {
  family: Family | null;
  members: FamilyMember[];
  invitations: FamilyInvitation[];
  myInvitations: FamilyInvitation[];
  isLoading: boolean;
  error: string | null;

  // Family operations
  fetchFamily: () => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  updateFamily: (familyId: string, name: string) => Promise<void>;
  deleteFamily: (familyId: string) => Promise<void>;
  leaveFamily: (familyId: string) => Promise<void>;

  // Member operations
  fetchMembers: (familyId: string) => Promise<void>;
  inviteMember: (familyId: string, email: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: 'owner' | 'admin' | 'member') => Promise<void>;

  // Invitation operations
  fetchInvitations: (familyId: string) => Promise<void>;
  fetchMyInvitations: () => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  members: [],
  invitations: [],
  myInvitations: [],
  isLoading: false,
  error: null,

  fetchFamily: async () => {
    set({ isLoading: true, error: null });
    try {
      const family = await familyService.getMyFamily();
      set({ family, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createFamily: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const family = await familyService.createFamily({ name });
      set({ family, isLoading: false });
      // Fetch members after creating family (creator is auto-added as owner)
      await get().fetchMembers(family.id);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateFamily: async (familyId: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const family = await familyService.updateFamily(familyId, name);
      set({ family, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteFamily: async (familyId: string) => {
    set({ isLoading: true, error: null });
    try {
      await familyService.deleteFamily(familyId);
      set({ family: null, members: [], invitations: [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  leaveFamily: async (familyId: string) => {
    set({ isLoading: true, error: null });
    try {
      await familyService.leaveFamily(familyId);
      set({ family: null, members: [], invitations: [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchMembers: async (familyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const members = await familyService.getFamilyMembers(familyId);
      set({ members, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  inviteMember: async (familyId: string, email: string) => {
    set({ isLoading: true, error: null });
    try {
      await familyService.inviteMember({ family_id: familyId, email });
      // Refresh invitations
      await get().fetchInvitations(familyId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  removeMember: async (memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      await familyService.removeMember(memberId);
      // Remove from local state
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateMemberRole: async (memberId: string, role: 'owner' | 'admin' | 'member') => {
    set({ isLoading: true, error: null });
    try {
      await familyService.updateMemberRole({ member_id: memberId, role });
      // Update local state
      set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, role } : m
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchInvitations: async (familyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const invitations = await familyService.getPendingInvitations(familyId);
      set({ invitations, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMyInvitations: async () => {
    set({ isLoading: true, error: null });
    try {
      const myInvitations = await familyService.getMyInvitations();
      set({ myInvitations, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  acceptInvitation: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      await familyService.acceptInvitation({ token });
      // Refresh family and invitations
      await get().fetchFamily();
      await get().fetchMyInvitations();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  rejectInvitation: async (invitationId: string) => {
    set({ isLoading: true, error: null });
    try {
      await familyService.rejectInvitation(invitationId);
      // Remove from local state
      set((state) => ({
        myInvitations: state.myInvitations.filter((i) => i.id !== invitationId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    family: null,
    members: [],
    invitations: [],
    myInvitations: [],
    isLoading: false,
    error: null,
  }),
}));
