import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useUserStore } from '../../../store/userStore';
import { getCurrencySymbol } from '../../../utils/currency';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: boolean;
  disabled?: boolean;
  type?: 'income' | 'expense';
  label?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  error = false,
  disabled = false,
  type = 'expense',
  label = 'Amount',
}) => {
  const { profile, fetchProfile } = useUserStore();
  
  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  const currency = profile?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);
  const noDecimals = ['VND', 'JPY', 'KRW'].includes(currency.toUpperCase());

  const handleChangeText = (text: string) => {
    // Remove all non-numeric characters except decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // For currencies without decimals, remove decimal points
    if (noDecimals) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      // Ensure only one decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        return;
      }
      
      // Limit to 2 decimal places
      if (parts[1] && parts[1].length > 2) {
        return;
      }
    }
    
    onChangeText(cleaned);
  };

  const formatDisplayValue = () => {
    if (!value) return '';
    
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return value;
    
    // For VND and similar currencies without decimal places
    if (noDecimals) {
      return Math.round(num).toLocaleString('en-US');
    }
    
    // Format with commas for thousands
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <TextInput
      label={label}
      value={formatDisplayValue()}
      onChangeText={handleChangeText}
      mode="outlined"
      keyboardType="decimal-pad"
      disabled={disabled}
      error={error}
      left={<TextInput.Affix text={currencySymbol} />}
      style={[
        styles.input,
        type === 'income' ? styles.incomeInput : styles.expenseInput,
      ]}
      placeholder={noDecimals ? '0' : '0.00'}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeInput: {
    // Optional: add income-specific styling
  },
  expenseInput: {
    // Optional: add expense-specific styling
  },
});
