import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Button, IconButton, SegmentedButtons, FAB, ProgressBar, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../../../store/userStore';
import { useBudgetStore } from '../../../store/budgetStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { formatCurrency } from '../../../utils/currency';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { budgetService } from '../../../services/budgetService';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { FilterButtonGroup } from '../../../components/FilterButtonGroup';
import { ScreenTransition } from '../../../components/ScreenTransition';

export const BudgetScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const { profile, fetchProfile } = useUserStore();
  const { budgetUsage, fetchBudgetUsage, isLoading } = useBudgetStore();
  const lastModifiedTimestamp = useTransactionStore((state) => state.lastModifiedTimestamp);
  const lastLoadedTimestampRef = useRef(0);
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

  useFocusEffect(
    useCallback(() => {
      if (lastModifiedTimestamp > lastLoadedTimestampRef.current) {
        loadBudgetUsage();
        lastLoadedTimestampRef.current = Date.now();
      }
    }, [lastModifiedTimestamp, period])
  );

  const loadBudgetUsage = async () => {
    setRefreshing(true);
    await fetchBudgetUsage(period);
    setRefreshing(false);
  };

  const onRefresh = () => {
    loadBudgetUsage();
  };

  const handleDeleteBudget = (budgetId: string) => {
    Alert.alert(
      t('budgets.deleteBudget'),
      t('budgets.confirmDeleteBudget'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetService.deleteBudget(budgetId);
              await fetchBudgetUsage(period);
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || t('budgets.budgetDeleteError'));
            }
          },
        },
      ]
    );
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
    return <LoadingScreen message={t('budgets.loading')} />;
  }

  return (
    <ScreenTransition>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.filterContainer}>
          <FilterButtonGroup
            value={period}
            onValueChange={(value) => setPeriod(value as any)}
            buttons={[
              { value: 'monthly', label: t('budgets.monthly') },
              { value: 'yearly', label: t('budgets.yearly') },
            ]}
          />
        </View>

        {budgetUsage.length > 0 && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {period === 'monthly' ? t('budgets.thisMonth') : t('budgets.thisYear')} {t('budgets.overview')}
              </Text>

              <View style={styles.overallStats}>
                <View style={styles.statItem}>
                  <Text variant="bodySmall" style={styles.statLabel}>{t('budgets.budget')}</Text>
                  <Text variant="titleMedium" style={styles.statValue}>
                    {formatCurrency(getTotalBudget(), currency)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="bodySmall" style={styles.statLabel}>{t('budgets.spent')}</Text>
                  <Text variant="titleMedium" style={[styles.statValue, { color: theme.colors.expense }]}>
                    {formatCurrency(getTotalSpent(), currency)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="bodySmall" style={styles.statLabel}>{t('budgets.remaining')}</Text>
                  <Text variant="titleMedium" style={[styles.statValue, { color: theme.colors.income }]}>
                    {formatCurrency(getTotalRemaining(), currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.overallProgress}>
                <Text variant="bodyMedium" style={styles.overallPercentage}>
                  {getOverallPercentage().toFixed(1)}% {t('budgets.used')}
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
          <TouchableOpacity 
            key={item.budget.id}
            onPress={() => navigation.navigate('SetBudget' as never, { budgetId: item.budget.id } as never)}
            activeOpacity={1}
          >
            <Card style={styles.budgetCard}>
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
                        {item.budget.category?.name || t('budgets.category')}
                      </Text>
                      <Text variant="bodySmall" style={styles.budgetPeriod}>
                        {period === 'monthly' ? t('budgets.monthlyBudget') : t('budgets.yearlyBudget')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.budgetHeaderActions}>
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
                    <IconButton
                      icon="delete"
                      iconColor={theme.colors.error}
                      size={20}
                      onPress={(e) => {
                        e?.preventDefault?.();
                        handleDeleteBudget(item.budget.id);
                      }}
                    />
                  </View>
                </View>

                <View style={styles.budgetAmounts}>
                  <View style={styles.amountRow}>
                    <Text variant="bodyMedium">{t('budgets.budget')}:</Text>
                    <Text variant="bodyMedium" style={styles.amountValue}>
                      {formatCurrency(item.budget.amount, currency)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text variant="bodyMedium">{t('budgets.spent')}:</Text>
                    <Text variant="bodyMedium" style={[styles.amountValue, { color: theme.colors.expense }]}>
                      {formatCurrency(item.spent, currency)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text variant="bodyMedium">{t('budgets.remaining')}:</Text>
                    <Text 
                      variant="bodyMedium" 
                      style={[
                        styles.amountValue, 
                        { color: item.remaining >= 0 ? theme.colors.income : theme.colors.expense }
                      ]}
                    >
                      {formatCurrency(item.remaining, currency)}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text variant="bodySmall" style={styles.progressLabel}>
                      {item.percentage.toFixed(1)}% {t('budgets.used')}
                    </Text>
                    {item.isOverBudget && (
                      <Text variant="bodySmall" style={[styles.overBudgetText, { color: theme.colors.error }]}>
                        {t('budgets.overBudget')}
                      </Text>
                    )}
                    {item.isWarning && !item.isOverBudget && (
                      <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.warning }]}>
                        {t('budgets.warning')}
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
          </TouchableOpacity>
        ))}

        {budgetUsage.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <View style={styles.emptyState}>
                <IconButton icon="wallet-outline" size={64} iconColor="#ccc" />
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  {t('budgets.noBudgetsSet')}
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  {t('budgets.noBudgetsDescription')}
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('SetBudget' as never)}
                  style={styles.emptyButton}
                  icon="plus"
                >
                  {t('budgets.setFirstBudget')}
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
        // label={t('budgets.addBudget')}
      />
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
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
  budgetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
  },
  warningText: {
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
