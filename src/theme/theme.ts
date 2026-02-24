import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    primaryContainer: '#e8ddff',
    secondary: '#03dac6',
    secondaryContainer: '#b2f1e8',
    tertiary: '#018786',
    error: '#f44336',
    errorContainer: '#fdecea',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    onPrimary: '#ffffff',
    onSecondary: '#000000',
    onBackground: '#1c1b1f',
    onSurface: '#1c1b1f',
    onSurfaceVariant: '#49454f',
    outline: '#79747e',
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
    primary: '#d0bcff',
    primaryContainer: '#4f378b',
    secondary: '#03dac6',
    secondaryContainer: '#005047',
    tertiary: '#4dd0e1',
    error: '#ffb4ab',
    errorContainer: '#93000a',
    background: '#1c1b1f',
    surface: '#1c1b1f',
    surfaceVariant: '#2b2930',
    onPrimary: '#371e73',
    onSecondary: '#003730',
    onBackground: '#e6e1e5',
    onSurface: '#e6e1e5',
    onSurfaceVariant: '#cac4d0',
    outline: '#938f99',
    // Custom colors
    income: '#66bb6a',
    expense: '#ef5350',
    warning: '#ffa726',
  },
};

export type AppTheme = typeof lightTheme;
