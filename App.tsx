import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { lightTheme, darkTheme } from './src/theme/theme';
import { OnboardingScreen } from './src/features/onboarding';
import './src/i18n';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.subtitle}>Please restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, opacity: 0.6 },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  const { i18n } = useTranslation();
  const initialize = useAuthStore((state) => state.initialize);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    initialize();
    checkOnboarding();
    loadLanguagePreference();
  }, [initialize]);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user_language');
      if (savedLanguage) {
        await i18n.changeLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  };

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
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <StatusBar
              style={isDarkMode ? "light" : "dark"}
              backgroundColor={theme.colors.surface}
              translucent={false}
            />
            {showOnboarding ? (
              <OnboardingScreen onComplete={handleOnboardingComplete} />
            ) : (
              <RootNavigator />
            )}
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
