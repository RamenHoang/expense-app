export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithCategory extends Budget {
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    type: 'income' | 'expense';
  };
}

export interface CreateBudgetInput {
  category_id: string;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
}

export interface UpdateBudgetInput {
  amount?: number;
  period?: 'monthly' | 'yearly';
  start_date?: string;
  end_date?: string;
}

export interface BudgetUsage {
  budget: BudgetWithCategory;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isWarning: boolean; // >80%
}
