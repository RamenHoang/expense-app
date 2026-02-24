import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, List, Avatar, Divider, Dialog, Button, Portal, Switch } from 'react-native-paper';
import { useAuthStore } from '../../../store/authStore';
import { useUserStore } from '../../../store/userStore';
import { useThemeStore } from '../../../store/themeStore';
import { exportService } from '../../../services/exportService';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuthStore();
  const { profile, fetchProfile } = useUserStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setLogoutDialogVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    setExportDialogVisible(false);
    setExporting(true);
    try {
      await exportService.exportAndShareJSON();
      Alert.alert('Success', 'Data exported successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExportDialogVisible(false);
    setExporting(true);
    try {
      await exportService.exportAndShareCSV();
      Alert.alert('Success', 'Transactions exported as CSV!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
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
    <ScrollView style={styles.container}>
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <Avatar.Text 
          size={64} 
          label={getInitials(fullName)} 
          style={styles.avatar}
        />
        <Text variant="titleLarge" style={styles.userName}>{fullName}</Text>
        <Text variant="bodyMedium" style={styles.userEmail}>{user?.email}</Text>
      </View>

      <Divider style={styles.divider} />

      {/* Account Settings */}
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Profile"
          description="Edit your profile information"
          left={(props) => <List.Icon {...props} icon="account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Manage Categories"
          description="Add, edit, or delete categories"
          left={(props) => <List.Icon {...props} icon="tag-multiple" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Categories' as never)}
        />
        <List.Item
          title="Currency"
          description={profile?.currency || 'USD'}
          left={(props) => <List.Icon {...props} icon="currency-usd" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('CurrencySelection' as never)}
        />
      </List.Section>
      
      {/* Appearance Settings */}
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Dark Mode"
          description={isDarkMode ? "Enabled" : "Disabled"}
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={(props) => (
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme}
            />
          )}
        />
      </List.Section>
      
      {/* Data Management */}
      <List.Section>
        <List.Subheader>Data</List.Subheader>
        <List.Item
          title="Export Data"
          description="Backup your data as JSON or CSV"
          left={(props) => <List.Icon {...props} icon="download" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setExportDialogVisible(true)}
          disabled={exporting}
        />
      </List.Section>
      
      {/* Sign Out */}
      <List.Section>
        <List.Item
          title="Sign Out"
          titleStyle={styles.signOutText}
          left={(props) => <List.Icon {...props} icon="logout" color="#d32f2f" />}
          onPress={() => setLogoutDialogVisible(true)}
        />
      </List.Section>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Sign Out</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to sign out?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onPress={handleSignOut} loading={loading} disabled={loading}>
              Sign Out
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Export Format Dialog */}
        <Dialog visible={exportDialogVisible} onDismiss={() => setExportDialogVisible(false)}>
          <Dialog.Title>Export Data</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Choose export format:
            </Text>
            <List.Item
              title="JSON (Complete Backup)"
              description="All data including categories, transactions, and budgets"
              left={(props) => <List.Icon {...props} icon="code-json" />}
              onPress={handleExportJSON}
              disabled={exporting}
            />
            <List.Item
              title="CSV (Transactions)"
              description="Transaction history in spreadsheet format"
              left={(props) => <List.Icon {...props} icon="file-delimited" />}
              onPress={handleExportCSV}
              disabled={exporting}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportDialogVisible(false)} disabled={exporting}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
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
});
