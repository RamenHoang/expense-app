import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export const BudgetScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Budget</Text>
      <Text variant="bodyMedium">Manage your budgets here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
