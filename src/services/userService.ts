import { supabase } from '../config/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  currency: string;
  avatar_url?: string;
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
   * Upload avatar image and return public URL
   */
  uploadAvatar: async (base64: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const folder = user.id;
    const { data: existing } = await supabase.storage.from('avatars').list(folder);
    if (existing && existing.length > 0) {
      const toDelete = existing.map(f => `${folder}/${f.name}`);
      await supabase.storage.from('avatars').remove(toDelete);
    }

    const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
    const estimatedBytes = (base64.length * 3) / 4;
    if (estimatedBytes > MAX_AVATAR_BYTES) {
      throw new Error('Avatar image exceeds 5 MB limit');
    }

    const path = `${folder}/avatar.jpg`;

    let uint8Array: Uint8Array;
    try {
      uint8Array = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    } catch {
      throw new Error('Invalid image data');
    }

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, uint8Array, { contentType: 'image/jpeg', cacheControl: '3600', upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Append cache-bust so the new image reloads immediately
    return `${data.publicUrl}?t=${Date.now()}`;
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
