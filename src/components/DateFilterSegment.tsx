import React from 'react';
import { StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface DateFilterSegmentProps {
  value: 'month' | 'year' | 'custom' | 'all';
  onValueChange: (value: 'month' | 'year' | 'custom' | 'all') => void;
  style?: any;
}

export const DateFilterSegment: React.FC<DateFilterSegmentProps> = ({
  value,
  onValueChange,
  style,
}) => {
  const { t } = useTranslation();

  return (
    <SegmentedButtons
      value={value}
      onValueChange={onValueChange}
      buttons={[
        { value: 'month', label: t('dateFilter.month') },
        { value: 'year', label: t('dateFilter.year') },
        { value: 'custom', label: t('dateFilter.custom') },
        { value: 'all', label: t('dateFilter.all') },
      ]}
      style={style}
    />
  );
};
