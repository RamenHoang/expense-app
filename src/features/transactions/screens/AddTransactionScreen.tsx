import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategorySelector } from '../../categories/components/CategorySelector';
import { DatePickerInput } from '../components/DatePickerInput';
import { AmountInput } from '../components/AmountInput';
import { ReceiptUpload } from '../components/ReceiptUpload';
import { transactionService } from '../../../services/transactionService';
import { useTransactionStore } from '../../../store/transactionStore';
import { useUserStore } from '../../../store/userStore';
import { Category } from '../../../types/category';
import { formatCurrency } from '../../../utils/currency';

type AddTransactionScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const AddTransactionScreen = ({ navigation }: AddTransactionScreenProps) => {
  const theme = useTheme();
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const { profile, fetchProfile } = useUserStore();
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Validation errors
  const [amountError, setAmountError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  const currency = profile?.currency || 'USD';

  const validateForm = () => {
    let isValid = true;

    if (!amount || parseFloat(amount) <= 0) {
      setAmountError(true);
      setError('Please enter a valid amount');
      isValid = false;
    } else {
      setAmountError(false);
    }

    if (!selectedCategory) {
      setCategoryError(true);
      if (isValid) setError('Please select a category');
      isValid = false;
    } else {
      setCategoryError(false);
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const transaction = await transactionService.createTransaction({
        type,
        amount: parseFloat(amount),
        category_id: selectedCategory?.id,
        transaction_date: date.toISOString().split('T')[0],
        note: note.trim() || undefined,
      });

      // Upload receipt if provided
      let receiptUrl;
      if (receiptUri && receiptFileName) {
        try {
          receiptUrl = await transactionService.uploadReceipt(
            transaction.id,
            receiptUri,
            receiptFileName
          );
          // Update transaction with receipt URL
          await transactionService.updateTransaction(transaction.id, { receipt_url: receiptUrl });
        } catch (uploadError: any) {
          console.error('Receipt upload failed:', uploadError);
          // Don't fail the whole transaction if receipt upload fails
        }
      }

      // Fetch the created transaction with category details
      const transactionWithCategory = await transactionService.getTransactionById(
        transaction.id
      );

      addTransaction(transactionWithCategory);
      setSuccess('Transaction added successfully!');

      // Reset form
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
    setCategoryError(false);
    
    // Auto-set type based on category
    if (category && category.type !== type) {
      setType(category.type);
    }
  };

  const handleReceiptUpload = (uri: string, fileName: string) => {
    setReceiptUri(uri);
    setReceiptFileName(fileName);
  };

  const handleReceiptDelete = () => {
    setReceiptUri('');
    setReceiptFileName('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.form}>
          <Text variant="labelLarge" style={styles.label}>
            Type
          </Text>
          <SegmentedButtons
            value={type}
            onValueChange={(value) => setType(value as 'income' | 'expense')}
            buttons={[
              {
                value: 'income',
                label: 'Income',
                icon: 'cash-plus',
              },
              {
                value: 'expense',
                label: 'Expense',
                icon: 'cash-minus',
              },
            ]}
            disabled={loading}
            style={styles.segmentedButtons}
          />

          <AmountInput
            value={amount}
            onChangeText={setAmount}
            error={amountError}
            disabled={loading}
            type={type}
          />

          <CategorySelector
            selectedCategoryId={selectedCategory?.id}
            onSelectCategory={handleCategorySelect}
            type={type}
            error={categoryError}
          />

          <DatePickerInput
            value={date}
            onChange={setDate}
            label="Date"
            disabled={loading}
          />

          <TextInput
            label="Note (Optional)"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            multiline
            numberOfLines={3}
            disabled={loading}
            style={styles.input}
            placeholder="Add a note about this transaction"
          />

          <ReceiptUpload
            receiptUrl={receiptUri}
            onUpload={handleReceiptUpload}
            onDelete={handleReceiptDelete}
            disabled={loading}
          />

          <View style={[styles.summary, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={styles.summaryLabel}>
              Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Type:</Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.summaryValue,
                  { color: type === 'income' ? theme.colors.income : theme.colors.expense },
                ]}
              >
                {type === 'income' ? 'Income' : 'Expense'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Amount:</Text>
              <Text
                variant="titleLarge"
                style={[
                  styles.summaryValue,
                  { color: type === 'income' ? theme.colors.income : theme.colors.expense },
                ]}
              >
                {amount ? formatCurrency(parseFloat(amount.replace(/,/g, '')), currency) : formatCurrency(0, currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Category:</Text>
              <Text variant="bodyLarge" style={styles.summaryValue}>
                {selectedCategory?.name || 'None'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              Add Transaction
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setError(''),
        }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={2000}
        style={{ backgroundColor: theme.colors.income }}
      >
        {success}
      </Snackbar>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  form: {
    flex: 1,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  summary: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  summaryLabel: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
