import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Portal, Modal, Button } from 'react-native-paper';

interface DatePickerInputProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label = 'Date',
  disabled = false,
  error = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    
    // Generate last 60 days
    for (let i = 0; i < 60; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dates.push(date);
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  modal: {
    backgroundColor: 'white',
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
    borderColor: '#e0e0e0',
  },
  selectedDateItem: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  dateText: {
    fontWeight: 'bold',
  },
  dateSubtext: {
    marginTop: 4,
    opacity: 0.7,
  },
  selectedDateText: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});


