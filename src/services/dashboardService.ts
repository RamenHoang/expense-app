import { supabase } from '../config/supabase';

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  category_icon?: string;
  category_color?: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export const dashboardService = {
  /**
   * Get dashboard summary for a date range
   */
  getDashboardSummary: async (
    startDate?: string,
    endDate?: string
  ): Promise<DashboardSummary> => {
    let query = supabase.from('transactions').select('type, amount');

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary = (data || []).reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.totalIncome += Number(transaction.amount);
          acc.incomeCount += 1;
        } else {
          acc.totalExpense += Number(transaction.amount);
          acc.expenseCount += 1;
        }
        acc.transactionCount += 1;
        return acc;
      },
      {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        transactionCount: 0,
        incomeCount: 0,
        expenseCount: 0,
      }
    );

    summary.balance = summary.totalIncome - summary.totalExpense;
    return summary;
  },

  /**
   * Get spending by category for a date range
   */
  getCategoryBreakdown: async (
    type: 'income' | 'expense',
    startDate?: string,
    endDate?: string
  ): Promise<CategorySummary[]> => {
    let query = supabase
      .from('transactions')
      .select(`
        amount,
        category:categories(id, name, icon, color)
      `)
      .eq('type', type);

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by category
    const categoryMap = new Map<string, {
      name: string;
      icon?: string;
      color?: string;
      total: number;
      count: number;
    }>();

    let grandTotal = 0;

    (data || []).forEach((transaction: any) => {
      const categoryId = transaction.category?.id || 'uncategorized';
      const categoryName = transaction.category?.name || 'Uncategorized';
      const categoryIcon = transaction.category?.icon;
      const categoryColor = transaction.category?.color;
      const amount = Number(transaction.amount);

      grandTotal += amount;

      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId)!;
        existing.total += amount;
        existing.count += 1;
      } else {
        categoryMap.set(categoryId, {
          name: categoryName,
          icon: categoryIcon,
          color: categoryColor,
          total: amount,
          count: 1,
        });
      }
    });

    // Convert to array and add percentages
    const breakdown: CategorySummary[] = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        category_id: categoryId,
        category_name: data.name,
        category_icon: data.icon,
        category_color: data.color,
        total: data.total,
        count: data.count,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return breakdown;
  },

  /**
   * Get monthly trends for the last N months
   */
  getMonthlyTrends: async (months: number = 6): Promise<MonthlyTrend[]> => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .lte('transaction_date', endDate.toISOString().split('T')[0])
      .order('transaction_date');

    if (error) throw error;

    // Initialize all months in the range with zero values
    const monthMap = new Map<string, { income: number; expense: number }>();
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, { income: 0, expense: 0 });
      current.setMonth(current.getMonth() + 1);
    }

    // Fill in actual transaction data
    (data || []).forEach((transaction: any) => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthMap.has(monthKey)) {
        const monthData = monthMap.get(monthKey)!;
        if (transaction.type === 'income') {
          monthData.income += Number(transaction.amount);
        } else {
          monthData.expense += Number(transaction.amount);
        }
      }
    });

    // Convert to array with month names
    const trends: MonthlyTrend[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return trends;
  },

  /**
   * Get recent transactions (for dashboard widget)
   */
  getRecentTransactions: async (limit: number = 5) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
