import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, SegmentedButtons, Snackbar, useTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { CategorySelector } from '../../categories/components/CategorySelector';
import { AmountInput } from '../../transactions/components/AmountInput';
import { budgetService } from '../../../services/budgetService';
import { useBudgetStore } from '../../../store/budgetStore';
import { useUserStore } from '../../../store/userStore';
import { Category } from '../../../types/category';
import { formatCurrency } from '../../../utils/currency';

type SetBudgetScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const SetBudgetScreen = ({ navigation }: SetBudgetScreenProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
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
      setError(t('budgets.amountRequired'));
      isValid = false;
    } else {
      setAmountError(false);
    }

    if (!selectedCategory) {
      setCategoryError(true);
      if (isValid) setError(t('budgets.categoryRequired'));
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
          t('budgets.budgetExists'),
          t('budgets.budgetExistsMessage', { 
            period: period === 'monthly' ? t('budgets.monthly').toLowerCase() : t('budgets.yearly').toLowerCase(), 
            category: selectedCategory!.name 
          }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('budgets.update'),
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
      setError(err.message || t('budgets.budgetSetError'));
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

      setSuccess(t('budgets.budgetSetSuccess'));

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

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setAmountError(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.form}>
        <Text variant="titleMedium" style={styles.title}>
          {t('budgets.setBudgetLimit')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('budgets.setBudgetDescription')}
        </Text>

        <Text variant="labelLarge" style={styles.label}>
          {t('budgets.budgetPeriod')}
        </Text>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as any)}
          buttons={[
            { value: 'monthly', label: t('budgets.monthly') },
            { value: 'yearly', label: t('budgets.yearly') },
          ]}
          style={styles.segmentedButtons}
        />

        <CategorySelector
          selectedCategoryId={selectedCategory?.id}
          onSelectCategory={handleCategorySelect}
          type="expense"
          error={categoryError}
        />

        <AmountInput
          value={amount}
          onChangeText={handleAmountChange}
          error={amountError}
          disabled={loading}
        />

        {selectedCategory && amount && (
          <View style={[styles.summary, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleSmall" style={styles.summaryLabel}>
              {t('budgets.summary')}
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">{t('budgets.category')}:</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {selectedCategory.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">{t('budgets.period')}:</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {period === 'monthly' ? t('budgets.monthly') : t('budgets.yearly')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">{t('budgets.budgetLimit')}:</Text>
              <Text variant="titleMedium" style={[styles.summaryValue, { color: theme.colors.primary }]}>
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
            {t('common.cancel')}
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          >
            {t('budgets.setBudget')}
          </Button>
        </View>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        action={{
          label: t('common.close'),
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
