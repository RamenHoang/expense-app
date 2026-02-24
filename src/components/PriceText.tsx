import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useUserStore } from '../store/userStore';
import { formatCurrency } from '../utils/currency';

interface PriceTextProps {
  amount: number;
  type?: 'income' | 'expense' | 'neutral';
  style?: TextStyle;
  variant?: 'displayLarge' | 'displayMedium' | 'displaySmall' | 'headlineLarge' | 'headlineMedium' | 'headlineSmall' | 'titleLarge' | 'titleMedium' | 'titleSmall' | 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'labelLarge' | 'labelMedium' | 'labelSmall';
  showSign?: boolean;
  currency?: string;
}

export const PriceText: React.FC<PriceTextProps> = ({
  amount,
  type = 'neutral',
  style,
  variant = 'bodyLarge',
  showSign = false,
  currency: customCurrency,
}) => {
  const theme = useTheme();
  const { profile } = useUserStore();
  
  const currency = customCurrency || profile?.currency || 'USD';
  const formattedAmount = formatCurrency(Math.abs(amount), currency);
  
  const getColor = () => {
    switch (type) {
      case 'income':
        return theme.colors.income;
      case 'expense':
        return theme.colors.expense;
      default:
        return theme.colors.onSurface;
    }
  };

  const getSign = () => {
    if (!showSign) return '';
    if (type === 'income') return '+';
    if (type === 'expense') return '-';
    return amount >= 0 ? '+' : '-';
  };

  return (
    <Text
      variant={variant}
      style={[
        styles.text,
        { color: getColor() },
        style,
      ]}
    >
      {getSign()}{formattedAmount}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
  },
});
