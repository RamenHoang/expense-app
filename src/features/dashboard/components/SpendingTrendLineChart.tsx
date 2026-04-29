import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { dashboardService, MonthlyTrend } from '../../../services/dashboardService';
import { formatMonthShortLabel } from '../../../utils/date';

interface SpendingTrendLineChartProps {
  startDate?: string;
  endDate?: string;
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
}

export const SpendingTrendLineChart: React.FC<SpendingTrendLineChartProps> = ({ startDate, endDate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const locale = t('common.locale');

  const [data, setData] = useState<MonthlyTrend[]>([]);
  const [granularity, setGranularity] = useState<'daily' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const isDaily = !!(startDate && endDate && daysBetween(startDate, endDate) <= 45);
    setGranularity(isDaily ? 'daily' : 'monthly');
    setLoading(true);

    const fetch = isDaily
      ? dashboardService.getDailyTrends(startDate!, endDate!)
      : dashboardService.getMonthlyTrends(startDate, endDate);

    fetch
      .then((trends) => { if (!cancelled) { setData(trends); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const isDark = theme.dark;
  const bgColor = isDark ? theme.colors.surface : '#ffffff';
  const labelColorFn = isDark
    ? (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`
    : (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`;

  const chartConfig = {
    backgroundColor: bgColor,
    backgroundGradientFrom: bgColor,
    backgroundGradientTo: bgColor,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    labelColor: labelColorFn,
    propsForDots: { r: '3', strokeWidth: '1' },
    propsForLabels: { fontSize: 10 },
  };

  const buildLabels = (): string[] => {
    if (granularity === 'daily') {
      // Show day-of-month; skip alternates when > 20 points to avoid crowding
      const skip = data.length > 20 ? 2 : 1;
      return data.map((item, i) => {
        if (i % skip !== 0) return '';
        const day = parseInt(item.month.split('-')[2], 10);
        return String(day);
      });
    }
    return data.map((item) => formatMonthShortLabel(item.month, locale));
  };

  const chartData = {
    labels: buildLabels(),
    datasets: [
      {
        data: data.length > 0 ? data.map((item) => item.income) : [0],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: data.length > 0 ? data.map((item) => item.expense) : [0],
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: [t('dashboard.income'), t('dashboard.expense')],
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          {t('common.noDataAvailable')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={chartData}
        width={screenWidth - 64}
        height={200}
        chartConfig={chartConfig}
        bezier
        fromZero
        withInnerLines={false}
        withOuterLines={false}
        style={styles.chart}
        yAxisLabel=""
        yAxisSuffix=""
        formatYLabel={(value) => {
          const num = parseFloat(value);
          if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
          if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
          return value;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },
  loadingContainer: {
    height: 216,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
});
