import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../config/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../types/navigation';
import { useTheme } from 'react-native-paper';
import { ScreenTransition } from '../../../components/ScreenTransition';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontWeight: 'bold',
      marginBottom: 8,
      color: theme.colors.primary,
    },
    subtitle: {
      opacity: 0.7,
      color: theme.colors.onBackground,
    },
    form: {
      width: '100%',
    },
    input: {
      marginBottom: 16,
    },
    forgotButton: {
      alignSelf: 'flex-end',
      marginBottom: 8,
    },
    loginButton: {
      marginTop: 8,
      paddingVertical: 6,
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
  });

  const validateForm = () => {
    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.invalidEmail'));
      return false;
    }
    if (!password) {
      setError(t('auth.passwordRequired'));
      return false;
    }
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      // Navigation handled by auth state change
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenTransition>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>{t('auth.login')}</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>{t('auth.signIn')}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            disabled={loading}
            style={styles.input}
          />

          <TextInput
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            disabled={loading}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
            style={styles.forgotButton}
          >
            {t('auth.forgotPassword')}
          </Button>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
          >
            {t('auth.login')}
          </Button>

          <View style={styles.registerContainer}>
            <Text variant="bodyMedium">{t('auth.noAccount')} </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
              compact
            >
              {t('auth.signUp')}
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        action={{
          label: t('common.close'),
          onPress: () => setError(''),
        }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
    </ScreenTransition>
  );
};
