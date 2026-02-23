import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Protected route wrapper that checks authentication
 * Displays loading state while checking auth
 * Redirects to login if not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return fallback || (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    // Navigation is handled by RootNavigator based on auth state
    return null;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
  },
});
