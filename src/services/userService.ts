import { supabase } from '../config/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export const userService = {
  /**
   * Get user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<UserProfile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
