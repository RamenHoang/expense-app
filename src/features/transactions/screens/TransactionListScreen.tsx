import React, { useEffect, useState } from 'react';
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
  SegmentedButtons,
  Snackbar,
  useTheme,
  Portal,
  Dialog,
  Button,
  Divider,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTransactionStore } from '../../../store/transactionStore';
import { useFamilyStore } from '../../../store/familyStore';
import { TransactionListItem } from '../components/TransactionListItem';
import { TransactionWithCategory } from '../../../types/transaction';
import { useUserStore } from '../../../store/userStore';
import { PriceText } from '../../../components/PriceText';
import { RangeDatePicker } from '../../../components/RangeDatePicker';
import { DateFilterSegment } from '../../../components/DateFilterSegment';
import { Chip } from 'react-native-paper';
import { formatDateToUTC7String, getCurrentDateUTC7 } from '../../../utils/date';
import { FilterButtonGroup } from '../../../components/FilterButtonGroup';

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
    setFilters,
    clearError,
    resetPagination,
  } = useTransactionStore();
  const { profile } = useUserStore();
  const { family } = useFamilyStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'family'>('all');
  const [dateFilter, setDateFilter] = useState<'month' | 'year' | 'custom' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [dateFilter, appliedCustomRange, scopeFilter]);

  const getDateRange = () => {
    // Get current date in UTC+7
    const endDate = getCurrentDateUTC7();
    const startDate = getCurrentDateUTC7();

    switch (dateFilter) {
      case 'month':
        // First day of current month
        startDate.setUTCDate(1);
        break;
      case 'year':
        // First day of current year
        startDate.setUTCMonth(0, 1);
        break;
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

    return {
      start_date: formatDateToUTC7String(startDate),
      end_date: formatDateToUTC7String(endDate),
    };
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
      search: searchQuery || undefined,
      scope: scopeFilter === 'all' ? undefined : scopeFilter,
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const dateRange = getDateRange();
    resetPagination();
    fetchTransactions({ 
      ...filters, 
      ...dateRange,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      search: query || undefined,
      type: filterType === 'all' ? undefined : filterType,
    }, true);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value as 'all' | 'income' | 'expense');
    const newType = value === 'all' ? undefined : (value as 'income' | 'expense');
    const dateRange = getDateRange();
    resetPagination();
    fetchTransactions({ 
      ...filters, 
      ...dateRange,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      type: newType,
      search: searchQuery || undefined,
    }, true);
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

  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction' as never);
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

    let dateLabel = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

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
          />
        ))}
      </View>
    );
  }, [renderSectionHeader]);

  return (
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

        {/* Scope filter chips - only show if user has family */}
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
              style={styles.chip}
            >
              {t('transactions.allTransactions')}
            </Chip>
            <Chip
              selected={scopeFilter === 'mine'}
              onPress={() => setScopeFilter('mine')}
              style={styles.chip}
            >
              {t('transactions.myTransactions')}
            </Chip>
            <Chip
              selected={scopeFilter === 'family'}
              onPress={() => setScopeFilter('family')}
              style={styles.chip}
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
          onEndReachedThreshold={0.5}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={5}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 150,
            offset: 150 * index,
            index,
          })}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text variant="bodySmall" style={styles.loadingText}>
                  {t('transactions.loadingMore')}
                </Text>
              </View>
            ) : null
          }
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

      {/* Expandable Search FAB */}
      <View style={styles.searchFabContainer}>
        {isSearchExpanded ? (
          <View style={[styles.expandedSearchBar, { backgroundColor: theme.colors.surface }]}>
            <Searchbar
              placeholder={t('common.search')}
              onChangeText={handleSearch}
              value={searchQuery}
              style={styles.searchInput}
              // autoFocus
              inputStyle={{ minWidth: 0 }}
            />
            {/* <FAB
              icon="close"
              size="small"
              onPress={() => {
                setIsSearchExpanded(false);
                setSearchQuery('');
                handleSearch('');
              }}
              style={styles.closeSearchButton}
            /> */}
          </View>
        ) : (
          <FAB
            icon="magnify"
            onPress={() => setIsSearchExpanded(true)}
            style={styles.searchFab}
            size="medium"
            // label={t('common.search')}
          />
        )}
      </View>

      <FAB
        icon="plus"
        onPress={() => navigation.navigate('AddTransaction' as never)}
        style={styles.fab}
      />

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
      </Portal>
    </View>
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
    marginBottom: 12,
    elevation: 0,
  },
  filterButtons: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  chipContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  chipContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    marginRight: 0,
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
    paddingBottom: 80, // Add padding to prevent FAB from covering items
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
    paddingVertical: 16,
    alignItems: 'center',
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
  searchFabContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 88,
    zIndex: 1,
  },
  searchFab: {
    alignSelf: 'flex-end',
  },
  expandedSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  closeSearchButton: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
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
});
