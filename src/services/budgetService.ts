import { supabase } from '../config/supabase';
import {
  Budget,
  BudgetWithCategory,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetUsage,
} from '../types/budget';

export const budgetService = {
  /**
   * Get all budgets for current user
   */
  getBudgets: async (): Promise<BudgetWithCategory[]> => {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single budget by ID
   */
  getBudgetById: async (id: string): Promise<BudgetWithCategory> => {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new budget
   */
  createBudget: async (input: CreateBudgetInput): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('budgets')
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
   * Update an existing budget
   */
  updateBudget: async (id: string, input: UpdateBudgetInput): Promise<Budget> => {
    const { data, error } = await supabase
      .from('budgets')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a budget
   */
  deleteBudget: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get budget usage for current period
   */
  getBudgetUsage: async (period: 'monthly' | 'yearly' = 'monthly'): Promise<BudgetUsage[]> => {
    // Get current period dates
    const now = new Date();
    const startDate = new Date(now.getFullYear(), period === 'monthly' ? now.getMonth() : 0, 1);
    
    // Fix: endDate should be the last day of current month, not previous month
    const endDate = period === 'monthly'
      ? new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month
      : new Date(now.getFullYear(), 11, 31); // Dec 31 of current year

    // Get budgets for current period
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .eq('period', period)
      .lte('start_date', endDate.toISOString().split('T')[0])
      .or(`end_date.is.null,end_date.gte.${startDate.toISOString().split('T')[0]}`);

    if (budgetError) throw budgetError;

    if (!budgets || budgets.length === 0) {
      return [];
    }

    // Get spending for each budget category
    const usagePromises = budgets.map(async (budget: any) => {
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('category_id', budget.category_id)
        .eq('type', 'expense')
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0]);

      if (transError) throw transError;

      const spent = (transactions || []).reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
      const budgetAmount = Number(budget.amount);
      const remaining = budgetAmount - spent;
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      return {
        budget,
        spent,
        remaining,
        percentage,
        isOverBudget: percentage > 100,
        isWarning: percentage > 80 && percentage <= 100,
      };
    });

    const usage = await Promise.all(usagePromises);
    return usage.sort((a, b) => b.percentage - a.percentage);
  },

  /**
   * Check if category already has a budget
   */
  hasBudget: async (categoryId: string, period: 'monthly' | 'yearly'): Promise<boolean> => {
    const { count, error } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('period', period)
      .is('end_date', null);

    if (error) throw error;
    return (count || 0) > 0;
  },
};
