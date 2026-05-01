import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Platform, Linking } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { ResetPasswordScreen } from '../features/auth/screens/ResetPasswordScreen';
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
import { BatchVoiceScreen } from '../features/transactions/screens/BatchVoiceScreen';
import { EditProfileScreen } from '../features/settings/screens/EditProfileScreen';
import { useAuthStore } from '../store/authStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { t } = useTranslation();
  const { user, isLoading, isPasswordRecovery } = useAuthStore();
  const theme = useTheme();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes('auth/callback')) return;

      const queryStr = url.split('?')[1];
      if (!queryStr) return;
      const params = new URLSearchParams(queryStr);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        if (type === 'recovery') {
          useAuthStore.getState().setPasswordRecovery(true);
        }
      }
    };

    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

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
        {isPasswordRecovery ? (
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
        ) : user ? (
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
            <Stack.Screen
              name="BatchVoice"
              component={BatchVoiceScreen}
              options={{
                title: t('batchVoice.title'),
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                title: t('settings.editProfile'),
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
