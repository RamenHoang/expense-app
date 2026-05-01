import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { Text, Card, Button, IconButton, useTheme, Portal, Dialog, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../../../store/userStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { dashboardService, DashboardSummary, CategorySummary } from '../../../services/dashboardService';
import { PriceText } from '../../../components/PriceText';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RangeDatePicker } from '../../../components/RangeDatePicker';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { DateFilterSegment } from '../../../components/DateFilterSegment';
import { formatDateForDisplay, formatDateToUTC7String } from '../../../utils/date';
import { SpendingTrendLineChart } from '../components/SpendingTrendLineChart';
import { useContentTransition } from '../../../hooks/useContentTransition';

const FILTER_STORAGE_KEY = 'dashboard_date_filter';

type DateFilter = 'month' | 'year' | 'all' | 'custom';

interface PersistedFilter {
  filter: DateFilter;
  customStart?: string;
  customEnd?: string;
}

// Pure function — takes explicit params, no closure over state.
function computeDateRange(
  filter: DateFilter,
  customRange: { start: Date; end: Date } | null
): { startDate?: string; endDate?: string } {
  switch (filter) {
    case 'month': {
      const now = new Date();
      return {
        startDate: formatDateToUTC7String(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: formatDateToUTC7String(now),
      };
    }
    case 'year': {
      const now = new Date();
      return {
        startDate: formatDateToUTC7String(new Date(now.getFullYear(), 0, 1)),
        endDate: formatDateToUTC7String(now),
      };
    }
    case 'custom':
      if (customRange) {
        return {
          startDate: formatDateToUTC7String(customRange.start),
          endDate: formatDateToUTC7String(customRange.end),
        };
      }
      return {};
    case 'all':
      return {};
  }
}

function persistFilter(filter: DateFilter, customRange: { start: Date; end: Date } | null) {
  const payload: PersistedFilter = { filter };
  if (filter === 'custom' && customRange) {
    payload.customStart = customRange.start.toISOString();
    payload.customEnd = customRange.end.toISOString();
  }
  AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload));
}

