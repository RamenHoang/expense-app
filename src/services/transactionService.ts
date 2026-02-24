import { supabase } from '../config/supabase';
import * as FileSystem from 'expo-file-system';
import {
  Transaction,
  TransactionWithCategory,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
} from '../types/transaction';

// Helper function to convert base64 to Blob
function base64toBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

export const transactionService = {
  /**
   * Get transactions with optional filters
   */
  getTransactions: async (
    filters?: TransactionFilters
  ): Promise<TransactionWithCategory[]> => {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color, type)
      `)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

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

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single transaction by ID
   */
  getTransactionById: async (id: string): Promise<TransactionWithCategory> => {
    const { data, error } = await supabase
      .from('transactions')
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
      // Read file as base64 (using string literal instead of EncodingType enum)
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

      // Convert base64 to blob
      const blob = base64toBlob(base64, 'image/jpeg');

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
