import React, { useState, memo } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { List, IconButton, Dialog, Button, Portal, Text, useTheme, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { TransactionWithCategory } from '../../../types/transaction';
import { transactionService } from '../../../services/transactionService';
import { useTransactionStore } from '../../../store/transactionStore';
import { useAuthStore } from '../../../store/authStore';
import { PriceText } from '../../../components/PriceText';

interface TransactionListItemProps {
  transaction: TransactionWithCategory;
  onEdit: (transaction: TransactionWithCategory) => void;
  searchQuery?: string;
}

const TransactionListItemComponent: React.FC<TransactionListItemProps> = ({
  transaction,
  onEdit,
  searchQuery = '',
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const removeTransaction = useTransactionStore((state) => state.removeTransaction);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnTransaction = user?.id === transaction.user_id;

  const highlightText = (text: string, query: string) => {
    if (!query || !text) return <Text>{text}</Text>;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <Text>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text key={index} style={{ backgroundColor: theme.colors.primaryContainer, fontWeight: 'bold' }}>
              {part}
            </Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  };

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
      Alert.alert(t('common.error'), error.message || t('common.failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
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
      name: t('common.uncategorized'),
    };
  };

  const categoryInfo = getCategoryInfo();

  return (
    <>
      <List.Item
        title={
          <View style={styles.titleContainer}>
            {highlightText(categoryInfo.name, searchQuery)}
            {transaction.is_shared && (
              <Text style={[styles.sharedBadge, { color: theme.colors.primary }]}>
                • {t('transactions.sharedTransaction')}
              </Text>
            )}
          </View>
        }
        description={transaction.note ? highlightText(transaction.note, searchQuery) : t('common.noNote')}
        onPress={isOwnTransaction ? () => onEdit(transaction) : undefined}
        left={(props) => (
          <List.Icon
            {...props}
            icon={categoryInfo.icon}
            color={categoryInfo.color}
          />
        )}
        right={() => (
          <View style={styles.rightContent}>
            <PriceText
              amount={transaction.amount}
              type={transaction.type}
              variant="titleMedium"
              showSign
            />
            {isOwnTransaction && (
              <View style={styles.actions}>
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => setDeleteDialogVisible(true)}
                />
              </View>
            )}
          </View>
        )}
        style={[styles.item, { backgroundColor: theme.colors.surface }]}
      />
      <Divider style={styles.divider} />

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>{t('transactions.deleteTransaction')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t('transactions.confirmDelete')}
            </Text>
            <View style={[styles.transactionDetails, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailText}>
                  {t('common.amount')}:{' '}
                </Text>
                <PriceText amount={transaction.amount} variant="bodyMedium" />
              </View>
              <Text variant="bodyMedium" style={styles.detailText}>
                {t('common.category')}: {categoryInfo.name}
              </Text>
              {transaction.note && (
                <Text variant="bodyMedium" style={styles.detailText}>
                  {t('common.note')}: {transaction.note}
                </Text>
              )}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteDialogVisible(false)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onPress={handleDelete}
              loading={isDeleting}
              disabled={isDeleting}
              textColor={theme.colors.error}
            >
              {t('common.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

// Memoize component to prevent unnecessary re-renders
export const TransactionListItem = memo(
  TransactionListItemComponent,
  (prevProps, nextProps) => {
    // Return true if props are equal (SKIP re-render)
    // Return false if props changed (DO re-render)
    return (
      prevProps.transaction.id === nextProps.transaction.id &&
      prevProps.transaction.amount === nextProps.transaction.amount &&
      prevProps.transaction.note === nextProps.transaction.note &&
      prevProps.transaction.transaction_date === nextProps.transaction.transaction_date &&
      prevProps.transaction.type === nextProps.transaction.type &&
      prevProps.transaction.category?.id === nextProps.transaction.category?.id
    );
  }
);

const styles = StyleSheet.create({
  item: {
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharedBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  rightContent: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginBottom: 4,
  },
});
