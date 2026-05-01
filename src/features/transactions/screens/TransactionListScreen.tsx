import React, { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  Snackbar,
  useTheme,
  Portal,
  Dialog,
  Button,
  IconButton,
  Modal,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTransactionStore } from '../../../store/transactionStore';
import { useFamilyStore } from '../../../store/familyStore';
import { useCategoryStore } from '../../../store/categoryStore';
import { TransactionListItem } from '../components/TransactionListItem';
import { TransactionWithCategory } from '../../../types/transaction';
import { useUserStore } from '../../../store/userStore';
import { PriceText } from '../../../components/PriceText';
import { RangeDatePicker } from '../../../components/RangeDatePicker';
import { DateFilterSegment } from '../../../components/DateFilterSegment';
import { Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDateForDisplay, formatDateToUTC7String } from '../../../utils/date';
import { FilterButtonGroup } from '../../../components/FilterButtonGroup';
import { ScreenTransition } from '../../../components/ScreenTransition';

export const TransactionListScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const {
    transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    filters,
    fetchTransactions,
    loadMoreTransactions,
    clearError,
    resetPagination,
  } = useTransactionStore();
  useUserStore();
  const { family } = useFamilyStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'family'>('all');
  const [dateFilter, setDateFilter] = useState<'month' | 'year' | 'custom' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: Date; end: Date } | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('transactions.title'),
      headerRight: () => (
        <IconButton
          icon={debouncedSearchQuery ? 'magnify-close' : 'magnify'}
          onPress={() => setSearchModalVisible(true)}
        />
      ),
    });
  }, [navigation, debouncedSearchQuery, t]);

  const handleCloseSearch = () => {
    setSearchModalVisible(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSearchModalVisible(false);
  };

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (categories.length === 0) fetchCategories();
  }, []);

  const visibleCategories = useMemo(() =>
    filterType === 'all' ? categories : categories.filter(c => c.type === filterType),
    [categories, filterType]
  );

  useEffect(() => {
    loadTransactions();
  }, [filterType, dateFilter, appliedCustomRange, scopeFilter, debouncedSearchQuery, categoryFilter]);

  const getDateRange = () => {
    // Compute today's date string in UTC+7 from the real current time.
    // formatDateToUTC7String expects a real UTC Date — do NOT pre-shift with
    // getCurrentDateUTC7() here, that would apply the +7h offset twice.
    const todayStr = formatDateToUTC7String(new Date());
    const [year, month] = todayStr.split('-');

    switch (dateFilter) {
      case 'month':
        return { start_date: `${year}-${month}-01`, end_date: todayStr };
      case 'year':
        return { start_date: `${year}-01-01`, end_date: todayStr };
      case 'custom':
        if (appliedCustomRange) {
          return {
            start_date: formatDateToUTC7String(appliedCustomRange.start),
            end_date: formatDateToUTC7String(appliedCustomRange.end),
          };
        }
        return {};
      case 'all':
        return {};
    }
  };

  const loadTransactions = async () => {
    resetPagination();
    const dateRange = getDateRange();
    await fetchTransactions({
      ...filters,
      ...dateRange,
      // Explicitly clear date range when not set
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      type: filterType === 'all' ? undefined : filterType,
      search: debouncedSearchQuery || undefined,
      scope: scopeFilter === 'all' ? undefined : scopeFilter,
      category_id: categoryFilter,
    }, true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadMoreTransactions();
    }
  };

  const renderFooter = useCallback(() => {
    if (transactions.length === 0) return null;
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.loadingText}>
            {t('transactions.loadingMore')}
          </Text>
        </View>
      );
    }
    return <View style={styles.listFooter} />;
  }, [transactions.length, isLoadingMore, theme.colors.primary, t]);

  const handleFilterChange = (value: string) => {
    setFilterType(value as 'all' | 'income' | 'expense');
    setCategoryFilter(undefined);
  };

  const handleDateFilterChange = (value: string) => {
    if (value === 'custom') {
      // If we already have an applied custom range, use it
      // Otherwise, reset to current month range
      if (!appliedCustomRange) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setCustomStartDate(firstDayOfMonth);
        setCustomEndDate(today);
      }
      setShowCustomDialog(true);
    } else {
      // Clear custom range when switching to other filters
      setAppliedCustomRange(null);
      setDateFilter(value as any);
    }
  };

  const handleSelectRange = (start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const handleApplyCustomRange = () => {
    setAppliedCustomRange({ start: customStartDate, end: customEndDate });
    setDateFilter('custom');
    setShowCustomDialog(false);
  };

  const handleCancelCustomRange = () => {
    setShowCustomDialog(false);
    if (dateFilter === 'custom' && !appliedCustomRange) {
      setDateFilter('all');
    }
  };


  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    navigation.navigate('EditTransaction' as never, { transactionId: transaction.id } as never);
  };

  const groupTransactionsByDate = (transactions: TransactionWithCategory[]) => {
    const grouped: { [key: string]: TransactionWithCategory[] } = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });

    return Object.entries(grouped).map(([date, items]) => ({
      date,
      transactions: items,
    }));
  };

  const groupedTransactions = React.useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions]
  );

  const calculateDayTotal = (dayTransactions: TransactionWithCategory[]) => {
    return dayTransactions.reduce((sum, t) => {
      return t.type === 'income' ? sum + Number(t.amount) : sum - Number(t.amount);
    }, 0);
  };

  const renderSectionHeader = React.useCallback(({ item }: any) => {
    const total = calculateDayTotal(item.transactions);
    const date = new Date(item.date);
    const isToday = date.toDateString() === new Date().toDateString();
    const isYesterday =
      date.toDateString() ===
      new Date(Date.now() - 86400000).toDateString();

    let dateLabel = formatDateForDisplay(date, 'vi-VN');

    if (isToday) dateLabel = t('transactions.today');
    if (isYesterday) dateLabel = t('transactions.yesterday');

    return (
      <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="titleMedium" style={styles.sectionDate}>
          {dateLabel}
        </Text>
        <PriceText
          amount={total}
          variant="titleMedium"
          style={styles.sectionTotal}
          showSign
        />
      </View>
    );
  }, [theme.colors.surfaceVariant]);

  const renderItem = React.useCallback(({ item }: any) => {
    return (
      <View>
        {renderSectionHeader({ item })}
        {item.transactions.map((transaction: TransactionWithCategory) => (
          <TransactionListItem
            key={transaction.id}
            transaction={transaction}
            onEdit={handleEditTransaction}
            searchQuery={debouncedSearchQuery}
          />
        ))}
      </View>
    );
  }, [renderSectionHeader, debouncedSearchQuery]);

  return (
    <ScreenTransition>
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <FilterButtonGroup
          value={filterType}
          onValueChange={handleFilterChange}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'income', label: t('transactions.income') },
            { value: 'expense', label: t('transactions.expense') },
          ]}
          style={styles.filterButtons}
        />

        <DateFilterSegment
          value={dateFilter}
          onValueChange={handleDateFilterChange}
          style={styles.segmentedButtons}
        />

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipContainer}
          contentContainerStyle={styles.chipContent}
        >
          <Chip
            selected={!categoryFilter}
            onPress={() => setCategoryFilter(undefined)}
            style={[styles.chip, !categoryFilter && { backgroundColor: theme.colors.primaryContainer }]}
            textStyle={!categoryFilter ? [styles.chipTextSelected, { color: theme.colors.onPrimaryContainer }] : {}}
            showSelectedOverlay={false}
          >
            {t('transactions.allCategories')}
          </Chip>
          {visibleCategories.map(cat => (
            <Chip
              key={cat.id}
              selected={categoryFilter === cat.id}
              onPress={() => setCategoryFilter(prev => prev === cat.id ? undefined : cat.id)}
              style={[styles.chip, categoryFilter === cat.id && { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={categoryFilter === cat.id ? [styles.chipTextSelected, { color: theme.colors.onPrimaryContainer }] : {}}
              showSelectedOverlay={false}
              icon={cat.icon ? ({ size }) => (
                <MaterialCommunityIcons name={cat.icon as any} size={size} color={cat.color} />
              ) : undefined}
            >
              {cat.name}
            </Chip>
          ))}
        </ScrollView>

        {family && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}
            contentContainerStyle={styles.chipContent}
          >
            <Chip
              selected={scopeFilter === 'all'}
              onPress={() => setScopeFilter('all')}
              style={[styles.chip, scopeFilter === 'all' && { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={scopeFilter === 'all' ? [styles.chipTextSelected, { color: theme.colors.onPrimaryContainer }] : {}}
              showSelectedOverlay={false}
            >
              {t('transactions.allTransactions')}
            </Chip>
            <Chip
              selected={scopeFilter === 'mine'}
              onPress={() => setScopeFilter('mine')}
              style={[styles.chip, scopeFilter === 'mine' && { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={scopeFilter === 'mine' ? [styles.chipTextSelected, { color: theme.colors.onPrimaryContainer }] : {}}
              showSelectedOverlay={false}
            >
              {t('transactions.myTransactions')}
            </Chip>
            <Chip
              selected={scopeFilter === 'family'}
              onPress={() => setScopeFilter('family')}
              style={[styles.chip, scopeFilter === 'family' && { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={scopeFilter === 'family' ? [styles.chipTextSelected, { color: theme.colors.onPrimaryContainer }] : {}}
              showSelectedOverlay={false}
            >
              {t('transactions.familyTransactions')}
            </Chip>
          </ScrollView>
        )}
       
      </View>

      {isLoading && !refreshing && transactions.length > 0 ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            {t('common.loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.date}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={5}
          windowSize={10}
          removeClippedSubviews={true}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {searchQuery
                    ? t('common.noResults')
                    : t('transactions.noTransactions')}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : styles.listContent}
        />
      )}

      <View style={styles.fabWrapper} pointerEvents="box-none">
      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        style={styles.fab}
        onStateChange={({ open }) => setFabOpen(open)}
        actions={[
          {
            icon: 'pencil-outline',
            label: t('dashboard.addTransaction'),
            onPress: () => {
              setFabOpen(false);
              navigation.navigate('AddTransaction' as never);
            },
          },
          {
            icon: 'microphone',
            label: t('voice.addWithVoice'),
            onPress: () => {
              setFabOpen(false);
              navigation.navigate('BatchVoice' as never);
            },
          },
        ]}
      />
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{
          label: t('common.close'),
          onPress: clearError,
        }}
      >
        {error}
      </Snackbar>

      <Portal>
        <Dialog 
          visible={showCustomDialog} 
          onDismiss={handleCancelCustomRange}
          style={styles.dialog}
        >
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

        {/* Search modal */}
        <Modal
          visible={searchModalVisible}
          onDismiss={handleCloseSearch}
          contentContainerStyle={styles.searchModal}
          style={styles.searchModalBackdrop}
        >
          <Searchbar
            placeholder={t('common.search')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            autoFocus
            style={[styles.searchModalBar, { backgroundColor: theme.colors.surface }]}
            inputStyle={{ minWidth: 0 }}
            right={() =>
              searchQuery ? (
                <IconButton icon="close" size={20} onPress={handleClearSearch} />
              ) : null
            }
          />
        </Modal>
      </Portal>
    </View>
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 0,
  },
  filterButtons: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  chipContainer: {
    marginBottom: 8,
  },
  chipContent: {
    gap: 0,
  },
  chip: {
    marginRight: 0,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionDate: {
    fontWeight: 'bold',
  },
  sectionTotal: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  listContent: {
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  loadingMore: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooter: {
    height: 80,
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.6,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    minHeight: 300,
  },
  fabWrapper: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none' as const,
  },
  fab: {
    margin: 0,
    paddingBottom: 0,
  },
  dialog: {
    maxHeight: '85%',
  },
  scrollArea: {
    maxHeight: 500,
    paddingHorizontal: 0,
  },
  dialogScrollContent: {
    paddingBottom: 8,
  },
  dialogContent: {
    paddingHorizontal: 24,
  },
  dialogLabel: {
    marginBottom: 8,
    marginTop: 8,
  },
  selectedDateText: {
    marginBottom: 12,
    opacity: 0.7,
  },
  divider: {
    marginVertical: 16,
  },
  searchModalBackdrop: {
    backgroundColor: 'transparent',
  },
  searchModal: {
    margin: 16,
    marginTop: 8,
  },
  searchModalBar: {
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
});
