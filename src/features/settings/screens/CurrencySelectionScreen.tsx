import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Searchbar, RadioButton, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUserStore } from '../../../store/userStore';
import { userService } from '../../../services/userService';
import { getCurrencySymbol } from '../../../utils/currency';

type CurrencySelectionScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
];

export const CurrencySelectionScreen = ({ navigation }: CurrencySelectionScreenProps) => {
  const theme = useTheme();
  const { profile, fetchProfile, updateProfile } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(profile?.currency || 'USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    } else {
      setSelectedCurrency(profile.currency);
    }
  }, [profile]);

  const filteredCurrencies = CURRENCIES.filter(
    (currency) =>
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (selectedCurrency === profile?.currency) {
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      await userService.updateProfile({ currency: selectedCurrency });
      await fetchProfile();
      
      Alert.alert(
        'Currency Updated',
        `Your currency has been changed to ${selectedCurrency}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update currency');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search currencies"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView style={styles.list}>
        <RadioButton.Group
          onValueChange={(value) => setSelectedCurrency(value)}
          value={selectedCurrency}
        >
          {filteredCurrencies.map((currency) => (
            <List.Item
              key={currency.code}
              title={`${currency.name} (${currency.code})`}
              description={`Symbol: ${currency.symbol}`}
              left={(props) => (
                <View style={styles.radioContainer}>
                  <RadioButton value={currency.code} />
                </View>
              )}
              right={(props) => (
                <Text variant="titleLarge" style={styles.symbol}>
                  {currency.symbol}
                </Text>
              )}
              onPress={() => setSelectedCurrency(currency.code)}
              style={[
                styles.listItem,
                { backgroundColor: theme.colors.surface },
                selectedCurrency === currency.code && { backgroundColor: theme.colors.primaryContainer },
              ]}
            />
          ))}
        </RadioButton.Group>

        {filteredCurrencies.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No currencies found
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading || selectedCurrency === profile?.currency}
          style={styles.saveButton}
        >
          Save
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  list: {
    flex: 1,
  },
  listItem: {
    marginBottom: 1,
  },
  radioContainer: {
    justifyContent: 'center',
  },
  symbol: {
    alignSelf: 'center',
    marginRight: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
