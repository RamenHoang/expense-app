import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
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
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCategoryStore } from '../../../store/categoryStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { useUserStore } from '../../../store/userStore';
import { useFamilyStore } from '../../../store/familyStore';
import { parseVoiceTransaction, ParsedTransaction } from '../../../utils/parseVoiceTransaction';
import { formatCurrency } from '../../../utils/currency';
import { transactionService } from '../../../services/transactionService';
import { formatDateToUTC7String } from '../../../utils/date';
import { DatePickerInput } from '../components/DatePickerInput';
import { AmountInput } from '../components/AmountInput';
import { ScreenTransition } from '../../../components/ScreenTransition';

type QueueItem = ParsedTransaction & { key: string };
type RecordingState = 'idle' | 'recording' | 'error';

export const BatchVoiceScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { categories, fetchCategories } = useCategoryStore();
  const { fetchTransactions } = useTransactionStore();
  const { profile } = useUserStore();
  const { family, shareWithFamily, setShareWithFamily } = useFamilyStore();
  const currency = profile?.currency || 'VND';

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastParsed, setLastParsed] = useState<ParsedTransaction | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isShared, setIsShared] = useState(shareWithFamily);

  // Inline edit state
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined);
  const [editDate, setEditDate] = useState<Date>(new Date());

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const autoAddTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-add the just-parsed result after 1.5s
  useEffect(() => {
    if (!lastParsed) return;
    autoAddTimer.current = setTimeout(() => {
      pushToQueue(lastParsed);
    }, 1500);
    return () => {
      if (autoAddTimer.current) clearTimeout(autoAddTimer.current);
    };
  }, [lastParsed]);

  const pushToQueue = useCallback((parsed: ParsedTransaction) => {
    const key = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setQueue(prev => [...prev, { ...parsed, key }]);
    setLastParsed(null);
    setRecordingState('idle');
  }, []);

  // Pulse animation
  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  // Speech recognition events
  useSpeechRecognitionEvent('start', () => {
    setRecordingState('recording');
    setLiveTranscript('');
    startPulse();
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setLiveTranscript(text);
    if (event.isFinal && text) {
      stopPulse();
      const parsed = parseVoiceTransaction(text, categories);
      setLastParsed(parsed);
      setLiveTranscript('');
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    stopPulse();
    setRecordingState(event.error === 'no-speech' ? 'idle' : 'error');
  });

  useSpeechRecognitionEvent('end', () => {
    stopPulse();
    setRecordingState(prev => (prev === 'recording' ? 'idle' : prev));
  });

  const startRecording = async () => {
    if (lastParsed) {
      // Cancel pending auto-add and add now before new recording
      if (autoAddTimer.current) clearTimeout(autoAddTimer.current);
      pushToQueue(lastParsed);
    }
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setRecordingState('error');
        return;
      }
      setSubmitError('');
      ExpoSpeechRecognitionModule.start({
        lang: 'vi-VN',
        interimResults: true,
        continuous: false,
      });
    } catch {
      setRecordingState('error');
    }
  };

  const stopRecording = () => {
    ExpoSpeechRecognitionModule.stop();
    stopPulse();
  };

  // Manually add the preview card now (skip the 1.5s wait)
  const handleAddNow = () => {
    if (autoAddTimer.current) clearTimeout(autoAddTimer.current);
    if (lastParsed) pushToQueue(lastParsed);
  };

  // Delete a queue item
  const handleDelete = (key: string) => {
    if (editingKey === key) setEditingKey(null);
    setQueue(prev => prev.filter(item => item.key !== key));
  };

  // Open / close inline edit
  const handleToggleEdit = (item: QueueItem) => {
    if (editingKey === item.key) {
      setEditingKey(null);
      return;
    }
    setEditingKey(item.key);
    setEditType(item.type);
    setEditAmount(item.amount ? String(item.amount) : '');
    setEditNote(item.note);
    setEditCategoryId(item.categoryId);
    setEditDate(item.date ?? new Date());
  };

  // Save inline edit
  const handleSaveEdit = (key: string) => {
    const amount = editAmount ? parseFloat(editAmount.replace(/,/g, '')) : null;
    setQueue(prev =>
      prev.map(item =>
        item.key !== key
          ? item
          : { ...item, type: editType, amount, note: editNote, categoryId: editCategoryId, date: editDate }
      )
    );
    setEditingKey(null);
  };

  // Batch create
  const handleCreateAll = async () => {
    const valid = queue.filter(item => item.amount && item.amount > 0);
    if (valid.length === 0) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const today = formatDateToUTC7String(new Date());
      const inputs = valid.map(item => ({
        type: item.type,
        amount: item.amount!,
        transaction_date: item.date ? formatDateToUTC7String(item.date) : today,
        category_id: item.categoryId,
        note: item.note || undefined,
        family_id: isShared && family ? family.id : undefined,
        is_shared: isShared && family ? true : false,
      }));
      await transactionService.createTransactionsBatch(inputs);
      await fetchTransactions();
      useTransactionStore.setState({ lastModifiedTimestamp: Date.now() });
      navigation.goBack();
    } catch (err: any) {
      setSubmitError(err.message || t('common.error'));
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (id?: string) =>
    id ? (categories.find(c => c.id === id)?.name ?? t('batchVoice.noCategory')) : t('batchVoice.noCategory');

  const validCount = queue.filter(item => item.amount && item.amount > 0).length;
  const hasInvalidItems = queue.some(item => !item.amount || item.amount <= 0);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderMicSection = () => (
    <View style={styles.micSection}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <IconButton
          icon="microphone"
          size={52}
          iconColor={
            recordingState === 'recording' ? theme.colors.error : theme.colors.primary
          }
          containerColor={
            recordingState === 'recording'
              ? theme.colors.errorContainer
              : theme.colors.primaryContainer
          }
          onPress={recordingState === 'recording' ? stopRecording : startRecording}
          disabled={!!lastParsed}
        />
      </Animated.View>

      <Text
        variant="bodyMedium"
        style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}
      >
        {recordingState === 'recording'
          ? t('batchVoice.tapToStop')
          : recordingState === 'error'
          ? t('voice.noTranscript')
          : t('batchVoice.tapToRecord')}
      </Text>

      {!!liveTranscript && (
        <Text
          variant="labelMedium"
          style={[styles.liveTranscript, { color: theme.colors.primary }]}
        >
          {liveTranscript}
        </Text>
      )}
    </View>
  );

  const renderLastParsed = () => {
    if (!lastParsed) return null;
    const isIncome = lastParsed.type === 'income';
    return (
      <Surface
        style={[styles.previewCard, { backgroundColor: theme.colors.secondaryContainer }]}
        elevation={0}
      >
        <View style={styles.previewHeader}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSecondaryContainer, fontStyle: 'italic' }}
          >
            {t('batchVoice.justParsed')}
          </Text>
          <Button mode="text" compact onPress={handleAddNow} labelStyle={{ fontSize: 12 }}>
            {t('batchVoice.addToList')}
          </Button>
        </View>
        <View style={styles.previewRow}>
          <Text
            variant="titleMedium"
            style={{
              color: isIncome ? theme.colors.primary : theme.colors.error,
              fontWeight: 'bold',
            }}
          >
            {lastParsed.amount
              ? formatCurrency(lastParsed.amount, currency)
              : t('batchVoice.invalidAmount')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>
            {getCategoryName(lastParsed.categoryId)}
          </Text>
        </View>
        {!!lastParsed.note && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSecondaryContainer, marginTop: 2 }}
          >
            {lastParsed.note}
          </Text>
        )}
      </Surface>
    );
  };

  const renderQueueItem = (item: QueueItem, index: number) => {
    const isIncome = item.type === 'income';
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
              style={{
                color: isIncome ? theme.colors.primary : theme.colors.error,
                fontWeight: 'bold',
                marginBottom: 2,
              }}
            >
              {isIncome ? '↑ ' : '↓ '}
              {isInvalid
                ? t('batchVoice.invalidAmount')
                : formatCurrency(item.amount!, currency)}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {getCategoryName(item.categoryId)}
            </Text>
            {!!item.note && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurface, marginTop: 2 }}
                numberOfLines={1}
              >
                {item.note}
              </Text>
            )}
            {!!item.date && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {item.date.toLocaleDateString('vi-VN')}
              </Text>
            )}
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

  const renderEditModal = () => (
    <Portal>
      <Modal
        visible={editingKey !== null}
        onDismiss={() => setEditingKey(null)}
        contentContainerStyle={[styles.editModal, { backgroundColor: theme.colors.surface }]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Type toggle */}
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

            {/* Amount */}
            <AmountInput
              value={editAmount}
              onChangeText={setEditAmount}
              type={editType}
            />

            {/* Note */}
            <TextInput
              key={`note-${editingKey}`}
              mode="outlined"
              label={t('batchVoice.note')}
              defaultValue={editNote}
              onChangeText={setEditNote}
              multiline
              numberOfLines={3}
              style={styles.editInput}
            />

            {/* Date picker */}
            <DatePickerInput
              value={editDate}
              onChange={setEditDate}
              label={t('transactions.date')}
            />

            {/* Category chips */}
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

            {/* Actions */}
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
      {/* Edit modal */}
      {renderEditModal()}

      {/* Fixed top: mic area + just-parsed preview */}
      <View style={styles.topSection}>
        {renderMicSection()}
        {renderLastParsed()}
      </View>

      {/* Scrollable queue list only */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {queue.length > 0 ? (
          <View style={styles.queueSection}>
            <Text
              variant="labelLarge"
              style={[styles.queueTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('batchVoice.queueTitle', { count: queue.length })}
            </Text>
            {queue.map((item, index) => renderQueueItem(item, index))}
          </View>
        ) : (
          !lastParsed && (
            <Text
              variant="bodyMedium"
              style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('batchVoice.noTransactions')}
            </Text>
          )
        )}

        {/* Error */}
        {!!submitError && (
          <Text
            variant="bodySmall"
            style={[styles.errorText, { color: theme.colors.error }]}
          >
            {submitError}
          </Text>
        )}
      </ScrollView>

      {/* Bottom bar — not absolute, participates in layout so it pushes the list up */}
      {queue.length > 0 && (
        <Surface
          style={[styles.bottomBar, { backgroundColor: theme.colors.surface }]}
          elevation={4}
        >
          {/* Family sharing toggle */}
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
                onValueChange={(value) => {
                  setIsShared(value);
                  setShareWithFamily(value);
                }}
                disabled={isSubmitting}
              />
            </View>
          )}

          {hasInvalidItems && (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 6 }}
            >
              {t('batchVoice.invalidAmount')} — {t('batchVoice.editItem').toLowerCase()}
            </Text>
          )}
          <Button
            mode="contained"
            onPress={handleCreateAll}
            disabled={validCount === 0 || isSubmitting}
            loading={isSubmitting}
            icon="check"
            style={styles.createButton}
          >
            {isSubmitting
              ? t('batchVoice.submitting')
              : t('batchVoice.createAll', { count: validCount })}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  micSection: {
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 110,
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 4,
    textAlign: 'center',
  },
  liveTranscript: {
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
  previewCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueSection: {
    gap: 8,
  },
  queueTitle: {
    marginBottom: 4,
    fontWeight: 'bold',
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
  editForm: {
    padding: 12,
    gap: 8,
  },
  typeToggle: {
    marginBottom: 4,
  },
  editInput: {
    fontSize: 14,
    marginBottom: 12,
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
  saveButton: {
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 24,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  createButton: {
    borderRadius: 8,
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
