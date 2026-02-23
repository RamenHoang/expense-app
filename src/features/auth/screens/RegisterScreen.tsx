import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export const RegisterScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Register</Text>
      <Text variant="bodyMedium">Create your account</Text>
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