export const DashboardScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const { profile, fetchProfile } = useUserStore();
  const lastModifiedTimestamp = useTransactionStore((state) => state.lastModifiedTimestamp);
  const lastLoadedTimestampRef = useRef(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: Date; end: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [fabOpen, setFabOpen] = useState(false);

  // Tracks current range so useFocusEffect can use it without a stale closure.
  const currentRangeRef = useRef<{ startDate?: string; endDate?: string }>({});
  currentRangeRef.current = computeDateRange(dateFilter, appliedCustomRange);

  const { play: playTransition, animatedStyle: contentAnimatedStyle } = useContentTransition();

  // Skip the first fire of the filter-change effect (initial load is done from
  // the AsyncStorage callback so the range is computed from parsed values, not state).
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!profile) fetchProfile();
  }, []);

  // On mount: restore persisted filter, then load with the correctly computed range.
  useEffect(() => {
    AsyncStorage.getItem(FILTER_STORAGE_KEY).then((raw) => {
      let filter: DateFilter = 'month';
      let customRange: { start: Date; end: Date } | null = null;

      if (raw) {
        try {
          const saved: PersistedFilter = JSON.parse(raw);
          filter = saved.filter;
          if (saved.filter === 'custom' && saved.customStart && saved.customEnd) {
            customRange = {
              start: new Date(saved.customStart),
              end: new Date(saved.customEnd),
            };
          }
        } catch (_) {}
      }

      // Set UI state.
      setDateFilter(filter);
      if (customRange) {
        setAppliedCustomRange(customRange);
        setCustomStartDate(customRange.start);
        setCustomEndDate(customRange.end);
      }

      // Compute range from the PARSED values (not from state, which hasn't
      // committed yet) and kick off the first data load.
      const { startDate, endDate } = computeDateRange(filter, customRange);
      loadDashboardData(startDate, endDate);
    });
  }, []);

  // On user-triggered filter changes: skip the initial mount fire (handled above),
  // then reload with the newly committed state values.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const { startDate, endDate } = computeDateRange(dateFilter, appliedCustomRange);
    loadDashboardData(startDate, endDate);
  }, [dateFilter, appliedCustomRange]);

  useFocusEffect(
    useCallback(() => {
      if (lastModifiedTimestamp > lastLoadedTimestampRef.current) {
        const { startDate, endDate } = currentRangeRef.current;
        loadDashboardData(startDate, endDate);
        lastLoadedTimestampRef.current = Date.now();
      }
    }, [lastModifiedTimestamp])
  );

  const loadDashboardData = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      const [summaryData, expenseBreakdown, recent] = await Promise.all([
        dashboardService.getDashboardSummary(startDate, endDate),
        dashboardService.getCategoryBreakdown('expense', startDate, endDate),
        dashboardService.getRecentTransactions(5, startDate, endDate),
      ]);
      setSummary(summaryData);
      setCategoryBreakdown(expenseBreakdown);
      setRecentTransactions(recent);
      playTransition();
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    const { startDate, endDate } = currentRangeRef.current;
    loadDashboardData(startDate, endDate);
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'month': return t('dashboard.thisMonth');
      case 'year': return t('dashboard.thisYear');
      case 'custom':
        if (appliedCustomRange) {
          const startStr = formatDateForDisplay(appliedCustomRange.start, 'vi-VN');
          const endStr = formatDateForDisplay(appliedCustomRange.end, 'vi-VN');
          return `${startStr} - ${endStr}`;
        }
        return t('dashboard.customRange');
      case 'all': return t('dashboard.allTime');
    }
  };

  const handleFilterChange = (value: string) => {
    if (value === 'custom') {
      if (!appliedCustomRange) {
        const today = new Date();
        setCustomStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
        setCustomEndDate(today);
      }
      setShowCustomDialog(true);
    } else {
      const newFilter = value as DateFilter;
      setAppliedCustomRange(null);
      setDateFilter(newFilter);
      persistFilter(newFilter, null);
    }
  };

  const handleSelectRange = (start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const handleApplyCustomRange = () => {
    const range = { start: customStartDate, end: customEndDate };
    setAppliedCustomRange(range);
    setDateFilter('custom');
    persistFilter('custom', range);
    setShowCustomDialog(false);
  };

  const handleCancelCustomRange = () => {
    setShowCustomDialog(false);
    if (dateFilter === 'custom' && !appliedCustomRange) {
      setDateFilter('month');
      persistFilter('month', null);
    }
  };

  const { startDate: chartStart, endDate: chartEnd } = currentRangeRef.current;

  if (loading && !refreshing && !summary) {
    return <LoadingScreen message={t('dashboard.loadingDashboard')} />;
  }

  const hasTransactions = (summary?.transactionCount ?? 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterRow}>
        <DateFilterSegment
          value={dateFilter}
          onValueChange={handleFilterChange}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View style={contentAnimatedStyle}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {getDateFilterLabel()} {t('dashboard.summary')}
            </Text>

            <View style={styles.balanceContainer}>
              <PriceText
                amount={summary?.balance || 0}
                type={(summary?.balance || 0) >= 0 ? 'income' : 'expense'}
                variant="headlineLarge"
                style={styles.balanceAmount}
              />
              <Text variant="bodySmall" style={styles.balanceLabel}>
                {t('dashboard.netBalance')}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.dark ? '#1b3a1c' : '#e8f5e9' }]}>
                  <IconButton icon="arrow-down" iconColor={theme.colors.income} size={20} />
                </View>
                <Text variant="labelSmall" style={styles.summaryItemLabel}>
                  {t('dashboard.income')}
                </Text>
                <PriceText amount={summary?.totalIncome || 0} type="income" variant="titleMedium" />
                <Text variant="bodySmall" style={styles.summaryItemCount}>
                  {summary?.incomeCount || 0} {t('dashboard.transactions')}
                </Text>
              </View>

              <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.dark ? '#3a1b1b' : '#ffebee' }]}>
                  <IconButton icon="arrow-up" iconColor={theme.colors.expense} size={20} />
                </View>
                <Text variant="labelSmall" style={styles.summaryItemLabel}>
                  {t('dashboard.expense')}
                </Text>
                <PriceText amount={summary?.totalExpense || 0} type="expense" variant="titleMedium" />
                <Text variant="bodySmall" style={styles.summaryItemCount}>
                  {summary?.expenseCount || 0} {t('dashboard.transactions')}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {categoryBreakdown.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {t('dashboard.topSpendingCategories')}
                </Text>
              </View>

              {categoryBreakdown.map((category) => (
                <View key={category.category_id} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <IconButton
                      icon={category.category_icon || 'tag'}
                      iconColor={category.category_color || '#666'}
                      size={20}
                    />
                    <View style={styles.categoryDetails}>
                      <Text variant="bodyMedium" style={styles.categoryName}>
                        {category.category_name}
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${category.percentage}%`,
                              backgroundColor: category.category_color || '#6200ee',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.categoryAmount}>
                    <PriceText
                      amount={category.total}
                      variant="titleSmall"
                      style={styles.categoryTotal}
                    />
                    <Text variant="bodySmall" style={styles.categoryPercentage}>
                      {category.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {hasTransactions && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {t('dashboard.monthlyTrends')}
              </Text>
              <SpendingTrendLineChart startDate={chartStart} endDate={chartEnd} />
            </Card.Content>
          </Card>
        )}

        {recentTransactions.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {t('dashboard.recentTransactions')}
                </Text>
                <Button mode="text" onPress={() => navigation.navigate('Transactions' as never)}>
                  {t('common.viewAll')}
                </Button>
              </View>

              {recentTransactions.map((transaction) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.transactionItem}
                  onPress={() =>
                    navigation.navigate('EditTransaction' as never, { transactionId: transaction.id } as never)
                  }
                >
                  <View style={styles.transactionIcon}>
                    <IconButton
                      icon={transaction.category?.icon || 'tag'}
                      iconColor={transaction.category?.color || '#666'}
                      size={20}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text variant="bodyMedium" style={styles.transactionCategory}>
                      {transaction.category?.name || t('common.uncategorized')}
                    </Text>
                    <Text variant="bodySmall" style={styles.transactionDate}>
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <PriceText
                    amount={transaction.amount}
                    type={transaction.type}
                    variant="titleSmall"
                    showSign
                  />
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}
        </Animated.View>
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible={true}
        icon={fabOpen ? 'close' : 'plus'}
        style={styles.fab}
        onStateChange={({ open }) => setFabOpen(open)}
        actions={[
          {
            icon: 'pencil-outline',
            label: t('dashboard.addTransaction'),
            onPress: () => { setFabOpen(false); navigation.navigate('AddTransaction' as never); },
          },
          {
            icon: 'microphone',
            label: t('voice.addWithVoice'),
            onPress: () => { setFabOpen(false); navigation.navigate('BatchVoice' as never); },
          },
        ]}
      />

      <Portal>
        <Dialog visible={showCustomDialog} onDismiss={handleCancelCustomRange} style={styles.dialog}>
          <Dialog.Title>{t('dateFilter.selectRange')}</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView contentContainerStyle={styles.dialogScrollContent}>
              <View style={styles.dialogContent}>
                <RangeDatePicker
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onSelectRange={handleSelectRange}
                  maxDate={new Date()}
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={handleCancelCustomRange}>{t('common.cancel')}</Button>
            <Button
              mode="contained"
              onPress={handleApplyCustomRange}
              disabled={!customStartDate || !customEndDate}
            >
              {t('common.apply')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: 'absolute', paddingBottom: 0, right: 0, bottom: 0 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  filterRow: { margin: 16 },
  summaryCard: { marginBottom: 16, elevation: 2 },
  card: { marginBottom: 16, elevation: 2 },
  cardTitle: { fontWeight: 'bold', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  balanceContainer: { alignItems: 'center', paddingVertical: 16, marginBottom: 16 },
  balanceAmount: { fontWeight: 'bold', marginBottom: 4 },
  balanceLabel: { opacity: 0.7 },
  summaryGrid: { flexDirection: 'row', gap: 12 },
  summaryItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 8 },
  summaryIcon: { borderRadius: 24, marginBottom: 8 },
  summaryItemLabel: { opacity: 0.7, marginBottom: 4 },
  summaryItemCount: { opacity: 0.6, fontSize: 11 },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  categoryInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  categoryDetails: { flex: 1 },
  categoryName: { marginBottom: 4 },
  progressBar: { height: 6, backgroundColor: 'rgba(128, 128, 128, 0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  categoryAmount: { alignItems: 'flex-end' },
  categoryTotal: { fontWeight: 'bold' },
  categoryPercentage: { opacity: 0.6 },
  transactionItem: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  transactionIcon: { marginRight: 8 },
  transactionDetails: { flex: 1 },
  transactionCategory: { marginBottom: 2 },
  transactionDate: { opacity: 0.6 },
  dialog: { maxHeight: '85%' },
  scrollArea: { maxHeight: 500, paddingHorizontal: 0 },
  dialogScrollContent: { paddingBottom: 8 },
  dialogContent: { paddingHorizontal: 24 },
});
