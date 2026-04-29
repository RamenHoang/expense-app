import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Snackbar, useTheme } from 'react-native-paper';
import { supabase } from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { ScreenTransition } from '../../../components/ScreenTransition';

export const ResetPasswordScreen = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const theme = useTheme();
  const { signOut } = useAuthStore();

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
    saveButton: {
      marginTop: 8,
      paddingVertical: 6,
    },
  });

  const validate = () => {
    if (!password) {
      setError('Vui lòng nhập mật khẩu mới');
      return false;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
      setTimeout(() => {
        signOut();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Không thể đặt lại mật khẩu');
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
            <Text variant="displaySmall" style={styles.title}>Mật Khẩu Mới</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Nhập mật khẩu mới của bạn để hoàn tất quá trình đặt lại.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Mật khẩu mới"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              disabled={loading}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(v => !v)}
                />
              }
            />

            <TextInput
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              disabled={loading}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(v => !v)}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.saveButton}
            >
              {loading ? 'Đang lưu...' : 'Lưu Mật Khẩu'}
            </Button>
          </View>
        </ScrollView>

        <Snackbar
          visible={!!error}
          onDismiss={() => setError('')}
          duration={3000}
          action={{ label: 'Đóng', onPress: () => setError('') }}
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
