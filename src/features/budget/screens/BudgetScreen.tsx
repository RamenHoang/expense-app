import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, IconButton, SegmentedButtons, FAB, ProgressBar } from 'react-native-paper';
import { useUserStore } from '../../../store/userStore';
import { useBudgetStore } from '../../../store/budgetStore';
import { formatCurrency } from '../../../utils/currency';
import { useNavigation } from '@react-navigation/native';

export const BudgetScreen = () => {
  const navigation = useNavigation();
  const { profile, fetchProfile } = useUserStore();
  const { budgetUsage, fetchBudgetUsage, isLoading } = useBudgetStore();
  
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  useEffect(() => {
    loadBudgetUsage();
  }, [period]);

  const loadBudgetUsage = async () => {
    setRefreshing(true);
    await fetchBudgetUsage(period);
    setRefreshing(false);
  };

  const onRefresh = () => {
    loadBudgetUsage();
  };

  const currency = profile?.currency || 'USD';

  const getProgressBarColor = (percentage: number) => {
    if (percentage > 100) return '#f44336'; // Red - over budget
    if (percentage > 80) return '#ff9800'; // Orange - warning
    return '#4caf50'; // Green - good
  };

  const getTotalBudget = () => {
    return budgetUsage.reduce((sum, item) => sum + item.budget.amount, 0);
  };

  const getTotalSpent = () => {
    return budgetUsage.reduce((sum, item) => sum + item.spent, 0);
  };

  const getTotalRemaining = () => {
    return budgetUsage.reduce((sum, item) => sum + item.remaining, 0);
  };

  const getOverallPercentage = () => {
    const total = getTotalBudget();
    const spent = getTotalSpent();
    return total > 0 ? (spent / total) * 100 : 0;
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="bodyLarge">Loading budgets...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.filterContainer}>
          <SegmentedButtons
            value={period}
            onValueChange={(value) => setPeriod(value as any)}
            buttons={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />
        </View>

        {budgetUsage.length > 0 && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {period === 'monthly' ? 'This Month' : 'This Year'} Overview
              </Text>

              <View style={styles.overallStats}>
                <View style={styles.statItem}>
                  <Text variant="bodySmall" style={styles.statLabel}>Budget</Text>
                  <Text variant="titleMedium" style={styles.statValue}>
                    {formatCurrency(getTotalBudget(), currency)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="bodySmall" style={styles.statLabel}>Spent</Text>
                  <Text variant="titleMedium" style={[styles.statValue, { color: '#f44336' }]}>
                    {formatCurrency(getTotalSpent(), currency)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="bodySmall" style={styles.statLabel}>Remaining</Text>
                  <Text variant="titleMedium" style={[styles.statValue, { color: '#4caf50' }]}>
                    {formatCurrency(getTotalRemaining(), currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.overallProgress}>
                <Text variant="bodyMedium" style={styles.overallPercentage}>
                  {getOverallPercentage().toFixed(1)}% of total budget used
                </Text>
                <ProgressBar
                  progress={Math.min(getOverallPercentage() / 100, 1)}
                  color={getProgressBarColor(getOverallPercentage())}
                  style={styles.progressBar}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {budgetUsage.map((item) => (
          <Card key={item.budget.id} style={styles.budgetCard}>
            <Card.Content>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetInfo}>
                  <IconButton
                    icon={item.budget.category?.icon || 'tag'}
                    iconColor={item.budget.category?.color || '#666'}
                    size={24}
                  />
                  <View style={styles.budgetDetails}>
                    <Text variant="titleMedium" style={styles.categoryName}>
                      {item.budget.category?.name || 'Category'}
                    </Text>
                    <Text variant="bodySmall" style={styles.budgetPeriod}>
                      {period === 'monthly' ? 'Monthly Budget' : 'Yearly Budget'}
                    </Text>
                  </View>
                </View>
                {item.isOverBudget && (
                  <IconButton
                    icon="alert-circle"
                    iconColor="#f44336"
                    size={24}
                  />
                )}
                {item.isWarning && !item.isOverBudget && (
                  <IconButton
                    icon="alert"
                    iconColor="#ff9800"
                    size={24}
                  />
                )}
              </View>

              <View style={styles.budgetAmounts}>
                <View style={styles.amountRow}>
                  <Text variant="bodyMedium">Budget:</Text>
                  <Text variant="bodyMedium" style={styles.amountValue}>
                    {formatCurrency(item.budget.amount, currency)}
                  </Text>
                </View>
                <View style={styles.amountRow}>
                  <Text variant="bodyMedium">Spent:</Text>
                  <Text variant="bodyMedium" style={[styles.amountValue, { color: '#f44336' }]}>
                    {formatCurrency(item.spent, currency)}
                  </Text>
                </View>
                <View style={styles.amountRow}>
                  <Text variant="bodyMedium">Remaining:</Text>
                  <Text 
                    variant="bodyMedium" 
                    style={[
                      styles.amountValue, 
                      { color: item.remaining >= 0 ? '#4caf50' : '#f44336' }
                    ]}
                  >
                    {formatCurrency(item.remaining, currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text variant="bodySmall" style={styles.progressLabel}>
                    {item.percentage.toFixed(1)}% used
                  </Text>
                  {item.isOverBudget && (
                    <Text variant="bodySmall" style={styles.overBudgetText}>
                      Over Budget!
                    </Text>
                  )}
                  {item.isWarning && !item.isOverBudget && (
                    <Text variant="bodySmall" style={styles.warningText}>
                      Warning
                    </Text>
                  )}
                </View>
                <ProgressBar
                  progress={Math.min(item.percentage / 100, 1)}
                  color={getProgressBarColor(item.percentage)}
                  style={styles.progressBar}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        {budgetUsage.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <View style={styles.emptyState}>
                <IconButton icon="wallet-outline" size={64} iconColor="#ccc" />
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No Budgets Set
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Create budgets to track your spending and stay on target.
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('SetBudget' as never)}
                  style={styles.emptyButton}
                  icon="plus"
                >
                  Set Your First Budget
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('SetBudget' as never)}
        label="Add Budget"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
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
  budgetCard: {
    marginBottom: 12,
    elevation: 2,
  },
  emptyCard: {
    marginTop: 32,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  overallProgress: {
    marginTop: 8,
  },
  overallPercentage: {
    marginBottom: 8,
    opacity: 0.8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetDetails: {
    flex: 1,
  },
  categoryName: {
    fontWeight: 'bold',
  },
  budgetPeriod: {
    opacity: 0.6,
  },
  budgetAmounts: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountValue: {
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    opacity: 0.7,
  },
  overBudgetText: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  warningText: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
