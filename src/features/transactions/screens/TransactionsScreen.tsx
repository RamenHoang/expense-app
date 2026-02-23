import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, FAB } from 'react-native-paper';

export const TransactionsScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Transactions</Text>
      <Text variant="bodyMedium">Your transaction list will appear here</Text>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => console.log('Add transaction')}
      />
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
