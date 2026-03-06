export interface Transaction {
  id: string;
  user_id: string;
  category_id?: string;
  type: 'income' | 'expense';
  amount: number;
  note?: string;
  transaction_date: string;
  receipt_url?: string;
  family_id?: string | null;
  is_shared?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    type: 'income' | 'expense';
  };
}

export interface CreateTransactionInput {
  type: 'income' | 'expense';
  amount: number;
  transaction_date: string;
  category_id?: string;
  note?: string;
  receipt_url?: string;
  family_id?: string;
  is_shared?: boolean;
}

export interface UpdateTransactionInput {
  type?: 'income' | 'expense';
  amount?: number;
  transaction_date?: string;
  category_id?: string;
  note?: string;
  receipt_url?: string;
  family_id?: string | null;
  is_shared?: boolean;
}

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
  scope?: 'all' | 'mine' | 'family'; // Filter by ownership
}
