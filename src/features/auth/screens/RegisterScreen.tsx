import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Snackbar, useTheme } from 'react-native-paper';
import { supabase } from '../../../config/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../types/navigation';
import { ScreenTransition } from '../../../components/ScreenTransition';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export const RegisterScreen = ({ navigation }: RegisterScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ tên');
      return false;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập email hợp lệ');
      return false;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return false;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setSuccess('Tạo tài khoản thành công! Vui lòng kiểm tra email để xác minh.');
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tạo tài khoản');
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
          <Text variant="displaySmall" style={styles.title}>Tạo Tài Khoản</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Đăng ký để bắt đầu</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            autoCapitalize="words"
            autoComplete="name"
            disabled={loading}
            style={styles.input}
          />

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

          <TextInput
            label="Mật khẩu"
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

          <TextInput
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="password"
            disabled={loading}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerButton}
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </Button>

          <View style={styles.loginContainer}>
            <Text variant="bodyMedium">Đã có tài khoản? </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
              compact
            >
              Đăng nhập
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
