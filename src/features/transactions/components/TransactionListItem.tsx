import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { List, IconButton, Dialog, Button, Portal, Text, useTheme } from 'react-native-paper';
import { TransactionWithCategory } from '../../../types/transaction';
import { transactionService } from '../../../services/transactionService';
import { useTransactionStore } from '../../../store/transactionStore';
import { getCurrencySymbol } from '../../../utils/currency';
import { useUserStore } from '../../../store/userStore';

interface TransactionListItemProps {
  transaction: TransactionWithCategory;
  onEdit: (transaction: TransactionWithCategory) => void;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  onEdit,
}) => {
  const theme = useTheme();
  const { profile } = useUserStore();
  const removeTransaction = useTransactionStore((state) => state.removeTransaction);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const currency = profile?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);
  const noDecimals = ['VND', 'JPY', 'KRW'].includes(currency.toUpperCase());

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await transactionService.deleteTransaction(transaction.id);

      // Delete receipt if exists
      if (transaction.receipt_url) {
        await transactionService.deleteReceipt(transaction.receipt_url);
      }

      removeTransaction(transaction.id);
      setDeleteDialogVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getCategoryInfo = () => {
    if (transaction.category) {
      return {
        icon: transaction.category.icon || 'tag',
        color: transaction.category.color || '#666',
        name: transaction.category.name,
      };
    }
    return {
      icon: transaction.type === 'income' ? 'cash-plus' : 'cash-minus',
      color: transaction.type === 'income' ? theme.colors.income : theme.colors.expense,
      name: 'Uncategorized',
    };
  };

  const categoryInfo = getCategoryInfo();

  return (
    <>
      <List.Item
        title={categoryInfo.name}
        description={transaction.note || 'No note'}
        left={(props) => (
          <List.Icon
            {...props}
            icon={categoryInfo.icon}
            color={categoryInfo.color}
          />
        )}
        right={() => (
          <View style={styles.rightContent}>
            <Text
              variant="titleMedium"
              style={[
                styles.amount,
                {
                  color:
                    transaction.type === 'income' ? theme.colors.income : theme.colors.expense,
                },
              ]}
            >
              {transaction.type === 'income' ? '+' : '-'}{currencySymbol}
              {formatAmount(Number(transaction.amount.toFixed(noDecimals ? 0 : 2)))}
            </Text>
            <View style={styles.actions}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => onEdit(transaction)}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => setDeleteDialogVisible(true)}
              />
            </View>
          </View>
        )}
        style={[styles.item, { backgroundColor: theme.colors.surface }]}
      />

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Transaction</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete this transaction?
            </Text>
            <View style={[styles.transactionDetails, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="bodyMedium" style={styles.detailText}>
                Amount: {currencySymbol}{formatAmount(Number(transaction.amount.toFixed(noDecimals ? 0 : 2)))}
              </Text>
              <Text variant="bodyMedium" style={styles.detailText}>
                Category: {categoryInfo.name}
              </Text>
              {transaction.note && (
                <Text variant="bodyMedium" style={styles.detailText}>
                  Note: {transaction.note}
                </Text>
              )}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteDialogVisible(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onPress={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
              textColor={theme.colors.error}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  item: {
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  rightContent: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: -8,
  },
  transactionDetails: {
    marginTop: 12,
    padding: 12,
    borderRadius: 4,
  },
  detailText: {
    marginBottom: 4,
  },
});
