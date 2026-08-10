import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Chip } from './Chip';
import { CategoryPickerSheet } from './CategoryPickerSheet';
import { getCategoryMeta } from '../data/categories';
import { useApp } from '../context/AppContext';
import { JobCategory } from '../types';

interface FilterChipsRowProps {
  activeCategory: JobCategory | 'all';
  onCategoryChange: (cat: JobCategory | 'all') => void;
  nearMeActive: boolean;
  onNearMeToggle: () => void;
  todayActive: boolean;
  onTodayToggle: () => void;
  onFiltersPress: () => void;
}

export const FilterChipsRow: React.FC<FilterChipsRowProps> = ({
  activeCategory,
  onCategoryChange,
  nearMeActive,
  onNearMeToggle,
  todayActive,
  onTodayToggle,
  onFiltersPress,
}) => {
  const { t, categories } = useApp();
  const [pickerVisible, setPickerVisible] = useState(false);

  const allChipLabel = activeCategory === 'all' ? t('allCategories') : getCategoryMeta(activeCategory, categories).label;

  return (
    <>
      <View style={styles.container}>
        <Chip label={t('filters')} icon="tune-variant" onPress={onFiltersPress} compact style={styles.chip} />
        <Chip
          label={t('nearMe')}
          icon="crosshairs-gps"
          selected={nearMeActive}
          onPress={onNearMeToggle}
          compact
          style={styles.chip}
        />
        <Chip
          label={t('today')}
          icon="calendar-today"
          selected={todayActive}
          onPress={onTodayToggle}
          compact
          style={styles.chip}
        />
        <Chip
          label={allChipLabel}
          trailingIcon="chevron-down"
          selected={activeCategory !== 'all'}
          onPress={() => setPickerVisible(true)}
          compact
          style={styles.chip}
        />
      </View>

      <CategoryPickerSheet
        visible={pickerVisible}
        activeCategory={activeCategory}
        onSelect={onCategoryChange}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chip: {
    width: 78,
  },
});
