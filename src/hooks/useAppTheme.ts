import { useTheme } from 'react-native-paper';
import { AppTheme } from '../theme/theme';

/**
 * Hook to get theme-aware colors
 * Use this instead of hardcoded colors for dark mode support
 */
export const useAppTheme = () => {
  const theme = useTheme<AppTheme>();
  
  return {
    colors: theme.colors,
    // Convenience getters for common colors
    background: theme.colors.background,
    surface: theme.colors.surface,
    surfaceVariant: theme.colors.surfaceVariant,
    primary: theme.colors.primary,
    text: theme.colors.onSurface,
    textSecondary: theme.colors.onSurfaceVariant,
    income: theme.colors.income,
    expense: theme.colors.expense,
    warning: theme.colors.warning,
  };
};
