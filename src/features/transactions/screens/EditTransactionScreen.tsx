import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { CategorySelector } from '../../categories/components/CategorySelector';
import { DatePickerInput } from '../components/DatePickerInput';
import { AmountInput } from '../components/AmountInput';
import { transactionService } from '../../../services/transactionService';
import { useTransactionStore } from '../../../store/transactionStore';
import { useFamilyStore } from '../../../store/familyStore';
import { useAuthStore } from '../../../store/authStore';
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
  const { t } = useTranslation();
  const theme = useTheme();
  const { transactionId } = route.params;
  const updateTransactionInStore = useTransactionStore((state) => state.updateTransaction);
  const { family, shareWithFamily, setShareWithFamily } = useFamilyStore();
  const currentUser = useAuthStore((state) => state.user);

  const [transaction, setTransaction] = useState<TransactionWithCategory | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isYourTransaction, setIsYourTransaction] = useState(false);

  // Validation errors
  const [amountError, setAmountError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      const data = await transactionService.getTransactionById(transactionId);
      // console.log('Loaded transaction:', JSON.stringify(data, null, 2));
      // console.log('Current user ID:', currentUser?.id);
      // console.log('Transaction user_id:', data.user_id);
      // console.log('User profile:', data.user_profile);

      setTransaction(data);
      setType(data.type);
      setAmount(data.amount.toString());
      setDate(new Date(data.transaction_date));
      setNote(data.note || '');
      setIsShared(data.is_shared || false);

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

      setIsYourTransaction(data.user_id === currentUser?.id);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('transactions.failedToLoadTransaction'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;

    if (!amount || parseFloat(amount) <= 0) {
      setAmountError(true);
      setError(t('transactions.amountRequired'));
      isValid = false;
    } else {
      setAmountError(false);
    }

    if (!selectedCategory) {
      setCategoryError(true);
      if (isValid) setError(t('transactions.categoryRequired'));
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
          family_id: isShared && family ? family.id : null,
          is_shared: isShared && family ? true : false,
        }
      );

      // Fetch the updated transaction with category details
      const transactionWithCategory = await transactionService.getTransactionById(
        updatedTransaction.id
      );

      updateTransactionInStore(transactionId, transactionWithCategory);
      setSuccess(t('transactions.transactionUpdated'));

      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err: any) {
      setError(err.message || t('common.error'));
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
          {t('common.loading')}
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
          {/* Display creator info if not the current user */}
          {/* {console.log('Rendering creator check:', {
            hasTransaction: !!transaction,
            transactionUserId: transaction?.user_id,
            currentUserId: currentUser?.id,
            isDifferentUser: transaction?.user_id !== currentUser?.id,
            hasUserProfile: !!transaction?.user_profile,
            userProfile: transaction?.user_profile
          })} */}
          {transaction && transaction.user_id !== currentUser?.id && transaction.user_profile && (
            <View style={[styles.creatorInfo, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="labelMedium" style={styles.creatorLabel}>
                {t('transactions.createdBy')}
              </Text>
              <Text variant="bodyLarge" style={styles.creatorName}>
                {transaction.user_profile.email && (
                  <Text variant="labelMedium" style={styles.creatorEmail}>
                    {transaction.user_profile.full_name}
                  </Text>
                )}
              </Text>
            </View>
          )}

          <Text variant="labelLarge" style={styles.label}>
            {t('transactions.type')}
          </Text>
          <SegmentedButtons
            value={type}
            onValueChange={(value) => setType(value as 'income' | 'expense')}
            buttons={[
              {
                value: 'income',
                label: t('transactions.income'),
                icon: 'cash-plus',
              },
              {
                value: 'expense',
                label: t('transactions.expense'),
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
            label={t('transactions.date')}
            disabled={saving}
          />

          <TextInput
            label={t('transactions.enterDescription')}
            value={note}
            onChangeText={setNote}
            mode="outlined"
            multiline
            numberOfLines={3}
            disabled={saving}
            style={styles.input}
            placeholder={t('transactions.enterDescription')}
          />

          {/* Share with family toggle */}
          {family && (
            <View style={styles.switchContainer}>
              <View style={styles.switchLabel}>
                <Text variant="labelLarge">{t('transactions.shareWithFamily')}</Text>
                <Text variant="bodySmall" style={styles.switchHint}>
                  {t('transactions.shareWithFamilyDesc', { familyName: family.name })}
                </Text>
              </View>
              <Switch
                value={isShared}
                onValueChange={(value) => {
                  setIsShared(value);
                  setShareWithFamily(value);
                }}
                disabled={saving || !isYourTransaction}
              />
            </View>
          )}

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving || !isYourTransaction}
              style={styles.cancelButton}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={saving}
              disabled={saving || !isYourTransaction}
              style={styles.submitButton}
            >
              {t('common.save')}
            </Button>
          </View>
        </View>
      </ScrollView>

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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchHint: {
    marginTop: 4,
    opacity: 0.7,
  },
  creatorInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  creatorLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  creatorName: {
    fontWeight: '600',
  },
  creatorEmail: {
    fontWeight: '400',
    opacity: 0.8,
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
