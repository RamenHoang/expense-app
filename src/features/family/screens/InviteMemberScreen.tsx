import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFamilyStore } from '../../../store/familyStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenTransition } from '../../../components/ScreenTransition';

export const InviteMemberScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const { inviteMember, isLoading } = useFamilyStore();

  const { familyId } = route.params as { familyId: string };
  const [email, setEmail] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('family.enterEmail'));
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert(t('common.error'), t('family.invalidEmail'));
      return;
    }

    try {
      await inviteMember(familyId, email.trim().toLowerCase());
      Alert.alert(t('common.success'), t('family.invitationSent'));
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <ScreenTransition>
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.label}>{t('family.email')}</Text>
        <TextInput
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          placeholder={t('family.enterEmail')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          autoFocus
        />

        <Button
          mode="contained"
          onPress={handleInvite}
          loading={isLoading}
          disabled={isLoading || !email.trim()}
          style={styles.button}
        >
          {t('family.inviteMember')}
        </Button>
      </View>
    </ScrollView>
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
});
