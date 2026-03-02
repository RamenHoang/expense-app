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
import { TransactionListItem } from '../components/TransactionListItem';
import { TransactionWithCategory } from '../../../types/transaction';
import { useUserStore } from '../../../store/userStore';
import { PriceText } from '../../../components/PriceText';
import { RangeDatePicker } from '../../../components/RangeDatePicker';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFilter, setDateFilter] = useState<'month' | 'year' | 'custom' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [dateFilter]);

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();

    switch (dateFilter) {
      case 'month':
        startDate.setDate(1);
        break;
      case 'year':
        startDate.setMonth(0, 1);
        break;
      case 'custom':
        if (appliedCustomRange) {
          return {
            start_date: appliedCustomRange.start.toISOString().split('T')[0],
            end_date: appliedCustomRange.end.toISOString().split('T')[0],
          };
        }
        return {};
      case 'all':
        return {};
    }

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  };

  const loadTransactions = async () => {
    resetPagination();
    const dateRange = getDateRange();
    await fetchTransactions({
      ...filters,
      ...dateRange,
      type: filterType === 'all' ? undefined : filterType,
      search: searchQuery || undefined,
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
      type: newType,
      search: searchQuery || undefined,
    }, true);
  };

  const handleDateFilterChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDialog(true);
    } else {
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
        <Searchbar
          placeholder={t('common.search')}
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />

        <SegmentedButtons
          value={filterType}
          onValueChange={handleFilterChange}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'income', label: t('transactions.income') },
            { value: 'expense', label: t('transactions.expense') },
          ]}
          style={styles.segmentedButtons}
        />

        <SegmentedButtons
          value={dateFilter}
          onValueChange={handleDateFilterChange}
          buttons={[
            { value: 'month', label: t('dateFilter.month') },
            { value: 'year', label: t('dateFilter.year') },
            { value: 'custom', label: t('dateFilter.custom') },
            { value: 'all', label: t('dateFilter.all') },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

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
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : undefined}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddTransaction}
        label={t('common.add')}
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
  segmentedButtons: {
    marginBottom: 8,
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
