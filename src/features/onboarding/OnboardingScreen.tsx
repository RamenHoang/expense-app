import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import AppIntroSlider from 'react-native-app-intro-slider';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  title: string;
  text: string;
  icon: string;
  backgroundColor: string;
}

const slides: Slide[] = [
  {
    key: '1',
    title: 'Welcome to Personal Finance Manager',
    text: 'Take control of your finances with easy expense tracking',
    icon: '💰',
    backgroundColor: '#6366f1',
  },
  {
    key: '2',
    title: 'Track Every Transaction',
    text: 'Easily log income and expenses with categories and notes',
    icon: '💸',
    backgroundColor: '#8b5cf6',
  },
  {
    key: '3',
    title: 'Visual Insights',
    text: 'See where your money goes with beautiful charts and reports',
    icon: '📊',
    backgroundColor: '#06b6d4',
  },
  {
    key: '4',
    title: 'Set Budgets & Goals',
    text: 'Stay on track with budget alerts and spending limits',
    icon: '🎯',
    backgroundColor: '#10b981',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const theme = useTheme();
  const sliderRef = useRef<AppIntroSlider>(null);

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onComplete();
    }
  };

  const handleSkip = async () => {
    await handleDone();
  };

  const renderItem = ({ item }: { item: Slide }) => {
    return (
      <View
        style={[
          styles.slide,
          {
            backgroundColor: theme.dark ? theme.colors.background : item.backgroundColor,
          },
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text
            variant="headlineMedium"
            style={[styles.title, { color: theme.dark ? theme.colors.onBackground : '#fff' }]}
          >
            {item.title}
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.text, { color: theme.dark ? theme.colors.onBackground : '#fff' }]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderNextButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Text style={styles.buttonText}>→</Text>
      </View>
    );
  };

  const renderDoneButton = () => {
    return (
      <View style={[styles.buttonCircle, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>✓</Text>
      </View>
    );
  };

  const renderSkipButton = () => {
    return (
      <View style={styles.skipButton}>
        <Text style={[styles.skipText, { color: theme.dark ? theme.colors.onBackground : '#fff' }]}>
          Skip
        </Text>
      </View>
    );
  };

  return (
    <AppIntroSlider
      ref={sliderRef}
      renderItem={renderItem}
      data={slides}
      onDone={handleDone}
      onSkip={handleSkip}
      showSkipButton
      renderNextButton={renderNextButton}
      renderDoneButton={renderDoneButton}
      renderSkipButton={renderSkipButton}
      dotStyle={styles.dotStyle}
      activeDotStyle={[styles.activeDotStyle, { backgroundColor: theme.colors.primary }]}
    />
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: width - 64,
  },
  icon: {
    fontSize: 120,
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  text: {
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  buttonCircle: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 12,
  },
  skipText: {
    fontSize: 16,
  },
  dotStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDotStyle: {
    width: 24,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
