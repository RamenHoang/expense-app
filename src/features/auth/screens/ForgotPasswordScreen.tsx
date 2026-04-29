import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Snackbar } from 'react-native-paper';
import { supabase } from '../../../config/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../types/navigation';
import { useTheme } from 'react-native-paper';
import { ScreenTransition } from '../../../components/ScreenTransition';

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      textAlign: 'center',
      marginHorizontal: 16,
      color: theme.colors.onBackground,
    },
    form: {
      width: '100%',
    },
    input: {
      marginBottom: 16,
    },
    resetButton: {
      marginTop: 8,
      paddingVertical: 6,
    },
    backContainer: {
      alignItems: 'center',
      marginTop: 16,
    },
  });

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập email hợp lệ');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://ramenhoang.github.io/expense-app/auth-redirect.html',
      });

      if (error) throw error;

      setSuccess('Đã gửi liên kết đặt lại mật khẩu! Kiểm tra email của bạn.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi email đặt lại mật khẩu');
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
          <Text variant="displaySmall" style={styles.title}>Đặt Lại Mật Khẩu</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Nhập địa chỉ email của bạn và chúng tôi sẽ gửi cho bạn liên kết để đặt lại mật khẩu.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            disabled={loading}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
            style={styles.resetButton}
          >
            {loading ? 'Đang gửi...' : 'Gửi Liên Kết'}
          </Button>

          <View style={styles.backContainer}>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
              icon="arrow-left"
            >
              Quay lại Đăng Nhập
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        action={{
          label: 'Đóng',
          onPress: () => setError(''),
        }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={3000}
        style={{ backgroundColor: '#4caf50' }}
      >
        {success}
      </Snackbar>
    </KeyboardAvoidingView>
    </ScreenTransition>
  );
};
