import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { transactionService } from './transactionService';
import { categoryService } from './categoryService';
import { budgetService } from './budgetService';
import { userService } from './userService';

export const exportService = {
  /**
   * Export all data as JSON
   */
  exportDataAsJSON: async (): Promise<string> => {
    try {
      // Fetch all data
      const [transactions, categories, budgets, profile] = await Promise.all([
        transactionService.getTransactions(),
        categoryService.getCategories(),
        budgetService.getBudgets(),
        userService.getProfile(),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        profile: {
          fullName: profile?.full_name,
          currency: profile?.currency,
        },
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
        })),
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.transaction_date,
          note: tx.note,
          categoryId: tx.category_id,
          categoryName: tx.category?.name,
          receiptUrl: tx.receipt_url,
          createdAt: tx.created_at,
        })),
        budgets: budgets.map(budget => ({
          id: budget.id,
          categoryId: budget.category_id,
          categoryName: budget.category?.name,
          amount: budget.amount,
          period: budget.period,
          startDate: budget.start_date,
          endDate: budget.end_date,
        })),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error: any) {
      throw new Error(`Export failed: ${error.message}`);
    }
  },

  /**
   * Export data as CSV
   */
  exportDataAsCSV: async (): Promise<{ transactions: string; categories: string; budgets: string }> => {
    try {
      const [transactions, categories, budgets] = await Promise.all([
        transactionService.getTransactions(),
        categoryService.getCategories(),
        budgetService.getBudgets(),
      ]);

      // Helper to escape CSV fields
      const escapeCSV = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Transactions CSV with BOM for Excel UTF-8 support
      const transactionsCsv = '\uFEFF' + [
        'Date,Type,Category,Amount,Note,Created At',
        ...transactions.map(tx =>
          [
            escapeCSV(tx.transaction_date),
            escapeCSV(tx.type),
            escapeCSV(tx.category?.name || 'Uncategorized'),
            tx.amount,
            escapeCSV(tx.note || ''),
            escapeCSV(tx.created_at),
          ].join(',')
        ),
      ].join('\n');

      // Categories CSV
      const categoriesCsv = '\uFEFF' + [
        'Name,Type,Icon,Color',
        ...categories.map(cat =>
          [
            escapeCSV(cat.name),
            escapeCSV(cat.type),
            escapeCSV(cat.icon || ''),
            escapeCSV(cat.color || ''),
          ].join(',')
        ),
      ].join('\n');

      // Budgets CSV
      const budgetsCsv = '\uFEFF' + [
        'Category,Amount,Period,Start Date,End Date',
        ...budgets.map(budget =>
          [
            escapeCSV(budget.category?.name || ''),
            budget.amount,
            escapeCSV(budget.period),
            escapeCSV(budget.start_date),
            escapeCSV(budget.end_date || ''),
          ].join(',')
        ),
      ].join('\n');

      return {
        transactions: transactionsCsv,
        categories: categoriesCsv,
        budgets: budgetsCsv,
      };
    } catch (error: any) {
      throw new Error(`CSV export failed: ${error.message}`);
    }
  },

  /**
   * Save and share export file
   */
  saveAndShareFile: async (content: string, filename: string): Promise<void> => {
    try {
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Write file with proper UTF-8 encoding
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: 'utf8',
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: filename.endsWith('.json') ? 'application/json' : 'text/csv',
          dialogTitle: 'Export Data',
          UTI: filename.endsWith('.json') ? 'public.json' : 'public.comma-separated-values-text',
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error: any) {
      console.error('Export file error:', error);
      throw new Error(`Failed to save file: ${error.message}`);
    }
  },

  /**
   * Export all data and share as JSON
   */
  exportAndShareJSON: async (): Promise<void> => {
    const jsonData = await exportService.exportDataAsJSON();
    const filename = `personal-finance-backup-${new Date().toISOString().split('T')[0]}.json`;
    await exportService.saveAndShareFile(jsonData, filename);
  },

  /**
   * Export transactions as CSV and share
   */
  exportAndShareCSV: async (): Promise<void> => {
    const csvData = await exportService.exportDataAsCSV();
    const date = new Date().toISOString().split('T')[0];
    
    // For now, export transactions (most important data)
    const filename = `transactions-${date}.csv`;
    await exportService.saveAndShareFile(csvData.transactions, filename);
  },
};
