import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFamilyStore } from '../../../store/familyStore';
import { useNavigation } from '@react-navigation/native';

export const CreateFamilyScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const { createFamily, isLoading } = useFamilyStore();

  const [familyName, setFamilyName] = useState('');

  const handleCreate = async () => {
    if (!familyName.trim()) {
      Alert.alert(t('common.error'), t('family.enterFamilyName'));
      return;
    }

    try {
      await createFamily(familyName.trim());
      Alert.alert(t('common.success'), t('family.familyCreated'));
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.label}>{t('family.familyName')}</Text>
        <TextInput
          mode="outlined"
          value={familyName}
          onChangeText={setFamilyName}
          placeholder={t('family.enterFamilyName')}
          style={styles.input}
          autoFocus
        />

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={isLoading}
          disabled={isLoading || !familyName.trim()}
          style={styles.button}
        >
          {t('family.createFamily')}
        </Button>
      </View>
    </ScrollView>
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
