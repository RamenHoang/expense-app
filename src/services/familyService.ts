import { supabase } from '../config/supabase';
import {
  Family,
  FamilyMember,
  FamilyInvitation,
  CreateFamilyInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  AcceptInvitationInput,
} from '../types/family';

const INVITATION_EXPIRY_DAYS = 7;

class FamilyService {
  async getMyFamily(): Promise<Family | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (memberError || !memberData) return null;

      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', memberData.family_id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get my family error:', error);
      return null;
    }
  }

  async createFamily(input: CreateFamilyInput): Promise<Family> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('families')
        .insert({
          name: input.name,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create family error:', error);
      throw error;
    }
  }

  async updateFamily(familyId: string, name: string): Promise<Family> {
    try {
      const { data, error } = await supabase
        .from('families')
        .update({ name })
        .eq('id', familyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update family error:', error);
      throw error;
    }
  }

  async deleteFamily(familyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', familyId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete family error:', error);
      throw error;
    }
  }

  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      const { data, error } = await supabase.rpc('get_family_members', {
        p_family_id: familyId,
      });

      if (error) throw error;

      return (data || []).map((member: any) => ({
        id: member.id,
        family_id: member.family_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        status: member.status,
        user: {
          email: member.user_email || '',
          name: member.user_name,
        },
      }));
    } catch (error) {
      console.error('Get family members error:', error);
      throw error;
    }
  }

  async inviteMember(input: InviteMemberInput): Promise<FamilyInvitation> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if the email belongs to a user who is already a member
      const { data: isMember, error: checkError } = await supabase
        .rpc('is_email_family_member', {
          p_family_id: input.family_id,
          p_email: input.email.toLowerCase()
        });

      if (checkError) {
        console.error('Error checking member status:', checkError);
        // Continue anyway - database constraint will catch duplicates
      }

      if (isMember) {
        throw new Error('This user is already a family member');
      }

      // Check if there's already a pending invitation for this email
      const { data: pendingInvitation } = await supabase
        .from('family_invitations')
        .select('id')
        .eq('family_id', input.family_id)
        .eq('email', input.email.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (pendingInvitation) {
        throw new Error('An invitation has already been sent to this email');
      }

      // Generate unique token
      const token = this.generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

      const { data, error } = await supabase
        .from('family_invitations')
        .insert({
          family_id: input.family_id,
          invited_by: user.id,
          email: input.email.toLowerCase(),
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
          throw new Error('An invitation has already been sent to this email');
        }
        throw error;
      }

      // TODO: Send email notification
      
      return data;
    } catch (error) {
      console.error('Invite member error:', error);
      throw error;
    }
  }

  async getPendingInvitations(familyId: string): Promise<FamilyInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('family_invitations')
        .select(`
          *,
          family:family_id (*)
        `)
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((invitation: any) => ({
        ...invitation,
        inviter: undefined,
      }));
    } catch (error) {
      console.error('Get pending invitations error:', error);
      throw error;
    }
  }

  async getMyInvitations(): Promise<FamilyInvitation[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('family_invitations')
        .select(`
          *,
          family:family_id (*)
        `)
        .eq('email', user.email?.toLowerCase())
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((invitation: any) => ({
        ...invitation,
        inviter: undefined,
      }));
    } catch (error) {
      console.error('Get my invitations error:', error);
      throw error;
    }
  }

  async acceptInvitation(input: AcceptInvitationInput): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get invitation
      const { data: invitation, error: invError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('token', input.token)
        .eq('email', user.email?.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (invError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Check if not expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('family_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        throw new Error('Invitation has expired');
      }

      // Add member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: invitation.family_id,
          user_id: user.id,
          role: 'member',
          status: 'active',
        });

      if (memberError) throw memberError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Accept invitation error:', error);
      throw error;
    }
  }

  async rejectInvitation(invitationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('family_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;
    } catch (error) {
      console.error('Reject invitation error:', error);
      throw error;
    }
  }

  async updateMemberRole(input: UpdateMemberRoleInput): Promise<void> {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ role: input.role })
        .eq('id', input.member_id);

      if (error) throw error;
    } catch (error) {
      console.error('Update member role error:', error);
      throw error;
    }
  }

  async removeMember(memberId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    } catch (error) {
      console.error('Remove member error:', error);
      throw error;
    }
  }

  async leaveFamily(familyId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Leave family error:', error);
      throw error;
    }
  }

  private generateInvitationToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

export const familyService = new FamilyService();
