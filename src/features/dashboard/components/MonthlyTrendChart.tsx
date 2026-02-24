import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { MonthlyTrend } from '../../../services/dashboardService';

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data }) => {
  const screenWidth = Dimensions.get('window').width;

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No data available
        </Text>
      </View>
    );
  }

  // Format month labels (e.g., "2024-02" -> "Feb")
  const labels = data.map((item) => {
    const [year, month] = item.month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1];
  });

  const chartData = {
    labels,
    datasets: [
      {
        data: data.map((item) => item.income),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green for income
      },
      {
        data: data.map((item) => item.expense),
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Red for expense
      },
    ],
    legend: ['Income', 'Expense'],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  return (
    <View style={styles.container}>
      <BarChart
        data={chartData}
        width={screenWidth - 64}
        height={220}
        chartConfig={chartConfig}
        verticalLabelRotation={0}
        fromZero
        showBarTops={false}
        withInnerLines={false}
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chart: {
    borderRadius: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
});
