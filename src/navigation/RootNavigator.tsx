import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { RootStackParamList } from '../types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { CategoryListScreen } from '../features/categories/screens/CategoryListScreen';
import { AddTransactionScreen } from '../features/transactions/screens/AddTransactionScreen';
import { EditTransactionScreen } from '../features/transactions/screens/EditTransactionScreen';
import { SetBudgetScreen } from '../features/budget/screens/SetBudgetScreen';
import { CurrencySelectionScreen } from '../features/settings/screens/CurrencySelectionScreen';
import { useAuthStore } from '../store/authStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, isLoading } = useAuthStore();
  const theme = useTheme();

  const commonScreenOptions = {
    headerStyle: {
      backgroundColor: theme.colors.surface,
    },
    headerTintColor: theme.colors.onSurface,
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {user ? (
          <>
            <Stack.Screen 
              name="Main" 
              component={MainNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Categories" 
              component={CategoryListScreen}
              options={{ 
                title: 'Manage Categories',
                headerBackTitle: 'Back',
                ...commonScreenOptions,
              }}
            />
            <Stack.Screen 
              name="AddTransaction" 
              component={AddTransactionScreen}
              options={{ 
                title: 'Add Transaction',
                headerBackTitle: 'Back',
                ...commonScreenOptions,
              }}
            />
            <Stack.Screen 
              name="EditTransaction" 
              component={EditTransactionScreen}
              options={{ 
                title: 'Edit Transaction',
                headerBackTitle: 'Back',
                ...commonScreenOptions,
              }}
            />
            <Stack.Screen 
              name="SetBudget" 
              component={SetBudgetScreen}
              options={{ 
                title: 'Set Budget',
                headerBackTitle: 'Back',
                ...commonScreenOptions,
              }}
            />
            <Stack.Screen 
              name="CurrencySelection" 
              component={CurrencySelectionScreen}
              options={{ 
                title: 'Select Currency',
                headerBackTitle: 'Back',
                ...commonScreenOptions,
              }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator} 
            options={{
              headerShown: false,
              ...commonScreenOptions,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
  },
});
