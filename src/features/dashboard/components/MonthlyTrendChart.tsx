import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { BarChart } from 'react-native-chart-kit';
import { MonthlyTrend } from '../../../services/dashboardService';

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data }) => {
  const { t } = useTranslation();
  const screenWidth = Dimensions.get('window').width;

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          {t('common.noDataAvailable')}
        </Text>
      </View>
    );
  }

  // Format month labels (e.g., "2024-02" -> "Feb")
  const labels = data.map((item) => {
    const [year, month] = item.month.split('-');
    const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    return monthNames[parseInt(month) - 1];
  });

  const chartData = {
    labels,
    datasets: [
      {
        data: data.map((item) => item.income),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
      },
      {
        data: data.map((item) => item.expense),
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
      },
    ],
    legend: [t('dashboard.income'), t('dashboard.expense')],
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
