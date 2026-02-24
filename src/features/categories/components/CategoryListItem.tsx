import React, { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { List, IconButton, Dialog, Button, Portal, Text } from 'react-native-paper';
import { Category } from '../../../types/category';
import { categoryService } from '../../../services/categoryService';
import { useCategoryStore } from '../../../store/categoryStore';

interface CategoryListItemProps {
  category: Category;
  onEdit: (category: Category) => void;
}

export const CategoryListItem: React.FC<CategoryListItemProps> = ({ category, onEdit }) => {
  const removeCategory = useCategoryStore((state) => state.removeCategory);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [usageCount, setUsageCount] = useState<number | null>(null);

  const handleDeletePress = async () => {
    try {
      const count = await categoryService.getCategoryUsageCount(category.id);
      setUsageCount(count);
      setDeleteDialogVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check category usage');
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await categoryService.deleteCategory(category.id);
      removeCategory(category.id);
      setDeleteDialogVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  const getIconColor = () => {
    return category.color || (category.type === 'income' ? '#4caf50' : '#f44336');
  };

  return (
    <>
      <List.Item
        title={category.name}
        description={category.type === 'income' ? 'Income' : 'Expense'}
        left={(props) => (
          <List.Icon
            {...props}
            icon={category.icon || (category.type === 'income' ? 'cash-plus' : 'cash-minus')}
            color={getIconColor()}
          />
        )}
        right={() => (
          <View style={styles.actions}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => onEdit(category)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor="#d32f2f"
              onPress={handleDeletePress}
            />
          </View>
        )}
        style={styles.item}
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Category</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete "{category.name}"?
            </Text>
            {usageCount !== null && usageCount > 0 && (
              <Text variant="bodyMedium" style={styles.warningText}>
                {'\n'}Warning: This category is used in {usageCount} transaction
                {usageCount !== 1 ? 's' : ''}. Those transactions will have no category after deletion.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onPress={handleConfirmDelete}
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    color: '#f44336',
    marginTop: 8,
  },
});
