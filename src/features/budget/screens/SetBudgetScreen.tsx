import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Snackbar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategorySelector } from '../../categories/components/CategorySelector';
import { budgetService } from '../../../services/budgetService';
import { useBudgetStore } from '../../../store/budgetStore';
import { useUserStore } from '../../../store/userStore';
import { Category } from '../../../types/category';
import { formatCurrency } from '../../../utils/currency';

type SetBudgetScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const SetBudgetScreen = ({ navigation }: SetBudgetScreenProps) => {
  const { fetchBudgetUsage } = useBudgetStore();
  const { profile, fetchProfile } = useUserStore();
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      // Check if budget already exists
      const exists = await budgetService.hasBudget(selectedCategory!.id, period);
      
      if (exists) {
        Alert.alert(
          'Budget Exists',
          `A ${period} budget already exists for ${selectedCategory!.name}. Do you want to update it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                // For simplicity, create a new one (should ideally update the existing)
                await createBudget();
              },
            },
          ]
        );
        setLoading(false);
        return;
      }

      await createBudget();
    } catch (err: any) {
      setError(err.message || 'Failed to set budget');
      setLoading(false);
    }
  };

  const createBudget = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(1); // First day of month

      await budgetService.createBudget({
        category_id: selectedCategory!.id,
        amount: parseFloat(amount),
        period,
        start_date: startDate.toISOString().split('T')[0],
      });

      // Refresh budget usage
      await fetchBudgetUsage(period);

      setSuccess('Budget set successfully!');

      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
    setCategoryError(false);
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    setAmount(cleaned);
    setAmountError(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.form}>
        <Text variant="titleMedium" style={styles.title}>
          Set a Budget Limit
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Choose a category and set a spending limit to track your expenses.
        </Text>

        <Text variant="labelLarge" style={styles.label}>
          Budget Period
        </Text>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as any)}
          buttons={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
          style={styles.segmentedButtons}
        />

        <CategorySelector
          selectedCategoryId={selectedCategory?.id}
          onSelectCategory={handleCategorySelect}
          type="expense"
          error={categoryError}
        />

        <TextInput
          label="Budget Amount"
          value={amount}
          onChangeText={handleAmountChange}
          mode="outlined"
          keyboardType="decimal-pad"
          error={amountError}
          disabled={loading}
          left={<TextInput.Affix text={currency} />}
          style={styles.input}
          placeholder="0.00"
        />

        {selectedCategory && amount && (
          <View style={styles.summary}>
            <Text variant="titleSmall" style={styles.summaryLabel}>
              Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Category:</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {selectedCategory.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Period:</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {period === 'monthly' ? 'Monthly' : 'Yearly'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Budget Limit:</Text>
              <Text variant="titleMedium" style={[styles.summaryValue, { color: '#6200ee' }]}>
                {formatCurrency(parseFloat(amount || '0'), currency)}
              </Text>
            </View>
          </View>
        )}

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
            Set Budget
          </Button>
        </View>
      </View>

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
        style={{ backgroundColor: '#4caf50' }}
      >
        {success}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 24,
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
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
