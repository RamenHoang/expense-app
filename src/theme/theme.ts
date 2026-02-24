import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    error: '#f44336',
    background: '#f5f5f5',
    surface: '#ffffff',
    onSurface: '#000000',
    // Custom colors
    income: '#4caf50',
    expense: '#f44336',
    warning: '#ff9800',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    secondary: '#03dac6',
    error: '#cf6679',
    background: '#121212',
    surface: '#1e1e1e',
    onSurface: '#ffffff',
    // Custom colors
    income: '#4caf50',
    expense: '#f44336',
    warning: '#ff9800',
  },
};

export type AppTheme = typeof lightTheme;
