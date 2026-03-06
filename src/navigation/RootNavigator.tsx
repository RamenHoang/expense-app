import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Platform } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { RootStackParamList } from '../types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { CategoryListScreen } from '../features/categories/screens/CategoryListScreen';
import { AddTransactionScreen } from '../features/transactions/screens/AddTransactionScreen';
import { EditTransactionScreen } from '../features/transactions/screens/EditTransactionScreen';
import { SetBudgetScreen } from '../features/budget/screens/SetBudgetScreen';
import { CurrencySelectionScreen } from '../features/settings/screens/CurrencySelectionScreen';
import { CreateFamilyScreen } from '../features/family/screens/CreateFamilyScreen';
import { InviteMemberScreen } from '../features/family/screens/InviteMemberScreen';
import { EditFamilyScreen } from '../features/family/screens/EditFamilyScreen';
import { useAuthStore } from '../store/authStore';
import { t } from 'i18next';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, isLoading } = useAuthStore();
  const theme = useTheme();

  const commonScreenOptions = {
    headerStyle: {
      backgroundColor: theme.colors.surface,
    },
    headerTintColor: theme.colors.onSurface,
    contentStyle: {
      backgroundColor: theme.colors.background,
    },
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: true,
          ...commonScreenOptions,
        }}
      >
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
                title: t('categories.manageCategories'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="AddTransaction" 
              component={AddTransactionScreen}
              options={{ 
                title: t('transactions.addTransaction'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="EditTransaction" 
              component={EditTransactionScreen}
              options={{ 
                title: t('transactions.editTransaction'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="SetBudget" 
              component={SetBudgetScreen}
              options={{ 
                title: t('budgets.setBudget'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="CurrencySelection" 
              component={CurrencySelectionScreen}
              options={{ 
                title: t('settings.selectCurrency'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="CreateFamily" 
              component={CreateFamilyScreen}
              options={{ 
                title: t('family.createFamily'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="InviteMember" 
              component={InviteMemberScreen}
              options={{ 
                title: t('family.inviteMember'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="EditFamily" 
              component={EditFamilyScreen}
              options={{ 
                title: t('family.title'),
                headerBackTitle: t('common.back'),
              }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator} 
            options={{
              headerShown: false,
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
