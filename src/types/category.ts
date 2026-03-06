export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  family_id?: string | null;
  is_shared?: boolean;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  family_id?: string;
  is_shared?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: 'income' | 'expense';
  icon?: string;
  color?: string;
  family_id?: string | null;
  is_shared?: boolean;
}
