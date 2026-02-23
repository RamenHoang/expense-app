import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Avatar, Divider, Dialog, Button, Portal } from 'react-native-paper';
import { useAuthStore } from '../../../store/authStore';

export const SettingsScreen = () => {
  const { user, signOut } = useAuthStore();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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
          title="Currency"
          description="USD"
          left={(props) => <List.Icon {...props} icon="currency-usd" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>
      
      {/* Appearance Settings */}
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Dark Mode"
          description="Coming soon"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>
      
      {/* Data Management */}
      <List.Section>
        <List.Subheader>Data</List.Subheader>
        <List.Item
          title="Export Data"
          description="Download your data as CSV"
          left={(props) => <List.Icon {...props} icon="download" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
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
