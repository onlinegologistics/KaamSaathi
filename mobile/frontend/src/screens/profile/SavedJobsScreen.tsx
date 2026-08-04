import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { JobCard } from '../../components/JobCard';
import { listJobs } from '../../services/api';
import { toJobViewModel } from '../../utils/jobAdapter';
import { Job } from '../../types';
import { useApp } from '../../context/AppContext';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SavedJobs'>;

export const SavedJobsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, accessToken, bookmarkedJobIds, applyToJob } = useApp();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedJobs = useCallback(() => {
    if (!accessToken) return;
    listJobs(accessToken, { limit: 100 })
      .then((res) => {
        const saved = res.data
          .filter((job) => bookmarkedJobIds.includes(job._id))
          .map((job) => toJobViewModel(job));
        setJobs(saved);
      })
      .catch(() => setJobs([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [accessToken, bookmarkedJobIds]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchSavedJobs();
    }, [fetchSavedJobs])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t('savedJobs')}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => navigation.getParent()?.navigate('HomeTab', { screen: 'JobDetail', params: { jobId: item.id } } as never)}
              onApply={() => applyToJob(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="bookmark-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>Saved jobs will appear here.</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  listContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxxl,
  },
});
