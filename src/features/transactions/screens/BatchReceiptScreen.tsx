import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import {
  Text,
  IconButton,
  Button,
  Surface,
  useTheme,
  Chip,
  ActivityIndicator,
  TextInput,
  SegmentedButtons,
  Modal,
  Portal,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { useCategoryStore } from '../../../store/categoryStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { useUserStore } from '../../../store/userStore';
import { useFamilyStore } from '../../../store/familyStore';
import { parseReceiptText, ReceiptItem } from '../../../utils/parseReceiptText';
import { extractTransactionsFromImage } from '../../../services/openRouterService';
import { formatCurrency } from '../../../utils/currency';
import { transactionService } from '../../../services/transactionService';
import { logger } from '../../../utils/logger';
import { formatDateToUTC7String } from '../../../utils/date';
import { DatePickerInput } from '../components/DatePickerInput';
import { AmountInput } from '../components/AmountInput';
import { ScreenTransition } from '../../../components/ScreenTransition';

type ScanState = 'idle' | 'processing' | 'review' | 'submitting';

type QueueItem = {
  key: string;
  name: string;
  amount: number | null;
  categoryId: string | undefined;
  date: Date;
};

export const BatchReceiptScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { categories, fetchCategories } = useCategoryStore();
  const { fetchTransactions } = useTransactionStore();
  const { profile } = useUserStore();
  const { family, shareWithFamily, setShareWithFamily } = useFamilyStore();
  const currency = profile?.currency || 'VND';

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [merchant, setMerchant] = useState('');
  const [receiptDate, setReceiptDate] = useState<Date>(new Date());
  const [globalCategoryId, setGlobalCategoryId] = useState<string | undefined>(undefined);
  const [isShared, setIsShared] = useState(shareWithFamily);
  const [submitError, setSubmitError] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanProgressCount, setScanProgressCount] = useState(0);

  // Inline edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-select "Mua sắm" (Shopping) as default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !globalCategoryId) {
      const shopping = categories.find(c =>
        /mua sắm|shopping|siêu thị|grocery/i.test(c.name)
      );
      if (shopping) setGlobalCategoryId(shopping.id);
    }
  }, [categories]);

  // ─── Image picking & OCR ──────────────────────────────────────────────────

  const processImage = useCallback(async (uri: string) => {
    setScanState('processing');
    setScanError('');
    setMerchant('');
    setScanProgressCount(0);
    try {
      // Compress image (also requests base64 for the vision API call)
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1920 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      type ParsedItem = { name: string; amount: number; date: Date };
      let items: ParsedItem[];

      try {
        if (!compressed.base64) throw new Error('Missing base64 image data');
        const transactions = await extractTransactionsFromImage(
          compressed.base64,
          'image/jpeg',
          accumulatedText => {
            // Rough live progress: count completed "amount" fields streamed so far.
            const found = accumulatedText.match(/"amount"/g)?.length ?? 0;
            setScanProgressCount(found);
          }
        );
        items = transactions.map(tx => ({
          name: tx.description,
          amount: tx.amount,
          date: tx.date ? new Date(tx.date) : new Date(),
        }));
      } catch (aiErr) {
        logger.error('[BatchReceipt] AI vision extraction failed, falling back to OCR + regex parser', aiErr);
        const ocrResult = await TextRecognition.recognize(compressed.uri);
        const parsed = parseReceiptText(ocrResult.text);
        setMerchant(parsed.merchant || '');
        const baseDate = parsed.date ? new Date(parsed.date) : new Date();
        items = parsed.items.map(item => ({ name: item.name, amount: item.amount, date: baseDate }));
      }

      if (items.length === 0) {
        setScanError(t('receipt.noItemsDetected'));
        setScanState('idle');
        return;
      }

      setReceiptDate(items[0].date);
      setQueue(
        items.map(item => ({
          key: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: item.name,
          amount: item.amount,
          categoryId: globalCategoryId,
          date: item.date,
        }))
      );
      setScanState('review');
    } catch (err: any) {
      setScanError(err.message || t('common.error'));
      setScanState('idle');
    }
  }, [globalCategoryId, t]);

  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  // ─── Queue management ─────────────────────────────────────────────────────

  const handleDelete = (key: string) => {
    if (editingKey === key) setEditingKey(null);
    setQueue(prev => prev.filter(item => item.key !== key));
  };

  const handleToggleEdit = (item: QueueItem) => {
    if (editingKey === item.key) {
      setEditingKey(null);
      return;
    }
    setEditingKey(item.key);
    setEditAmount(item.amount ? String(item.amount) : '');
    setEditNote(item.name);
    setEditCategoryId(item.categoryId ?? globalCategoryId);
    setEditDate(item.date);
    setEditType('expense');
  };

  const handleSaveEdit = (key: string) => {
    const amount = editAmount ? parseFloat(editAmount.replace(/,/g, '')) : null;
    setQueue(prev =>
      prev.map(item =>
        item.key !== key
          ? item
          : { ...item, amount, name: editNote, categoryId: editCategoryId, date: editDate }
      )
    );
    setEditingKey(null);
  };

  // Apply global category to all items that haven't been individually edited
  const handleGlobalCategoryChange = (catId: string | undefined) => {
    setGlobalCategoryId(catId);
    setQueue(prev =>
      prev.map(item => ({ ...item, categoryId: catId }))
    );
  };

  // ─── Batch create ─────────────────────────────────────────────────────────

  const handleCreateAll = async () => {
    const valid = queue.filter(item => item.amount && item.amount > 0);
    if (valid.length === 0) return;
    setScanState('submitting');
    setSubmitError('');
    try {
      const inputs = valid.map(item => ({
        type: 'expense' as const,
        amount: item.amount!,
        transaction_date: formatDateToUTC7String(item.date),
        category_id: item.categoryId,
        note: item.name || undefined,
        family_id: isShared && family ? family.id : undefined,
        is_shared: isShared && !!family,
      }));
      await transactionService.createTransactionsBatch(inputs);
      await fetchTransactions();
      useTransactionStore.setState({ lastModifiedTimestamp: Date.now() });
      navigation.goBack();
    } catch (err: any) {
      setSubmitError(err.message || t('common.error'));
      setScanState('review');
    }
  };

  const getCategoryName = (id?: string) =>
    id ? (categories.find(c => c.id === id)?.name ?? t('batchVoice.noCategory')) : t('batchVoice.noCategory');

  const validCount = queue.filter(item => item.amount && item.amount > 0).length;
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderIdle = () => (
    <View style={styles.idleContainer}>
      <Text
        variant="headlineSmall"
        style={[styles.idleTitle, { color: theme.colors.onSurface }]}
      >
        {t('receipt.scanReceipt')}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.idleSubtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        {t('receipt.scanInstructions')}
      </Text>

      {!!scanError && (
        <Surface
          style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}
          elevation={0}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
            {scanError}
          </Text>
        </Surface>
      )}

      <View style={styles.buttonRow}>
        <Button
          mode="contained"
          icon="camera"
          onPress={handleCamera}
          style={styles.pickButton}
          contentStyle={styles.pickButtonContent}
        >
          {t('receipt.camera')}
        </Button>
        <Button
          mode="outlined"
          icon="image"
          onPress={handleGallery}
          style={styles.pickButton}
          contentStyle={styles.pickButtonContent}
        >
          {t('receipt.gallery')}
        </Button>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text
        variant="bodyLarge"
        style={[styles.processingText, { color: theme.colors.onSurfaceVariant }]}
      >
        {scanProgressCount > 0
          ? t('receipt.itemsFoundSoFar', { count: scanProgressCount })
          : t('receipt.analyzing')}
      </Text>
    </View>
  );

  const renderQueueItem = (item: QueueItem) => {
    const isInvalid = !item.amount || item.amount <= 0;
    return (
      <Surface
        key={item.key}
        style={[
          styles.queueCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isInvalid ? theme.colors.error : theme.colors.outline,
            borderWidth: isInvalid ? 1 : 0,
          },
        ]}
        elevation={1}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.error, fontWeight: 'bold', marginBottom: 2 }}
            >
              {isInvalid
                ? t('batchVoice.invalidAmount')
                : formatCurrency(item.amount!, currency)}
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {getCategoryName(item.categoryId)}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <IconButton
              icon="pencil-outline"
              size={18}
              onPress={() => handleToggleEdit(item)}
              iconColor={theme.colors.onSurfaceVariant}
            />
            <IconButton
              icon="trash-can-outline"
              size={18}
              onPress={() => handleDelete(item.key)}
              iconColor={theme.colors.error}
            />
          </View>
        </View>
      </Surface>
    );
  };

  const renderReview = () => (
    <View style={styles.reviewContainer}>
      {/* Header info card */}
      <Surface
        style={[styles.headerCard, { backgroundColor: theme.colors.primaryContainer }]}
        elevation={0}
      >
        <View style={styles.headerCardRow}>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            {t('receipt.merchant')}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}
          >
            {merchant || '—'}
          </Text>
        </View>
        <View style={styles.headerCardRow}>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            {t('transactions.date')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            {receiptDate.toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={styles.headerCardRow}>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            {t('receipt.detectedItems', { count: queue.length })}
          </Text>
          <Button
            mode="text"
            compact
            onPress={() => { setScanState('idle'); setQueue([]); }}
            labelStyle={{ fontSize: 12, color: theme.colors.onPrimaryContainer }}
          >
            {t('receipt.retake')}
          </Button>
        </View>
      </Surface>

      {/* Global category selector */}
      <Text
        variant="labelMedium"
        style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
      >
        {t('receipt.defaultCategory')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {expenseCategories.map(cat => (
            <Chip
              key={cat.id}
              selected={globalCategoryId === cat.id}
              onPress={() => handleGlobalCategoryChange(cat.id)}
              style={styles.categoryChip}
              compact
            >
              {cat.name}
            </Chip>
          ))}
        </View>
      </ScrollView>

      {/* Items list */}
      <Text
        variant="labelLarge"
        style={[styles.queueTitle, { color: theme.colors.onSurfaceVariant }]}
      >
        {t('batchVoice.queueTitle', { count: queue.length })}
      </Text>
      <View style={styles.queueSection}>
        {queue.map(item => renderQueueItem(item))}
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Portal>
      <Modal
        visible={editingKey !== null}
        onDismiss={() => setEditingKey(null)}
        contentContainerStyle={[styles.editModal, { backgroundColor: theme.colors.surface }]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <SegmentedButtons
              value={editType}
              onValueChange={val => {
                setEditType(val as 'income' | 'expense');
                const cat = categories.find(c => c.id === editCategoryId);
                if (cat && cat.type !== val) setEditCategoryId(undefined);
              }}
              buttons={[
                { value: 'expense', label: t('batchVoice.expense') },
                { value: 'income', label: t('batchVoice.income') },
              ]}
              style={styles.typeToggle}
            />

            <AmountInput
              value={editAmount}
              onChangeText={setEditAmount}
              type={editType}
            />

            <TextInput
              key={`note-${editingKey}`}
              mode="outlined"
              label={t('batchVoice.note')}
              defaultValue={editNote}
              onChangeText={setEditNote}
              multiline
              numberOfLines={2}
              style={styles.editInput}
            />

            <DatePickerInput
              value={editDate}
              onChange={setEditDate}
              label={t('transactions.date')}
            />

            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
            >
              {t('batchVoice.category')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {categories
                  .filter(c => c.type === editType)
                  .map(cat => (
                    <Chip
                      key={cat.id}
                      selected={editCategoryId === cat.id}
                      onPress={() =>
                        setEditCategoryId(editCategoryId === cat.id ? undefined : cat.id)
                      }
                      style={styles.categoryChip}
                      compact
                    >
                      {cat.name}
                    </Chip>
                  ))}
              </View>
            </ScrollView>

            <View style={styles.editModalActions}>
              <Button mode="outlined" onPress={() => setEditingKey(null)} style={{ flex: 1 }}>
                {t('common.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={() => editingKey && handleSaveEdit(editingKey)}
                style={{ flex: 1 }}
              >
                {t('batchVoice.editDone')}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <ScreenTransition>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderEditModal()}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {scanState === 'idle' && renderIdle()}
          {scanState === 'processing' && renderProcessing()}
          {(scanState === 'review' || scanState === 'submitting') && renderReview()}
        </ScrollView>

        {/* Bottom action bar */}
        {(scanState === 'review' || scanState === 'submitting') && queue.length > 0 && (
          <Surface
            style={[styles.bottomBar, { backgroundColor: theme.colors.surface }]}
            elevation={4}
          >
            {family && (
              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
                    {t('transactions.shareWithFamily')}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('transactions.shareWithFamilyDesc', { familyName: family.name })}
                  </Text>
                </View>
                <Switch
                  value={isShared}
                  onValueChange={val => {
                    setIsShared(val);
                    setShareWithFamily(val);
                  }}
                  disabled={scanState === 'submitting'}
                />
              </View>
            )}

            {!!submitError && (
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 6 }}
              >
                {submitError}
              </Text>
            )}

            <Button
              mode="contained"
              onPress={handleCreateAll}
              disabled={validCount === 0 || scanState === 'submitting'}
              loading={scanState === 'submitting'}
              icon="check"
              style={styles.createButton}
            >
              {scanState === 'submitting'
                ? t('batchVoice.submitting')
                : t('receipt.addTransactions', { count: validCount })}
            </Button>
          </Surface>
        )}
      </KeyboardAvoidingView>
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  // Idle state
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    gap: 16,
  },
  idleTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  idleSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pickButton: {
    flex: 1,
  },
  pickButtonContent: {
    paddingVertical: 6,
  },
  errorCard: {
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  // Processing state
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 20,
  },
  processingText: {
    textAlign: 'center',
  },
  // Review state
  reviewContainer: {
    gap: 12,
  },
  headerCard: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  headerCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    marginBottom: 4,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    paddingBottom: 4,
  },
  categoryChip: {
    marginRight: 4,
  },
  queueTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  queueSection: {
    gap: 8,
  },
  queueCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  cardLeft: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  switchLabel: {
    flex: 1,
  },
  createButton: {
    borderRadius: 8,
  },
  // Edit modal
  typeToggle: {
    marginBottom: 8,
  },
  editInput: {
    fontSize: 14,
    marginBottom: 12,
  },
  editModal: {
    margin: 16,
    marginTop: 40,
    marginBottom: 'auto',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
