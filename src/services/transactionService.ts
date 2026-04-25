import { supabase } from '../config/supabase';
import {
  Transaction,
  TransactionWithCategory,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from '../types/transaction';

export const transactionService = {
  /**
   * Get transactions with optional filters
   */
  getTransactions: async (
    filters?: TransactionFilters
  ): Promise<TransactionWithCategory[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply scope filter
    if (filters?.scope === 'mine') {
      // Only my transactions (not shared)
      query = query.eq('user_id', user.id).is('is_shared', false);
    } else if (filters?.scope === 'family') {
      // Only shared family transactions
      query = query.eq('is_shared', true);
    }
    // 'all' or undefined = default behavior (RLS handles it)

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.start_date) {
      query = query.gte('transaction_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('transaction_date', filters.end_date);
    }

    if (filters?.search) {
      query = query.ilike('note', `%${filters.search}%`);
    }

    // Pagination support
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single transaction by ID
   */
  getTransactionById: async (id: string): Promise<TransactionWithCategory> => {
    console.log('[TransactionService] Fetching transaction:', id);
    
    // Fetch transaction with category
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.log('[TransactionService] Error fetching transaction:', error);
      throw error;
    }

    console.log('[TransactionService] Transaction fetched:', JSON.stringify(transaction, null, 2));

    // Fetch user profile and email separately
    if (transaction?.user_id) {
      console.log('[TransactionService] Fetching profile for user_id:', transaction.user_id);
      
      // Fetch profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', transaction.user_id)
        .maybeSingle();

      console.log('[TransactionService] Profile fetch result:', { profile, profileError });

      // Fetch email using RPC function
      const { data: userEmail, error: emailError } = await supabase
        .rpc('get_user_email', { p_user_id: transaction.user_id });

      console.log('[TransactionService] Email fetch result:', { userEmail, emailError });

      const result = {
        ...transaction,
        user_profile: {
          id: profile?.id || transaction.user_id,
          full_name: profile?.full_name || userEmail || 'Unknown User',
          email: userEmail || undefined,
        },
      };
      
      console.log('[TransactionService] Returning transaction with profile:', JSON.stringify(result, null, 2));
      return result;
    }

    console.log('[TransactionService] No user_id, returning transaction without profile');
    return transaction;
  },

  /**
   * Create a new transaction
   */
  createTransaction: async (
    input: CreateTransactionInput
  ): Promise<Transaction> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('transactions')
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
   * Create multiple transactions in a single Supabase insert
   */
  createTransactionsBatch: async (
    inputs: CreateTransactionInput[]
  ): Promise<Transaction[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('transactions')
      .insert(inputs.map(input => ({ user_id: user.id, ...input })))
      .select();

    if (error) throw error;
    return data || [];
  },

  /**
   * Update an existing transaction
   */
  updateTransaction: async (
    id: string,
    input: UpdateTransactionInput
  ): Promise<Transaction> => {
    const { data, error } = await supabase
      .from('transactions')
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
   * Delete a transaction
   */
  deleteTransaction: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get transaction summary for a period
   */
  getTransactionSummary: async (
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  }> => {
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
        } else {
          acc.totalExpense += Number(transaction.amount);
        }
        acc.transactionCount += 1;
        return acc;
      },
      {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        transactionCount: 0,
      }
    );

    summary.balance = summary.totalIncome - summary.totalExpense;
    return summary;
  },

  /**
   * Upload receipt image to Supabase Storage
   */
  uploadReceipt: async (
    transactionId: string,
    fileUri: string,
    fileName: string
  ): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const filePath = `${user.id}/${transactionId}/${fileName}`;

    try {
      // Fetch the file and convert to ArrayBuffer, then Blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      console.log('Receipt uploaded successfully:', filePath);
      // Return the file path (we'll use signed URLs when displaying)
      return filePath;
    } catch (error: any) {
      console.error('Receipt upload error:', error);
      throw new Error(`Receipt upload failed: ${error.message || 'Unknown error'}`);
    }
  },

  /**
   * Get signed URL for receipt (for private storage)
   */
  getReceiptUrl: async (filePath: string): Promise<string> => {
    if (!filePath) return '';

    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  },

  /**
   * Delete receipt image from storage
   */
  deleteReceipt: async (receiptUrl: string): Promise<void> => {
    if (!receiptUrl) return;

    // Extract file path from URL
    const urlParts = receiptUrl.split('/');
    const bucketIndex = urlParts.indexOf('receipts');
    if (bucketIndex === -1) return;

    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from('receipts')
      .remove([filePath]);

    if (error) throw error;
  },
};
