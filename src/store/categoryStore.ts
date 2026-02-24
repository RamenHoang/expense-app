import { create } from 'zustand';
import { Category } from '../types/category';
import { categoryService } from '../services/categoryService';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: (type?: 'income' | 'expense') => Promise<void>;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async (type?: 'income' | 'expense') => {
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryService.getCategories(type);
      set({ categories, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addCategory: (category: Category) => {
    set((state) => ({
      categories: [...state.categories, category].sort((a, b) => 
        a.name.localeCompare(b.name)
      ),
    }));
  },

  updateCategory: (id: string, updates: Partial<Category>) => {
    set((state) => ({
      categories: state.categories
        .map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  removeCategory: (id: string) => {
    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== id),
    }));
  },

  clearError: () => set({ error: null }),
}));
