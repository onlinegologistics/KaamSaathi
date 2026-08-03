import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { IconButton } from './IconButton';
import { categories } from '../data/categories';
import { useApp } from '../context/AppContext';
import { JobCategory } from '../types';

interface CategoryPickerSheetProps {
  visible: boolean;
  activeCategory: JobCategory | 'all';
  onSelect: (category: JobCategory | 'all') => void;
  onClose: () => void;
  showAllOption?: boolean;
}

export const CategoryPickerSheet: React.FC<CategoryPickerSheetProps> = ({
  visible,
  activeCategory,
  onSelect,
  onClose,
  showAllOption = true,
}) => {
  const { t } = useApp();

  const handleSelect = (cat: JobCategory | 'all') => {
    onSelect(cat);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('selectCategory')}</Text>
          <IconButton name="close" accessibilityLabel={t('cancel')} onPress={onClose} color={theme.colors.textSecondary} />
        </View>

        <View style={styles.grid}>
          {showAllOption && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activeCategory === 'all' }}
              onPress={() => handleSelect('all')}
              style={styles.option}
            >
              <View style={[styles.circle, activeCategory === 'all' && styles.circleActive]}>
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={24}
                  color={activeCategory === 'all' ? theme.colors.textInverse : theme.colors.textSecondary}
                />
              </View>
              <Text style={styles.label} numberOfLines={1}>{t('allCategories')}</Text>
            </Pressable>
          )}

          {categories.map((cat) => {
            const selected = activeCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => handleSelect(cat.key)}
                style={styles.option}
              >
                <View style={[styles.circle, selected && { backgroundColor: cat.color }]}>
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={24}
                    color={selected ? theme.colors.textInverse : theme.colors.textSecondary}
                  />
                </View>
                <Text style={styles.label} numberOfLines={1}>{t(cat.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  option: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  circleActive: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
