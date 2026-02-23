import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export const ForgotPasswordScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Forgot Password</Text>
      <Text variant="bodyMedium">Reset your password</Text>
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
