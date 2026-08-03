import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Chip } from './Chip';
import { categories } from '../data/categories';
import { useApp } from '../context/AppContext';
import { JobCategory } from '../types';

export interface FilterState {
  categories: JobCategory[];
  distanceKm: number;
  payMin: number;
  payMax: number;
  todayOnly: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  categories: [],
  distanceKm: 20,
  payMin: 0,
  payMax: 2000,
  todayOnly: false,
};

interface FilterPanelModalProps {
  visible: boolean;
  initialFilters: FilterState;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
}

export const FilterPanelModal: React.FC<FilterPanelModalProps> = ({
  visible,
  initialFilters,
  onClose,
  onApply,
}) => {
  const { t } = useApp();
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  useEffect(() => {
    if (visible) setFilters(initialFilters);
  }, [visible, initialFilters]);

  const toggleCategory = (cat: JobCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const reset = () => setFilters(DEFAULT_FILTERS);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.container}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <IconButton name="arrow-left" accessibilityLabel={t('cancel')} onPress={onClose} color={theme.colors.primary} />
            <Text style={styles.headerTitle}>{t('filters')}</Text>
            <Pressable onPress={reset} style={styles.resetBtn} hitSlop={8}>
              <Text style={styles.resetText}>{t('resetFilters')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>{t('category')}</Text>
            <View style={styles.categoryGrid}>
              {categories.slice(0, 5).map((cat) => {
                const selected = filters.categories.includes(cat.key);
                return (
                  <Pressable
                    key={cat.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(cat.labelKey)}
                    onPress={() => toggleCategory(cat.key)}
                    style={styles.categoryOption}
                  >
                    <View style={[styles.categoryCircle, selected && styles.categoryCircleActive]}>
                      <MaterialCommunityIcons name={cat.icon as any} size={22} color={selected ? theme.colors.textInverse : theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.categoryLabel} numberOfLines={1}>{t(cat.labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>

          <View style={styles.sectionDivider} />

          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>{t('distance')}</Text>
            <Text style={styles.sliderValue}>{filters.distanceKm} km</Text>
          </View>
          <Slider
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={filters.distanceKm}
            onValueChange={(v) => setFilters((p) => ({ ...p, distanceKm: v }))}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
          />

          <View style={styles.sectionDivider} />

          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>{t('payRange')}</Text>
            <Text style={styles.sliderValue}>
              ₹{filters.payMin} - ₹{filters.payMax}
            </Text>
          </View>
          <Text style={styles.sliderSubLabel}>Min</Text>
          <Slider
            minimumValue={0}
            maximumValue={2000}
            step={50}
            value={filters.payMin}
            onValueChange={(v) => setFilters((p) => ({ ...p, payMin: Math.min(v, p.payMax) }))}
            minimumTrackTintColor={theme.colors.secondary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.secondary}
          />
          <Text style={styles.sliderSubLabel}>Max</Text>
          <Slider
            minimumValue={0}
            maximumValue={2000}
            step={50}
            value={filters.payMax}
            onValueChange={(v) => setFilters((p) => ({ ...p, payMax: Math.max(v, p.payMin) }))}
            minimumTrackTintColor={theme.colors.secondary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.secondary}
          />

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionTitle}>{t('dateTime')}</Text>
          <View style={styles.dateRow}>
            <Chip
              label={t('today')}
              icon="calendar-today"
              selected={filters.todayOnly}
              onPress={() => setFilters((p) => ({ ...p, todayOnly: !p.todayOnly }))}
            />
            <View style={styles.dateHint}>
              <MaterialCommunityIcons name="calendar-month-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.dateHintText}>More date options coming soon</Text>
            </View>
          </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button label={t('applyFilters')} onPress={() => onApply(filters)} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.18)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  resetBtn: {
    minHeight: theme.MIN_TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  resetText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  categoryOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  categoryCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  categoryCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryLabel: {
    ...theme.typography.tiny,
    color: theme.colors.textSecondary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.lg,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  sliderSubLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  dateRow: {
    gap: theme.spacing.sm,
  },
  dateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateHintText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
});
