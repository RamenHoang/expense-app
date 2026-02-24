import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, IconButton, SegmentedButtons, useTheme } from 'react-native-paper';
import { useUserStore } from '../../../store/userStore';
import { dashboardService, DashboardSummary, CategorySummary } from '../../../services/dashboardService';
import { PriceText } from '../../../components/PriceText';
import { useNavigation } from '@react-navigation/native';

export const DashboardScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { profile, fetchProfile } = useUserStore();
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'month' | 'year' | 'all'>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
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
      case 'all':
        return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const [summaryData, expenseBreakdown, recent] = await Promise.all([
        dashboardService.getDashboardSummary(startDate, endDate),
        dashboardService.getCategoryBreakdown('expense', startDate, endDate),
        dashboardService.getRecentTransactions(5),
      ]);

      setSummary(summaryData);
      setCategoryBreakdown(expenseBreakdown.slice(0, 5));
      setRecentTransactions(recent);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const currency = profile?.currency || 'USD';

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'month':
        return 'This Month';
      case 'year':
        return 'This Year';
      case 'all':
        return 'All Time';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={dateFilter}
          onValueChange={(value) => setDateFilter(value as any)}
          buttons={[
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
            { value: 'all', label: 'All' },
          ]}
        />
      </View>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {getDateFilterLabel()} Summary
          </Text>

          <View style={styles.balanceContainer}>
            <PriceText
              amount={summary?.balance || 0}
              type={(summary?.balance || 0) >= 0 ? 'income' : 'expense'}
              variant="headlineLarge"
              style={styles.balanceAmount}
            />
            <Text variant="bodySmall" style={styles.balanceLabel}>
              Net Balance
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={[styles.summaryIcon, { backgroundColor: theme.dark ? '#1b3a1c' : '#e8f5e9' }]}>
                <IconButton icon="arrow-down" iconColor={theme.colors.income} size={20} />
              </View>
              <Text variant="labelSmall" style={styles.summaryItemLabel}>
                Income
              </Text>
              <PriceText
                amount={summary?.totalIncome || 0}
                type="income"
                variant="titleMedium"
              />
              <Text variant="bodySmall" style={styles.summaryItemCount}>
                {summary?.incomeCount || 0} transactions
              </Text>
            </View>

            <View style={[styles.summaryItem, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={[styles.summaryIcon, { backgroundColor: theme.dark ? '#3a1b1b' : '#ffebee' }]}>
                <IconButton icon="arrow-up" iconColor={theme.colors.expense} size={20} />
              </View>
              <Text variant="labelSmall" style={styles.summaryItemLabel}>
                Expense
              </Text>
              <PriceText
                amount={summary?.totalExpense || 0}
                type="expense"
                variant="titleMedium"
              />
              <Text variant="bodySmall" style={styles.summaryItemCount}>
                {summary?.expenseCount || 0} transactions
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
                Top Spending Categories
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

      {recentTransactions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Recent Transactions
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Transactions' as never)}
              >
                View All
              </Button>
            </View>

            {recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <IconButton
                    icon={transaction.category?.icon || 'tag'}
                    iconColor={transaction.category?.color || '#666'}
                    size={20}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text variant="bodyMedium" style={styles.transactionCategory}>
                    {transaction.category?.name || 'Uncategorized'}
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
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <View style={styles.quickActions}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate('AddTransaction' as never)}
          style={styles.actionButton}
        >
          Add Transaction
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  balanceAmount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceLabel: {
    opacity: 0.7,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  summaryIcon: {
    borderRadius: 24,
    marginBottom: 8,
  },
  summaryItemLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  summaryItemValue: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  summaryItemCount: {
    opacity: 0.6,
    fontSize: 11,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  categoryTotal: {
    fontWeight: 'bold',
  },
  categoryPercentage: {
    opacity: 0.6,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  transactionIcon: {
    marginRight: 8,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    marginBottom: 2,
  },
  transactionDate: {
    opacity: 0.6,
  },
  transactionAmount: {
    fontWeight: 'bold',
  },
  quickActions: {
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
  },
});
