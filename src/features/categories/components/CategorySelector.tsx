import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Portal, Modal, IconButton, Searchbar, useTheme } from 'react-native-paper';
import { useCategoryStore } from '../../../store/categoryStore';
import { Category } from '../../../types/category';

interface CategorySelectorProps {
  selectedCategoryId?: string;
  onSelectCategory: (category: Category | null) => void;
  type?: 'income' | 'expense';
  label?: string;
  error?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onSelectCategory,
  type,
  label = 'Category',
  error = false,
}) => {
  const { categories, fetchCategories, isLoading, error: fetchError } = useCategoryStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      marginBottom: 8,
    },
    errorLabel: {
      color: '#d32f2f',
    },
    selector: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      backgroundColor: theme.colors.surface,
      minHeight: 56,
    },
    errorSelector: {
      borderColor: '#d32f2f',
    },
    selectedCategory: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    iconContainer: {
      pointerEvents: 'none',
    },
    categoryName: {
      flex: 1,
    },
    placeholder: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    placeholderText: {
      flex: 1,
      opacity: 0.6,
    },
    errorText: {
      color: theme.colors.error,
      marginTop: 4,
      marginLeft: 12,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      margin: 20,
      borderRadius: 8,
      maxHeight: '80%',
      minHeight: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: 20,
      paddingTop: 8,
    },
    modalTitle: {
      fontWeight: 'bold',
    },
    searchBar: {
      margin: 16,
      marginTop: 0,
      elevation: 0,
    },
    categoryList: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    categoryListItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    selectedListItem: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: theme.colors.primaryContainer,
    },
    categoryListContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    categoryListTextContainer: {
      flex: 1,
    },
    categoryListName: {
      fontWeight: 'bold',
    },
    categoryListType: {
      opacity: 0.6,
      marginTop: 2,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 12,
      gap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 20,
      paddingRight: 12,
      maxWidth: '48%',
      backgroundColor: theme.colors.surface,
    },
    selectedChip: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: theme.colors.primaryContainer,
    },
    chipText: {
      flex: 1,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      opacity: 0.6,
      textAlign: 'center',
    },
  });

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, []);

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);

  const filteredCategories = categories
    .filter((cat) => !type || cat.type === type)
    .filter((cat) => cat.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelectCategory = (category: Category) => {
    onSelectCategory(category);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleClearCategory = (e: any) => {
    e.stopPropagation();
    onSelectCategory(null);
  };

  return (
    <>
      <View style={styles.container}>
        <Text variant="labelLarge" style={[styles.label, error && styles.errorLabel]}>
          {label}
        </Text>
        <TouchableOpacity
          style={[styles.selector, error && styles.errorSelector]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          {selectedCategory ? (
            <View style={styles.selectedCategory}>
              <View style={styles.iconContainer} pointerEvents="none">
                <IconButton
                  icon={selectedCategory.icon || 'tag'}
                  size={20}
                  iconColor={selectedCategory.color || '#666'}
                />
              </View>
              <Text variant="bodyLarge" style={styles.categoryName}>
                {selectedCategory.name}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e?.stopPropagation();
                  handleClearCategory(e);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconButton
                  icon="close-circle"
                  size={20}
                  iconColor="#999"
                  onPress={() => { }}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholder} pointerEvents="none">
              <IconButton icon="tag-outline" size={20} iconColor="#999" />
              <Text variant="bodyLarge" style={styles.placeholderText}>
                Select a category
              </Text>
              <IconButton icon="chevron-down" size={20} iconColor="#999" />
            </View>
          )}
        </TouchableOpacity>
        {error && (
          <Text variant="bodySmall" style={styles.errorText}>
            Please select a category
          </Text>
        )}
      </View>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Select Category
            </Text>
            <IconButton icon="close" onPress={() => setModalVisible(false)} />
          </View>

          <Searchbar
            placeholder="Search categories"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />

          <ScrollView style={styles.categoryList}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  Loading categories...
                </Text>
              </View>
            ) : fetchError ? (
              <View style={styles.emptyState}>
                <Text variant="bodyLarge" style={[styles.emptyText, { color: '#d32f2f' }]}>
                  Error: {fetchError}
                </Text>
              </View>
            ) : filteredCategories.length === 0 ? (
              <View style={styles.emptyState}>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {searchQuery
                    ? 'No categories found'
                    : type
                      ? `No ${type} categories available. Please create one first.`
                      : 'No categories available. Please create one first.'}
                </Text>
              </View>
            ) : (
              <>
                {filteredCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryListItem,
                      selectedCategoryId === category.id && styles.selectedListItem,
                    ]}
                    onPress={() => handleSelectCategory(category)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryListContent} pointerEvents="none">
                      <IconButton
                        icon={category.icon || 'tag'}
                        size={24}
                        iconColor={category.color || '#666'}
                      />
                      <View style={styles.categoryListTextContainer}>
                        <Text variant="bodyLarge" style={styles.categoryListName}>
                          {category.name}
                        </Text>
                        <Text variant="bodySmall" style={styles.categoryListType}>
                          {category.type === 'income' ? 'Income' : 'Expense'}
                        </Text>
                      </View>
                      {selectedCategoryId === category.id && (
                        <IconButton
                          icon="check"
                          size={24}
                          iconColor="#6200ee"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </>
  );
};
