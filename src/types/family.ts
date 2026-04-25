export type FamilyRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'pending' | 'left';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
  status: MemberStatus;
  user?: {
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  invited_by: string;
  email: string;
  token: string;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  family?: Family;
  inviter?: {
    email: string;
    name?: string;
  };
}

export interface CreateFamilyInput {
  name: string;
}

export interface InviteMemberInput {
  family_id: string;
  email: string;
}

export interface UpdateMemberRoleInput {
  member_id: string;
  role: FamilyRole;
}

export interface AcceptInvitationInput {
  token: string;
}
