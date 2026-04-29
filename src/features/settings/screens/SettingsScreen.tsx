import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import Constants from 'expo-constants';
import { Text, List, Avatar, Divider, Dialog, Button, Portal, Switch, useTheme, RadioButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/authStore';
import { useUserStore } from '../../../store/userStore';
import { useThemeStore } from '../../../store/themeStore';
import { exportService } from '../../../services/exportService';
import { useNavigation } from '@react-navigation/native';
import { ScreenTransition } from '../../../components/ScreenTransition';

export const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const { profile, fetchProfile } = useUserStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchProfile();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setLogoutDialogVisible(false);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('settings.signOutError'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    setExportDialogVisible(false);
    setExporting(true);
    try {
      await exportService.exportAndShareJSON();
      Alert.alert(t('common.success'), t('settings.exportSuccess'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('settings.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExportDialogVisible(false);
    setExporting(true);
    try {
      await exportService.exportAndShareCSV();
      Alert.alert(t('common.success'), t('settings.exportCSVSuccess'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('settings.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleReplayOnboarding = async () => {
    Alert.alert(
      t('settings.replayTutorial'),
      t('settings.replayTutorialConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('onboarding_completed');
              Alert.alert(
                t('common.success'),
                t('settings.replayTutorialSuccess'),
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.replayTutorialError'));
            }
          },
        },
      ]
    );
  };

  const handleChangeLanguage = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      setSelectedLanguage(language);
      await AsyncStorage.setItem('user_language', language);
      setLanguageDialogVisible(false);
      Alert.alert(t('common.success'), t('settings.languageChanged'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.languageChangeError'));
    }
  };

  const getLanguageName = (code: string) => {
    switch (code) {
      case 'en':
        return 'English';
      case 'vi':
        return 'Tiếng Việt';
      default:
        return code;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const fullName = user?.user_metadata?.full_name || 'User';

  return (
    <ScreenTransition>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* User Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: theme.colors.surface }]}>
        {profile?.avatar_url ? (
          <Avatar.Image
            size={64}
            source={{ uri: profile.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <Avatar.Text
            size={64}
            label={getInitials(fullName)}
            style={styles.avatar}
          />
        )}
        <Text variant="titleLarge" style={styles.userName}>{fullName}</Text>
        <Text variant="bodyMedium" style={styles.userEmail}>{user?.email}</Text>
      </View>

      <Divider style={styles.divider} />

      {/* Account Settings */}
      <List.Section>
        <List.Subheader>{t('settings.account')}</List.Subheader>
        <List.Item
          title={t('settings.profile')}
          description={t('settings.editProfileDescription')}
          left={(props) => <List.Icon {...props} icon="account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('EditProfile' as never)}
        />
        <List.Item
          title={t('categories.manageCategories')}
          description={t('settings.manageCategoriesDescription')}
          left={(props) => <List.Icon {...props} icon="tag-multiple" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Categories' as never)}
        />
        <List.Item
          title={t('settings.currency')}
          description={profile?.currency || 'USD'}
          left={(props) => <List.Icon {...props} icon="currency-usd" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('CurrencySelection' as never)}
        />
      </List.Section>
      
      {/* Appearance Settings */}
      <List.Section>
        <List.Subheader>{t('settings.appearance')}</List.Subheader>
        <List.Item
          title={t('settings.language')}
          description={getLanguageName(i18n.language)}
          left={(props) => <List.Icon {...props} icon="translate" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setLanguageDialogVisible(true)}
        />
        <List.Item
          title={t('settings.darkMode')}
          description={isDarkMode ? t('settings.darkModeEnabled') : t('settings.darkModeDisabled')}
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={(props) => (
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme}
            />
          )}
        />
      </List.Section>
      
      {/* App Settings */}
      <List.Section>
        <List.Subheader>{t('settings.app')}</List.Subheader>
        <List.Item
          title={t('settings.replayTutorial')}
          description={t('settings.replayTutorialDescription')}
          left={(props) => <List.Icon {...props} icon="school" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleReplayOnboarding}
        />
      </List.Section>
      
      {/* Data Management */}
      <List.Section>
        <List.Subheader>{t('settings.data')}</List.Subheader>
        <List.Item
          title={t('settings.exportData')}
          description={t('settings.exportDataDescription')}
          left={(props) => <List.Icon {...props} icon="download" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setExportDialogVisible(true)}
          disabled={exporting}
        />
      </List.Section>
      
      {/* Sign Out */}
      <List.Section>
        <List.Item
          title={t('settings.signOut')}
          titleStyle={styles.signOutText}
          left={(props) => <List.Icon {...props} icon="logout" color="#d32f2f" />}
          onPress={() => setLogoutDialogVisible(true)}
        />
      </List.Section>

      {/* App Version */}
      <Text variant="bodySmall" style={styles.versionText}>
        v{Constants.expoConfig?.version ?? '1.0.0'}
      </Text>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>{t('settings.signOut')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('settings.signOutConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button onPress={handleSignOut} loading={loading} disabled={loading}>
              {t('settings.signOut')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Export Format Dialog */}
        <Dialog visible={exportDialogVisible} onDismiss={() => setExportDialogVisible(false)}>
          <Dialog.Title>{t('settings.exportData')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              {t('settings.exportFormat')}
            </Text>
            <List.Item
              title={t('settings.exportJSON')}
              description={t('settings.exportJSONDescription')}
              left={(props) => <List.Icon {...props} icon="code-json" />}
              onPress={handleExportJSON}
              disabled={exporting}
            />
            <List.Item
              title={t('settings.exportCSV')}
              description={t('settings.exportCSVDescription')}
              left={(props) => <List.Icon {...props} icon="file-delimited" />}
              onPress={handleExportCSV}
              disabled={exporting}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportDialogVisible(false)} disabled={exporting}>
              {t('common.cancel')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Language Selection Dialog */}
        <Dialog visible={languageDialogVisible} onDismiss={() => setLanguageDialogVisible(false)}>
          <Dialog.Title>{t('settings.selectLanguage')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={handleChangeLanguage} value={selectedLanguage}>
              <RadioButton.Item label="English" value="en" />
              <RadioButton.Item label="Tiếng Việt" value="vi" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLanguageDialogVisible(false)}>
              {t('common.close')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    marginBottom: 12,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 8,
  },
  signOutText: {
    color: '#d32f2f',
  },
  versionText: {
    textAlign: 'center',
    opacity: 0.5,
    marginBottom: 24,
  },
});
