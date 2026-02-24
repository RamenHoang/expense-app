import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { List, IconButton, Dialog, Button, Portal, Text } from 'react-native-paper';
import { TransactionWithCategory } from '../../../types/transaction';
import { transactionService } from '../../../services/transactionService';
import { useTransactionStore } from '../../../store/transactionStore';

interface TransactionListItemProps {
  transaction: TransactionWithCategory;
  onEdit: (transaction: TransactionWithCategory) => void;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  onEdit,
}) => {
  const removeTransaction = useTransactionStore((state) => state.removeTransaction);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      color: transaction.type === 'income' ? '#4caf50' : '#f44336',
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
                    transaction.type === 'income' ? '#4caf50' : '#f44336',
                },
              ]}
            >
              {transaction.type === 'income' ? '+' : '-'}$
              {formatAmount(Number(transaction.amount))}
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
                iconColor="#d32f2f"
                onPress={() => setDeleteDialogVisible(true)}
              />
            </View>
          </View>
        )}
        style={styles.item}
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
            <View style={styles.transactionDetails}>
              <Text variant="bodyMedium" style={styles.detailText}>
                Amount: ${formatAmount(Number(transaction.amount))}
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
              textColor="#d32f2f"
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  detailText: {
    marginBottom: 4,
  },
});
