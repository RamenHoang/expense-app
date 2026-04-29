import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFamilyStore } from '../../../store/familyStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenTransition } from '../../../components/ScreenTransition';

export const EditFamilyScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const { family, updateFamily, isLoading } = useFamilyStore();

  const { familyId } = route.params as { familyId: string };
  const [familyName, setFamilyName] = useState('');

  useEffect(() => {
    if (family) {
      setFamilyName(family.name);
    }
  }, [family]);

  const handleUpdate = async () => {
    if (!familyName.trim()) {
      Alert.alert(t('common.error'), t('family.enterFamilyName'));
      return;
    }

    try {
      await updateFamily(familyId, familyName.trim());
      Alert.alert(t('common.success'), t('family.familyUpdated'));
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <ScreenTransition>
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
          onPress={handleUpdate}
          loading={isLoading}
          disabled={isLoading || !familyName.trim()}
          style={styles.button}
        >
          {t('common.save')}
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
