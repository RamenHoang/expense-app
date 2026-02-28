import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { lightTheme, darkTheme } from './src/theme/theme';
import { OnboardingScreen } from './src/features/onboarding';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    initialize();
    checkOnboarding();
  }, [initialize]);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      setShowOnboarding(completed !== 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Wait for onboarding status to be checked
  if (showOnboarding === null) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <StatusBar style={isDarkMode ? "light" : "dark"} />
          {showOnboarding ? (
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          ) : (
            <RootNavigator />
          )}
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
