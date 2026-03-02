import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, IconButton, SegmentedButtons, useTheme, Portal, Dialog, Divider, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../../store/userStore';
import { dashboardService, DashboardSummary, CategorySummary } from '../../../services/dashboardService';
import { PriceText } from '../../../components/PriceText';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RangeDatePicker } from '../../../components/RangeDatePicker';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { DateFilterSegment } from '../../../components/DateFilterSegment';

export const DashboardScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const { profile, fetchProfile } = useUserStore();
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<'month' | 'year' | 'all' | 'custom'>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter, appliedCustomRange]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [dateFilter, appliedCustomRange])
  );

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
            startDate: appliedCustomRange.start.toISOString().split('T')[0],
            endDate: appliedCustomRange.end.toISOString().split('T')[0],
          };
        }
        return { startDate: undefined, endDate: undefined };
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
      setCategoryBreakdown(expenseBreakdown);
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
        return t('dashboard.thisMonth');
      case 'year':
        return t('dashboard.thisYear');
      case 'custom':
        if (appliedCustomRange) {
          const start = appliedCustomRange.start;
          const end = appliedCustomRange.end;
          const startStr = start.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' });
          const endStr = end.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' });
          return `${startStr} - ${endStr}`;
        }
        return t('dashboard.customRange');
      case 'all':
        return t('dashboard.allTime');
    }
  };

  const handleFilterChange = (value: string) => {
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
    // Reset to previous filter if custom was not applied
    if (dateFilter === 'custom' && !appliedCustomRange) {
      setDateFilter('month');
    }
  };

  if (loading && !refreshing) {
    return <LoadingScreen message={t('dashboard.loadingDashboard')} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <View style={styles.filterContainer}>
        <DateFilterSegment
          value={dateFilter}
          onValueChange={handleFilterChange}
        />
      </View>

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
              <PriceText
                amount={summary?.totalIncome || 0}
                type="income"
                variant="titleMedium"
              />
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
              <PriceText
                amount={summary?.totalExpense || 0}
                type="expense"
                variant="titleMedium"
              />
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

            {categoryBreakdown.slice(0, 5).map((category) => (
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

      {/* Category Breakdown - Pie Chart */}
      {/* {categoryBreakdown.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {t('dashboard.spendingByCategory')}
            </Text>
            <CategoryPieChart data={categoryBreakdown.slice(0, 8)} currency={currency} />
          </Card.Content>
        </Card>
      )} */}

      {/* Monthly Trends - Bar Chart */}
      {/* {monthlyTrends.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {t('dashboard.monthlyTrends')}
            </Text>
            <MonthlyTrendChart data={monthlyTrends} />
          </Card.Content>
        </Card>
      )} */}

      {recentTransactions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {t('dashboard.recentTransactions')}
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Transactions' as never)}
              >
                {t('common.viewAll')}
              </Button>
            </View>

            {recentTransactions.map((transaction) => (
              <TouchableOpacity 
                key={transaction.id} 
                style={styles.transactionItem}
                onPress={() => navigation.navigate('EditTransaction' as never, { transactionId: transaction.id } as never)}
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

      <View style={styles.quickActions}>
        <FAB
          icon="plus"
          onPress={() => navigation.navigate('AddTransaction' as never)}
          style={styles.actionButton}
          label={t('dashboard.addTransaction')}
        />
      </View>
    </ScrollView>

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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
});
