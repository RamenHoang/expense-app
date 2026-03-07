import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FilterButtonGroup } from './FilterButtonGroup';

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
    <FilterButtonGroup
      value={value}
      onValueChange={(val) => onValueChange(val as 'month' | 'year' | 'custom' | 'all')}
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
