# Family Sharing Feature Plan

## Overview
Allow users to create/join families and share transactions with family members.

## Database Schema Changes

### 1. New Tables

#### `families`
- `id` (uuid, primary key)
- `name` (text) - Family name
- `created_by` (uuid, foreign key to auth.users)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `family_members`
- `id` (uuid, primary key)
- `family_id` (uuid, foreign key to families)
- `user_id` (uuid, foreign key to auth.users)
- `role` (text) - 'owner' | 'admin' | 'member'
- `joined_at` (timestamp)
- `status` (text) - 'active' | 'pending' | 'left'

#### `family_invitations`
- `id` (uuid, primary key)
- `family_id` (uuid, foreign key to families)
- `invited_by` (uuid, foreign key to auth.users)
- `email` (text) - Email of invited user
- `token` (text) - Unique invitation token
- `status` (text) - 'pending' | 'accepted' | 'rejected' | 'expired'
- `created_at` (timestamp)
- `expires_at` (timestamp)

### 2. Modified Tables

#### `transactions`
- Add `family_id` (uuid, nullable, foreign key to families)
- Add `is_shared` (boolean, default false)
- Keep `user_id` to track who created it

#### `budgets`
- Add `family_id` (uuid, nullable, foreign key to families)
- Add `is_shared` (boolean, default false)

## Features

### Phase 1: Basic Family Management
1. ✅ Create family
2. ✅ Invite members via email
3. ✅ Accept/reject invitations
4. ✅ View family members
5. ✅ Leave family
6. ✅ Remove members (owner/admin only)

### Phase 2: Transaction Sharing
1. ✅ Toggle transaction sharing when creating transaction
2. ✅ View all family transactions
3. ✅ Filter: my transactions vs family transactions
4. ✅ Dashboard shows combined family data

### Phase 3: Advanced Features
1. Family budgets (shared budget limits)
2. Family reports and analytics
3. Permission management
4. Multiple families support (optional)

## UI Components Needed

### Screens
1. `FamilyScreen.tsx` - Main family management
2. `FamilyMembersScreen.tsx` - List of members
3. `InviteFamilyScreen.tsx` - Send invitations
4. `AcceptInvitationScreen.tsx` - Accept invitation flow

### Components
1. `FamilyCard.tsx` - Display family info
2. `MemberListItem.tsx` - Family member item
3. `InvitationListItem.tsx` - Pending invitation
4. `FamilyToggle.tsx` - Share with family toggle in transaction form

## Services
1. `familyService.ts` - Family CRUD operations
2. `invitationService.ts` - Invitation management

## Store
1. `familyStore.ts` - Family state management

## Navigation
Add "Family" tab to main navigation between Budget and Settings

## Implementation Steps
1. Create Supabase migrations for new tables
2. Create family service and store
3. Build family management screens
4. Add family toggle to transaction form
5. Update transaction queries to include family data
6. Update dashboard to show family statistics
7. Add family section to settings

## Security Considerations
- RLS policies to ensure users only see their family data
- Validate family membership before showing shared data
- Prevent unauthorized member removal
- Secure invitation tokens

## Future Enhancements
- Family categories (shared categories)
- Family payment requests
- Expense splitting
- Family notifications
- Family chat/comments on transactions
