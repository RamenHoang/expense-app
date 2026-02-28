import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';

interface CalendarPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  markedDates?: { [key: string]: { marked?: boolean; color?: string } };
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  markedDates = {},
}) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
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

  const isDateSelected = (date: Date | null): boolean => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDatePress = (date: Date | null) => {
    if (date && !isDateDisabled(date)) {
      onSelectDate(date);
    }
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <View style={styles.container}>
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

      {/* Days of week header */}
      <View style={styles.daysOfWeekRow}>
        {daysOfWeek.map((day) => (
          <View key={day} style={styles.dayOfWeekCell}>
            <Text variant="labelSmall" style={styles.dayOfWeekText}>
              {day.substring(0, 1)}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {days.map((date, index) => {
          const disabled = isDateDisabled(date);
          const selected = isDateSelected(date);
          const today = isToday(date);
          const dateKey = date ? getDateKey(date) : '';
          const marked = markedDates[dateKey];

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                selected && { backgroundColor: theme.colors.primary },
                today && !selected && { borderWidth: 1, borderColor: theme.colors.primary },
              ]}
              onPress={() => handleDatePress(date)}
              disabled={disabled}
            >
              {date && (
                <>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.dayText,
                      selected && { color: theme.colors.onPrimary },
                      disabled && { color: theme.colors.outline, opacity: 0.3 },
                      today && !selected && { color: theme.colors.primary, fontWeight: 'bold' },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {marked && (
                    <View
                      style={[
                        styles.markedDot,
                        { backgroundColor: marked.color || theme.colors.primary },
                      ]}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
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
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginVertical: 1,
  },
  dayText: {
    textAlign: 'center',
    fontSize: 13,
  },
  markedDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 1,
  },
});
