import { create } from 'zustand';
import { TransactionWithCategory, TransactionFilters } from '../types/transaction';
import { transactionService } from '../services/transactionService';

interface TransactionState {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  filters: TransactionFilters;
  currentOffset: number;
  pageSize: number;
  lastModifiedTimestamp: number; // Track when last modification occurred
  fetchTransactions: (filters?: TransactionFilters, reset?: boolean) => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  addTransaction: (transaction: TransactionWithCategory) => void;
  updateTransaction: (id: string, transaction: Partial<TransactionWithCategory>) => void;
  removeTransaction: (id: string) => void;
  setFilters: (filters: TransactionFilters) => void;
  clearError: () => void;
  resetPagination: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  error: null,
  filters: {},
  currentOffset: 0,
  pageSize: 30,
  lastModifiedTimestamp: 0,

  fetchTransactions: async (filters?: TransactionFilters, reset = true) => {
    set({ isLoading: true, error: null });
    try {
      const newFilters = filters || get().filters;
      const { pageSize } = get();
      
      const transactions = await transactionService.getTransactions({
        ...newFilters,
        limit: pageSize,
        offset: reset ? 0 : undefined,
      });
      
      set({ 
        transactions, 
        filters: newFilters, 
        isLoading: false,
        currentOffset: reset ? pageSize : get().currentOffset,
        hasMore: transactions.length === pageSize,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadMoreTransactions: async () => {
    const { isLoadingMore, hasMore, currentOffset, pageSize, filters, transactions } = get();
    
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const moreTransactions = await transactionService.getTransactions({
        ...filters,
        limit: pageSize,
        offset: currentOffset,
      });

      set({
        transactions: [...transactions, ...moreTransactions],
        currentOffset: currentOffset + pageSize,
        hasMore: moreTransactions.length === pageSize,
        isLoadingMore: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoadingMore: false });
    }
  },

  addTransaction: (transaction: TransactionWithCategory) => {
    set((state) => ({
      transactions: [transaction, ...state.transactions].sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      ),
      lastModifiedTimestamp: Date.now(), // Update timestamp
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
      lastModifiedTimestamp: Date.now(), // Update timestamp
    }));
  },

  removeTransaction: (id: string) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      lastModifiedTimestamp: Date.now(), // Update timestamp
    }));
  },

  setFilters: (filters: TransactionFilters) => {
    set({ filters });
  },

  clearError: () => set({ error: null }),

  resetPagination: () => set({ currentOffset: 0, hasMore: true }),
}));
