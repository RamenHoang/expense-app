import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, FAB, SegmentedButtons, Snackbar, Portal, Searchbar } from 'react-native-paper';
import { useCategoryStore } from '../../../store/categoryStore';
import { CategoryListItem } from '../components/CategoryListItem';
import { CategoryModal } from '../components/CategoryModal';
import { Category } from '../../../types/category';

export const CategoryListScreen = () => {
  const { categories, isLoading, error, fetchCategories, clearError } = useCategoryStore();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [filterType]);

  const loadCategories = async () => {
    const type = filterType === 'all' ? undefined : filterType;
    await fetchCategories(type);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setModalVisible(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingCategory(null);
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const incomeCategories = filteredCategories.filter((cat) => cat.type === 'income');
  const expenseCategories = filteredCategories.filter((cat) => cat.type === 'expense');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search categories"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <SegmentedButtons
          value={filterType}
          onValueChange={(value) => setFilterType(value as 'all' | 'income' | 'expense')}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {(filterType === 'all' || filterType === 'income') && incomeCategories.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Income Categories
            </Text>
            {incomeCategories.map((category) => (
              <CategoryListItem
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
              />
            ))}
          </View>
        )}

        {(filterType === 'all' || filterType === 'expense') && expenseCategories.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Expense Categories
            </Text>
            {expenseCategories.map((category) => (
              <CategoryListItem
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
              />
            ))}
          </View>
        )}

        {filteredCategories.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {searchQuery
                ? 'No categories found'
                : 'No categories yet. Tap + to add one!'}
            </Text>
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddCategory}
        label="Add Category"
      />

      <Portal>
        <CategoryModal
          visible={modalVisible}
          category={editingCategory}
          onDismiss={handleCloseModal}
          onSuccess={() => {
            handleCloseModal();
            loadCategories();
          }}
        />
      </Portal>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: clearError,
        }}
      >
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
