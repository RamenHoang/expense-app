import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
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
import { RouteProp } from '@react-navigation/native';
import { CategorySelector } from '../../categories/components/CategorySelector';
import { DatePickerInput } from '../components/DatePickerInput';
import { AmountInput } from '../components/AmountInput';
import { transactionService } from '../../../services/transactionService';
import { useTransactionStore } from '../../../store/transactionStore';
import { Category } from '../../../types/category';
import { TransactionWithCategory } from '../../../types/transaction';

type EditTransactionScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ params: { transactionId: string } }, 'params'>;
};

export const EditTransactionScreen = ({
  navigation,
  route,
}: EditTransactionScreenProps) => {
  const theme = useTheme();
  const { transactionId } = route.params;
  const updateTransactionInStore = useTransactionStore((state) => state.updateTransaction);

  const [transaction, setTransaction] = useState<TransactionWithCategory | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Validation errors
  const [amountError, setAmountError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      const data = await transactionService.getTransactionById(transactionId);
      setTransaction(data);
      setType(data.type);
      setAmount(data.amount.toString());
      setDate(new Date(data.transaction_date));
      setNote(data.note || '');
      
      if (data.category) {
        setSelectedCategory({
          id: data.category.id,
          name: data.category.name,
          icon: data.category.icon,
          color: data.category.color,
          type: data.category.type,
          user_id: data.user_id,
          created_at: '',
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load transaction');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

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

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedTransaction = await transactionService.updateTransaction(
        transactionId,
        {
          type,
          amount: parseFloat(amount),
          category_id: selectedCategory?.id,
          transaction_date: date.toISOString().split('T')[0],
          note: note.trim() || undefined,
        }
      );

      // Fetch the updated transaction with category details
      const transactionWithCategory = await transactionService.getTransactionById(
        updatedTransaction.id
      );

      updateTransactionInStore(transactionId, transactionWithCategory);
      setSuccess('Transaction updated successfully!');

      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading transaction...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            disabled={saving}
            style={styles.segmentedButtons}
          />

          <AmountInput
            value={amount}
            onChangeText={setAmount}
            error={amountError}
            disabled={saving}
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
            disabled={saving}
          />

          <TextInput
            label="Note (Optional)"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            multiline
            numberOfLines={3}
            disabled={saving}
            style={styles.input}
            placeholder="Add a note about this transaction"
          />

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={saving}
              disabled={saving}
              style={styles.submitButton}
            >
              Save Changes
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
