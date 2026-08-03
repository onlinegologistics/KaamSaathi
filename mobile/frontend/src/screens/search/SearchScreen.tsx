import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ScrollView, Keyboard, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { JobRow } from '../../components/JobRow';
import { FilterPanelModal, FilterState, DEFAULT_FILTERS } from '../../components/FilterPanelModal';
import { listJobs } from '../../services/api';
import { toJobViewModel } from '../../utils/jobAdapter';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { HomeStackParamList, SearchStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList | SearchStackParamList, any>;

const QUICK_FILTERS = ['All', 'Nearby', 'Trending', 'Full Time'] as const;
type QuickFilter = (typeof QUICK_FILTERS)[number];

export const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const { t, accessToken, applyToJob } = useApp();

  // Hide the bottom tab bar for as long as the keyboard is up — whether this
  // screen was reached from Home's search bar or straight from the Search tab —
  // so the bar can't sit on top of the keyboard (Android has no built-in avoidance
  // for absolutely-positioned tab bars).
  useEffect(() => {
    const tabNavigator = navigation.getParent();
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      tabNavigator?.setOptions({ tabBarStyle: { display: 'none' } });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      tabNavigator?.setOptions({ tabBarStyle: undefined });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      tabNavigator?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  const [query, setQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('All');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [results, setResults] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(
    async (text: string, activeFilters: FilterState = filters, active: QuickFilter = quickFilter) => {
      if (!accessToken) return;
      setLoading(true);
      try {
        const res = await listJobs(accessToken, {
          status: 'open',
          search: text.trim() || undefined,
          category: activeFilters.categories.length === 1 ? activeFilters.categories[0] : undefined,
          // "Nearby" tightens the radius; the panel's own value wins otherwise.
          distanceKm: active === 'Nearby' ? Math.min(activeFilters.distanceKm, 5) : activeFilters.distanceKm,
          payMin: activeFilters.payMin,
          payMax: activeFilters.payMax,
          date: activeFilters.todayOnly ? new Date().toISOString() : undefined,
          limit: 30,
        });
        setResults(res.data.map((job) => toJobViewModel(job)));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, filters, quickFilter]
  );

  useEffect(() => {
    runSearch(query, filters, quickFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, quickFilter]);

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Find Jobs</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('filters')}
          onPress={() => setFilterVisible(true)}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="tune-variant" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={21} color={theme.colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(query)}
          placeholder="Search jobs..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear"
            onPress={() => {
              setQuery('');
              runSearch('');
            }}
          >
            <MaterialCommunityIcons name="close-circle" size={19} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {QUICK_FILTERS.map((chip) => {
            const active = quickFilter === chip;
            return (
              <Pressable
                key={chip}
                accessibilityRole="button"
                accessibilityLabel={chip}
                onPress={() => setQuickFilter(chip)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobRow
            job={item}
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
            onApply={() => applyToJob(item.id)}
          />
        )}
        contentContainerStyle={styles.resultsList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="magnify-close" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>{t('noResults')}</Text>
              <Text style={styles.emptySubText}>{t('tryDifferentFilters')}</Text>
            </View>
          )
        }
      />

      <FilterPanelModal
        visible={filterVisible}
        initialFilters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterVisible(false);
          runSearch(query, f);
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    minHeight: 50,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    paddingVertical: 10,
  },
  chipsWrap: {
    paddingVertical: theme.spacing.sm,
  },
  chipsRow: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.accent,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: theme.colors.textInverse,
  },
  resultsList: {
    paddingTop: theme.spacing.xxs,
    paddingBottom: 96,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.bodyLg,
    color: theme.colors.textMuted,
  },
  emptySubText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
