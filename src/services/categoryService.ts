import { supabase } from '../config/supabase';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/category';

export const categoryService = {
  /**
   * Get all categories for current user
   */
  getCategories: async (type?: 'income' | 'expense'): Promise<Category[]> => {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single category by ID
   */
  getCategoryById: async (id: string): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new category
   */
  createCategory: async (input: CreateCategoryInput): Promise<Category> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: user.id,
          ...input,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check for duplicate category names
   */
  checkDuplicateName: async (
    name: string, 
    type: 'income' | 'expense', 
    familyId?: string,
    excludeId?: string  // Exclude current category when editing
  ): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('categories')
      .select('id')
      .eq('name', name)
      .eq('type', type);

    // Exclude current category when editing
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    if (familyId) {
      // Check for duplicates in family scope
      query = query.eq('family_id', familyId).eq('is_shared', true);
    } else {
      // Check for duplicates in personal scope
      query = query.eq('user_id', user.id).is('is_shared', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    if (data && data.length > 0) {
      throw new Error(
        familyId 
          ? 'A shared category with this name already exists in your family'
          : 'A category with this name already exists'
      );
    }
  },

  /**
   * Update an existing category
   */
  updateCategory: async (id: string, input: UpdateCategoryInput): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a category
   */
  deleteCategory: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Check if category is in use (has transactions)
   */
  isCategoryInUse: async (id: string): Promise<boolean> => {
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (error) throw error;
    return (count || 0) > 0;
  },

  /**
   * Get category usage count
   */
  getCategoryUsageCount: async (id: string): Promise<number> => {
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (error) throw error;
    return count || 0;
  },
};
