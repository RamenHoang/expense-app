import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, Avatar, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ScreenTransition } from '../../../components/ScreenTransition';
import { useUserStore } from '../../../store/userStore';
import { useAuthStore } from '../../../store/authStore';
import { userService } from '../../../services/userService';
import { supabase } from '../../../config/supabase';

export const EditProfileScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const { profile, fetchProfile } = useUserStore();
  const { user } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentAvatarUrl = profile?.avatar_url;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const pickImage = async () => {
    Alert.alert(
      t('settings.changePhoto'),
      undefined,
      [
        {
          text: t('settings.photoLibrary'),
          onPress: () => {
            setTimeout(async () => {
              try {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert(t('common.error'), t('settings.permissionDenied'));
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: 'images',
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.6,
                  base64: true,
                });
                if (!result.canceled && result.assets[0]) {
                  setAvatarUri(result.assets[0].uri);
                  setAvatarBase64(result.assets[0].base64 ?? null);
                }
              } catch (error: any) {
                Alert.alert(t('common.error'), error?.message || 'Failed to open gallery');
              }
            }, 300);
          },
        },
        {
          text: t('settings.camera'),
          onPress: () => {
            setTimeout(async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('common.error'), t('settings.permissionDenied'));
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.6,
                base64: true,
              });
              if (!result.canceled && result.assets[0]) {
                setAvatarUri(result.assets[0].uri);
                setAvatarBase64(result.assets[0].base64 ?? null);
              }
            }, 100);
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert(t('common.error'), t('settings.fullNameRequired'));
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = currentAvatarUrl;

      if (avatarUri && avatarBase64) {
        avatarUrl = await userService.uploadAvatar(avatarBase64);
      }

      await userService.updateProfile({ full_name: trimmedName, avatar_url: avatarUrl });
      await supabase.auth.updateUser({ data: { full_name: trimmedName } });
      await fetchProfile();

      Alert.alert(t('common.success'), t('settings.profileUpdated'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('settings.profileUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    fullName.trim() !== (profile?.full_name || user?.user_metadata?.full_name || '') ||
    avatarUri !== null;

  const displayUri = avatarUri || currentAvatarUrl;

  return (
    <ScreenTransition>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} disabled={saving}>
        {displayUri ? (
          <Image source={{ uri: displayUri }} style={styles.avatarImage} />
        ) : (
          <Avatar.Text size={96} label={getInitials(fullName)} />
        )}
        <View style={[styles.cameraOverlay, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="camera" size={16} color={theme.colors.onPrimary} />
        </View>
      </TouchableOpacity>

      <Text variant="bodySmall" style={[styles.changePhotoHint, { color: theme.colors.onSurfaceVariant }]}>
        {t('settings.tapToChangePhoto')}
      </Text>

      <TextInput
        label={t('settings.fullName')}
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
        autoCapitalize="words"
        disabled={saving}
      />

      <TextInput
        label={t('settings.email')}
        value={user?.email || ''}
        style={styles.input}
        disabled
      />

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!hasChanges || saving}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        {saving ? <ActivityIndicator size={20} color={theme.colors.onPrimary} /> : t('settings.saveChanges')}
      </Button>
    </ScrollView>
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoHint: {
    marginBottom: 32,
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  saveButton: {
    width: '100%',
    marginTop: 8,
  },
  saveButtonContent: {
    height: 48,
  },
});
