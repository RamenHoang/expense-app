import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

export const LoginScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Login</Text>
      <Text variant="bodyMedium">Welcome back!</Text>
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
