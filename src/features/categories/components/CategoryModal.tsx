import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Divider,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../types/category';
import { categoryService } from '../../../services/categoryService';
import { useCategoryStore } from '../../../store/categoryStore';
import { useFamilyStore } from '../../../store/familyStore';

interface CategoryModalProps {
  visible: boolean;
  category?: Category | null;
  onDismiss: () => void;
  onSuccess: () => void;
}

const CATEGORY_COLORS = [
  '#f44336', // Red
  '#e91e63', // Pink
  '#9c27b0', // Purple
  '#673ab7', // Deep Purple
  '#3f51b5', // Indigo
  '#2196f3', // Blue
  '#03a9f4', // Light Blue
  '#00bcd4', // Cyan
  '#009688', // Teal
  '#4caf50', // Green
  '#8bc34a', // Light Green
  '#cddc39', // Lime
  '#ffeb3b', // Yellow
  '#ffc107', // Amber
  '#ff9800', // Orange
  '#ff5722', // Deep Orange
];

const CATEGORY_ICONS = [
  // Income
  'cash-plus',
  'trending-up',
  'wallet',
  'bank',
  'briefcase',
  'gift',

  // Expense
  'cash-minus',
  'cart',
  'food',
  'coffee',
  'silverware-fork-knife',
  'gas-station',
  'car',
  'bus',
  'home',
  'lightning-bolt',
  'water',
  'wifi',
  'phone',
  'hospital',
  '医疗',
  'pill',
  'school',
  'book-open',
  'movie',
  'gamepad-variant',
  'tshirt-crew',
  'shopping',
  'gift-outline',
  'dog',
  'paw',
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  category,
  onDismiss,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { addCategory, updateCategory } = useCategoryStore();
  const { family } = useFamilyStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [selectedIcon, setSelectedIcon] = useState('cash-minus');
  const [selectedColor, setSelectedColor] = useState('#f44336');
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  const styles = StyleSheet.create({
    modal: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      margin: 20,
      borderRadius: 8,
      maxHeight: '90%',
    },
    title: {
      marginBottom: 16,
      fontWeight: 'bold',
    },
    input: {
      marginBottom: 16,
    },
    label: {
      marginBottom: 8,
      marginTop: 8,
    },
    segmentedButtons: {
      marginBottom: 8,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 8,
      paddingVertical: 8,
    },
    switchLabel: {
      flex: 1,
      marginRight: 16,
    },
    switchHint: {
      marginTop: 4,
      opacity: 0.7,
    },
    divider: {
      marginVertical: 16,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    colorBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedColorBox: {
      borderColor: theme.colors.primary,
      borderWidth: 3,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    iconBox: {
      width: 56,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedIconBox: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
    },
    errorText: {
      color: theme.colors.error,
      marginTop: 8,
      marginBottom: 8,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 16,
    },
  });

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setSelectedIcon(category.icon || 'cash-minus');
      setSelectedColor(category.color || '#f44336');
      setIsShared(category.is_shared || false);
    } else {
      resetForm();
    }
  }, [category, visible]);

  const resetForm = () => {
    setName('');
    setType('expense');
    setSelectedIcon('cash-minus');
    setSelectedColor('#f44336');
    setIsShared(false);
    setError('');
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError(t('categories.categoryNameRequired'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      if (category) {
        // Check for duplicate when changing sharing status or name
        const sharingChanged = category.is_shared !== isShared;
        const nameChanged = category.name !== name.trim();
        
        if (sharingChanged || nameChanged) {
          await categoryService.checkDuplicateName(
            name.trim(), 
            type, 
            isShared && family ? family.id : undefined,
            category.id  // Exclude current category
          );
        }

        // Update existing category
        const input: UpdateCategoryInput = {
          name: name.trim(),
          type,
          icon: selectedIcon,
          color: selectedColor,
          family_id: isShared && family ? family.id : null,
          is_shared: isShared && family ? true : false,
        };
        const updated = await categoryService.updateCategory(category.id, input);
        updateCategory(category.id, updated);
      } else {
        // Check for duplicate before creating
        await categoryService.checkDuplicateName(name.trim(), type, isShared && family ? family.id : undefined);

        // Create new category
        const input: CreateCategoryInput = {
          name: name.trim(),
          type,
          icon: selectedIcon,
          color: selectedColor,
          family_id: isShared && family ? family.id : undefined,
          is_shared: isShared && family ? true : false,
        };
        const created = await categoryService.createCategory(input);
        addCategory(created);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || t('categories.failedToSaveCategory'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <ScrollView>
          <Text variant="headlineSmall" style={styles.title}>
            {category ? t('categories.editCategory') : t('categories.addCategory')}
          </Text>

          <TextInput
            label={t('categories.categoryName')}
            value={name}
            onChangeText={setName}
            mode="outlined"
            disabled={loading}
            style={styles.input}
            error={!!error && !name.trim()}
          />

          <Text variant="labelLarge" style={styles.label}>
            {t('categories.type')}
          </Text>
          <SegmentedButtons
            value={type}
            onValueChange={(value) => setType(value as 'income' | 'expense')}
            buttons={[
              { value: 'income', label: t('categories.income') },
              { value: 'expense', label: t('categories.expense') },
            ]}
            disabled={loading}
            style={styles.segmentedButtons}
          />

          {/* Share with family toggle - show when user has family */}
          {family && (
            <View style={styles.switchContainer}>
              <View style={styles.switchLabel}>
                <Text variant="labelLarge">{t('categories.shareWithFamily')}</Text>
                <Text variant="bodySmall" style={styles.switchHint}>
                  {category 
                    ? t('categories.updateSharingDesc', { familyName: family.name })
                    : t('categories.shareWithFamilyDesc', { familyName: family.name })
                  }
                </Text>
              </View>
              <Switch
                value={isShared}
                onValueChange={setIsShared}
                disabled={loading}
              />
            </View>
          )}

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={styles.label}>
            {t('categories.color')}
          </Text>
          <View style={styles.colorGrid}>
            {CATEGORY_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorBox,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColorBox,
                ]}
                onPress={() => setSelectedColor(color)}
                disabled={loading}
              >
                {selectedColor === color && (
                  <IconButton icon="check" size={16} iconColor="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={styles.label}>
            {t('categories.icon')}
          </Text>
          <View style={styles.iconGrid}>
            {CATEGORY_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[
                  styles.iconBox,
                  selectedIcon === icon && styles.selectedIconBox,
                ]}
                onPress={() => setSelectedIcon(icon)}
                disabled={loading}
              >
                <IconButton
                  icon={icon}
                  size={24}
                  iconColor={selectedIcon === icon ? selectedColor : '#666'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {error && (
            <Text variant="bodyMedium" style={styles.errorText}>
              {error}
            </Text>
          )}

          <View style={styles.actions}>
            <Button onPress={onDismiss} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
            >
              {category ? t('common.update') : t('common.create')}
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};
