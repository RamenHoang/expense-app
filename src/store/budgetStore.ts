import { create } from 'zustand';
import { BudgetWithCategory, BudgetUsage } from '../types/budget';
import { budgetService } from '../services/budgetService';

interface BudgetState {
  budgets: BudgetWithCategory[];
  budgetUsage: BudgetUsage[];
  isLoading: boolean;
  error: string | null;
  fetchBudgets: () => Promise<void>;
  fetchBudgetUsage: (period: 'monthly' | 'yearly') => Promise<void>;
  addBudget: (budget: BudgetWithCategory) => void;
  updateBudget: (id: string, budget: Partial<BudgetWithCategory>) => void;
  removeBudget: (id: string) => void;
  clearError: () => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  budgetUsage: [],
  isLoading: false,
  error: null,

  fetchBudgets: async () => {
    set({ isLoading: true, error: null });
    try {
      const budgets = await budgetService.getBudgets();
      set({ budgets, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchBudgetUsage: async (period: 'monthly' | 'yearly') => {
    set({ isLoading: true, error: null });
    try {
      const usage = await budgetService.getBudgetUsage(period);
      set({ budgetUsage: usage, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addBudget: (budget: BudgetWithCategory) => {
    set((state) => ({
      budgets: [budget, ...state.budgets],
    }));
  },

  updateBudget: (id: string, updates: Partial<BudgetWithCategory>) => {
    set((state) => ({
      budgets: state.budgets.map((budget) =>
        budget.id === id ? { ...budget, ...updates } : budget
      ),
    }));
  },

  removeBudget: (id: string) => {
    set((state) => ({
      budgets: state.budgets.filter((budget) => budget.id !== id),
    }));
  },

  clearError: () => set({ error: null }),
}));
