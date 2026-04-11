import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  IconButton,
  ActivityIndicator,
  Surface,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCategoryStore } from '../../../store/categoryStore';
import { useUserStore } from '../../../store/userStore';
import { parseVoiceTransaction, ParsedTransaction } from '../../../utils/parseVoiceTransaction';
import { formatCurrency } from '../../../utils/currency';

interface VoiceInputModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (parsed: ParsedTransaction) => void;
}

type RecordingState = 'idle' | 'recording' | 'done' | 'error';

export const VoiceInputModal = ({ visible, onDismiss, onConfirm }: VoiceInputModalProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { categories, fetchCategories, isLoading: categoriesLoading } = useCategoryStore();
  const { profile } = useUserStore();

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const currency = profile?.currency || 'VND';

  // Fetch fresh categories every time the modal opens
  useEffect(() => {
    if (visible) {
      setRecordingState('idle');
      setTranscript('');
      setParsed(null);
      fetchCategories();
    } else {
      stopRecording();
    }
  }, [visible]);

  // Pulse animation while recording
  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  // expo-speech-recognition event handlers
  useSpeechRecognitionEvent('start', () => {
    setRecordingState('recording');
    startPulse();
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal) {
      stopPulse();
      const result = parseVoiceTransaction(text, categories);
      setParsed(result);
      setRecordingState('done');
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    stopPulse();
    // 'no-speech' is a soft error — stay in idle so user can try again
    if (event.error === 'no-speech') {
      setRecordingState('idle');
    } else {
      setRecordingState('error');
    }
  });

  useSpeechRecognitionEvent('end', () => {
    stopPulse();
    // If ended without a result, go back to idle
    setRecordingState(prev => (prev === 'recording' ? 'idle' : prev));
  });

  const startRecording = async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setRecordingState('error');
        setTranscript(t('voice.permissionDenied'));
        return;
      }
      setTranscript('');
      setParsed(null);
      ExpoSpeechRecognitionModule.start({
        lang: 'vi-VN',
        interimResults: true,
        continuous: false,
      });
    } catch (e: any) {
      // Native module not available (e.g. running in Expo Go)
      setRecordingState('error');
      setTranscript(t('voice.notAvailable'));
    }
  };

  const stopRecording = () => {
    ExpoSpeechRecognitionModule.stop();
    stopPulse();
  };

  const handleRetry = () => {
    setTranscript('');
    setParsed(null);
    setRecordingState('idle');
  };

  const handleConfirm = () => {
    if (parsed) {
      onConfirm(parsed);
      onDismiss();
    }
  };

  const getCategoryName = (id?: string) => {
    if (!id) return t('voice.notDetected');
    return categories.find(c => c.id === id)?.name ?? t('voice.notDetected');
  };

  const renderMicArea = () => {
    if (categoriesLoading) {
      return (
        <View style={styles.micContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
            {t('common.loading')}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.micContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <IconButton
            icon="microphone"
            size={56}
            iconColor={recordingState === 'recording' ? theme.colors.error : theme.colors.primary}
            containerColor={
              recordingState === 'recording'
                ? theme.colors.errorContainer
                : theme.colors.primaryContainer
            }
            onPress={recordingState === 'recording' ? stopRecording : startRecording}
            disabled={recordingState === 'done'}
          />
        </Animated.View>

        <Text variant="bodyMedium" style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
          {recordingState === 'recording'
            ? t('voice.tapToStop')
            : recordingState === 'done'
            ? transcript
            : recordingState === 'error'
            ? transcript || t('voice.noTranscript')
            : t('voice.startRecording')}
        </Text>

        {recordingState === 'recording' && (
          <Text variant="labelMedium" style={[styles.listeningLabel, { color: theme.colors.primary }]}>
            {transcript || t('voice.listening')}
          </Text>
        )}
      </View>
    );
  };

  const renderParsedResult = () => {
    if (!parsed) return null;

    return (
      <Surface style={[styles.resultCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
        <Text variant="labelLarge" style={[styles.resultTitle, { color: theme.colors.onSurfaceVariant }]}>
          {t('voice.parsedResult')}
        </Text>

        <View style={styles.resultRow}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('voice.detectedType')}:
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: parsed.type === 'income' ? theme.colors.income : theme.colors.expense, fontWeight: 'bold' }}
          >
            {parsed.type === 'income' ? t('transactions.income') : t('transactions.expense')}
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('voice.detectedAmount')}:
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              fontWeight: 'bold',
              color: parsed.amount ? theme.colors.onSurface : theme.colors.error,
            }}
          >
            {parsed.amount ? formatCurrency(parsed.amount, currency) : t('voice.noAmountDetected')}
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('voice.detectedCategory')}:
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            {getCategoryName(parsed.categoryId)}
          </Text>
        </View>

        {parsed.note ? (
          <View style={styles.resultRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('voice.detectedNote')}:
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface, flex: 1, textAlign: 'right' }}>
              {parsed.note}
            </Text>
          </View>
        ) : null}

        {parsed.date ? (
          <View style={styles.resultRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('voice.detectedDate')}:
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              {parsed.date.toLocaleDateString('vi-VN')}
            </Text>
          </View>
        ) : null}
      </Surface>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              {t('voice.modalTitle')}
            </Text>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          {/* Mic area */}
          {renderMicArea()}

          {/* Parsed result */}
          {renderParsedResult()}

          {/* Action buttons */}
          {recordingState === 'done' && (
            <View style={styles.actions}>
              <Button mode="outlined" onPress={handleRetry} style={styles.actionButton}>
                {t('voice.retryRecording')}
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirm}
                style={styles.actionButton}
                disabled={!parsed?.amount}
              >
                {t('voice.confirm')}
              </Button>
            </View>
          )}

          {recordingState === 'error' && (
            <Button mode="contained" onPress={handleRetry} style={styles.retryButton}>
              {t('voice.retryRecording')}
            </Button>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 24,
    borderRadius: 16,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  micContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    minHeight: 120,
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  listeningLabel: {
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  resultCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  retryButton: {
    marginTop: 16,
  },
});
