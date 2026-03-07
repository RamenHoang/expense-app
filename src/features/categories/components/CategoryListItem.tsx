import React, { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { List, IconButton, Dialog, Button, Portal, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Category } from '../../../types/category';
import { categoryService } from '../../../services/categoryService';
import { useCategoryStore } from '../../../store/categoryStore';

interface CategoryListItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  searchQuery?: string;
}

export const CategoryListItem: React.FC<CategoryListItemProps> = ({ category, onEdit, searchQuery = '' }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const removeCategory = useCategoryStore((state) => state.removeCategory);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [usageCount, setUsageCount] = useState<number | null>(null);

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

  const handleDeletePress = async () => {
    try {
      const count = await categoryService.getCategoryUsageCount(category.id);
      setUsageCount(count);
      setDeleteDialogVisible(true);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('categories.failedToCheckUsage'));
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await categoryService.deleteCategory(category.id);
      removeCategory(category.id);
      setDeleteDialogVisible(false);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getIconColor = () => {
    return category.color || (category.type === 'income' ? theme.colors.income : theme.colors.expense);
  };

  return (
    <>
      <List.Item
        title={
          <View style={styles.titleContainer}>
            {highlightText(category.name, searchQuery)}
            {category.is_shared && (
              <Text style={[styles.sharedBadge, { color: theme.colors.primary }]}>
                • {t('categories.sharedCategory')}
              </Text>
            )}
          </View>
        }
        description={category.type === 'income' ? t('categories.income') : t('categories.expense')}
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
              iconColor={theme.colors.error}
              onPress={handleDeletePress}
            />
          </View>
        )}
        style={[styles.item, { backgroundColor: theme.colors.surface }]}
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>{t('categories.deleteCategory')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t('categories.confirmDelete').replace('danh mục này', `"${category.name}"`)}
            </Text>
            {usageCount !== null && usageCount > 0 && (
              <Text variant="bodyMedium" style={[styles.warningText, { color: theme.colors.error }]}>
                {'\n'}{t('categories.categoryInUseMessage', { count: usageCount })}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button
              onPress={handleConfirmDelete}
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    marginTop: 8,
  },
});
