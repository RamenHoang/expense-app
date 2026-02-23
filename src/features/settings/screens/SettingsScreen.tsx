import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List } from 'react-native-paper';
import { useAuthStore } from '../../../store/authStore';

export const SettingsScreen = () => {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <View style={styles.container}>
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Profile"
          left={(props) => <List.Icon {...props} icon="account" />}
        />
        <List.Item
          title="Currency"
          description="USD"
          left={(props) => <List.Icon {...props} icon="currency-usd" />}
        />
      </List.Section>
      
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Dark Mode"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
        />
      </List.Section>
      
      <List.Section>
        <List.Subheader>Data</List.Subheader>
        <List.Item
          title="Export CSV"
          left={(props) => <List.Icon {...props} icon="download" />}
        />
      </List.Section>
      
      <List.Section>
        <List.Item
          title="Sign Out"
          left={(props) => <List.Icon {...props} icon="logout" />}
          onPress={signOut}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
