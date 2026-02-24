import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  SegmentedButtons,
  Chip,
  Portal,
  Snackbar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTransactionStore } from '../../../store/transactionStore';
import { TransactionListItem } from '../components/TransactionListItem';
import { TransactionWithCategory } from '../../../types/transaction';

export const TransactionListScreen = () => {
  const navigation = useNavigation();
  const {
    transactions,
    isLoading,
    error,
    filters,
    fetchTransactions,
    setFilters,
    clearError,
  } = useTransactionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    await fetchTransactions({
      ...filters,
      type: filterType === 'all' ? undefined : filterType,
      search: searchQuery || undefined,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value as 'all' | 'income' | 'expense');
    const newType = value === 'all' ? undefined : (value as 'income' | 'expense');
    setFilters({ ...filters, type: newType });
    fetchTransactions({ ...filters, type: newType });
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

  const groupedTransactions = groupTransactionsByDate(transactions);

  const calculateDayTotal = (dayTransactions: TransactionWithCategory[]) => {
    return dayTransactions.reduce((sum, t) => {
      return t.type === 'income' ? sum + Number(t.amount) : sum - Number(t.amount);
    }, 0);
  };

  const renderSectionHeader = ({ item }: any) => {
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

    if (isToday) dateLabel = 'Today';
    if (isYesterday) dateLabel = 'Yesterday';

    return (
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionDate}>
          {dateLabel}
        </Text>
        <Text
          variant="titleMedium"
          style={[
            styles.sectionTotal,
            { color: total >= 0 ? '#4caf50' : '#f44336' },
          ]}
        >
          {total >= 0 ? '+' : ''}${Math.abs(total).toFixed(2)}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: any) => {
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search transactions"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />

        <SegmentedButtons
          value={filterType}
          onValueChange={handleFilterChange}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
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
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                {searchQuery
                  ? 'No transactions found'
                  : 'No transactions yet. Tap + to add one!'}
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
        label="Add"
      />

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: clearError,
        }}
      >
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
