import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme, Button, Menu } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { formatDateForDisplay } from '../utils/date';

interface RangeDatePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onSelectRange: (startDate: Date, endDate: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export const RangeDatePicker: React.FC<RangeDatePickerProps> = ({
  startDate,
  endDate,
  onSelectRange,
  minDate,
  maxDate,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  const [currentMonth, setCurrentMonth] = useState(startDate || new Date());
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate || null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate || null);
  
  const [monthMenuVisible, setMonthMenuVisible] = useState(false);
  const [yearMenuVisible, setYearMenuVisible] = useState(false);
  
  // Track selected month and year separately
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Track if the change is internal (from user selecting month/year)
  const internalChangeRef = useRef(false);

  // Sync internal state only when props change from outside
  useEffect(() => {
    // Skip if this was an internal change
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    
    // External change - update state
    setTempStartDate(startDate || null);
    setTempEndDate(endDate || null);
    setCurrentMonth(startDate || new Date());
    
    // Try to detect if the range represents a full month or year selection
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Check if it's a full month selection
      const isFirstDayOfMonth = start.getDate() === 1;
      const isLastDayOfMonth = end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
      const isSameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
      
      if (isFirstDayOfMonth && isLastDayOfMonth && isSameMonth) {
        // This is a full month selection
        setSelectedMonth(start.getMonth());
        setSelectedYear(start.getFullYear());
      } else {
        // Check if it's a full year selection
        const isFirstDayOfYear = start.getDate() === 1 && start.getMonth() === 0;
        const isLastDayOfYear = end.getDate() === 31 && end.getMonth() === 11;
        const isSameYear = start.getFullYear() === end.getFullYear();
        
        if (isFirstDayOfYear && isLastDayOfYear && isSameYear) {
          // This is a full year selection
          setSelectedMonth(null);
          setSelectedYear(start.getFullYear());
        } else {
          // Custom manual selection
          setSelectedMonth(null);
          setSelectedYear(null);
        }
      }
    } else {
      setSelectedMonth(null);
      setSelectedYear(null);
    }
  }, [startDate, endDate]);

  const daysOfWeek = [
    t('calendar.sunday'),
    t('calendar.monday'),
    t('calendar.tuesday'),
    t('calendar.wednesday'),
    t('calendar.thursday'),
    t('calendar.friday'),
    t('calendar.saturday'),
  ];
  
  const monthNames = [
    t('calendar.january'),
    t('calendar.february'),
    t('calendar.march'),
    t('calendar.april'),
    t('calendar.may'),
    t('calendar.june'),
    t('calendar.july'),
    t('calendar.august'),
    t('calendar.september'),
    t('calendar.october'),
    t('calendar.november'),
    t('calendar.december')
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date: Date | null): boolean => {
    if (!date) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isInRange = (date: Date | null): boolean => {
    if (!date || !tempStartDate) return false;
    if (!tempEndDate) return false;
    return date >= tempStartDate && date <= tempEndDate;
  };

  const isRangeStart = (date: Date | null): boolean => {
    return isSameDay(date, tempStartDate);
  };

  const isRangeEnd = (date: Date | null): boolean => {
    return isSameDay(date, tempEndDate);
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return isSameDay(date, today);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDatePress = (date: Date | null) => {
    if (!date || isDateDisabled(date)) return;

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // First tap or reset selection
      setTempStartDate(date);
      setTempEndDate(null);
      // Clear month/year selections when manually selecting dates
      setSelectedMonth(null);
      setSelectedYear(null);
    } else {
      // Second tap
      let finalStartDate: Date;
      let finalEndDate: Date;
      
      if (date < tempStartDate) {
        // If selected date is before start, swap them
        finalStartDate = date;
        finalEndDate = tempStartDate;
      } else {
        finalStartDate = tempStartDate;
        finalEndDate = date;
      }
      
      setTempStartDate(finalStartDate);
      setTempEndDate(finalEndDate);
      
      // Clear month/year selections when manually selecting dates
      setSelectedMonth(null);
      setSelectedYear(null);
      
      // Mark as internal change before calling callback
      internalChangeRef.current = true;
      onSelectRange(finalStartDate, finalEndDate);
    }
  };

  const handleReset = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setSelectedMonth(null);
    setSelectedYear(null);
  };

  const handleMonthSelect = (monthIndex: number) => {
    // Use selected year if available, otherwise use current year in calendar
    const year = selectedYear !== null ? selectedYear : currentMonth.getFullYear();
    const newMonth = new Date(year, monthIndex, 1);
    setCurrentMonth(newMonth);
    setMonthMenuVisible(false);
    
    // Store selected month
    setSelectedMonth(monthIndex);
    
    // Auto-select the entire month
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    
    setTempStartDate(start);
    setTempEndDate(end);
    
    // Mark as internal change before calling callback
    internalChangeRef.current = true;
    onSelectRange(start, end);
  };

  const handleYearSelect = (year: number) => {
    const newMonth = new Date(year, currentMonth.getMonth(), 1);
    setCurrentMonth(newMonth);
    setYearMenuVisible(false);
    
    // Store selected year
    setSelectedYear(year);
    
    // If a month is already selected, select that month in the new year
    if (selectedMonth !== null) {
      const start = new Date(year, selectedMonth, 1);
      const end = new Date(year, selectedMonth + 1, 0);
      setTempStartDate(start);
      setTempEndDate(end);
      
      // Mark as internal change before calling callback
      internalChangeRef.current = true;
      onSelectRange(start, end);
    } else {
      // Otherwise, auto-select the entire year
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      setTempStartDate(start);
      setTempEndDate(end);
      
      // Mark as internal change before calling callback
      internalChangeRef.current = true;
      onSelectRange(start, end);
    }
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  };

  const days = getDaysInMonth(currentMonth);

  const getSelectionText = () => {
    if (!tempStartDate) {
      return t('dateFilter.selectStartDate');
    }
    if (!tempEndDate) {
      return t('dateFilter.selectEndDate');
    }
    return t('dateFilter.rangeSelected');
  };

  return (
    <View style={styles.container}>
      {/* Selection Status */}
      <View style={styles.statusContainer}>
        <Text variant="labelMedium" style={[styles.statusText, { color: theme.colors.primary }]}>
          {getSelectionText()}
        </Text>
        {tempStartDate && (
          <Button mode="text" compact onPress={handleReset}>
            {t('common.reset')}
          </Button>
        )}
      </View>

      {/* Header with month/year navigation */}
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          size={20}
          onPress={handlePreviousMonth}
          style={styles.navButton}
        />
        <Text variant="titleSmall" style={styles.monthYear}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <IconButton
          icon="chevron-right"
          size={20}
          onPress={handleNextMonth}
          style={styles.navButton}
        />
      </View>

      {/* Quick Select Dropdowns */}
      <View style={styles.quickSelectContainer}>
        <Menu
          visible={monthMenuVisible}
          onDismiss={() => setMonthMenuVisible(false)}
          anchor={
            <Button 
              mode="text" 
              compact 
              onPress={() => setMonthMenuVisible(true)}
              style={styles.quickSelectButton}
              icon="menu-down"
            >
              {selectedMonth !== null
                ? monthNames[selectedMonth]
                : t('dateFilter.selectMonth')}
            </Button>
          }
        >
          {monthNames.map((month, index) => (
            <Menu.Item
              key={index}
              onPress={() => handleMonthSelect(index)}
              title={month}
            />
          ))}
        </Menu>

        <Menu
          visible={yearMenuVisible}
          onDismiss={() => setYearMenuVisible(false)}
          anchor={
            <Button 
              mode="text" 
              compact 
              onPress={() => setYearMenuVisible(true)}
              style={styles.quickSelectButton}
              icon="menu-down"
            >
              {selectedYear !== null
                ? selectedYear.toString()
                : t('dateFilter.selectYear')}
            </Button>
          }
        >
          {getYearOptions().map((year) => (
            <Menu.Item
              key={year}
              onPress={() => handleYearSelect(year)}
              title={year.toString()}
            />
          ))}
        </Menu>
      </View>

      {/* Days of week header */}
      <View style={styles.daysOfWeekRow}>
        {daysOfWeek.map((day) => (
          <View key={day} style={styles.dayOfWeekCell}>
            <Text variant="labelSmall" style={styles.dayOfWeekText}>
              {day.substring(0, 2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {days.map((date, index) => {
          const disabled = isDateDisabled(date);
          const rangeStart = isRangeStart(date);
          const rangeEnd = isRangeEnd(date);
          const inRange = isInRange(date);
          const today = isToday(date);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                inRange && !rangeStart && !rangeEnd && { backgroundColor: theme.colors.primaryContainer },
                (rangeStart || rangeEnd) && { backgroundColor: theme.colors.primary },
                today && !rangeStart && !rangeEnd && !inRange && { 
                  borderWidth: 1, 
                  borderColor: theme.colors.primary 
                },
              ]}
              onPress={() => handleDatePress(date)}
              disabled={disabled}
            >
              {date && (
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.dayText,
                    (rangeStart || rangeEnd) && { color: theme.colors.onPrimary, fontWeight: 'bold' },
                    inRange && !rangeStart && !rangeEnd && { color: theme.colors.onPrimaryContainer },
                    disabled && { color: theme.colors.outline, opacity: 0.3 },
                    today && !rangeStart && !rangeEnd && !inRange && { 
                      color: theme.colors.primary, 
                      fontWeight: 'bold' 
                    },
                  ]}
                >
                  {date.getDate()}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date Display */}
      {tempStartDate && (
        <View style={styles.selectedDatesContainer}>
          <View style={styles.selectedDateItem}>
            <Text variant="labelSmall" style={styles.dateLabel}>
              {t('dashboard.fromDate')}
            </Text>
            <Text variant="bodyMedium" style={styles.dateValue}>
              {formatDateForDisplay(tempStartDate, 'vi-VN')}
            </Text>
          </View>
          {tempEndDate && (
            <>
              <Text variant="bodyLarge" style={styles.dateSeparator}>→</Text>
              <View style={styles.selectedDateItem}>
                <Text variant="labelSmall" style={styles.dateLabel}>
                  {t('dashboard.toDate')}
                </Text>
                <Text variant="bodyMedium" style={styles.dateValue}>
                  {formatDateForDisplay(tempEndDate, 'vi-VN')}
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  navButton: {
    margin: 0,
  },
  monthYear: {
    fontWeight: 'bold',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 12,
  },
  quickSelectButton: {
    flex: 1,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayOfWeekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayOfWeekText: {
    fontWeight: 'bold',
    opacity: 0.6,
    fontSize: 11,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 240, // Fixed height for 6 rows (40px per row x 6)
  },
  dayCell: {
    width: '14.28%',
    height: 40, // Fixed height instead of aspectRatio
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginVertical: 1,
  },
  dayText: {
    textAlign: 'center',
    fontSize: 13,
  },
  selectedDatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  selectedDateItem: {
    alignItems: 'center',
  },
  dateLabel: {
    opacity: 0.6,
    marginBottom: 4,
  },
  dateValue: {
    fontWeight: 'bold',
  },
  dateSeparator: {
    marginHorizontal: 16,
    opacity: 0.4,
  },
});
