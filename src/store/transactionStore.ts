import { create } from 'zustand';
import { TransactionWithCategory, TransactionFilters } from '../types/transaction';
import { transactionService } from '../services/transactionService';

interface TransactionState {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
  error: string | null;
  filters: TransactionFilters;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  addTransaction: (transaction: TransactionWithCategory) => void;
  updateTransaction: (id: string, transaction: Partial<TransactionWithCategory>) => void;
  removeTransaction: (id: string) => void;
  setFilters: (filters: TransactionFilters) => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  filters: {},

  fetchTransactions: async (filters?: TransactionFilters) => {
    set({ isLoading: true, error: null });
    try {
      const newFilters = filters || get().filters;
      const transactions = await transactionService.getTransactions(newFilters);
      set({ transactions, filters: newFilters, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addTransaction: (transaction: TransactionWithCategory) => {
    set((state) => ({
      transactions: [transaction, ...state.transactions].sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      ),
    }));
  },

  updateTransaction: (id: string, updates: Partial<TransactionWithCategory>) => {
    set((state) => ({
      transactions: state.transactions
        .map((t) => (t.id === id ? { ...t, ...updates } : t))
        .sort(
          (a, b) =>
            new Date(b.transaction_date).getTime() -
            new Date(a.transaction_date).getTime()
        ),
    }));
  },

  removeTransaction: (id: string) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  setFilters: (filters: TransactionFilters) => {
    set({ filters });
  },

  clearError: () => set({ error: null }),
}));
