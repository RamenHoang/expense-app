import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Portal, Modal, Button, useTheme } from 'react-native-paper';

interface DatePickerInputProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label = 'Date',
  disabled = false,
  error = false,
  minDate,
  maxDate,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    input: {
      backgroundColor: theme.colors.surface,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      margin: 20,
      borderRadius: 8,
      maxHeight: '80%',
    },
    modalTitle: {
      marginBottom: 16,
      fontWeight: 'bold',
    },
    dateList: {
      maxHeight: 400,
    },
    dateItem: {
      padding: 16,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    selectedDateItem: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    dateText: {
      fontWeight: 'bold',
    },
    dateSubtext: {
      marginTop: 4,
      opacity: 0.7,
    },
    selectedDateText: {
      color: theme.colors.onPrimary,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 16,
    },
  });

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generateDates = () => {
    const dates = [];
    const today = maxDate || new Date();
    const startFrom = minDate || new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Generate dates from minDate to maxDate
    let currentDate = new Date(today);
    const endDate = new Date(startFrom);
    
    while (currentDate >= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return dates;
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value);
    setShowPicker(false);
  };

  const handleIconPress = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  const getDayLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        value={formatDate(value)}
        mode="outlined"
        editable={false}
        disabled={disabled}
        error={error}
        right={
          <TextInput.Icon
            icon="calendar"
            onPress={handleIconPress}
            disabled={disabled}
          />
        }
        style={styles.input}
      />

      <Portal>
        <Modal
          visible={showPicker}
          onDismiss={handleCancel}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Select Date
          </Text>

          <ScrollView style={styles.dateList}>
            {generateDates().map((date, index) => {
              const isSelected = date.toDateString() === tempDate.toDateString();
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateItem, isSelected && styles.selectedDateItem]}
                  onPress={() => setTempDate(date)}
                >
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.dateText,
                      isSelected && styles.selectedDateText,
                    ]}
                  >
                    {getDayLabel(date)}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.dateSubtext,
                      isSelected && styles.selectedDateText,
                    ]}
                  >
                    {date.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Button onPress={handleCancel}>Cancel</Button>
            <Button mode="contained" onPress={handleConfirm}>
              Confirm
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};
