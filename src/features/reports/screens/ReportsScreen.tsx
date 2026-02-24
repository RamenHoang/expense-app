import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, SegmentedButtons, IconButton } from 'react-native-paper';
import { useUserStore } from '../../../store/userStore';
import { dashboardService, CategorySummary, MonthlyTrend } from '../../../services/dashboardService';
import { CategoryPieChart } from '../../dashboard/components/CategoryPieChart';
import { MonthlyTrendChart } from '../../dashboard/components/MonthlyTrendChart';
import { formatCurrency } from '../../../utils/currency';

export const ReportsScreen = () => {
  const { profile, fetchProfile } = useUserStore();
  
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySummary[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [dateFilter, setDateFilter] = useState<'3months' | '6months' | '12months'>('6months');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  useEffect(() => {
    loadReportsData();
  }, [type, dateFilter]);

  const getMonthsCount = () => {
    switch (dateFilter) {
      case '3months':
        return 3;
      case '6months':
        return 6;
      case '12months':
        return 12;
      default:
        return 6;
    }
  };

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - getMonthsCount());

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const [breakdown, trends] = await Promise.all([
        dashboardService.getCategoryBreakdown(type, startDate, endDate),
        dashboardService.getMonthlyTrends(getMonthsCount()),
      ]);

      setCategoryBreakdown(breakdown);
      setMonthlyTrends(trends);
    } catch (error: any) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReportsData();
  };

  const currency = profile?.currency || 'USD';

  const getTotalAmount = () => {
    return categoryBreakdown.reduce((sum, cat) => sum + cat.total, 0);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="bodyLarge">Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Type Filter */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as any)}
          buttons={[
            { value: 'expense', label: 'Expenses', icon: 'arrow-up' },
            { value: 'income', label: 'Income', icon: 'arrow-down' },
          ]}
        />
      </View>

      {/* Date Range Filter */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={dateFilter}
          onValueChange={(value) => setDateFilter(value as any)}
          buttons={[
            { value: '3months', label: '3M' },
            { value: '6months', label: '6M' },
            { value: '12months', label: '12M' },
          ]}
        />
      </View>

      {/* Category Breakdown - Pie Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {type === 'expense' ? 'Expenses' : 'Income'} by Category
          </Text>
          <Text variant="bodyMedium" style={styles.totalAmount}>
            Total: {formatCurrency(getTotalAmount(), currency)}
          </Text>
          <CategoryPieChart data={categoryBreakdown.slice(0, 8)} currency={currency} />
        </Card.Content>
      </Card>

      {/* Category List with Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Detailed Breakdown
          </Text>

          {categoryBreakdown.map((category) => (
            <TouchableOpacity
              key={category.category_id}
              style={[
                styles.categoryItem,
                selectedCategory?.category_id === category.category_id && styles.selectedCategoryItem,
              ]}
              onPress={() => setSelectedCategory(
                selectedCategory?.category_id === category.category_id ? null : category
              )}
              activeOpacity={0.7}
            >
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
                  <Text variant="bodySmall" style={styles.categoryCount}>
                    {category.count} transactions
                  </Text>
                </View>
              </View>
              <View style={styles.categoryAmount}>
                <Text variant="titleSmall" style={styles.categoryTotal}>
                  {formatCurrency(category.total, currency)}
                </Text>
                <Text variant="bodySmall" style={styles.categoryPercentage}>
                  {category.percentage.toFixed(1)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {categoryBreakdown.length === 0 && (
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                No {type} transactions in this period
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Monthly Trends - Bar Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Monthly Trends
          </Text>
          <MonthlyTrendChart data={monthlyTrends} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  totalAmount: {
    marginBottom: 16,
    opacity: 0.8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  selectedCategoryItem: {
    backgroundColor: '#e8f4f8',
    borderWidth: 1,
    borderColor: '#6200ee',
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
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryCount: {
    opacity: 0.6,
    fontSize: 11,
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
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
});
