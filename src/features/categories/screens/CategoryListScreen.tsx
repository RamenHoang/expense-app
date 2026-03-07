import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, FAB, SegmentedButtons, Snackbar, Portal, Searchbar, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useCategoryStore } from '../../../store/categoryStore';
import { CategoryListItem } from '../components/CategoryListItem';
import { CategoryModal } from '../components/CategoryModal';
import { Category } from '../../../types/category';
import { FilterButtonGroup } from '../../../components/FilterButtonGroup';

export const CategoryListScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { categories, isLoading, error, fetchCategories, clearError } = useCategoryStore();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

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
    category.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const incomeCategories = filteredCategories.filter((cat) => cat.type === 'income');
  const expenseCategories = filteredCategories.filter((cat) => cat.type === 'expense');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <FilterButtonGroup
          value={filterType}
          onValueChange={(value) => setFilterType(value as 'all' | 'income' | 'expense')}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'income', label: t('categories.income') },
            { value: 'expense', label: t('categories.expense') },
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
              {t('categories.incomeCategories')}
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
          <View style={[styles.section, { paddingBottom: 80 }]}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('categories.expenseCategories')}
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
              {debouncedSearchQuery
                ? t('categories.noCategoriesFound')
                : t('categories.noCategoriesYet')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Expandable Search FAB */}
      <View style={styles.searchFabContainer}>
        {isSearchExpanded ? (
          <View style={[styles.expandedSearchBar, { backgroundColor: theme.colors.surface }]}>
            <Searchbar
              placeholder={t('categories.searchCategories')}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchInput}
              // autoFocus
              inputStyle={{ minWidth: 0 }}
            />
            {/* <FAB
              icon="close"
              size="small"
              onPress={() => {
                setIsSearchExpanded(false);
                setSearchQuery('');
              }}
              style={styles.closeSearchButton}
            /> */}
          </View>
        ) : (
          <FAB
            icon="magnify"
            onPress={() => setIsSearchExpanded(true)}
            style={styles.searchFab}
            size="medium"
            label={t('common.search')}
          />
        )}
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddCategory}
        // label={t('categories.addCategory')}
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
          label: t('common.close'),
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
  },
  header: {
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
  searchFabContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 88,
    zIndex: 1,
  },
  searchFab: {
    alignSelf: 'flex-end',
  },
  expandedSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  closeSearchButton: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
