import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Snackbar,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { CategorySelector } from '../../categories/components/CategorySelector';
import { DatePickerInput } from '../components/DatePickerInput';
import { AmountInput } from '../components/AmountInput';
// import { ReceiptUpload } from '../components/ReceiptUpload';
import { transactionService } from '../../../services/transactionService';
import { useTransactionStore } from '../../../store/transactionStore';
import { useUserStore } from '../../../store/userStore';
import { useFamilyStore } from '../../../store/familyStore';
import { useCategoryStore } from '../../../store/categoryStore';
import { Category } from '../../../types/category';
import { formatCurrency } from '../../../utils/currency';
import { formatDateToUTC7String } from '../../../utils/date';
import { FilterButtonGroup } from '../../../components/FilterButtonGroup';
import { VoiceInputModal } from '../components/VoiceInputModal';
import { RootStackParamList } from '../../../types/navigation';
import { ScreenTransition } from '../../../components/ScreenTransition';

type AddTransactionScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const AddTransactionScreen = ({ navigation }: AddTransactionScreenProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'AddTransaction'>>();
  const params = route.params;

  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const { profile, fetchProfile } = useUserStore();
  const { family, shareWithFamily, setShareWithFamily } = useFamilyStore();
  const { categories } = useCategoryStore();

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>(params?.initialType ?? 'expense');
  const [amount, setAmount] = useState(params?.initialAmount ?? '');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState(params?.initialNote ?? '');
  const [isShared, setIsShared] = useState(shareWithFamily);
  // const [receiptUri, setReceiptUri] = useState('');
  // const [receiptFileName, setReceiptFileName] = useState('');
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

  // Set up mic button in screen header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="microphone"
          size={24}
          onPress={() => setShowVoiceModal(true)}
        />
      ),
    });
  }, [navigation]);

  // Auto-select initial category from voice params
  useEffect(() => {
    if (params?.initialCategoryId && categories.length > 0) {
      const cat = categories.find(c => c.id === params.initialCategoryId);
      if (cat) {
        setSelectedCategory(cat);
        setType(cat.type as 'income' | 'expense');
      }
    }
  }, [params?.initialCategoryId, categories]);

  const currency = profile?.currency || 'USD';

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

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const transaction = await transactionService.createTransaction({
        type,
        amount: parseFloat(amount),
        category_id: selectedCategory?.id,
        // Convert Date object to YYYY-MM-DD string in UTC+7
        transaction_date: formatDateToUTC7String(date),
        note: note.trim() || undefined,
        family_id: isShared && family ? family.id : undefined,
        is_shared: isShared && family ? true : false,
      });

      // Upload receipt if provided
      // let receiptUrl;
      // if (receiptUri && receiptFileName) {
      //   try {
      //     receiptUrl = await transactionService.uploadReceipt(
      //       transaction.id,
      //       receiptUri,
      //       receiptFileName
      //     );
      //     // Update transaction with receipt URL
      //     await transactionService.updateTransaction(transaction.id, { receipt_url: receiptUrl });
      //   } catch (uploadError: any) {
      //     console.error('Receipt upload failed:', uploadError);
      //     // Don't fail the whole transaction if receipt upload fails
      //   }
      // }

      // Fetch the created transaction with category details
      const transactionWithCategory = await transactionService.getTransactionById(
        transaction.id
      );

      addTransaction(transactionWithCategory);
      setSuccess(t('transactions.transactionAdded'));

      // Reset form
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err: any) {
      setError(err.message || t('common.error'));
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

  // const handleReceiptUpload = (uri: string, fileName: string) => {
  //   setReceiptUri(uri);
  //   setReceiptFileName(fileName);
  // };

  // const handleReceiptDelete = () => {
  //   setReceiptUri('');
  //   setReceiptFileName('');
  // };

  return (
    <ScreenTransition>
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
          {/* <Text variant="labelLarge" style={styles.label}>
            {t('transactions.type')}
          </Text> */}
          <FilterButtonGroup
            value={type}
            onValueChange={(value) => setType(value as 'income' | 'expense')}
            buttons={[
              {
                value: 'income',
                label: t('transactions.income'),
              },
              {
                value: 'expense',
                label: t('transactions.expense'),
              },
            ]}
            style={styles.segmentedButtons}
          ></FilterButtonGroup>

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
            label={t('transactions.date')}
            disabled={loading}
          />

          <TextInput
            label={t('transactions.enterDescription')}
            value={note}
            onChangeText={setNote}
            mode="outlined"
            multiline
            numberOfLines={3}
            disabled={loading}
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
                disabled={loading}
              />
            </View>
          )}

          {/* Receipt upload - commented out for now */}
          {/* <ReceiptUpload
            receiptUrl={receiptUri}
            onUpload={handleReceiptUpload}
            onDelete={handleReceiptDelete}
            disabled={loading}
          /> */}

          <View style={[styles.summary, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={styles.summaryLabel}>
              {t('dashboard.summary')}
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">{t('transactions.type')}:</Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.summaryValue,
                  { color: type === 'income' ? theme.colors.income : theme.colors.expense },
                ]}
              >
                {type === 'income' ? t('transactions.income') : t('transactions.expense')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">{t('common.amount')}:</Text>
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
              <Text variant="bodyLarge">{t('common.category')}:</Text>
              <Text variant="bodyLarge" style={styles.summaryValue}>
                {selectedCategory?.name || t('common.uncategorized')}
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
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              {t('transactions.addTransaction')}
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

      <VoiceInputModal
        visible={showVoiceModal}
        onDismiss={() => setShowVoiceModal(false)}
        onConfirm={(parsed) => {
          if (parsed.type) setType(parsed.type);
          if (parsed.amount) setAmount(String(parsed.amount));
          if (parsed.note) setNote(parsed.note);
          if (parsed.date) setDate(parsed.date);
          if (parsed.categoryId && categories.length > 0) {
            const cat = categories.find(c => c.id === parsed.categoryId);
            if (cat) {
              setSelectedCategory(cat);
              setType(cat.type as 'income' | 'expense');
            }
          }
          setCategoryError(false);
          setAmountError(false);
        }}
      />
    </View>
    </ScreenTransition>
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
